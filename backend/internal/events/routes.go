package events

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

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
	users *users.Repository
	// clearScores retires an event's score entries when the event is
	// deleted, so they stop counting toward the leaderboard.
	clearScores func(context.Context, primitive.ObjectID) error
}

// NewHandler builds the handler backed by the given event and audit stores.
// userRepo resolves an actor's display name for the audit trail; clearScores
// is the scores store's per-event clear.
func NewHandler(store *Store, auditStore *audit.Store, userRepo *users.Repository, clearScores func(context.Context, primitive.ObjectID) error) *Handler {
	return &Handler{store: store, audit: auditStore, users: userRepo, clearScores: clearScores}
}

// actorName resolves clerkID to the name on their profile, for the audit
// trail to show a person instead of a raw Clerk ID. It's snapshotted at
// write time — like a diff's author, an entry keeps the name as it was
// when the action happened, even if the person's profile changes later.
// Falls back to the Clerk ID itself if no name is on file yet.
func (h *Handler) actorName(ctx context.Context, clerkID string) string {
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil || u.Name == "" {
		return clerkID
	}
	return u.Name
}

// Mount registers event routes on r in two tiers.
//
// The schedule itself is public: anyone can see what's on and when, signed
// in or not. It's the Games' front window as much as an app screen, and a
// student shouldn't need an account to find out where Scunts starts.
//
// Everything else is exec/admin. That now includes /history, which used to
// be readable by any signed-in user on the reasoning that it's a historical
// record rather than the live scoring panel. It carries the scoring paper
// trail — which exec awarded what to whom, by name — and once the event
// itself is world-readable that trail would be world-readable too, so it
// moves behind the same gate as the scores it describes.
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Get("/api/events", h.List)
	r.Get("/api/events/{id}", h.Get)
	r.Get("/api/categories", h.ListCategories)

	r.Group(func(wr chi.Router) {
		wr.Use(appmw.RequireAuth(clerkSecretKey))
		wr.Use(appmw.RequireRole(userRepo, models.RoleExec))
		wr.Get("/api/events/{id}/history", h.History)
		wr.Post("/api/events", h.Create)
		wr.Put("/api/events/{id}", h.Update)
		wr.Delete("/api/events/{id}", h.Delete)
		wr.Post("/api/categories", h.CreateCategory)
		wr.Delete("/api/categories/{id}", h.DeleteCategory)
	})
}

// List returns events, optionally narrowed by ?from=&to= (RFC3339 timestamps)
// and ?category=.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ListFilter{Category: q.Get("category")}

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
	if errors.Is(err, mongo.ErrNoDocuments) {
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
	Categories       []string  `json:"categories"`
}

// validate checks the fields required by the event CRUD spec: non-empty
// title, only existing categories (none repeated), and endsAt strictly
// after startsAt.
func (req eventRequest) validate(known []Category) string {
	if req.Title == "" {
		return "title is required"
	}
	for i, name := range req.Categories {
		exists := slices.ContainsFunc(known, func(c Category) bool { return c.Name == name })
		if !exists || slices.Contains(req.Categories[:i], name) {
			return "invalid category"
		}
	}
	if !req.EndsAt.After(req.StartsAt) {
		return "endsAt must be after startsAt"
	}
	return ""
}

// decodeEvent reads and validates an event create/update body, writing the
// error response itself when it returns false.
func (h *Handler) decodeEvent(w http.ResponseWriter, r *http.Request) (eventRequest, bool) {
	var req eventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return req, false
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	known, err := h.store.ListCategories(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return req, false
	}
	if msg := req.validate(known); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return req, false
	}
	if req.Categories == nil {
		req.Categories = []string{}
	}
	return req, true
}

// Create adds a new event. Exec/admin only (enforced by route middleware).
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	req, ok := h.decodeEvent(w, r)
	if !ok {
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
		Categories:       req.Categories,
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
		Actor:      h.actorName(ctx, clerkID),
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

	req, ok := h.decodeEvent(w, r)
	if !ok {
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
		"categories":       req.Categories,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	before, err := h.store.Get(ctx, id)
	if errors.Is(err, mongo.ErrNoDocuments) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	updated, err := h.store.Update(ctx, id, set)
	if errors.Is(err, mongo.ErrNoDocuments) {
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
			Actor:      h.actorName(ctx, clerkID),
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
	add("Categories", strings.Join(before.Categories, ", "), strings.Join(after.Categories, ", "))
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

	if err := h.clearScores(ctx, id); err != nil {
		log.Printf("events: clear scores for deleted event failed: %v", err)
	}

	if err := h.audit.Record(ctx, audit.Entry{
		EventID:    id,
		EntityType: audit.EntityEvent,
		EntityID:   id,
		Verb:       audit.VerbDeleted,
		Actor:      h.actorName(ctx, clerkID),
		At:         time.Now().UTC(),
		Text:       "Event deleted.",
	}); err != nil {
		log.Printf("events: audit record failed: %v", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListCategories returns every category. Public, like the schedule it
// colours.
func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.ListCategories(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// maxCategoryName keeps a name short enough to fit on a filter chip.
const maxCategoryName = 24

// CreateCategory adds a category. Exec/admin only (enforced by route
// middleware).
func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || utf8.RuneCountInString(name) > maxCategoryName {
		http.Error(w, "name must be 1 to 24 characters", http.StatusBadRequest)
		return
	}
	if !hexColor.MatchString(req.Color) {
		http.Error(w, "invalid color", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	created, err := h.store.CreateCategory(ctx, Category{
		Name:      name,
		Color:     req.Color,
		CreatedAt: time.Now().UTC(),
	})
	if mongo.IsDuplicateKeyError(err) {
		http.Error(w, "a category with that name already exists", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

// DeleteCategory removes a category and takes it off every event that had
// it. Competition can't be deleted: the scoring panel depends on it. Exec/
// admin only (enforced by route middleware).
func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	c, err := h.store.GetCategory(ctx, id)
	if errors.Is(err, mongo.ErrNoDocuments) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if c.Name == CategoryCompetition {
		http.Error(w, "the Competition category can't be deleted", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteCategory(ctx, *c); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
