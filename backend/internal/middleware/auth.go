package middleware

import (
	"context"
	"net/http"
	"strings"
	"sync"

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

// jwkCache holds Clerk's signing keys by key ID. Without it jwt.Verify
// fetches the whole key set from Clerk's API on every request, so each
// authenticated call paid a Clerk round trip before it touched Mongo —
// measured at 100–400 ms, on top of every /api/me, scores and CS comp
// poll. Keys rotate rarely, and a token signed by an unknown key simply
// misses the cache and fetches, so nothing here needs to expire.
var jwkCache = struct {
	sync.Mutex
	keys map[string]*clerk.JSONWebKey
}{keys: map[string]*clerk.JSONWebKey{}}

// signingKey returns the key that signed token, fetching it from Clerk
// only the first time a key ID is seen.
func signingKey(ctx context.Context, token string) (*clerk.JSONWebKey, error) {
	unverified, err := jwt.Decode(ctx, &jwt.DecodeParams{Token: token})
	if err != nil {
		return nil, err
	}
	jwkCache.Lock()
	key, ok := jwkCache.keys[unverified.KeyID]
	jwkCache.Unlock()
	if ok {
		return key, nil
	}
	key, err = jwt.GetJSONWebKey(ctx, &jwt.GetJSONWebKeyParams{KeyID: unverified.KeyID})
	if err != nil {
		return nil, err
	}
	jwkCache.Lock()
	jwkCache.keys[unverified.KeyID] = key
	jwkCache.Unlock()
	return key, nil
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
			key, err := signingKey(r.Context(), token)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token:                  token,
				JWK:                    key,
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
