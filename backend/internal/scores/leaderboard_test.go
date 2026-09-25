package scores

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Mongo integration tests for how the leaderboard combines event scores
// with ExtraPoints (accepted Scunts proof). Run only when TEST_MONGO_URI is
// set; each test gets its own database, dropped on cleanup.

func testLeaderboardHandler(t *testing.T) (*Handler, *Store) {
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
	name := base + "_scores_" + primitive.NewObjectID().Hex()

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
	return NewHandler(store, nil, nil, nil), store
}

func getLeaderboard(t *testing.T, h *Handler) (int, Leaderboard) {
	t.Helper()
	rec := httptest.NewRecorder()
	h.Leaderboard(rec, httptest.NewRequest(http.MethodGet, "/api/leaderboard", nil))
	var board Leaderboard
	if rec.Code == http.StatusOK {
		if err := json.Unmarshal(rec.Body.Bytes(), &board); err != nil {
			t.Fatalf("decode: %v", err)
		}
	}
	return rec.Code, board
}

func TestLeaderboard_AddsScuntsPointsToEventScores(t *testing.T) {
	h, store := testLeaderboardHandler(t)
	if _, err := store.Upsert(context.Background(), primitive.NewObjectID(), models.TeamSoftware, 50, "event"); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	now := time.Now().UTC()
	h.ExtraPoints = func(context.Context) ([]LeaderboardPoint, error) {
		return []LeaderboardPoint{
			{Team: models.TeamSoftware, Value: 100, At: now.Add(-time.Hour)},
			{Team: models.TeamElectrical, Value: 30, At: now.Add(time.Hour)},
		}, nil
	}

	code, board := getLeaderboard(t, h)
	if code != http.StatusOK {
		t.Fatalf("leaderboard: got %d, want 200", code)
	}
	if board.Totals[models.TeamSoftware] != 150 || board.Totals[models.TeamElectrical] != 30 {
		t.Fatalf("totals = %v, want software 150 and electrical 30", board.Totals)
	}
	if len(board.Points) != 3 {
		t.Fatalf("got %d points, want 3", len(board.Points))
	}
	// The chart running-sums these in order, so they must be oldest first
	// even though the event score was fetched before the Scunts points.
	for i := 1; i < len(board.Points); i++ {
		if board.Points[i].At.Before(board.Points[i-1].At) {
			t.Fatalf("points not oldest-first: %v", board.Points)
		}
	}
	if board.Points[0].Value != 100 || board.Points[2].Value != 30 {
		t.Fatalf("points out of order: %v", board.Points)
	}
}

func TestLeaderboard_WithoutExtraPoints_EventScoresOnly(t *testing.T) {
	h, store := testLeaderboardHandler(t)
	if _, err := store.Upsert(context.Background(), primitive.NewObjectID(), models.TeamComputer, 40, "event"); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	code, board := getLeaderboard(t, h)
	if code != http.StatusOK {
		t.Fatalf("leaderboard: got %d, want 200", code)
	}
	if board.Totals[models.TeamComputer] != 40 || len(board.Points) != 1 {
		t.Fatalf("board = %+v, want computer 40 from one point", board)
	}
}

func TestLeaderboard_ExtraPointsError_Fails(t *testing.T) {
	h, _ := testLeaderboardHandler(t)
	h.ExtraPoints = func(context.Context) ([]LeaderboardPoint, error) {
		return nil, errors.New("boom")
	}
	// Failing loudly beats quietly showing standings that are missing
	// every Scunts point.
	if code, _ := getLeaderboard(t, h); code != http.StatusInternalServerError {
		t.Fatalf("leaderboard: got %d, want 500", code)
	}
}
