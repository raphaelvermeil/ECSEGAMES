package main

import (
	"context"
	"log"
	"net/http"
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
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Readiness(database))

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
		renderer, err := cscomp.NewRenderer(cfg.ChromePath, cfg.ChromeNoSandbox, cfg.CSCompRenderConcurrency)
		if err != nil {
			log.Printf("cscomp: renderer unavailable, submissions disabled: %v", err)
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

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
