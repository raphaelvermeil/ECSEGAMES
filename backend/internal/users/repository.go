package users

import (
	"context"

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
