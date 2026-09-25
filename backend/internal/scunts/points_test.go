package scunts

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/ecsegames/backend/internal/audit"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// These are Mongo integration tests for the proof → points workflow. Like
// internal/users they run only when TEST_MONGO_URI is set, and never fall
// back to MONGO_URI. Each test gets its own throwaway database, dropped on
// cleanup, so runs can't see each other's data or leave any behind.
//
// The accept guard leans on a unique index, which is exactly the kind of
// thing a mocked collection wouldn't exercise.

func testHandler(t *testing.T) (*Handler, *Store) {
	t.Helper()
	_ = godotenv.Load("../../.env")
	uri := os.Getenv("TEST_MONGO_URI")
	if uri == "" {
		t.Skip("TEST_MONGO_URI not set; skipping Mongo integration test")
	}
	base := os.Getenv("TEST_MONGO_DB")
	if base == "" {
		base = "ecsegames_test"
	}
	name := base + "_scunts_" + primitive.NewObjectID().Hex()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	database, err := db.Connect(ctx, uri, name)
	if err != nil {
		t.Fatalf("mongo connect: %v", err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = database.Drop(ctx)
	})

	store := NewStore(database)
	if err := store.EnsureIndexes(ctx); err != nil {
		t.Fatalf("ensure indexes: %v", err)
	}
	// Storage is nil: accepting touches only Mongo, and the removal path is
	// tested at the store, which is where the points are taken back.
	h := NewHandler(store, nil, users.NewRepository(database), audit.NewStore(database))
	return h, store
}

func newTask(t *testing.T, s *Store, points int) *Task {
	t.Helper()
	task, err := s.InsertTask(context.Background(), Task{
		Category:  CategoryGeneral,
		Text:      "test mission",
		Points:    points,
		CreatedAt: time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("insert task: %v", err)
	}
	return task
}

func newProof(t *testing.T, s *Store, task *Task, team models.Team) *Submission {
	t.Helper()
	return newProofBy(t, s, task, team, "test-clerk")
}

func newProofBy(t *testing.T, s *Store, task *Task, team models.Team, clerkID string) *Submission {
	t.Helper()
	sub, err := s.Insert(context.Background(), Submission{
		Team:            team,
		Key:             "scunts/" + string(team) + "/test.jpg",
		Kind:            KindImage,
		ContentType:     "image/jpeg",
		Size:            1,
		SubmittedBy:     clerkID,
		SubmittedByName: "Test Student",
		SubmittedAt:     time.Now().UTC(),
		TaskID:          task.ID,
		Status:          StatusPending,
	})
	if err != nil {
		t.Fatalf("insert submission: %v", err)
	}
	return sub
}

// accept calls the Accept handler directly, skipping the auth middleware
// (which is chi's and Clerk's concern, not this workflow's).
func accept(t *testing.T, h *Handler, id primitive.ObjectID) int {
	t.Helper()
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.Hex())
	req := httptest.NewRequest(http.MethodPost, "/api/scunts/submissions/"+id.Hex()+"/accept", nil)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()
	h.Accept(rec, req)
	return rec.Code
}

// totals sums the leaderboard contribution per team, as the scores
// handler does.
func totals(t *testing.T, s *Store) map[models.Team]int {
	t.Helper()
	pts, err := s.AcceptedPoints(context.Background())
	if err != nil {
		t.Fatalf("accepted points: %v", err)
	}
	out := map[models.Team]int{}
	for _, p := range pts {
		out[p.Team] += p.Points
	}
	return out
}

func isDone(t *testing.T, s *Store, task *Task, team models.Team) bool {
	t.Helper()
	done, err := s.IsDone(context.Background(), task.ID, team)
	if err != nil {
		t.Fatalf("is done: %v", err)
	}
	return done
}

