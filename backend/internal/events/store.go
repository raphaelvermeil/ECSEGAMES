package events

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	collectionName         = "events"
	categoryCollectionName = "eventCategories"
)

// Store persists events and their categories in MongoDB.
type Store struct {
	coll *mongo.Collection
	cats *mongo.Collection
}

// NewStore returns an event store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{
		coll: database.Collection(collectionName),
		cats: database.Collection(categoryCollectionName),
	}
}

// caseInsensitive makes "meals" and "Meals" the same category name.
var caseInsensitive = &options.Collation{Locale: "en", Strength: 2}

// EnsureCategories prepares the categories collection at boot: a unique
// (case-insensitive) index on name, the default categories when the
// collection is empty, and a one-time move of events written before events
// could have several categories from their single "category" field to a
// "categories" list. Every step is safe to rerun.
func (s *Store) EnsureCategories(ctx context.Context) error {
	if _, err := s.cats.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true).SetCollation(caseInsensitive),
	}); err != nil {
		return err
	}

	n, err := s.cats.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if n == 0 {
		now := time.Now().UTC()
		docs := make([]any, len(defaultCategories))
		for i, c := range defaultCategories {
			c.ID = primitive.NewObjectID()
			c.CreatedAt = now
			docs[i] = c
		}
		// Ordered, so _id order (the list order) matches defaultCategories.
		if _, err := s.cats.InsertMany(ctx, docs); err != nil {
			return err
		}
	}

	_, err = s.coll.UpdateMany(ctx,
		bson.M{"category": bson.M{"$exists": true}},
		mongo.Pipeline{
			{{Key: "$set", Value: bson.M{"categories": bson.A{"$category"}}}},
			{{Key: "$unset", Value: "category"}},
		},
	)
	return err
}

// ListCategories returns every category, oldest first.
func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
	opts := options.Find().SetSort(bson.D{{Key: "_id", Value: 1}})
	cur, err := s.cats.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Category{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// CreateCategory inserts a new category. A name already taken (ignoring
// case) fails with a duplicate-key error.
func (s *Store) CreateCategory(ctx context.Context, c Category) (*Category, error) {
	c.ID = primitive.NewObjectID()
	if _, err := s.cats.InsertOne(ctx, c); err != nil {
		return nil, err
	}
	return &c, nil
}

// GetCategory returns a single category by ID. Returns
// mongo.ErrNoDocuments if it doesn't exist.
func (s *Store) GetCategory(ctx context.Context, id primitive.ObjectID) (*Category, error) {
	var c Category
	if err := s.cats.FindOne(ctx, bson.M{"_id": id}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

// DeleteCategory removes a category and takes it off every event that had
// it. The events go first: if the delete then fails, the category is merely
// unused, rather than events pointing at one that no longer exists.
func (s *Store) DeleteCategory(ctx context.Context, c Category) error {
	if _, err := s.coll.UpdateMany(ctx,
		bson.M{"categories": c.Name},
		bson.M{"$pull": bson.M{"categories": c.Name}},
	); err != nil {
		return err
	}
	_, err := s.cats.DeleteOne(ctx, bson.M{"_id": c.ID})
	return err
}

// EnsureIndexes backs the schedule's chronological listing with an index,
// so it stays a range scan rather than an in-memory sort as events grow.
func (s *Store) EnsureIndexes(ctx context.Context) error {
	_, err := s.coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "startsAt", Value: 1}},
	})
	return err
}

// ListFilter narrows List to a date range and/or category. Zero values are
// unfiltered: a zero From/To means unbounded, an empty Category means all.
type ListFilter struct {
	From     time.Time
	To       time.Time
	Category string
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
		filter["categories"] = f.Category
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

// Exists reports whether an event with this ID is stored. The scores
// handler uses it so points can't be awarded against a made-up or deleted
// event.
func (s *Store) Exists(ctx context.Context, id primitive.ObjectID) (bool, error) {
	n, err := s.coll.CountDocuments(ctx, bson.M{"_id": id}, options.Count().SetLimit(1))
	return n > 0, err
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
