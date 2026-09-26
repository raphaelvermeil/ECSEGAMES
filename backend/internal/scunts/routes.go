package scunts

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/ecsegames/backend/internal/audit"
	appmw "github.com/ecsegames/backend/internal/middleware"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Handler serves the Scunts media endpoints. storage may be nil when R2 is
// unconfigured, in which case every route reports 503 — unlike the CS comp,
// where reads survive a missing renderer, listing here needs storage too
// because each item carries a presigned URL.
type Handler struct {
	store   *Store
	storage *Storage
	users   *users.Repository
	audit   *audit.Store
}

// NewHandler builds the handler. storage is allowed to be nil.
func NewHandler(store *Store, storage *Storage, userRepo *users.Repository, auditStore *audit.Store) *Handler {
	return &Handler{store: store, storage: storage, users: userRepo, audit: auditStore}
}

// Mount registers the Scunts routes. Everything is behind a session: the
// gallery shows student faces and is readable by any signed-in user, but
// never publicly, in contrast to the schedule.
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))

		pr.Post("/api/scunts/upload-url", h.UploadURL)
		pr.Post("/api/scunts/submissions", h.Create)
		pr.Get("/api/scunts/submissions", h.List)

		// The mission checklist is readable by any signed-in student. There
		// is no student write: a mission only becomes done when an exec
		// accepts proof for it.
		pr.Get("/api/scunts/sections", h.ListSections)
		pr.Get("/api/scunts/tasks", h.ListTasks)

		// Reviewing proof is exec-only: accepting pays out points, and
		// takedown removes an upload for everyone.
		pr.Group(func(er chi.Router) {
			er.Use(appmw.RequireRole(userRepo, models.RoleExec))
			er.Post("/api/scunts/submissions/{id}/accept", h.Accept)
			er.Delete("/api/scunts/submissions/{id}", h.Delete)

			// Only execs shape the list itself.
			er.Post("/api/scunts/tasks", h.CreateTask)
			er.Patch("/api/scunts/tasks/{id}", h.UpdateTask)
			er.Delete("/api/scunts/tasks/{id}", h.DeleteTask)
			er.Post("/api/scunts/sections", h.CreateSection)
		})
	})
}

// caller resolves the requesting user, rejecting anyone who hasn't finished
// onboarding: a submission is attributed to a Games team, so there has to
// be one. The page gates this too; this is the backstop.
func (h *Handler) caller(w http.ResponseWriter, r *http.Request) (*models.User, bool) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return nil, false
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return nil, false
	}
	if u.Team == "" {
		http.Error(w, "join a team first", http.StatusConflict)
		return nil, false
	}
	return u, true
}

// ready reports whether R2 is configured, answering 503 when it isn't.
func (h *Handler) ready(w http.ResponseWriter) bool {
	if h.storage == nil {
		http.Error(w, "media storage not configured", http.StatusServiceUnavailable)
		return false
	}
	return true
}

type uploadURLRequest struct {
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

type uploadURLResponse struct {
	UploadURL string `json:"uploadUrl"`
	Key       string `json:"key"`
}

// UploadURL hands back a short-lived URL the browser PUTs the file to
// directly. Checking the type and size here is a courtesy that fails a bad
// upload before it is transferred; Create checks the stored object again,
// which is the check that actually counts.
func (h *Handler) UploadURL(w http.ResponseWriter, r *http.Request) {
	if !h.ready(w) {
		return
	}
	u, ok := h.caller(w, r)
	if !ok {
		return
	}

	var req uploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	kind, allowed := KindFor(req.ContentType)
	if !allowed {
		http.Error(w, "unsupported file type", http.StatusBadRequest)
		return
	}
	if req.Size <= 0 || req.Size > MaxBytesFor(kind) {
		http.Error(w, "file is too large", http.StatusBadRequest)
		return
	}

	key := NewKey(u.Team, req.ContentType)
	url, err := h.storage.PresignPut(r.Context(), key, req.ContentType)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, uploadURLResponse{UploadURL: url, Key: key})
}

type createRequest struct {
	Keys    []string `json:"keys"`
	TaskID  string   `json:"taskId"`
	Caption string   `json:"caption"`
}

