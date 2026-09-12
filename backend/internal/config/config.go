package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	ClerkSecretKey string
	FrontendOrigin string

	// CS comp rendering. CSCompSolutionsDir holds the target PNGs the
	// seeder writes and scoring diffs against; ChromePath is empty by
	// default, letting chromedp find Chrome itself; the concurrency limit
	// caps how many submissions may be rasterized at once.
	CSCompSolutionsDir      string
	ChromePath              string
	CSCompRenderConcurrency int

	// CSCompMinutes is how long a fresh comp round runs. It is the length
	// the clock resets to, not a deadline the server enforces — an exec
	// starts, pauses and adjusts it (see cscomp.Clock).
	CSCompMinutes int
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

		CSCompSolutionsDir:      getenv("CSCOMP_SOLUTIONS_DIR", "./images/cs-comp/solutions"),
		ChromePath:              os.Getenv("CHROME_PATH"),
		CSCompRenderConcurrency: getenvInt("CSCOMP_RENDER_CONCURRENCY", 4),
		CSCompMinutes:           getenvInt("CSCOMP_MINUTES", 45),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getenvInt reads an integer setting, falling back if it is unset or not a
// number.
func getenvInt(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return fallback
}
