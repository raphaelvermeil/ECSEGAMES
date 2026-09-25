package scunts

import (
	"context"
	"errors"
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	collectionName            = "scuntsSubmissions"
	tasksCollectionName       = "scuntsTasks"
	completionsCollectionName = "scuntsCompletions"
	sectionsCollectionName    = "scuntsSections"
)

// ListLimit caps how many submissions a single listing returns. The gallery
// is newest-first and unpaginated for now, so this is what stops a long
// weekend from producing an unbounded response.
const ListLimit = 200

// Store persists Scunts submissions in MongoDB. It holds metadata only —
// the media lives in R2 (see storage.go).
type Store struct {
	coll        *mongo.Collection
	tasks       *mongo.Collection
	completions *mongo.Collection
	sections    *mongo.Collection
}

// NewStore returns a submission store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{
		coll:        database.Collection(collectionName),
		tasks:       database.Collection(tasksCollectionName),
		completions: database.Collection(completionsCollectionName),
		sections:    database.Collection(sectionsCollectionName),
	}
}

// EnsureIndexes creates the descending submittedAt index the gallery reads
// in, and seeds the built-in checklist sections. Call once at startup.
func (s *Store) EnsureIndexes(ctx context.Context) error {
	// Unique prefix is what keeps two sections from both numbering as G1.
	if _, err := s.sections.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "key", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "prefix", Value: 1}}, Options: options.Index().SetUnique(true)},
	}); err != nil {
		return err
	}
	// $setOnInsert so an existing built-in is left exactly as it is.
	for _, sec := range builtinSections {
		if _, err := s.sections.UpdateOne(ctx,
			bson.M{"key": sec.Key},
			bson.M{"$setOnInsert": sec},
			options.Update().SetUpsert(true),
		); err != nil {
			return err
		}
	}
	if _, err := s.coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "submittedAt", Value: -1}},
	}); err != nil {
		return err
	}
	if _, err := s.tasks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "category", Value: 1}, {Key: "order", Value: 1}},
	}); err != nil {
		return err
	}
	// Unique, and not just an optimisation: the toggle upserts, so without
	// it two teammates tapping the same box at the same moment would both
	// insert and the task would read as done twice.
	_, err := s.completions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "taskId", Value: 1}, {Key: "team", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return err
}

// ListSections returns every checklist section in display order.
func (s *Store) ListSections(ctx context.Context) ([]Section, error) {
	cur, err := s.sections.Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "order", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	list := []Section{}
	return list, cur.All(ctx, &list)
}

// SectionExists reports whether tasks may be filed under key.
func (s *Store) SectionExists(ctx context.Context, key Category) (bool, error) {
	n, err := s.sections.CountDocuments(ctx, bson.M{"key": key})
	return n > 0, err
}

// InsertSection adds a section after the existing ones. Its key is its own
// ID, so two sections with similar names can never collide. A taken prefix
// comes back as a mongo duplicate-key error.
func (s *Store) InsertSection(ctx context.Context, label, prefix string) (*Section, error) {
	var last Section
	err := s.sections.FindOne(ctx, bson.M{},
		options.FindOne().SetSort(bson.D{{Key: "order", Value: -1}})).Decode(&last)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, err
	}
	id := primitive.NewObjectID()
	sec := Section{ID: id, Key: Category(id.Hex()), Label: label, Prefix: prefix, Order: last.Order + 1}
	if _, err := s.sections.InsertOne(ctx, sec); err != nil {
		return nil, err
	}
	return &sec, nil
}

// ListTasks returns every mission, ordered by category then position.
func (s *Store) ListTasks(ctx context.Context) ([]Task, error) {
	cur, err := s.tasks.Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "category", Value: 1}, {Key: "order", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	list := []Task{}
	return list, cur.All(ctx, &list)
}

// InsertTask adds a mission at the end of its category.
func (s *Store) InsertTask(ctx context.Context, t Task) (*Task, error) {
	// Position it after whatever is already in that category. A gap left by
	// a deleted task is fine — only the relative order is ever read.
	var last Task
	err := s.tasks.FindOne(ctx, bson.M{"category": t.Category},
		options.FindOne().SetSort(bson.D{{Key: "order", Value: -1}})).Decode(&last)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, err
	}
	t.Order = last.Order + 1

	res, err := s.tasks.InsertOne(ctx, t)
	if err != nil {
		return nil, err
	}
	if id, ok := res.InsertedID.(primitive.ObjectID); ok {
		t.ID = id
	}
	return &t, nil
}

// UpdateTask edits a mission's wording, note or value in place.
func (s *Store) UpdateTask(ctx context.Context, id primitive.ObjectID, text, note string, points int) (*Task, error) {
	var t Task
	err := s.tasks.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"text": text, "note": note, "points": points}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&t)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetTask returns one mission, or mongo.ErrNoDocuments.
func (s *Store) GetTask(ctx context.Context, id primitive.ObjectID) (*Task, error) {
	var t Task
	if err := s.tasks.FindOne(ctx, bson.M{"_id": id}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

// DeleteTask removes a mission and every team's tick of it — leaving the
// completions would orphan rows that nothing can ever read.
func (s *Store) DeleteTask(ctx context.Context, id primitive.ObjectID) error {
	if _, err := s.tasks.DeleteOne(ctx, bson.M{"_id": id}); err != nil {
		return err
	}
	_, err := s.completions.DeleteMany(ctx, bson.M{"taskId": id})
	return err
}

// CompletionsFor returns one team's ticks, keyed by task ID.
func (s *Store) CompletionsFor(ctx context.Context, team models.Team) (map[primitive.ObjectID]Completion, error) {
	cur, err := s.completions.Find(ctx, bson.M{"team": team})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []Completion
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	out := make(map[primitive.ObjectID]Completion, len(list))
	for _, c := range list {
		out[c.TaskID] = c
	}
	return out, nil
}

// SetDone ticks a task for a team. Upsert rather than insert so a second
// tap from a teammate is harmless rather than a duplicate-key error.
func (s *Store) SetDone(ctx context.Context, taskID primitive.ObjectID, team models.Team, clerkID, name string) error {
	_, err := s.completions.UpdateOne(ctx,
		bson.M{"taskId": taskID, "team": team},
		bson.M{"$set": bson.M{
			"doneBy":     clerkID,
			"doneByName": name,
			"doneAt":     time.Now().UTC(),
		}},
		options.Update().SetUpsert(true),
	)
	return err
}

// ClearDone un-ticks a task for a team. Any teammate may do this, so
// removing something already removed is not an error.
func (s *Store) ClearDone(ctx context.Context, taskID primitive.ObjectID, team models.Team) error {
	_, err := s.completions.DeleteOne(ctx, bson.M{"taskId": taskID, "team": team})
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
