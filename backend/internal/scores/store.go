package scores

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

const collectionName = "scoreEntries"

// ErrAlreadyCleared is returned by Clear when the entry has already been
// cleared — the caller should treat this as a conflict, not a hard failure.
var ErrAlreadyCleared = errors.New("score entry already cleared")

// Store persists score entries in MongoDB.
type Store struct {
	coll *mongo.Collection
}

// NewStore returns a score store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{coll: database.Collection(collectionName)}
}

// ListByEvent returns every score entry for an event, including cleared
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

// GetByTeam returns the entry for a team on an event, if one exists yet.
// Returns mongo.ErrNoDocuments if the team hasn't been graded on this event.
func (s *Store) GetByTeam(ctx context.Context, eventID primitive.ObjectID, team models.Team) (*ScoreEntry, error) {
	var e ScoreEntry
	filter := bson.M{"eventId": eventID, "team": team}
	if err := s.coll.FindOne(ctx, filter).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Upsert awards points to a team on an event. A team has at most one entry
// per event: awarding again overwrites value/description in place (and
// un-clears the entry, if it had been cleared) rather than adding a row.
// awardedBy/awardedAt are set only on first insert, so attribution for the
// original award is preserved across later overwrites.
func (s *Store) Upsert(ctx context.Context, eventID primitive.ObjectID, team models.Team, value int, description, editedBy string) (*ScoreEntry, error) {
	now := time.Now().UTC()
	filter := bson.M{"eventId": eventID, "team": team}
	update := bson.M{
		"$set": bson.M{
			"value":        value,
			"description":  description,
			"lastEditedBy": editedBy,
			"lastEditedAt": now,
			"cleared":      false,
		},
		"$setOnInsert": bson.M{
			"eventId":   eventID,
			"team":      team,
			"awardedBy": editedBy,
			"awardedAt": now,
		},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var e ScoreEntry
	if err := s.coll.FindOneAndUpdate(ctx, filter, update, opts).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Clear soft-deletes an entry, returning it to not-yet-graded: it stays in
// storage (so its history survives) but is marked cleared. Returns
// ErrAlreadyCleared if it already was, mongo.ErrNoDocuments if it doesn't
// exist at all.
func (s *Store) Clear(ctx context.Context, id primitive.ObjectID, clearedBy string) (*ScoreEntry, error) {
	now := time.Now().UTC()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	filter := bson.M{"_id": id, "cleared": false}
	update := bson.M{"$set": bson.M{
		"cleared":   true,
		"clearedBy": clearedBy,
		"clearedAt": now,
	}}

	var e ScoreEntry
	err := s.coll.FindOneAndUpdate(ctx, filter, update, opts).Decode(&e)
	if err == mongo.ErrNoDocuments {
		if _, getErr := s.Get(ctx, id); getErr == nil {
			return nil, ErrAlreadyCleared
		}
		return nil, mongo.ErrNoDocuments
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}