func TestPendingProof_EarnsNothing(t *testing.T) {
	_, s := testHandler(t)
	task := newTask(t, s, 250)
	newProof(t, s, task, models.TeamSoftware)

	if got := totals(t, s)[models.TeamSoftware]; got != 0 {
		t.Fatalf("pending proof counted %d points, want 0", got)
	}
	if isDone(t, s, task, models.TeamSoftware) {
		t.Fatalf("mission marked done before any proof was accepted")
	}
	pending, err := s.PendingTaskIDs(context.Background(), models.TeamSoftware)
	if err != nil {
		t.Fatalf("pending task ids: %v", err)
	}
	if !pending[task.ID] {
		t.Fatalf("mission not reported as pending for the submitting team")
	}
}

func TestAccept_AwardsMissionPointsAndCompletes(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 250)
	sub := newProof(t, s, task, models.TeamSoftware)

	if code := accept(t, h, sub.ID); code != http.StatusNoContent {
		t.Fatalf("accept: got %d, want 204", code)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 250 {
		t.Fatalf("team total = %d, want 250", got)
	}
	if !isDone(t, s, task, models.TeamSoftware) {
		t.Fatalf("mission not marked done after accept")
	}
	saved, err := s.Get(context.Background(), sub.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if saved.Status != StatusAccepted || saved.Points != 250 || saved.AcceptedAt == nil {
		t.Fatalf("submission after accept = status %q, points %d, acceptedAt %v", saved.Status, saved.Points, saved.AcceptedAt)
	}
}

func TestAccept_SameProofTwice_PaysOnce(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 100)
	sub := newProof(t, s, task, models.TeamSoftware)

	if code := accept(t, h, sub.ID); code != http.StatusNoContent {
		t.Fatalf("first accept: got %d, want 204", code)
	}
	if code := accept(t, h, sub.ID); code != http.StatusConflict {
		t.Fatalf("second accept: got %d, want 409", code)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 100 {
		t.Fatalf("team total = %d, want 100", got)
	}
}

func TestAccept_SecondProofForSameMission_PaysOnce(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 100)
	first := newProof(t, s, task, models.TeamSoftware)
	second := newProof(t, s, task, models.TeamSoftware)

	if code := accept(t, h, first.ID); code != http.StatusNoContent {
		t.Fatalf("accept first: got %d, want 204", code)
	}
	if code := accept(t, h, second.ID); code != http.StatusConflict {
		t.Fatalf("accept second: got %d, want 409", code)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 100 {
		t.Fatalf("team total = %d, want 100", got)
	}
	// The refused proof must stay reviewable, not half-accepted.
	saved, err := s.Get(context.Background(), second.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if saved.Status != StatusPending {
		t.Fatalf("refused proof status = %q, want pending", saved.Status)
	}
}

func TestAccept_SameMissionDifferentTeams_BothPaid(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 100)
	sw := newProof(t, s, task, models.TeamSoftware)
	el := newProof(t, s, task, models.TeamElectrical)

	if code := accept(t, h, sw.ID); code != http.StatusNoContent {
		t.Fatalf("accept software: got %d, want 204", code)
	}
	if code := accept(t, h, el.ID); code != http.StatusNoContent {
		t.Fatalf("accept electrical: got %d, want 204", code)
	}
	got := totals(t, s)
	if got[models.TeamSoftware] != 100 || got[models.TeamElectrical] != 100 {
		t.Fatalf("totals = %v, want 100 each for software and electrical", got)
	}
}

func TestAccept_PointsAreSnapshotted(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 100)
	sub := newProof(t, s, task, models.TeamSoftware)

	if code := accept(t, h, sub.ID); code != http.StatusNoContent {
		t.Fatalf("accept: got %d, want 204", code)
	}
	// Re-valuing a mission later must not rewrite points already earned.
	if _, err := s.UpdateTask(context.Background(), task.ID, task.Text, "", 999); err != nil {
		t.Fatalf("update task: %v", err)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 100 {
		t.Fatalf("team total = %d after mission re-valued, want 100", got)
	}
}

func TestAccept_DeletedMission_Refused(t *testing.T) {
	h, s := testHandler(t)
	task := newTask(t, s, 100)
	sub := newProof(t, s, task, models.TeamSoftware)

	if err := s.DeleteTask(context.Background(), task.ID); err != nil {
		t.Fatalf("delete task: %v", err)
	}
	if code := accept(t, h, sub.ID); code != http.StatusConflict {
		t.Fatalf("accept: got %d, want 409", code)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 0 {
		t.Fatalf("team total = %d, want 0", got)
	}
}

func TestAccept_UnknownSubmission_NotFound(t *testing.T) {
	h, _ := testHandler(t)
	if code := accept(t, h, primitive.NewObjectID()); code != http.StatusNotFound {
		t.Fatalf("accept: got %d, want 404", code)
	}
}

func TestRemoveAcceptedProof_TakesPointsBackAndReopens(t *testing.T) {
	h, s := testHandler(t)
	ctx := context.Background()
	task := newTask(t, s, 100)
	sub := newProof(t, s, task, models.TeamSoftware)

	if code := accept(t, h, sub.ID); code != http.StatusNoContent {
		t.Fatalf("accept: got %d, want 204", code)
	}
	saved, err := s.Get(ctx, sub.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if err := s.Delete(ctx, saved); err != nil {
		t.Fatalf("delete: %v", err)
	}

	if got := totals(t, s)[models.TeamSoftware]; got != 0 {
		t.Fatalf("team total = %d after removal, want 0", got)
	}
	if isDone(t, s, task, models.TeamSoftware) {
		t.Fatalf("mission still done after its proof was removed")
	}

	// Reopened means the team can earn it again with fresh proof.
	again := newProof(t, s, task, models.TeamSoftware)
	if code := accept(t, h, again.ID); code != http.StatusNoContent {
		t.Fatalf("re-accept: got %d, want 204", code)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 100 {
		t.Fatalf("team total = %d after re-accept, want 100", got)
	}
}

func TestRemovePendingProof_LeavesOtherTeamsPoints(t *testing.T) {
	h, s := testHandler(t)
	ctx := context.Background()
	task := newTask(t, s, 100)
	accepted := newProof(t, s, task, models.TeamSoftware)
	pending := newProof(t, s, task, models.TeamElectrical)

	if code := accept(t, h, accepted.ID); code != http.StatusNoContent {
		t.Fatalf("accept: got %d, want 204", code)
	}
	if err := s.Delete(ctx, pending); err != nil {
		t.Fatalf("delete pending: %v", err)
	}
	if got := totals(t, s)[models.TeamSoftware]; got != 100 {
		t.Fatalf("software total = %d, want 100", got)
	}
	if !isDone(t, s, task, models.TeamSoftware) {
		t.Fatalf("removing another team's pending proof reopened software's mission")
	}
}

func TestList_PendingVisibleOnlyToExecsAndSubmitter(t *testing.T) {
	h, s := testHandler(t)
	ctx := context.Background()
	task := newTask(t, s, 100)
	other := newTask(t, s, 100)
	accepted := newProofBy(t, s, task, models.TeamComputer, "computer-student")
	mine := newProofBy(t, s, task, models.TeamSoftware, "me")
	teammates := newProofBy(t, s, other, models.TeamSoftware, "my-teammate")
	rival := newProofBy(t, s, task, models.TeamElectrical, "rival")
	if code := accept(t, h, accepted.ID); code != http.StatusNoContent {
		t.Fatalf("accept: got %d, want 204", code)
	}

	student, err := s.List(ctx, "me", false)
	if err != nil {
		t.Fatalf("list as student: %v", err)
	}
	seen := map[primitive.ObjectID]bool{}
	for _, sub := range student {
		seen[sub.ID] = true
	}
	if !seen[accepted.ID] || !seen[mine.ID] {
		t.Fatalf("student should see accepted proof and their own pending proof; saw %v", seen)
	}
	if seen[teammates.ID] {
		t.Fatalf("student saw a teammate's pending proof")
	}
	if seen[rival.ID] {
		t.Fatalf("student saw another team's pending proof")
	}

	exec, err := s.List(ctx, "", true)
	if err != nil {
		t.Fatalf("list as exec: %v", err)
	}
	if len(exec) != 4 {
		t.Fatalf("exec saw %d submissions, want 4", len(exec))
	}
}
