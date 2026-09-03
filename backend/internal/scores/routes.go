package scores

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/ecsegames/backend/internal/audit"
	appmw "github.com/ecsegames/backend/internal/middleware"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Handler serves the score-entry API, nested under an event
// (/api/events/{eventID}/scores).
type Handler struct {
	store *Store
	audit *audit.Store
}

// NewHandler builds the handler backed by the given score and audit stores.
func NewHandler(store *Store, auditStore *audit.Store) *Handler {
	return &Handler{store: store, audit: auditStore}
}

// Mount registers score routes on r in two groups with different gates.
//
// The per-event scoring surface — reads included — stays exec/admin only,
// matching the design: the live scoring panel is exec-only, unlike the
// read-only event history. There is no PATCH route: Create both awards and
// corrects a team's points (see scoreRequest.validate), so a single write
// path covers both.
//
// /api/leaderboard is the deliberate exception: standings are a
// student-facing tab, so it needs only RequireAuth. It is safe to open
// because Leaderboard returns aggregates and bare timestamped awards —
// never event identity, actor, or description (see Leaderboard).
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))
		pr.Get("/api/leaderboard", h.Leaderboard)
	})

	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))
		pr.Use(appmw.RequireRole(userRepo, models.RoleExec))
		pr.Get("/api/events/{eventID}/scores", h.List)
		pr.Post("/api/events/{eventID}/scores", h.Create)
		pr.Delete("/api/events/{eventID}/scores/{id}", h.Delete)
	})
}

// LeaderboardPoint is one team's award at a point in time. The client
// running-sums these in order to draw the score-over-time curve, so they
// are sent oldest-first and carry no event identity.
type LeaderboardPoint struct {
	Team  models.Team `json:"team"`
	Value int         `json:"value"`
	At    time.Time   `json:"at"`
}

// Leaderboard is the standings payload: current total per team, plus the
// awards that produced them. Totals holds only teams with at least one
// active entry — a team that has not been graded yet is absent, and the
// client renders it as zero from its own canonical team list.
//
// This is the one score shape any signed-in user may read, so it carries
// no per-event attribution: no event ID, no awardedBy, no description.
type Leaderboard struct {
	Totals map[models.Team]int `json:"totals"`
	Points []LeaderboardPoint  `json:"points"`
}

// Leaderboard returns standings across every event. Unlike the rest of
// this package it is readable by any authenticated user (see Mount).
func (h *Handler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.ListAllActive(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	board := Leaderboard{
		Totals: map[models.Team]int{},
		Points: make([]LeaderboardPoint, 0, len(list)),
	}
	for _, e := range list {
		board.Totals[e.Team] += e.Value
		board.Points = append(board.Points, LeaderboardPoint{
			Team:  e.Team,
			Value: e.Value,
			At:    e.AwardedAt,
		})
	}
	writeJSON(w, http.StatusOK, board)
}

func eventIDParam(r *http.Request) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(chi.URLParam(r, "eventID"))
}

// List returns every score entry for an event, including cleared ones —
// the scoring panel keeps their history reachable rather than hiding them
// outright.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	eventID, err := eventIDParam(r)
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.ListByEvent(ctx, eventID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type scoreRequest struct {
	Team        models.Team `json:"team"`
	Value       int         `json:"value"`
	Description string      `json:"description"`
}

func (req scoreRequest) validate() string {
	if !models.IsValidTeam(req.Team) {
		return "invalid team"
	}
	return ""
}

// Create awards points to a team on this event, overwriting that team's
// existing entry if one exists (and un-clearing it, if it had been
// cleared) rather than adding a row — a team has at most one entry per
// event. Exec/admin only.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}
	eventID, err := eventIDParam(r)
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req scoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if msg := req.validate(); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	before, err := h.store.GetByTeam(ctx, eventID, req.Team)
	if err != nil && err != mongo.ErrNoDocuments {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	now := time.Now().UTC()
	updated, err := h.store.Upsert(ctx, eventID, req.Team, req.Value, req.Description, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	// A fresh award (no prior entry, or the prior entry was cleared) reads
	// as "awarded"; overwriting a live value reads as "edited" with a diff.
	if before == nil || before.Cleared {
		if err := h.audit.Record(ctx, audit.Entry{
			EventID:    eventID,
			EntityType: audit.EntityScoreEntry,
			EntityID:   updated.ID,
			Verb:       audit.VerbAwarded,
			Actor:      clerkID,
			At:         now,
			Text:       fmt.Sprintf("Awarded %+d points to %s.", updated.Value, updated.Team),
		}); err != nil {
			log.Printf("scores: audit record failed: %v", err)
		}
	} else {
		var diffs []audit.Diff
		if before.Value != updated.Value {
			diffs = append(diffs, audit.Diff{
				Label: "Points",
				From:  strconv.Itoa(before.Value),
				To:    strconv.Itoa(updated.Value),
			})
		}
		if before.Description != updated.Description {
			diffs = append(diffs, audit.Diff{
				Label: "Description",
				From:  before.Description,
				To:    updated.Description,
			})
		}
		if len(diffs) > 0 {
			if err := h.audit.Record(ctx, audit.Entry{
				EventID:    eventID,
				EntityType: audit.EntityScoreEntry,
				EntityID:   updated.ID,
				Verb:       audit.VerbEdited,
				Actor:      clerkID,
				At:         now,
				Text:       fmt.Sprintf("Edited award for %s.", updated.Team),
				Diffs:      diffs,
			}); err != nil {
				log.Printf("scores: audit record failed: %v", err)
			}
		}
	}

	writeJSON(w, http.StatusOK, updated)
}

// Delete clears a score entry — a soft delete that returns the team to
// not-yet-graded. The entry stays in storage (so its history survives)
// rather than disappearing. Exec/admin only.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}
	eventID, err := eventIDParam(r)
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	existing, err := h.store.Get(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if existing.EventID != eventID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	cleared, err := h.store.Clear(ctx, id, clerkID)
	if err == ErrAlreadyCleared {
		http.Error(w, "already cleared", http.StatusConflict)
		return
	}
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	if err := h.audit.Record(ctx, audit.Entry{
		EventID:    eventID,
		EntityType: audit.EntityScoreEntry,
		EntityID:   id,
		Verb:       audit.VerbDeleted,
		Actor:      clerkID,
		At:         time.Now().UTC(),
		Text:       fmt.Sprintf("Cleared %+d points from %s.", cleared.Value, cleared.Team),
	}); err != nil {
		log.Printf("scores: audit record failed: %v", err)
	}

	writeJSON(w, http.StatusOK, cleared)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
