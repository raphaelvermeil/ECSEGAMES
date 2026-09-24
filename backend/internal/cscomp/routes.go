package cscomp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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
	compSeconds  int
}

// NewHandler builds the handler. renderer may be nil — if Chrome could not
// be started at boot the rest of the comp still works and only Submit
// returns 503 (see main.go).
func NewHandler(store *Store, userRepo *users.Repository, renderer *Renderer, solutionsDir string, compSeconds int) *Handler {
	return &Handler{
		store:        store,
		users:        userRepo,
		renderer:     renderer,
		solutionsDir: solutionsDir,
		compSeconds:  compSeconds,
	}
}

// Mount registers the comp routes on r. Everything here is student-facing,
// so RequireAuth is the only gate — there is no exec surface: the
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
		pr.Get("/api/cscomp/leaderboard", h.Standings)
		pr.Post("/api/cscomp/teams", h.CreateTeam)
		pr.Post("/api/cscomp/teams/{id}/join", h.JoinTeam)
		pr.Post("/api/cscomp/teams/{id}/leave", h.LeaveTeam)

		pr.Get("/api/cscomp/me", h.Me)
		pr.Post("/api/cscomp/challenges/{id}/claim", h.Claim)
		pr.Delete("/api/cscomp/challenges/{id}/claim", h.Unclaim)

		pr.Post("/api/cscomp/challenges/{id}/submit", h.Submit)

		pr.Get("/api/cscomp/clock", h.GetClock)
	})

	// The clock is the one part of the comp an exec drives, so it is the
	// one part behind RequireRole. Everything above is student-facing.
	r.Group(func(er chi.Router) {
		er.Use(appmw.RequireAuth(clerkSecretKey))
		er.Use(appmw.RequireRole(userRepo, models.RoleExec))

		er.Post("/api/cscomp/clock", h.ControlClock)
	})
}

// ClockView is the clock as the client sees it. RemainingSeconds is
// resolved server-side so no browser has to reason about skew between its
// own wall clock and the server's — it counts down locally from this and
// re-syncs on the next poll.
type ClockView struct {
	Status           string `json:"status"`
	RemainingSeconds int    `json:"remainingSeconds"`
	DurationSeconds  int    `json:"durationSeconds"`
	// EndsAt is the wall-clock moment the round is due to finish, RFC3339
	// in UTC, or empty when no end has been set. The client renders it in
	// the viewer's own zone, so the server never guesses at one.
	EndsAt    string `json:"endsAt"`
	UpdatedBy string `json:"updatedBy"`
	// Started is whether the comp has ever been started, which is what
	// opens the battle to students (see battleOpen).
	Started bool `json:"started"`
	// StandingsHidden is whether students are currently kept off the
	// standings (see Clock.StandingsHidden). Execs still see them.
	StandingsHidden bool `json:"standingsHidden"`
}

func view(c *Clock, now time.Time) ClockView {
	ends := ""
	if e := c.EndTime(); !e.IsZero() {
		ends = e.UTC().Format(time.RFC3339)
	}
	return ClockView{
		Status:           c.Status,
		RemainingSeconds: c.RemainingAt(now),
		DurationSeconds:  c.Duration,
		EndsAt:           ends,
		UpdatedBy:        c.UpdatedBy,
		Started:          c.Started(),
		StandingsHidden:  c.StandingsHidden(now),
	}
}

// GetClock reports the shared countdown. Readable by any authenticated
// user: everyone in the room is watching the same clock.
func (h *Handler) GetClock(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	c, err := h.store.GetClock(ctx, h.compSeconds)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, view(c, time.Now().UTC()))
}

// clockRequest is one control action. EndsAt is read only by "setEnd", as
// a Unix timestamp in seconds. The client resolves the exec's chosen time
// of day into an absolute moment in their own zone before sending it, so
// nothing here has to guess which day or which timezone was meant.
type clockRequest struct {
	Action string `json:"action"`
	EndsAt int64  `json:"endsAt"`
}

// maxRoundLength bounds how far out an end may be set, so a mistyped hour
// cannot park the comp half a day away.
const maxRoundLength = 12 * time.Hour

