package users

import (
	"context"
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collectionName = "users"

// Repository stores users in MongoDB.
type Repository struct {
	coll *mongo.Collection
}

// NewRepository returns a user repository backed by the given database.
func NewRepository(database *mongo.Database) *Repository {
	return &Repository{coll: database.Collection(collectionName)}
}

// GetOrCreate returns the user for clerkID, inserting a minimal record (role
// student, no team) if none exists yet. This is how users first land in Mongo:
// the record is created on their first authenticated request rather than by a
// webhook. It only ever writes on insert (`$setOnInsert`), so it never
// overwrites fields an existing record already has.
func (r *Repository) GetOrCreate(ctx context.Context, clerkID string) (*models.User, error) {
	filter := bson.M{"clerkId": clerkID}
	update := bson.M{
		"$setOnInsert": bson.M{
			"clerkId":   clerkID,
			"role":      models.RoleStudent,
			"team":      models.Team(""),
			"createdAt": time.Now().UTC(),
		},
	}
	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var u models.User
	if err := r.coll.FindOneAndUpdate(ctx, filter, update, opts).Decode(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

// SetTeam completes onboarding: assigns the team and records the
// name/major/email collected on the same screen. The team itself is
// set-once, but resubmitting the *same* team is treated as an idempotent
// profile update rather than a conflict — this is what lets a user whose
// team was already on file (assigned before this profile info existed, or
// left over from an earlier submission that failed) still get their
// name/major/email recorded. Only a request for a genuinely different team
// is rejected. Reports whether the write happened; false means the user
// already has a different team, which the caller should treat as a
// conflict.
func (r *Repository) SetTeam(ctx context.Context, clerkID string, team models.Team, name, major, email string) (bool, error) {
	// Match users with no team yet (empty string, explicit null, or the
	// field missing entirely — older docs created before the team field
	// existed) or whose team already equals the one being submitted.
	filter := bson.M{"clerkId": clerkID, "team": bson.M{"$in": bson.A{"", nil, team}}}
	update := bson.M{"$set": bson.M{"team": team, "name": name, "major": major, "email": email}}

	res, err := r.coll.UpdateOne(ctx, filter, update)
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}
