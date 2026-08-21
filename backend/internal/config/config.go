package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	ClerkSecretKey string
	FrontendOrigin string
}

// Load reads config from a .env file if present, then environment variables,
// falling back to sensible development defaults.
func Load() Config {
	_ = godotenv.Load() // .env is optional; ignore if missing

	return Config{
		Port:           getenv("PORT", "8082"),
		MongoURI:       os.Getenv("MONGO_URI"),
		MongoDB:        getenv("MONGO_DB", "ecsegames"),
		ClerkSecretKey: os.Getenv("CLERK_SECRET_KEY"),
		FrontendOrigin: getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