// ControlClock applies an exec's start/pause/stop/adjust to the shared
// clock. The transitions themselves live on Clock (see clock.go); this
// reads the current one, applies the named move and writes it back.
//
// Last write wins. Two execs racing the same button is not a scenario
// worth locking for, and every action here is one another exec can
// immediately correct by pressing a different one.
func (h *Handler) ControlClock(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req clockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	current, err := h.store.GetClock(ctx, h.compSeconds)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	now := time.Now().UTC()
	// Before anything can move the end back out past the final hour.
	next := current.Latch(now)
	switch req.Action {
	case "start":
		next = next.Start(now)
	case "pause":
		next = next.Pause(now)
	case "stop":
		next = next.Stop(now)
	case "rehide":
		next = next.Rehide(now)
	case "reveal":
		next = next.Reveal()
	case "setEnd":
		if req.EndsAt == 0 {
			http.Error(w, "an end time is required", http.StatusBadRequest)
			return
		}
		target := time.Unix(req.EndsAt, 0).UTC()
		if !target.After(now) {
			http.Error(w, "that end time has already passed", http.StatusBadRequest)
			return
		}
		if target.After(now.Add(maxRoundLength)) {
			http.Error(w, "that end time is too far out", http.StatusBadRequest)
			return
		}
		next = next.SetEnd(now, target)
	default:
		http.Error(w, "unknown action", http.StatusBadRequest)
		return
	}

	next.UpdatedBy = displayName(u)
	if err := h.store.SaveClock(ctx, next); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, view(&next, now))
}

// battleOpen gates everything that reveals a challenge. Execs always pass,
// so they can check the board before the room arrives; everyone else waits
// until the clock has been started once, and from then on it stays open.
// Writes the response and returns false when the caller is kept out.
func (h *Handler) battleOpen(ctx context.Context, w http.ResponseWriter, r *http.Request) bool {
	return h.clockGate(ctx, w, r, func(c *Clock) string {
		if !c.Started() {
			return "the comp has not started"
		}
		return ""
	})
}

// standingsOpen keeps students off the standings for the final stretch of
// the comp, until an exec reveals them. Execs always pass.
func (h *Handler) standingsOpen(ctx context.Context, w http.ResponseWriter, r *http.Request) bool {
	return h.clockGate(ctx, w, r, func(c *Clock) string {
		if c.StandingsHidden(time.Now().UTC()) {
			return "the standings are hidden until the winners are revealed"
		}
		return ""
	})
}

// clockGate lets execs and admins straight through and asks closed about
// everyone else: a non-empty reason is sent back as a 403. Writes the
// response and returns false when the caller is kept out.
func (h *Handler) clockGate(ctx context.Context, w http.ResponseWriter, r *http.Request, closed func(*Clock) string) bool {
	clerkID, ok := appmw.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return false
	}
	u, err := h.users.GetOrCreate(ctx, clerkID)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return false
	}
	if u.Role == models.RoleExec || u.Role == models.RoleAdmin {
		return true
	}
	clock, err := h.store.GetClock(ctx, h.compSeconds)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return false
	}
	if reason := closed(clock); reason != "" {
		http.Error(w, reason, http.StatusForbidden)
		return false
	}
	return true
}

