package events

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
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

// Handler serves the event CRUD API (/api/events).
type Handler struct {
	store *Store
	audit *audit.Store
}

// NewHandler builds the handler backed by the given event and audit stores.
func NewHandler(store *Store, auditStore *audit.Store) *Handler {
	return &Handler{store: store, audit: auditStore}
}

// Mount registers event routes on r. Reads (including history) require a
// valid Clerk JWT; writes require exec or admin. History is readable by
// anyone who can read the event — it's the scoring *panel* that's
// exec-only, not the historical record.
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))
		pr.Get("/api/events", h.List)
		pr.Get("/api/events/{id}", h.Get)
		pr.Get("/api/events/{id}/history", h.History)

		pr.Group(func(wr chi.Router) {
			wr.Use(appmw.RequireRole(userRepo, models.RoleExec))
			wr.Post("/api/events", h.Create)
			wr.Patch("/api/events/{id}", h.Update)
			wr.Delete("/api/events/{id}", h.Delete)
		})
	})
}

// List returns events, optionally narrowed by ?from=&to= (RFC3339 timestamps)
// and ?category=.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ListFilter{Category: Category(q.Get("category"))}
	if filter.Category != "" && !IsValidCategory(filter.Category) {
		http.Error(w, "invalid category", http.StatusBadRequest)
		return
	}

	if v := q.Get("from"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			http.Error(w, "invalid from", http.StatusBadRequest)
			return
		}
		filter.From = t
	}
	if v := q.Get("to"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			http.Error(w, "invalid to", http.StatusBadRequest)
			return
		}
		filter.To = t
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.List(ctx, filter)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// Get returns a single event by ID.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	e, err := h.store.Get(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// History returns the audit trail for an event — its own create/edit
// entries plus every award/edit/revoke against its score entries — newest
// first.
func (h *Handler) History(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	entries, err := h.audit.ListByEvent(ctx, id)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

// eventRequest is the create/update payload. Update currently expects the
// full editable event body (not a sparse patch) — simplest thing that works
// for the skeleton.
type eventRequest struct {
	Title            string    `json:"title"`
	ShortDescription string    `json:"shortDescription"`
	LongDescription  string    `json:"longDescription"`
	Access           string    `json:"access"`
	Captain          string    `json:"captain"`
	StartsAt         time.Time `json:"startsAt"`
	EndsAt           time.Time `json:"endsAt"`
	Location         string    `json:"location"`
	Category         Category  `json:"category"`
}

// validate checks the fields required by the event CRUD spec: non-empty
// title, a real category, and endsAt strictly after startsAt.
func (req eventRequest) validate() string {
	if req.Title == "" {
		return "title is required"
	}
	if !IsValidCategory(req.Category) {
		return "invalid category"
	}
	if !req.EndsAt.After(req.StartsAt) {
		return "endsAt must be after startsAt"
	}
	return ""
}

// Create adds a new event. Exec/admin only (enforced by route middleware).
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req eventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if msg := req.validate(); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	e := Event{
		Title:            req.Title,
		ShortDescription: req.ShortDescription,
		LongDescription:  req.LongDescription,
		Access:           req.Access,
		Captain:          req.Captain,
		StartsAt:         req.StartsAt.UTC(),
		EndsAt:           req.EndsAt.UTC(),
		Location:         req.Location,
		Category:         req.Category,
		CreatedAt:        now,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	created, err := h.store.Create(ctx, e)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	if err := h.audit.Record(ctx, audit.Entry{
		EventID:    created.ID,
		EntityType: audit.EntityEvent,
		EntityID:   created.ID,
		Verb:       audit.VerbCreated,
		Actor:      clerkID,
		At:         now,
		Text:       "Event created.",
	}); err != nil {
		log.Printf("events: audit record failed: %v", err)
	}

	writeJSON(w, http.StatusCreated, created)
}

// Update replaces an event's editable fields. Exec/admin only (enforced by
// route middleware).
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req eventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if msg := req.validate(); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	set := bson.M{
		"title":            req.Title,
		"shortDescription": req.ShortDescription,
		"longDescription":  req.LongDescription,
		"access":           req.Access,
		"captain":          req.Captain,
		"startsAt":         req.StartsAt.UTC(),
		"endsAt":           req.EndsAt.UTC(),
		"location":         req.Location,
		"category":         req.Category,
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

	updated, err := h.store.Update(ctx, id, set)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	if diffs := diffEvent(before, updated); len(diffs) > 0 {
		if err := h.audit.Record(ctx, audit.Entry{
			EventID:    id,
			EntityType: audit.EntityEvent,
			EntityID:   id,
			Verb:       audit.VerbEdited,
			Actor:      clerkID,
			Text:       "Event updated.",
			Diffs:      diffs,
		}); err != nil {
			log.Printf("events: audit record failed: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, updated)
}

// diffEvent reports which editable fields changed between before and after,
// for the audit trail.
func diffEvent(before, after *Event) []audit.Diff {
	var diffs []audit.Diff
	add := func(label, from, to string) {
		if from != to {
			diffs = append(diffs, audit.Diff{Label: label, From: from, To: to})
		}
	}
	add("Title", before.Title, after.Title)
	add("Short description", before.ShortDescription, after.ShortDescription)
	add("Description", before.LongDescription, after.LongDescription)
	add("Access & sustainability", before.Access, after.Access)
	add("Captain's role", before.Captain, after.Captain)
	add("Starts", before.StartsAt.Format(time.RFC3339), after.StartsAt.Format(time.RFC3339))
	add("Ends", before.EndsAt.Format(time.RFC3339), after.EndsAt.Format(time.RFC3339))
	add("Location", before.Location, after.Location)
	add("Category", string(before.Category), string(after.Category))
	return diffs
}

// Delete removes an event. Exec/admin only (enforced by route middleware).
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	deleted, err := h.store.Delete(ctx, id)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !deleted {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if err := h.audit.Record(ctx, audit.Entry{
		EventID:    id,
		EntityType: audit.EntityEvent,
		EntityID:   id,
		Verb:       audit.VerbDeleted,
		Actor:      clerkID,
		At:         time.Now().UTC(),
		Text:       "Event deleted.",
	}); err != nil {
		log.Printf("events: audit record failed: %v", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
