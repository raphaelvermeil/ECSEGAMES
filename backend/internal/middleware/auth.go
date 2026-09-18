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

// authorizedParties is the set of origins a session token may have been
// issued to (the JWT's azp claim). Empty means no check.
var authorizedParties []string

// SetAuthorizedParties restricts accepted tokens to ones minted for these
// origins, so a token issued to another app on the same Clerk instance
// can't be replayed against this API. Call once at startup.
func SetAuthorizedParties(origins ...string) { authorizedParties = origins }

func authorizedParty(azp string) bool {
	// Clerk only sets azp on tokens from a browser session; leave the rest
	// (and an unconfigured check) alone.
	if azp == "" || len(authorizedParties) == 0 {
		return true
	}
	for _, o := range authorizedParties {
		if o == azp {
			return true
		}
	}
	return false
}

// RequireAuth verifies a Clerk session token from the Authorization header.
// On success it stores the Clerk user ID (the token subject) in the request
// context. On failure it responds 401. secretKey configures the Clerk client;
// when empty the middleware rejects every request with 503 — a server
// misconfiguration, not a client that should be told to sign in again.
func RequireAuth(secretKey string) func(http.Handler) http.Handler {
	if secretKey != "" {
		clerk.SetKey(secretKey)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secretKey == "" {
				http.Error(w, "auth not configured", http.StatusServiceUnavailable)
				return
			}
			token := bearerToken(r)
			if token == "" {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token:                  token,
				AuthorizedPartyHandler: authorizedParty,
			})
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			// A token with no subject would resolve every caller to one
			// shared user record keyed on "", so treat it as invalid.
			if claims.Subject == "" {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext returns the Clerk user ID stored by RequireAuth.
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
