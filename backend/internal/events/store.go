package events

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collectionName = "events"

// Store persists events in MongoDB.
type Store struct {
	coll *mongo.Collection
}

// NewStore returns an event store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{coll: database.Collection(collectionName)}
}

// ListFilter narrows List to a date range and/or category. Zero values are
// unfiltered: a zero From/To means unbounded, an empty Category means all.
type ListFilter struct {
	From     time.Time
	To       time.Time
	Category Category
}

// List returns events matching the filter, in chronological order.
func (s *Store) List(ctx context.Context, f ListFilter) ([]Event, error) {
	filter := bson.M{}
	if !f.From.IsZero() || !f.To.IsZero() {
		startsAt := bson.M{}
		if !f.From.IsZero() {
			startsAt["$gte"] = f.From
		}
		if !f.To.IsZero() {
			startsAt["$lte"] = f.To
		}
		filter["startsAt"] = startsAt
	}
	if f.Category != "" {
		filter["category"] = f.Category
	}

	opts := options.Find().SetSort(bson.D{{Key: "startsAt", Value: 1}})
	cur, err := s.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Event{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// Get returns a single event by ID. Returns mongo.ErrNoDocuments if it
// doesn't exist.
func (s *Store) Get(ctx context.Context, id primitive.ObjectID) (*Event, error) {
	var e Event
	if err := s.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Create inserts a new event and returns it with its assigned ID.
func (s *Store) Create(ctx context.Context, e Event) (*Event, error) {
	e.ID = primitive.NewObjectID()
	if _, err := s.coll.InsertOne(ctx, e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Update applies a partial update and returns the updated event. Returns
// mongo.ErrNoDocuments if id doesn't exist.
func (s *Store) Update(ctx context.Context, id primitive.ObjectID, set bson.M) (*Event, error) {
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var e Event
	if err := s.coll.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": set}, opts).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Delete removes an event by ID. Reports whether a document was deleted.
func (s *Store) Delete(ctx context.Context, id primitive.ObjectID) (bool, error) {
	res, err := s.coll.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return false, err
	}
	return res.DeletedCount > 0, nil
}
