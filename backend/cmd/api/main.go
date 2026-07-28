package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/handlers"
	appmw "github.com/ecsegames/backend/internal/middleware"
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
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Readiness(database))

	// Data routes need MongoDB. When it isn't connected (dev without a cluster),
	// the webhook and user API are disabled.
	if database != nil {
		userRepo := users.NewRepository(database)

		// Clerk webhook (public route — authenticated by its Svix signature,
		// not the Clerk JWT middleware).
		clerkWebhook := handlers.NewClerkWebhook(userRepo, cfg.ClerkWebhookSigningSecret)
		r.Post("/webhooks/clerk", clerkWebhook.Handle)

		// Authenticated user API.
		usersHandler := handlers.NewUsers(userRepo)
		r.Group(func(pr chi.Router) {
			pr.Use(appmw.RequireAuth(cfg.ClerkSecretKey))
			pr.Get("/api/me", usersHandler.Me)
			pr.Post("/api/team", usersHandler.SetTeam)
		})
	} else {
		log.Printf("database not connected: webhook + user API disabled")
	}

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
