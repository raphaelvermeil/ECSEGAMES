package cscomp

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	challengeCollection  = "cscompChallenges"
	teamCollection       = "cscompTeams"
	submissionCollection = "cscompSubmissions"
	claimCollection      = "cscompClaims"
)

// ErrConflict is returned when a write loses to one of the uniqueness
// rules — a challenge already claimed by the team, or a person who has
// already claimed something on that level. Callers map it to 409.
var ErrConflict = errors.New("cscomp: conflicting claim")

// Store persists the comp's four collections in MongoDB.
type Store struct {
	challenges  *mongo.Collection
	teams       *mongo.Collection
	submissions *mongo.Collection
	claims      *mongo.Collection
}

// NewStore returns a comp store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{
		challenges:  database.Collection(challengeCollection),
		teams:       database.Collection(teamCollection),
		submissions: database.Collection(submissionCollection),
		claims:      database.Collection(claimCollection),
	}
}

// EnsureIndexes creates the indexes the comp's rules depend on. The two
// claim indexes are not an optimisation: they are how the claim rules are
// enforced, atomically, instead of as a check-then-write race. Call once
// at startup.
func (s *Store) EnsureIndexes(ctx context.Context) error {
	if _, err := s.challenges.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}
	if _, err := s.submissions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "challengeId", Value: 1}, {Key: "clerkId", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}
	_, err := s.claims.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{ // one claimer per challenge, per team — "TAKEN" in the UI
			Keys:    bson.D{{Key: "teamId", Value: 1}, {Key: "challengeId", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{ // one claim per person per level, so five teammates spread across the five parts
			Keys:    bson.D{{Key: "teamId", Value: 1}, {Key: "clerkId", Value: 1}, {Key: "level", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	})
	return err
}

// ListChallenges returns all 30 challenges in play order.
func (s *Store) ListChallenges(ctx context.Context) ([]Challenge, error) {
	opts := options.Find().SetSort(bson.D{{Key: "level", Value: 1}, {Key: "part", Value: 1}})
	cur, err := s.challenges.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Challenge{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// GetChallenge returns one challenge by ID, or mongo.ErrNoDocuments.
func (s *Store) GetChallenge(ctx context.Context, id primitive.ObjectID) (*Challenge, error) {
	var c Challenge
	if err := s.challenges.FindOne(ctx, bson.M{"_id": id}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

// UpsertChallenge writes a challenge keyed on its name, so the seeder can
// be rerun without duplicating the 30 documents or minting new IDs that
// would orphan existing submissions and claims.
func (s *Store) UpsertChallenge(ctx context.Context, c Challenge) (*Challenge, error) {
	update := bson.M{
		"$set": bson.M{
			"level":       c.Level,
			"part":        c.Part,
			"points":      c.Points,
			"starterCode": c.Starter,
		},
		"$setOnInsert": bson.M{
			"name":      c.Name,
			"createdAt": time.Now().UTC(),
		},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var out Challenge
	if err := s.challenges.FindOneAndUpdate(ctx, bson.M{"name": c.Name}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListTeams returns every sub-team, oldest first.
func (s *Store) ListTeams(ctx context.Context) ([]Team, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	cur, err := s.teams.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Team{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// GetTeam returns one sub-team by ID, or mongo.ErrNoDocuments.
func (s *Store) GetTeam(ctx context.Context, id primitive.ObjectID) (*Team, error) {
	var t Team
	if err := s.teams.FindOne(ctx, bson.M{"_id": id}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

// CreateTeam inserts a new sub-team.
func (s *Store) CreateTeam(ctx context.Context, name string) (*Team, error) {
	t := Team{ID: primitive.NewObjectID(), Name: name, CreatedAt: time.Now().UTC()}
	if _, err := s.teams.InsertOne(ctx, t); err != nil {
		return nil, err
	}
	return &t, nil
}

// ListSubmissionsByTeam returns every submission credited to a sub-team —
// the team's progress board, including attempts that have not passed yet.
func (s *Store) ListSubmissionsByTeam(ctx context.Context, teamID primitive.ObjectID) ([]Submission, error) {
	cur, err := s.submissions.Find(ctx, bson.M{"teamId": teamID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Submission{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// UpsertSubmission records an attempt, keeping the best result. Attempts
// always increments; code, percent and timestamp only move when the new
// attempt beats the stored one — which is why this reads before it writes
// rather than using $max: the code has to travel with the percentage.
func (s *Store) UpsertSubmission(ctx context.Context, sub Submission) (*Submission, error) {
	filter := bson.M{"challengeId": sub.ChallengeID, "clerkId": sub.ClerkID}

	var existing Submission
	err := s.submissions.FindOne(ctx, filter).Decode(&existing)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, err
	}
	improved := err == mongo.ErrNoDocuments || sub.MatchPercent > existing.MatchPercent

	set := bson.M{}
	if improved {
		set["code"] = sub.Code
		set["matchPercent"] = sub.MatchPercent
		set["submittedAt"] = time.Now().UTC()
	}
	// The team and name snapshots follow the person rather than the best
	// score, so a solve is credited to whichever roster they are on now.
	set["teamId"] = sub.TeamID
	set["name"] = sub.Name

	update := bson.M{
		"$set": set,
		"$inc": bson.M{"attempts": 1},
		"$setOnInsert": bson.M{
			"challengeId": sub.ChallengeID,
			"clerkId":     sub.ClerkID,
		},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var out Submission
	if err := s.submissions.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListClaimsByTeam returns every claim held by a sub-team.
func (s *Store) ListClaimsByTeam(ctx context.Context, teamID primitive.ObjectID) ([]Claim, error) {
	cur, err := s.claims.Find(ctx, bson.M{"teamId": teamID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	list := []Claim{}
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// CreateClaim calls dibs on a challenge. Both rules are enforced by the
// unique indexes rather than by checking first, so a duplicate-key error
// from either one is the answer — returned as ErrConflict.
func (s *Store) CreateClaim(ctx context.Context, c Claim) (*Claim, error) {
	c.ID = primitive.NewObjectID()
	c.ClaimedAt = time.Now().UTC()
	if _, err := s.claims.InsertOne(ctx, c); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, ErrConflict
		}
		return nil, err
	}
	return &c, nil
}

// DeleteClaim releases a claim. It matches on the claimer as well as the
// challenge, so a teammate can only ever drop their own. Returns
// mongo.ErrNoDocuments if there was nothing of theirs to drop.
func (s *Store) DeleteClaim(ctx context.Context, teamID, challengeID primitive.ObjectID, clerkID string) error {
	filter := bson.M{"teamId": teamID, "challengeId": challengeID, "clerkId": clerkID}
	res, err := s.claims.DeleteOne(ctx, filter)
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}

// DeleteClaimsByMember drops every claim a person holds on a sub-team,
// which is what leaving the team does: their reserved parts go back on the
// board for the teammates they left behind.
func (s *Store) DeleteClaimsByMember(ctx context.Context, teamID primitive.ObjectID, clerkID string) error {
	_, err := s.claims.DeleteMany(ctx, bson.M{"teamId": teamID, "clerkId": clerkID})
	return err
}
