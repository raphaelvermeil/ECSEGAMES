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
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()

	// Mongo is optional at boot so the scaffold runs without a cluster.
	// When MONGO_URI is set we connect and ping; otherwise we log and continue.
	if cfg.MongoURI != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if _, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB); err != nil {
			log.Printf("warning: mongo not connected: %v", err)
		} else {
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

	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(cfg.ClerkSecretKey))
		pr.Get("/api/me", func(w http.ResponseWriter, r *http.Request) {
			id, _ := appmw.UserIDFromContext(r.Context())
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"userId":"` + id + `"}`))
		})
	})

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
