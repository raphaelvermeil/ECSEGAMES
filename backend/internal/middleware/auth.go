package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

type ctxKey string

const userIDKey ctxKey = "clerkUserID"

// RequireAuth verifies a Clerk session token from the Authorization header.
// On success it stores the Clerk user ID (the token subject) in the request
// context. On failure it responds 401. secretKey configures the Clerk client;
// when empty the middleware rejects every request so misconfiguration is loud.
func RequireAuth(secretKey string) func(http.Handler) http.Handler {
	if secretKey != "" {
		clerk.SetKey(secretKey)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secretKey == "" {
				http.Error(w, "auth not configured", http.StatusUnauthorized)
				return
			}
			token := bearerToken(r)
			if token == "" {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{Token: token})
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth verifies a Clerk session token when one is supplied, but lets
// the request through either way. It is the gate for endpoints that serve
// both audiences from one route: signed-out visitors get the public view,
// while a signed-in caller is identified so the handler can return more.
//
// Contrast with RequireAuth, which rejects anonymous requests. A token that
// is present but invalid is treated as no token rather than a 401 — the
// endpoint is public, so a stale session should degrade to the public view
// instead of erroring.
func OptionalAuth(secretKey string) func(http.Handler) http.Handler {
	if secretKey != "" {
		clerk.SetKey(secretKey)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secretKey == "" {
				next.ServeHTTP(w, r)
				return
			}
			token := bearerToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{Token: token})
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext returns the Clerk user ID stored by RequireAuth or
// OptionalAuth. When it reports false the caller is anonymous.
func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
