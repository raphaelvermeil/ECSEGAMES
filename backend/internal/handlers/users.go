package handlers

import (
	"context"
	"encoding/json"
	"net/http"
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
	Team models.Team `json:"team"`
}

// SetTeam joins the current user to a program team. The choice is set-once:
// a user who already has a team gets 409 (changing teams needs exec approval,
// which is out of scope for now).
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
	if !models.IsValidTeam(req.Team) {
		http.Error(w, "invalid team", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.repo.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if u.Team != "" {
		http.Error(w, "team already set", http.StatusConflict)
		return
	}

	updated, err := h.repo.SetTeam(ctx, clerkID, req.Team)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !updated {
		// Lost a race: the team was set between our read and write.
		http.Error(w, "team already set", http.StatusConflict)
		return
	}

	u.Team = req.Team
	writeJSON(w, http.StatusOK, u)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
