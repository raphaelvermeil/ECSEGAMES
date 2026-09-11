package cscomp

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	appmw "github.com/ecsegames/backend/internal/middleware"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Handler serves the CS comp API (/api/cscomp).
type Handler struct {
	store        *Store
	users        *users.Repository
	renderer     *Renderer
	solutionsDir string
}

// NewHandler builds the handler. renderer may be nil — if Chrome could not
// be started at boot the rest of the comp still works and only Submit
// returns 503 (see main.go).
func NewHandler(store *Store, userRepo *users.Repository, renderer *Renderer, solutionsDir string) *Handler {
	return &Handler{store: store, users: userRepo, renderer: renderer, solutionsDir: solutionsDir}
}

// Mount registers the comp routes on r. Everything here is student-facing,
// so RequireAuth is the only gate — there is no exec surface: the 30
// challenges come from cmd/seedcscomp, and a student's own submissions and
// claims are the only things they can write.
//
// Note what is *not* here: no route accepts a score. Submit takes code and
// nothing else, and the percentage comes back from the server's own render
// (see Submit).
func Mount(r chi.Router, h *Handler, userRepo *users.Repository, clerkSecretKey string) {
	r.Group(func(pr chi.Router) {
		pr.Use(appmw.RequireAuth(clerkSecretKey))

		pr.Get("/api/cscomp/challenges", h.ListChallenges)
		pr.Get("/api/cscomp/challenges/{id}/target.png", h.Target)

		pr.Get("/api/cscomp/teams", h.ListTeams)
		pr.Post("/api/cscomp/teams", h.CreateTeam)
		pr.Post("/api/cscomp/teams/{id}/join", h.JoinTeam)
		pr.Post("/api/cscomp/teams/{id}/leave", h.LeaveTeam)

		pr.Get("/api/cscomp/me", h.Me)
		pr.Post("/api/cscomp/challenges/{id}/claim", h.Claim)
		pr.Delete("/api/cscomp/challenges/{id}/claim", h.Unclaim)

		pr.Post("/api/cscomp/challenges/{id}/submit", h.Submit)
	})
}

