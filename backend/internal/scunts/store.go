package scunts

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collectionName = "scuntsSubmissions"

// ListLimit caps how many submissions a single listing returns. The gallery
// is newest-first and unpaginated for now, so this is what stops a long
// weekend from producing an unbounded response.
const ListLimit = 200

// Store persists Scunts submissions in MongoDB. It holds metadata only —
// the media lives in R2 (see storage.go).
type Store struct {
	coll *mongo.Collection
}

// NewStore returns a submission store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{coll: database.Collection(collectionName)}
}

// EnsureIndexes creates the descending submittedAt index the gallery reads
// in. Call once at startup.
func (s *Store) EnsureIndexes(ctx context.Context) error {
	_, err := s.coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "submittedAt", Value: -1}},
	})
	return err
}

// Insert stores a submission and returns it with its generated ID.
func (s *Store) Insert(ctx context.Context, sub Submission) (*Submission, error) {
	res, err := s.coll.InsertOne(ctx, sub)
	if err != nil {
		return nil, err
	}
	if id, ok := res.InsertedID.(primitive.ObjectID); ok {
		sub.ID = id
	}
	return &sub, nil
}

// List returns submissions newest first, capped at ListLimit.
func (s *Store) List(ctx context.Context) ([]Submission, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "submittedAt", Value: -1}}).
		SetLimit(ListLimit)

	cur, err := s.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	// Non-nil so an empty collection marshals as [] rather than null.
	list := []Submission{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// Get returns one submission, or mongo.ErrNoDocuments if it doesn't exist.
func (s *Store) Get(ctx context.Context, id primitive.ObjectID) (*Submission, error) {
	var sub Submission
	if err := s.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

// Delete removes a submission outright. Unlike a score entry there is no
// soft delete: the R2 object is gone too, so a tombstone would point at
// nothing.
func (s *Store) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := s.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
