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
	"go.mongodb.org/mongo-driver/bson"
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

// Mount registers score routes on r. The whole scoring surface — reads
// included — is exec/admin only, matching the design: the live scoring
// panel is exec-only, unlike the read-only event history.
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))
		pr.Use(appmw.RequireRole(userRepo, models.RoleExec))
		pr.Get("/api/events/{eventID}/scores", h.List)
		pr.Post("/api/events/{eventID}/scores", h.Create)
		pr.Patch("/api/events/{eventID}/scores/{id}", h.Update)
		pr.Delete("/api/events/{eventID}/scores/{id}", h.Delete)
	})
}

func eventIDParam(r *http.Request) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(chi.URLParam(r, "eventID"))
}

// List returns every score entry for an event, including revoked ones —
// the scoring table keeps a full history rather than hiding removals.
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
	Segment     string      `json:"segment"`
	Value       int         `json:"value"`
	Description string      `json:"description"`
}

func (req scoreRequest) validate() string {
	if !models.IsValidTeam(req.Team) {
		return "invalid team"
	}
	if req.Segment == "" {
		return "segment is required"
	}
	if req.Value == 0 {
		return "value must not be zero"
	}
	return ""
}

// Create awards points to a team. Exec/admin only.
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

	now := time.Now().UTC()
	e := ScoreEntry{
		EventID:      eventID,
		Team:         req.Team,
		Segment:      req.Segment,
		Value:        req.Value,
		Description:  req.Description,
		AwardedBy:    clerkID,
		AwardedAt:    now,
		LastEditedBy: clerkID,
		LastEditedAt: now,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	created, err := h.store.Create(ctx, e)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	if err := h.audit.Record(ctx, audit.Entry{
		EventID:    eventID,
		EntityType: audit.EntityScoreEntry,
		EntityID:   created.ID,
		Verb:       audit.VerbAwarded,
		Actor:      clerkID,
		At:         now,
		Text:       fmt.Sprintf("Awarded %+d points to %s for %q.", created.Value, created.Team, created.Segment),
	}); err != nil {
		log.Printf("scores: audit record failed: %v", err)
	}

	writeJSON(w, http.StatusCreated, created)
}

type scoreUpdateRequest struct {
	Value       int    `json:"value"`
	Description string `json:"description"`
}

func (req scoreUpdateRequest) validate() string {
	if req.Value == 0 {
		return "value must not be zero"
	}
	return ""
}

// Update corrects the value/description of an existing award. Exec/admin
// only. Team and segment aren't editable — award a new correcting entry
// instead if the recipient or segment was wrong.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	var req scoreUpdateRequest
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

	before, err := h.store.Get(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if before.EventID != eventID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	now := time.Now().UTC()
	updated, err := h.store.Update(ctx, id, bson.M{
		"value":        req.Value,
		"description":  req.Description,
		"lastEditedBy": clerkID,
		"lastEditedAt": now,
	})
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

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
			EntityID:   id,
			Verb:       audit.VerbEdited,
			Actor:      clerkID,
			At:         now,
			Text:       fmt.Sprintf("Edited award for %s.", updated.Team),
			Diffs:      diffs,
		}); err != nil {
			log.Printf("scores: audit record failed: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, updated)
}

// Delete revokes a score entry — a soft delete. The entry stays in the
// table (the caller renders it struck through) rather than disappearing.
// Exec/admin only.
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

	revoked, err := h.store.Revoke(ctx, id, clerkID)
	if err == ErrAlreadyRevoked {
		http.Error(w, "already revoked", http.StatusConflict)
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
		Text:       fmt.Sprintf("Revoked %+d points from %s.", revoked.Value, revoked.Team),
	}); err != nil {
		log.Printf("scores: audit record failed: %v", err)
	}

	writeJSON(w, http.StatusOK, revoked)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
