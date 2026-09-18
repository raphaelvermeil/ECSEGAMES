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
	// caps how many submissions may be rasterized at once. ChromeNoSandbox
	// is for containers (see the Dockerfile): Chrome's sandbox needs
	// privileges a hosted container doesn't have, and the rendered pages
	// already run with no scripting and no network.
	CSCompSolutionsDir      string
	ChromePath              string
	ChromeNoSandbox         bool
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
		ChromeNoSandbox:         os.Getenv("CHROME_NO_SANDBOX") == "1",
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

// getenvInt reads a positive integer setting, falling back if it is unset,
// not a number, or not positive — a zero render concurrency would block
// every submission forever, and a non-positive round length is meaningless.
func getenvInt(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil && v > 0 {
		return v
	}
	return fallback
}