// ListChallenges returns every challenge: level, part, name, points and
// starter code. The starter is the scaffold the editor opens with, not an
// answer.
func (h *Handler) ListChallenges(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if !h.battleOpen(ctx, w, r) {
		return
	}

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

	if !h.battleOpen(ctx, w, r) {
		return
	}

	c, err := h.store.GetChallenge(ctx, id)
	if errors.Is(err, mongo.ErrNoDocuments) {
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
// from the name via Slug, never from anything on the wire; Base is belt
// and braces so a name could never reach outside the solutions dir.
func (h *Handler) solution(name string) ([]byte, error) {
	return os.ReadFile(filepath.Join(h.solutionsDir, filepath.Base(Slug(name))+".png"))
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
	if errors.Is(err, mongo.ErrNoDocuments) {
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
	if errors.Is(err, mongo.ErrNoDocuments) {
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
	// A claim echoes the challenge's level back, so it is part of the
	// battle too.
	if !h.battleOpen(ctx, w, r) {
		return
	}

	c, err := h.store.GetChallenge(ctx, id)
	if errors.Is(err, mongo.ErrNoDocuments) {
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
	if errors.Is(err, mongo.ErrNoDocuments) {
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

	// Submissions only count while the round is running: the clock the
	// exec drives is the rule, not just a display.
	clock, err := h.store.GetClock(ctx, h.compSeconds)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	if clock.Status != ClockRunning || clock.RemainingAt(time.Now()) == 0 {
		http.Error(w, "the comp is not running", http.StatusConflict)
		return
	}

	c, err := h.store.GetChallenge(ctx, id)
	if errors.Is(err, mongo.ErrNoDocuments) {
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
		// Running out of time — waiting for a render slot at the start of a
		// round, or a render that didn't finish in time — is the server
		// being saturated, not the submission being wrong, and the student
		// should be told to retry rather than to fix their CSS.
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			http.Error(w, "the server is busy, try again in a few seconds", http.StatusServiceUnavailable)
			return
		}
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

// Standing is one sub-team's row on the comp board. SolvedParts carries
// "<level>-<part>" keys rather than challenge IDs so the client can draw
// its per-level pips without holding the challenge list alongside it.
//
// Points is the sum of the solved challenges' own Points values, so the
// board and a submission's response can never disagree about what a
// challenge was worth.
type Standing struct {
	TeamID      primitive.ObjectID `json:"teamId"`
	Name        string             `json:"name"`
	Points      int                `json:"points"`
	Solved      int                `json:"solved"`
	MemberCount int                `json:"memberCount"`
	SolvedParts []string           `json:"solvedParts"`
	LastLevel   int                `json:"lastLevel"`
}

// Leaderboard is the comp's own standings. It is deliberately not the
// Games leaderboard: this ranks the comp's sub-teams by points earned on
// the challenges and resets with the comp, while the Games board totals
// scoreEntries across every event. Nothing here touches scoreEntries.
//
// Total is the points a team would have for solving everything, so the
// client can size a progress bar without summing the challenge list.
type Leaderboard struct {
	Standings  []Standing `json:"standings"`
	Total      int        `json:"total"`
	TotalParts int        `json:"totalParts"`
}

// Standings ranks every sub-team. Reads are open to any authenticated user
// rather than gated on team membership — the board is the thing a student
// checks before they have joined anything, and it exposes nothing a
// teammate could not already see. The exception is the comp's final hour,
// when only execs see it until they reveal it (see standingsOpen).
func (h *Handler) Standings(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if !h.standingsOpen(ctx, w, r) {
		return
	}

	challenges, err := h.store.ListChallenges(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	byID := make(map[primitive.ObjectID]Challenge, len(challenges))
	total := 0
	for _, c := range challenges {
		byID[c.ID] = c
		total += c.Points
	}

	subs, err := h.store.ListSolvedSubmissions(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	// Solves are folded per team first so a team's row is one pass over
	// its own solves rather than a scan of every submission per team.
	type tally struct {
		points    int
		parts     []string
		lastLevel int
		seen      map[primitive.ObjectID]bool
	}
	tallies := map[primitive.ObjectID]*tally{}
	for _, s := range subs {
		c, ok := byID[s.ChallengeID]
		if !ok {
			// A submission whose challenge has since been removed scores
			// nothing rather than crediting unknown points.
			continue
		}
		t := tallies[s.TeamID]
		if t == nil {
			t = &tally{seen: map[primitive.ObjectID]bool{}}
			tallies[s.TeamID] = t
		}
		// Claims are advisory, so two teammates can both solve the same
		// part; it counts once for the team.
		if t.seen[s.ChallengeID] {
			continue
		}
		t.seen[s.ChallengeID] = true
		t.points += c.Points
		t.parts = append(t.parts, fmt.Sprintf("%d-%d", c.Level, c.Part))
		if c.Level > t.lastLevel {
			t.lastLevel = c.Level
		}
	}

	teams, err := h.store.ListTeams(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	// One round-trip for every roster size rather than one per team; every
	// viewer polls this every few seconds.
	counts, err := h.users.CountByCSCompTeams(ctx)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	rows := make([]Standing, 0, len(teams))
	for _, team := range teams {
		row := Standing{
			TeamID:      team.ID,
			Name:        team.Name,
			MemberCount: counts[team.ID],
			SolvedParts: []string{},
		}
		if t := tallies[team.ID]; t != nil {
			row.Points = t.points
			row.Solved = len(t.parts)
			row.SolvedParts = t.parts
			row.LastLevel = t.lastLevel
		}
		rows = append(rows, row)
	}

	// Points, then solves, then name — so the order is stable across polls
	// for teams that are genuinely tied rather than flickering between
	// them every fifteen seconds.
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Points != rows[j].Points {
			return rows[i].Points > rows[j].Points
		}
		if rows[i].Solved != rows[j].Solved {
			return rows[i].Solved > rows[j].Solved
		}
		return rows[i].Name < rows[j].Name
	})

	writeJSON(w, http.StatusOK, Leaderboard{
		Standings:  rows,
		Total:      total,
		TotalParts: len(challenges),
	})
}
