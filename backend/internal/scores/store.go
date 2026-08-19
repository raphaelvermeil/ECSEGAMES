package scores

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collectionName = "scoreEntries"

// ErrAlreadyRevoked is returned by Revoke when the entry has already been
// revoked — the caller should treat this as a conflict, not a hard failure.
var ErrAlreadyRevoked = errors.New("score entry already revoked")

// Store persists score entries in MongoDB.
type Store struct {
	coll *mongo.Collection
}

// NewStore returns a score store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{coll: database.Collection(collectionName)}
}

// ListByEvent returns every score entry for an event, including revoked
// ones, oldest first.
func (s *Store) ListByEvent(ctx context.Context, eventID primitive.ObjectID) ([]ScoreEntry, error) {
	opts := options.Find().SetSort(bson.D{{Key: "awardedAt", Value: 1}})
	cur, err := s.coll.Find(ctx, bson.M{"eventId": eventID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	entries := []ScoreEntry{}
	if err := cur.All(ctx, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

// Get returns a single score entry by ID. Returns mongo.ErrNoDocuments if
// it doesn't exist.
func (s *Store) Get(ctx context.Context, id primitive.ObjectID) (*ScoreEntry, error) {
	var e ScoreEntry
	if err := s.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Create inserts a new score entry and returns it with its assigned ID.
func (s *Store) Create(ctx context.Context, e ScoreEntry) (*ScoreEntry, error) {
	e.ID = primitive.NewObjectID()
	if _, err := s.coll.InsertOne(ctx, e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Update changes the value/description of an entry. Returns
// mongo.ErrNoDocuments if id doesn't exist.
func (s *Store) Update(ctx context.Context, id primitive.ObjectID, set bson.M) (*ScoreEntry, error) {
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var e ScoreEntry
	if err := s.coll.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": set}, opts).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Revoke soft-deletes an entry: it stays in the table (callers render it
// struck through) but is marked revoked. Returns ErrAlreadyRevoked if it
// already was, mongo.ErrNoDocuments if it doesn't exist at all.
func (s *Store) Revoke(ctx context.Context, id primitive.ObjectID, revokedBy string) (*ScoreEntry, error) {
	now := time.Now().UTC()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	filter := bson.M{"_id": id, "revoked": false}
	update := bson.M{"$set": bson.M{
		"revoked":   true,
		"revokedBy": revokedBy,
		"revokedAt": now,
	}}

	var e ScoreEntry
	err := s.coll.FindOneAndUpdate(ctx, filter, update, opts).Decode(&e)
	if err == mongo.ErrNoDocuments {
		if _, getErr := s.Get(ctx, id); getErr == nil {
			return nil, ErrAlreadyRevoked
		}
		return nil, mongo.ErrNoDocuments
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}
