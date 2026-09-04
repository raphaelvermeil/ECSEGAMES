package users

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
)

// testRepo connects to the dev Mongo database configured in backend/.env,
// skipping the test entirely if none is set. This is an integration test
// rather than a mock: the bug it guards against — SetTeam silently
// no-op'ing for a user that already has a team on file — only shows up
// against a real filter match, which a mocked collection wouldn't exercise.
func testRepo(t *testing.T) *Repository {
	t.Helper()
	_ = godotenv.Load("../../.env")
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		t.Skip("MONGO_URI not set; skipping Mongo integration test")
	}
	dbName := os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = "ecsegames"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	database, err := db.Connect(ctx, uri, dbName)
	if err != nil {
		t.Fatalf("mongo connect: %v", err)
	}
	return NewRepository(database)
}

// cleanupUser deletes the test's disposable clerkID once the test finishes,
// so these runs never leave fake accounts behind in a shared database.
func cleanupUser(t *testing.T, r *Repository, clerkID string) {
	t.Helper()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, _ = r.coll.DeleteOne(ctx, bson.M{"clerkId": clerkID})
	})
}

func fakeClerkID(tag string) string {
	return "test-clerk-" + tag + "-" + time.Now().Format("150405.000000000")
}

func TestSetTeam_FreshUser_SavesProfile(t *testing.T) {
	r := testRepo(t)
	ctx := context.Background()
	clerkID := fakeClerkID("fresh")
	cleanupUser(t, r, clerkID)

	if _, err := r.GetOrCreate(ctx, clerkID); err != nil {
		t.Fatalf("GetOrCreate: %v", err)
	}

	updated, err := r.SetTeam(ctx, clerkID, models.TeamElectrical, "Ada Lovelace", "U4 Software Eng", "ada@mail.mcgill.ca")
	if err != nil {
		t.Fatalf("SetTeam: %v", err)
	}
	if !updated {
		t.Fatalf("SetTeam reported no update for a fresh user")
	}

	var got models.User
	if err := r.coll.FindOne(ctx, bson.M{"clerkId": clerkID}).Decode(&got); err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if got.Team != models.TeamElectrical {
		t.Errorf("team = %q, want %q", got.Team, models.TeamElectrical)
	}
	if got.Name != "Ada Lovelace" {
		t.Errorf("name = %q, want %q", got.Name, "Ada Lovelace")
	}
	if got.Major != "U4 Software Eng" {
		t.Errorf("major = %q, want %q", got.Major, "U4 Software Eng")
	}
	if got.Email != "ada@mail.mcgill.ca" {
		t.Errorf("email = %q, want %q", got.Email, "ada@mail.mcgill.ca")
	}
}

// TestSetTeam_ExistingTeam_StillSavesProfile reproduces the reported bug:
// a user whose team was already on file (set before name/major/email
// existed, or from an earlier partial submission) must still get their
// profile recorded when they resubmit the same team, instead of silently
// no-op'ing behind the team's set-once guard.
func TestSetTeam_ExistingTeam_StillSavesProfile(t *testing.T) {
	r := testRepo(t)
	ctx := context.Background()
	clerkID := fakeClerkID("existing")
	cleanupUser(t, r, clerkID)

	if _, err := r.GetOrCreate(ctx, clerkID); err != nil {
		t.Fatalf("GetOrCreate: %v", err)
	}
	// Simulate a team assigned before name/major/email existed on the schema.
	if _, err := r.coll.UpdateOne(ctx, bson.M{"clerkId": clerkID}, bson.M{"$set": bson.M{"team": models.TeamComputer}}); err != nil {
		t.Fatalf("seed existing team: %v", err)
	}

	updated, err := r.SetTeam(ctx, clerkID, models.TeamComputer, "Grace Hopper", "U2 Computer Eng", "grace@mail.mcgill.ca")
	if err != nil {
		t.Fatalf("SetTeam: %v", err)
	}
	if !updated {
		t.Fatalf("SetTeam reported no update when resubmitting the same team — this is the reported bug")
	}

	var got models.User
	if err := r.coll.FindOne(ctx, bson.M{"clerkId": clerkID}).Decode(&got); err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if got.Name != "Grace Hopper" || got.Major != "U2 Computer Eng" || got.Email != "grace@mail.mcgill.ca" {
		t.Errorf("profile not saved on resubmit: got %+v", got)
	}
}

// TestSetTeam_DifferentTeam_IsConflict makes sure the fix above didn't
// remove the intentional guard against switching teams without exec
// approval.
func TestSetTeam_DifferentTeam_IsConflict(t *testing.T) {
	r := testRepo(t)
	ctx := context.Background()
	clerkID := fakeClerkID("conflict")
	cleanupUser(t, r, clerkID)

	if _, err := r.GetOrCreate(ctx, clerkID); err != nil {
		t.Fatalf("GetOrCreate: %v", err)
	}
	if _, err := r.SetTeam(ctx, clerkID, models.TeamElectrical, "First Name", "U1 EE", "first@mail.mcgill.ca"); err != nil {
		t.Fatalf("initial SetTeam: %v", err)
	}

	updated, err := r.SetTeam(ctx, clerkID, models.TeamSoftware, "Second Name", "U1 SE", "second@mail.mcgill.ca")
	if err != nil {
		t.Fatalf("SetTeam: %v", err)
	}
	if updated {
		t.Fatalf("SetTeam allowed switching from electrical to software — the team guard should reject this")
	}

	// And the conflicting attempt must not have clobbered the original profile.
	var got models.User
	if err := r.coll.FindOne(ctx, bson.M{"clerkId": clerkID}).Decode(&got); err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if got.Team != models.TeamElectrical || got.Name != "First Name" {
		t.Errorf("conflicting call altered the existing profile: got %+v", got)
	}
}
