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

// Upsert creates the user, or updates the email of an existing one, keyed on
// ClerkID. It is idempotent so repeated webhook deliveries don't duplicate
// records. Role and CreatedAt are written only on first insert, so re-delivered
// creation events can't reset a user's role or creation time.
func (r *Repository) Upsert(ctx context.Context, u models.User) error {
	filter := bson.M{"clerkId": u.ClerkID}
	update := bson.M{
		"$set": bson.M{
			"email": u.Email,
		},
		"$setOnInsert": bson.M{
			"clerkId":   u.ClerkID,
			"role":      u.Role,
			"createdAt": u.CreatedAt,
		},
	}
	_, err := r.coll.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

// GetOrCreate returns the user for clerkID, inserting a minimal record (role
// student, no team) if none exists yet. It only ever writes on insert
// (`$setOnInsert`), so it never overwrites fields an existing record already
// has — in particular the email the webhook populated.
func (r *Repository) GetOrCreate(ctx context.Context, clerkID string) (*models.User, error) {
	filter := bson.M{"clerkId": clerkID}
	update := bson.M{
		"$setOnInsert": bson.M{
			"clerkId":   clerkID,
			"email":     "",
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

// SetTeam assigns the team only if the user hasn't joined one yet (set-once).
// It reports whether the assignment happened; false means the user already had
// a team, which the caller should treat as a conflict.
func (r *Repository) SetTeam(ctx context.Context, clerkID string, team models.Team) (bool, error) {
	// Match users with no team yet: empty string, explicit null, or the field
	// missing entirely (older docs created before the team field existed —
	// `$in [nil]` matches absent fields too).
	filter := bson.M{"clerkId": clerkID, "team": bson.M{"$in": bson.A{"", nil}}}
	update := bson.M{"$set": bson.M{"team": team}}

	res, err := r.coll.UpdateOne(ctx, filter, update)
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}