// ListChallenges returns all 30 challenges: level, part, name, points and
// starter code. The starter is the scaffold the editor opens with, not an
// answer.
func (h *Handler) ListChallenges(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	list, err := h.store.ListChallenges(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// Target serves a challenge's solution PNG. Students are meant to see the
// target — that is the whole task — and serving it from here keeps one
// source of truth for the image that scoring actually diffs against. What
// they cannot do is influence the comparison: seeing the target is not the
// same as supplying it.
func (h *Handler) Target(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	c, err := h.store.GetChallenge(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	png, err := h.solution(c.Name)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	_, _ = w.Write(png)
}

// solution reads a challenge's target image off disk. The path is derived
// from the name via Slug, never from anything on the wire.
func (h *Handler) solution(name string) ([]byte, error) {
	return os.ReadFile(filepath.Join(h.solutionsDir, Slug(name)+".png"))
}

// TeamView is a sub-team with its roster, the shape both the team list and
// /api/cscomp/me hand the client.
type TeamView struct {
	Team
	Members     []models.User `json:"members"`
	MemberCount int           `json:"memberCount"`
}

// ListTeams returns every sub-team with its roster, so the join screen can
// show who is on what and which teams still have room.
func (h *Handler) ListTeams(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	teams, err := h.store.ListTeams(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	views := make([]TeamView, 0, len(teams))
	for _, t := range teams {
		members, err := h.users.ListByCSCompTeam(ctx, t.ID)
		if err != nil {
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
		views = append(views, TeamView{Team: t, Members: members, MemberCount: len(members)})
	}
	writeJSON(w, http.StatusOK, views)
}

type createTeamRequest struct {
	Name string `json:"name"`
}

func (req createTeamRequest) validate() string {
	if strings.TrimSpace(req.Name) == "" {
		return "name is required"
	}
	return ""
}

// CreateTeam makes a new sub-team and joins the creator to it — students
// run their own squads, so there is no exec step. A creator who is already
// on a team gets 409 and no team is made.
func (h *Handler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req createTeamRequest
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

	// Checked before the insert so a student who is already on a team does
	// not leave an empty one behind.
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if u.CSCompTeamID != nil {
		http.Error(w, "already on a team", http.StatusConflict)
		return
	}

	team, err := h.store.CreateTeam(ctx, strings.TrimSpace(req.Name))
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	joined, err := h.users.SetCSCompTeam(ctx, clerkID, team.ID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !joined {
		http.Error(w, "already on a team", http.StatusConflict)
		return
	}

	// u was read before the join, so bring it up to date rather than
	// handing back a roster whose only member says they are on no team.
	u.CSCompTeamID = &team.ID
	writeJSON(w, http.StatusOK, TeamView{Team: *team, Members: []models.User{*u}, MemberCount: 1})
}

// JoinTeam adds the caller to a sub-team. 409 if the team is full or the
// caller is already on one.
//
// The cap is a count followed by a write rather than one atomic operation,
// so two students joining the same last slot in the same instant could
// make it six. At club-event scale that is an acceptable trade for keeping
// the roster on the user document; a stricter version would need the
// membership list on the team.
func (h *Handler) JoinTeam(w http.ResponseWriter, r *http.Request) {
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

	team, err := h.store.GetTeam(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	count, err := h.users.CountByCSCompTeam(ctx, id)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if count >= TeamSize {
		http.Error(w, "team is full", http.StatusConflict)
		return
	}

	joined, err := h.users.SetCSCompTeam(ctx, clerkID, id)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if !joined {
		http.Error(w, "already on a team", http.StatusConflict)
		return
	}

	members, err := h.users.ListByCSCompTeam(ctx, id)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, TeamView{Team: *team, Members: members, MemberCount: len(members)})
}

// LeaveTeam takes the caller off their sub-team and drops the claims they
// were holding on it, so the parts they had reserved go back on the board.
// Their submissions stay put: a solve keeps counting for the team it was
// made on.
func (h *Handler) LeaveTeam(w http.ResponseWriter, r *http.Request) {
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

	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if u.CSCompTeamID == nil || *u.CSCompTeamID != id {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if err := h.store.DeleteClaimsByMember(ctx, id, clerkID); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if err := h.users.ClearCSCompTeam(ctx, clerkID); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// MeView is everything the comp screen needs on load: who you are, the
// sub-team you are on with its roster, and that team's claims and
// submissions. Team is nil when you have not joined one, and Claims and
// Submissions are then empty.
type MeView struct {
	User        models.User  `json:"user"`
	Team        *TeamView    `json:"team"`
	Claims      []Claim      `json:"claims"`
	Submissions []Submission `json:"submissions"`
}

// Me is the comp's single load call. Progress and claim state are
// team-wide rather than personal — "Level 1 Part 4 completed by Joe" comes
// straight out of the submission snapshots — so one round trip is enough
// to draw the whole board.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	view := MeView{User: *u, Claims: []Claim{}, Submissions: []Submission{}}
	if u.CSCompTeamID == nil {
		writeJSON(w, http.StatusOK, view)
		return
	}
	teamID := *u.CSCompTeamID

	team, err := h.store.GetTeam(ctx, teamID)
	if err == mongo.ErrNoDocuments {
		// The team document is gone but the user still points at it —
		// report them as unteamed rather than failing the whole screen.
		writeJSON(w, http.StatusOK, view)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	members, err := h.users.ListByCSCompTeam(ctx, teamID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	claims, err := h.store.ListClaimsByTeam(ctx, teamID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	subs, err := h.store.ListSubmissionsByTeam(ctx, teamID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	view.Team = &TeamView{Team: *team, Members: members, MemberCount: len(members)}
	view.Claims = claims
	view.Submissions = subs
	writeJSON(w, http.StatusOK, view)
}

// requireTeam resolves the caller to their user record and sub-team ID,
// writing the response and returning ok=false if they are not on one. The
// whole comp surface below team selection needs this.
func (h *Handler) requireTeam(ctx context.Context, w http.ResponseWriter, clerkID string) (*models.User, primitive.ObjectID, bool) {
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return nil, primitive.NilObjectID, false
	}
	if u.CSCompTeamID == nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return nil, primitive.NilObjectID, false
	}
	return u, *u.CSCompTeamID, true
}

// displayName is the snapshot written onto a claim or submission so the
// board can say "claimed by Joe" without a second lookup. Falls back to
// the Clerk ID when no name is on file yet.
func displayName(u *models.User) string {
	if u.Name == "" {
		return u.ClerkID
	}
	return u.Name
}

// Claim calls dibs on a challenge for the caller's sub-team. Both rules —
// one claimer per challenge per team, and one claim per person per level —
// are enforced by unique indexes in the store, so a 409 here is the
// database refusing, not a race the handler lost.
func (h *Handler) Claim(w http.ResponseWriter, r *http.Request) {
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

	u, teamID, ok := h.requireTeam(ctx, w, clerkID)
	if !ok {
		return
	}

	c, err := h.store.GetChallenge(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	claim, err := h.store.CreateClaim(ctx, Claim{
		TeamID:      teamID,
		ChallengeID: c.ID,
		ClerkID:     clerkID,
		Name:        displayName(u),
		Level:       c.Level,
	})
	if err == ErrConflict {
		http.Error(w, "already claimed", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, claim)
}

// Unclaim releases the caller's own claim on a challenge. A claim held by
// a teammate is not theirs to drop, and reads as not found.
func (h *Handler) Unclaim(w http.ResponseWriter, r *http.Request) {
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

	_, teamID, ok := h.requireTeam(ctx, w, clerkID)
	if !ok {
		return
	}

	err = h.store.DeleteClaim(ctx, teamID, id, clerkID)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// submitRequest is the entire submission wire format. Code is the only
// field, deliberately: there is nothing here through which a score could
// be asserted. Unknown fields are simply ignored by the decoder, so a
// request that tries to send a percentage sends it nowhere.
type submitRequest struct {
	Code string `json:"code"`
}

func (req submitRequest) validate() string {
	if strings.TrimSpace(req.Code) == "" {
		return "code is required"
	}
	if len(req.Code) > MaxCodeBytes {
		return "code is too long"
	}
	return ""
}

// submitResponse is the result of one attempt: how this attempt scored,
// the best score on record, and how many attempts have been made.
type submitResponse struct {
	MatchPercent float64 `json:"matchPercent"`
	Best         float64 `json:"best"`
	Attempts     int     `json:"attempts"`
	Solved       bool    `json:"solved"`
	Points       int     `json:"points"`
}

// Submit scores an attempt. This is the point of the whole package: the
// client sends code, the server renders that code itself and diffs the
// pixels against the challenge's target image. The percentage is computed
// here and nowhere else, so there is no number a student can forge.
//
// Submissions are unlimited and the best one is kept (see
// Store.UpsertSubmission). Points are all-or-nothing at PassThreshold.
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}
	if h.renderer == nil {
		http.Error(w, "rendering unavailable", http.StatusServiceUnavailable)
		return
	}
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req submitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if msg := req.validate(); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	u, teamID, ok := h.requireTeam(ctx, w, clerkID)
	if !ok {
		return
	}

	c, err := h.store.GetChallenge(ctx, id)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	wantBytes, err := h.solution(c.Name)
	if err != nil {
		http.Error(w, "target image missing", http.StatusInternalServerError)
		return
	}
	want, err := decodePNG(wantBytes)
	if err != nil {
		http.Error(w, "target image unreadable", http.StatusInternalServerError)
		return
	}

	gotBytes, err := h.renderer.Render(ctx, req.Code)
	if err != nil {
		// A render failure is the submission's fault far more often than
		// ours — markup that hangs the page, or exceeds the timeout.
		http.Error(w, "could not render submission", http.StatusBadRequest)
		return
	}
	got, err := decodePNG(gotBytes)
	if err != nil {
		http.Error(w, "could not render submission", http.StatusBadRequest)
		return
	}

	percent, err := MatchPercent(got, want)
	if err != nil {
		http.Error(w, "could not score submission", http.StatusInternalServerError)
		return
	}

	saved, err := h.store.UpsertSubmission(ctx, Submission{
		ChallengeID:  c.ID,
		ClerkID:      clerkID,
		TeamID:       teamID,
		Name:         displayName(u),
		Code:         req.Code,
		MatchPercent: percent,
	})
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	resp := submitResponse{
		MatchPercent: percent,
		Best:         saved.MatchPercent,
		Attempts:     saved.Attempts,
		Solved:       saved.Solved(),
	}
	if resp.Solved {
		resp.Points = c.Points
	}
	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
