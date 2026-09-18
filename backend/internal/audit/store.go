package audit

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collectionName = "auditEntries"

// Store persists audit entries in MongoDB.
type Store struct {
	coll *mongo.Collection
}

// NewStore returns an audit store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{coll: database.Collection(collectionName)}
}

// Record inserts an entry. At is set to now if the caller left it zero.
//
// The write is detached from the caller's cancellation: callers record
// after the data change has already landed, and a client that disconnects
// in between must not leave a score or event change with no history row.
// The deadline is kept short so a stuck insert still can't pin a goroutine.
func (s *Store) Record(ctx context.Context, e Entry) error {
	e.ID = primitive.NewObjectID()
	if e.At.IsZero() {
		e.At = time.Now().UTC()
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	_, err := s.coll.InsertOne(ctx, e)
	return err
}

// ListByEvent returns every entry for an event — from the event itself and
// from any of its score entries — reverse-chronological.
func (s *Store) ListByEvent(ctx context.Context, eventID primitive.ObjectID) ([]Entry, error) {
	opts := options.Find().SetSort(bson.D{{Key: "at", Value: -1}})
	cur, err := s.coll.Find(ctx, bson.M{"eventId": eventID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	entries := []Entry{}
	if err := cur.All(ctx, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}
