package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ecsegames/backend/internal/audit"
	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/cscomp"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/events"
	"github.com/ecsegames/backend/internal/handlers"
	appmw "github.com/ecsegames/backend/internal/middleware"
	"github.com/ecsegames/backend/internal/scores"
	"github.com/ecsegames/backend/internal/users"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	cfg := config.Load()

	// FRONTEND_ORIGIN falls back to localhost for dev. With production Clerk
	// keys that fallback would boot fine and then fail every browser call on
	// CORS with nothing in the server log, so refuse to start instead.
	if os.Getenv("FRONTEND_ORIGIN") == "" && strings.HasPrefix(cfg.ClerkSecretKey, "sk_live_") {
		log.Fatal("FRONTEND_ORIGIN must be set when running with production Clerk keys")
	}
	// Session tokens must have been minted for our frontend.
	appmw.SetAuthorizedParties(cfg.FrontendOrigin)

	// Mongo is optional at boot so the scaffold runs without a cluster.
	// When MONGO_URI is set we connect and ping; otherwise we log and continue.
	var database *mongo.Database
	if cfg.MongoURI != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if d, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB); err != nil {
			log.Printf("warning: mongo not connected: %v", err)
		} else {
			database = d
			log.Printf("connected to mongo database %q", cfg.MongoDB)
		}
	} else {
		log.Printf("MONGO_URI not set; starting without database")
	}

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	// Cap request bodies so a client can't make the server buffer an
	// arbitrarily large JSON payload. The largest legitimate body is a CS
	// comp submission, bounded at 64 KB, so 1 MB is generous.
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
			next.ServeHTTP(w, r)
		})
	})
	// Auth is a Bearer header, not a cookie, so credentials are not needed
	// on the CORS grant.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.FrontendOrigin},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Readiness(database))

	// The renderer outlives the route setup so shutdown can close Chrome.
	var renderer *cscomp.Renderer

	// Data routes need MongoDB. When it isn't connected (dev without a cluster),
	// the user API is disabled.
	if database != nil {
		userRepo := users.NewRepository(database)
		auditStore := audit.NewStore(database)
		eventStore := events.NewStore(database)
		scoreStore := scores.NewStore(database)
		eventHandler := events.NewHandler(eventStore, auditStore, userRepo, scoreStore.ClearByEvent)
		scoreHandler := scores.NewHandler(scoreStore, auditStore, userRepo, eventStore.Exists)

		// Unique indexes are what make the upserts in users, scores and the
		// comp race-safe (and, for the comp, enforce the claim rules), so a
		// failure to build them is fatal rather than logged. Bounded so a
		// stalled build can't leave the process hanging before it listens.
		idxCtx, cancelIdx := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancelIdx()
		if err := userRepo.EnsureIndexes(idxCtx); err != nil {
			log.Fatalf("users: ensure indexes: %v", err)
		}
		if err := scoreStore.EnsureIndexes(idxCtx); err != nil {
			log.Fatalf("scores: ensure indexes: %v", err)
		}
		if err := eventStore.EnsureIndexes(idxCtx); err != nil {
			log.Fatalf("events: ensure indexes: %v", err)
		}
		if err := auditStore.EnsureIndexes(idxCtx); err != nil {
			log.Fatalf("audit: ensure indexes: %v", err)
		}

		// Authenticated user API. Users are created in Mongo lazily on their
		// first request here, so no Clerk webhook is needed.
		usersHandler := handlers.NewUsers(userRepo)
		r.Group(func(pr chi.Router) {
			pr.Use(appmw.RequireAuth(cfg.ClerkSecretKey))
			pr.Get("/api/me", usersHandler.Me)
			pr.Post("/api/team", usersHandler.SetTeam)
		})

		events.Mount(r, eventHandler, userRepo, cfg.ClerkSecretKey)
		scores.Mount(r, scoreHandler, userRepo, cfg.ClerkSecretKey)

		// The CS comp scores submissions by rendering them in headless
		// Chrome, so a host without one degrades the same way a missing
		// Mongo does: the module still mounts, and only submitting is
		// disabled (Handler.Submit returns 503 on a nil renderer). Reads,
		// teams and claims keep working.
		rd, err := cscomp.NewRenderer(cfg.ChromePath, cfg.ChromeNoSandbox, cfg.CSCompRenderConcurrency)
		if err != nil {
			log.Printf("cscomp: renderer unavailable, submissions disabled: %v", err)
		} else {
			renderer = rd
		}
		cscompStore := cscomp.NewStore(database)
		if err := cscompStore.EnsureIndexes(idxCtx); err != nil {
			log.Fatalf("cscomp: ensure indexes: %v", err)
		}
		cscompHandler := cscomp.NewHandler(cscompStore, userRepo, renderer, cfg.CSCompSolutionsDir, cfg.CSCompMinutes*60)
		cscomp.Mount(r, cscompHandler, userRepo, cfg.ClerkSecretKey)
	} else {
		log.Printf("database not connected: user API disabled")
	}

	// Timeouts so a client holding a connection open can't pin a goroutine
	// forever; the write timeout leaves room for a CS comp render (30s).
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// On SIGINT/SIGTERM finish in-flight requests, then close Chrome and
	// Mongo, so a deploy doesn't cut a score write mid-request or leave an
	// orphaned Chromium tree behind.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		log.Printf("listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	log.Printf("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	if renderer != nil {
		renderer.Close()
	}
	if database != nil {
		if err := database.Client().Disconnect(shutdownCtx); err != nil {
			log.Printf("mongo disconnect: %v", err)
		}
	}
}
