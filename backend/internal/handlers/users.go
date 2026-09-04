package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	appmw "github.com/ecsegames/backend/internal/middleware"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
)

// Users serves the authenticated user endpoints (/api/me, /api/team).
type Users struct {
	repo *users.Repository
}

// NewUsers builds the handler backed by the given user repository.
func NewUsers(repo *users.Repository) *Users {
	return &Users{repo: repo}
}

// Me returns the current user, creating a minimal record on first call. This is
// the only path that puts a user into Mongo: the Clerk ID comes from the
// verified session token, never from the request body.
func (h *Users) Me(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.repo.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type setTeamRequest struct {
	Team  models.Team `json:"team"`
	Name  string      `json:"name"`
	Major string      `json:"major"`
	Email string      `json:"email"`
}

func (req setTeamRequest) validate() string {
	if !models.IsValidTeam(req.Team) {
		return "invalid team"
	}
	if strings.TrimSpace(req.Name) == "" {
		return "name is required"
	}
	if strings.TrimSpace(req.Major) == "" {
		return "major is required"
	}
	if strings.TrimSpace(req.Email) == "" {
		return "email is required"
	}
	return ""
}

// SetTeam completes onboarding: joins the current user to a program team and
// records the name/major/email collected on the same screen. The team is
// set-once — a request for a *different* team than the one already on file
// gets 409 (changing teams needs exec approval, which is out of scope for
// now) — but resubmitting the same team is not a conflict, so a profile
// that failed to save the first time can always be backfilled; see
// Repository.SetTeam.
func (h *Users) SetTeam(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req setTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if msg := req.validate(); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	major := strings.TrimSpace(req.Major)
	email := strings.TrimSpace(req.Email)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.repo.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	updated, err := h.repo.SetTeam(ctx, clerkID, req.Team, name, major, email)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !updated {
		// The user already has a different team on file.
		http.Error(w, "team already set", http.StatusConflict)
		return
	}

	u.Team = req.Team
	u.Name = name
	u.Major = major
	u.Email = email
	writeJSON(w, http.StatusOK, u)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