// Create records a submission for the objects the client says it uploaded.
//
// Everything the client claims is re-derived from the object itself: the
// content type and size come from a HEAD against R2, not from the request.
// That is the same stance cscomp takes by rendering submitted code itself
// rather than believing a reported score.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.ready(w) {
		return
	}
	u, ok := h.caller(w, r)
	if !ok {
		return
	}

	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// The caption is optional extra detail; the mission says what it's for.
	caption := strings.TrimSpace(req.Caption)
	if len(caption) > MaxCaptionLen {
		http.Error(w, "caption is too long", http.StatusBadRequest)
		return
	}
	if len(req.Keys) == 0 || len(req.Keys) > MaxFiles {
		http.Error(w, "attach between 1 and 10 files", http.StatusBadRequest)
		return
	}
	// Each key was minted for this caller's team, so anything else is either
	// a bug or someone claiming another team's object.
	for _, key := range req.Keys {
		if !strings.HasPrefix(key, "scunts/"+string(u.Team)+"/") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}

	taskID, err := primitive.ObjectIDFromHex(req.TaskID)
	if err != nil {
		http.Error(w, "pick a mission", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	if _, err := h.store.GetTask(ctx, taskID); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "that mission no longer exists", http.StatusBadRequest)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	done, err := h.store.IsDone(ctx, taskID, u.Team)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if done {
		http.Error(w, "your team already completed that mission", http.StatusConflict)
		return
	}
	// One proof per mission at a time: a second upload while the first is
	// still in review would just be a duplicate for execs to wade through.
	pending, err := h.store.HasPending(ctx, taskID, u.Team)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if pending {
		http.Error(w, "your team's proof for that mission is pending approval", http.StatusConflict)
		return
	}

	media := make([]Media, 0, len(req.Keys))
	for _, key := range req.Keys {
		contentType, size, err := h.storage.Head(ctx, key)
		if err != nil {
			http.Error(w, "upload not found", http.StatusBadRequest)
			return
		}
		kind, allowed := KindFor(contentType)
		if !allowed {
			// Stored but unusable, so don't leave it sitting in the bucket.
			_ = h.storage.Delete(ctx, key)
			http.Error(w, "unsupported file type", http.StatusBadRequest)
			return
		}
		if size <= 0 || size > MaxBytesFor(kind) {
			_ = h.storage.Delete(ctx, key)
			http.Error(w, "file is too large", http.StatusBadRequest)
			return
		}
		media = append(media, Media{Key: key, Kind: kind, ContentType: contentType, Size: size})
	}

	first := media[0]
	sub := Submission{
		Team:            u.Team,
		Key:             first.Key,
		Kind:            first.Kind,
		ContentType:     first.ContentType,
		Size:            first.Size,
		Extra:           media[1:],
		Caption:         caption,
		SubmittedBy:     u.ClerkID,
		SubmittedByName: displayName(u),
		SubmittedAt:     time.Now().UTC(),
		TaskID:          taskID,
		Status:          StatusPending,
	}
	if len(sub.Extra) == 0 {
		sub.Extra = nil
	}
	saved, err := h.store.Insert(ctx, sub)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	h.presign(ctx, saved)
	writeJSON(w, http.StatusCreated, saved)
}

// List returns the gallery, newest first, each item carrying a presigned
// URL the browser loads the media from. Pending proof is only included for
// execs and the person who submitted it.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	if !h.ready(w) {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Not h.caller: an exec without a team may still review.
	clerkID, _ := appmw.UserIDFromContext(r.Context())
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	isExec := u.Role == models.RoleExec || u.Role == models.RoleAdmin

	list, err := h.store.List(ctx, clerkID, isExec)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	for i := range list {
		h.presign(ctx, &list[i])
	}
	writeJSON(w, http.StatusOK, list)
}

// presign fills in the read URL for every file on a submission. Presigning
// is local signing, not a network call, so doing it per file costs nothing.
// A file whose URL can't be signed is still returned; the client renders a
// broken tile rather than the whole gallery failing.
func (h *Handler) presign(ctx context.Context, sub *Submission) {
	if url, err := h.storage.PresignGet(ctx, sub.Key); err == nil {
		sub.PhotoURL = url
	}
	for i := range sub.Extra {
		if url, err := h.storage.PresignGet(ctx, sub.Extra[i].Key); err == nil {
			sub.Extra[i].PhotoURL = url
		}
	}
}

