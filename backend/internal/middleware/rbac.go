package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
)

// roleRank orders roles so a higher role satisfies a lower requirement:
// admin > exec > student. Unknown/empty roles rank lowest (always denied).
func roleRank(role models.Role) int {
	switch role {
	case models.RoleAdmin:
		return 3
	case models.RoleExec:
		return 2
	case models.RoleStudent:
		return 1
	default:
		return 0
	}
}

// RequireRole is authorization middleware: it allows the request only if the
// authenticated user's role is at least `minimum`. Admins satisfy an exec
// requirement, execs satisfy a student requirement, and so on.
//
// It must run AFTER RequireAuth, which puts the Clerk user ID in the request
// context. Responds 401 if unauthenticated, 403 if the role is insufficient.
//
// Usage (attach to a route group that already requires auth):
//
//	pr.Use(appmw.RequireAuth(cfg.ClerkSecretKey))
//	pr.Use(appmw.RequireRole(userRepo, models.RoleExec))
func RequireRole(repo *users.Repository, minimum models.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clerkID, ok := UserIDFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthenticated", http.StatusUnauthorized)
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			user, err := repo.GetOrCreate(ctx, clerkID)
			cancel()
			if err != nil {
				http.Error(w, "storage error", http.StatusInternalServerError)
				return
			}

			if roleRank(user.Role) < roleRank(minimum) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