// Delete takes a submission down: the object first, then the record, then
// an audit entry naming the exec who did it.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if !h.ready(w) {
		return
	}
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	sub, err := h.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	// Object before record: an orphaned object costs storage, whereas a
	// record pointing at a deleted object renders as a broken tile.
	if err := h.storage.Delete(ctx, sub.Key); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	for _, m := range sub.Extra {
		if err := h.storage.Delete(ctx, m.Key); err != nil {
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
	}
	if err := h.store.Delete(ctx, sub); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	clerkID, _ := appmw.UserIDFromContext(r.Context())
	_ = h.audit.Record(ctx, audit.Entry{
		EntityType: audit.EntityScuntsSubmission,
		EntityID:   id,
		Verb:       audit.VerbDeleted,
		Actor:      h.actorName(ctx, clerkID),
		At:         time.Now().UTC(),
		Text:       "removed a Scunts submission by " + sub.SubmittedByName,
	})

	w.WriteHeader(http.StatusNoContent)
}

// actorName resolves a Clerk ID to the name on the profile, matching how
// events and scores attribute their audit entries. Falls back to the raw ID.
func (h *Handler) actorName(ctx context.Context, clerkID string) string {
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil || u.Name == "" {
		return clerkID
	}
	return u.Name
}

// displayName is the name shown on a submission tile, falling back to the
// Clerk ID so a tile is never anonymous.
func displayName(u *models.User) string {
	if u.Name == "" {
		return u.ClerkID
	}
	return u.Name
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// ---------------------------------------------------------------------------
// Mission checklist
//
// Unlike submissions, none of this touches R2 — so these routes work even
// when media storage is unconfigured, and deliberately skip h.ready.
// ---------------------------------------------------------------------------

// ListTasks returns every mission with the caller's team's tick state, so
// the same list reads differently for Software than for Electrical.
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	u, ok := h.caller(w, r)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	tasks, err := h.store.ListTasks(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	done, err := h.store.CompletionsFor(ctx, u.Team)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	pending, err := h.store.PendingTaskIDs(ctx, u.Team)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	views := make([]TaskView, 0, len(tasks))
	for _, t := range tasks {
		v := TaskView{Task: t, Pending: pending[t.ID]}
		if c, ok := done[t.ID]; ok {
			at := c.DoneAt
			v.Done, v.DoneByName, v.DoneAt = true, c.DoneByName, &at
		}
		views = append(views, v)
	}
	writeJSON(w, http.StatusOK, views)
}

// Accept approves a pending proof: the mission becomes done for that team
// and the mission's points go to the team on the leaderboard. Exec-only.
func (h *Handler) Accept(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sub, err := h.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if sub.Status != StatusPending {
		http.Error(w, "already reviewed", http.StatusConflict)
		return
	}
	task, err := h.store.GetTask(ctx, sub.TaskID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "that mission no longer exists", http.StatusConflict)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	// Completion first: its unique index is the guard against paying out
	// the same mission to the same team twice.
	err = h.store.InsertCompletion(ctx, Completion{
		TaskID:     task.ID,
		Team:       sub.Team,
		DoneBy:     sub.SubmittedBy,
		DoneByName: sub.SubmittedByName,
		DoneAt:     time.Now().UTC(),
	})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			http.Error(w, "that team already completed this mission", http.StatusConflict)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	ok, err := h.store.Accept(ctx, id, task.Points)
	if err != nil || !ok {
		// Lost a race with a takedown; don't leave the mission claimed.
		_ = h.store.ClearDone(ctx, task.ID, sub.Team)
		if err != nil {
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
		http.Error(w, "already reviewed", http.StatusConflict)
		return
	}

	clerkID, _ := appmw.UserIDFromContext(r.Context())
	_ = h.audit.Record(ctx, audit.Entry{
		EntityType: audit.EntityScuntsSubmission,
		EntityID:   id,
		Verb:       audit.VerbAwarded,
		Actor:      h.actorName(ctx, clerkID),
		At:         time.Now().UTC(),
		Text:       "accepted Scunts proof from " + string(sub.Team) + ": " + task.Text,
	})
	w.WriteHeader(http.StatusNoContent)
}

type taskRequest struct {
	Category Category `json:"category"`
	Text     string   `json:"text"`
	Note     string   `json:"note"`
	Points   *int     `json:"points"`
}

// validate returns an error message, or "" when the request is usable.
// Points is a pointer so an omitted value falls back to the default rather
// than creating a mission worth nothing. The category is checked against
// the stored sections by CreateTask, since that needs the database.
func (req *taskRequest) validate() string {
	req.Text = strings.TrimSpace(req.Text)
	req.Note = strings.TrimSpace(req.Note)
	if req.Text == "" {
		return "text is required"
	}
	if len(req.Text) > MaxTaskTextLen || len(req.Note) > MaxTaskTextLen {
		return "text is too long"
	}
	if req.Points != nil && (*req.Points < 0 || *req.Points > 100000) {
		return "invalid points"
	}
	return ""
}

func (req taskRequest) points() int {
	if req.Points == nil {
		return DefaultTaskPoints
	}
	return *req.Points
}

// CreateTask adds a mission to a category. Exec-only.
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var req taskRequest
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

	exists, err := h.store.SectionExists(ctx, req.Category)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "invalid category", http.StatusBadRequest)
		return
	}

	saved, err := h.store.InsertTask(ctx, Task{
		Category:  req.Category,
		Text:      req.Text,
		Note:      req.Note,
		Points:    req.points(),
		CreatedAt: time.Now().UTC(),
	})
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	h.recordTask(ctx, r, audit.VerbCreated, saved.ID, "added a Scunts mission")
	writeJSON(w, http.StatusCreated, TaskView{Task: *saved})
}

// UpdateTask edits a mission's wording, note or value. Exec-only. The
// category is fixed once created — moving a mission between nights would
// need a re-order, and renaming in place covers the real case.
func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req taskRequest
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

	saved, err := h.store.UpdateTask(ctx, id, req.Text, req.Note, req.points())
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	h.recordTask(ctx, r, audit.VerbEdited, id, "edited a Scunts mission")
	writeJSON(w, http.StatusOK, TaskView{Task: *saved})
}

// DeleteTask removes a mission and every team's tick of it. Exec-only.
func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if _, err := h.store.GetTask(ctx, id); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if err := h.store.DeleteTask(ctx, id); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	h.recordTask(ctx, r, audit.VerbDeleted, id, "removed a Scunts mission")
	w.WriteHeader(http.StatusNoContent)
}

// ListSections returns the checklist's headings in display order.
func (h *Handler) ListSections(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.ListSections(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type sectionRequest struct {
	Label  string `json:"label"`
	Prefix string `json:"prefix"`
}

// CreateSection adds a new heading to the checklist, e.g. "Ultimate
// Rallies" numbered U1, U2… Exec-only.
func (h *Handler) CreateSection(w http.ResponseWriter, r *http.Request) {
	var req sectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	label := strings.TrimSpace(req.Label)
	prefix := strings.ToUpper(strings.TrimSpace(req.Prefix))
	if label == "" || len(label) > MaxSectionLabelLen {
		http.Error(w, "invalid name", http.StatusBadRequest)
		return
	}
	// Letters only, so a number like "UR12" always reads unambiguously.
	if prefix == "" || len(prefix) > MaxSectionPrefixLen ||
		strings.IndexFunc(prefix, func(c rune) bool { return c < 'A' || c > 'Z' }) != -1 {
		http.Error(w, "prefix must be 1-3 letters", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	saved, err := h.store.InsertSection(ctx, label, prefix)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			http.Error(w, "that prefix is already used", http.StatusConflict)
			return
		}
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	clerkID, _ := appmw.UserIDFromContext(r.Context())
	_ = h.audit.Record(ctx, audit.Entry{
		EntityType: audit.EntityScuntsSection,
		EntityID:   saved.ID,
		Verb:       audit.VerbCreated,
		Actor:      h.actorName(ctx, clerkID),
		At:         time.Now().UTC(),
		Text:       "added the Scunts section " + saved.Label,
	})
	writeJSON(w, http.StatusCreated, saved)
}

// recordTask logs an exec's change to the list. Like submission takedowns
// these carry a zero EventID: they belong to no event, so they never show
// up in an event's history, but the trail exists in the database.
func (h *Handler) recordTask(ctx context.Context, r *http.Request, verb audit.Verb, id primitive.ObjectID, text string) {
	clerkID, _ := appmw.UserIDFromContext(r.Context())
	_ = h.audit.Record(ctx, audit.Entry{
		EntityType: audit.EntityScuntsTask,
		EntityID:   id,
		Verb:       verb,
		Actor:      h.actorName(ctx, clerkID),
		At:         time.Now().UTC(),
		Text:       text,
	})
}
