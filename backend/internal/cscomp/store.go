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
	clockCollection      = "cscompClock"
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
	clock       *mongo.Collection
}

// NewStore returns a comp store backed by the given database.
func NewStore(database *mongo.Database) *Store {
	return &Store{
		challenges:  database.Collection(challengeCollection),
		teams:       database.Collection(teamCollection),
		submissions: database.Collection(submissionCollection),
		claims:      database.Collection(claimCollection),
		clock:       database.Collection(clockCollection),
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
	if _, err := s.submissions.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "challengeId", Value: 1}, {Key: "clerkId", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		// The standings scan solved submissions on every poll; a team's
		// progress board reads by teamId.
		{Keys: bson.D{{Key: "matchPercent", Value: 1}}},
		{Keys: bson.D{{Key: "teamId", Value: 1}}},
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

// ListChallenges returns every challenge in play order.
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
// be rerun without duplicating the challenge documents or minting new IDs that
// would orphan existing submissions and claims.
func (s *Store) UpsertChallenge(ctx context.Context, c Challenge) (*Challenge, error) {
	update := bson.M{
		"$set": bson.M{
			"level":       c.Level,
			"part":        c.Part,
			"points":      c.Points,
			"starterCode": c.Starter,
			"example":     c.Example,
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

// PruneChallengesNotIn drops every challenge whose name is not in keep,
// and reports which ones went. The seeder is the only definition of the
// set, so a part that has been renamed or dropped there has to leave the
// database too: UpsertChallenge is keyed on the name, so without this a
// rename silently leaves the old document behind, sharing a level and a
// part number with its replacement and pointing at an image nobody
// regenerates.
//
// Submissions and claims against a pruned challenge are left where they
// are. They refer to a challenge that no longer exists either way, and
// the standings only count solved submissions whose challenge still
// resolves.
func (s *Store) PruneChallengesNotIn(ctx context.Context, keep []string) ([]string, error) {
	cur, err := s.challenges.Find(ctx, bson.M{"name": bson.M{"$nin": keep}})
	if err != nil {
		return nil, err
	}
	var stale []Challenge
	if err := cur.All(ctx, &stale); err != nil {
		return nil, err
	}
	if len(stale) == 0 {
		return nil, nil
	}

	names := make([]string, 0, len(stale))
	for _, c := range stale {
		names = append(names, c.Name)
	}
	if _, err := s.challenges.DeleteMany(ctx, bson.M{"name": bson.M{"$in": names}}); err != nil {
		return nil, err
	}
	return names, nil
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
// attempt beats the stored one. The comparison happens inside a single
// pipeline update so two submits landing at once can't both read the old
// best and let the worse one overwrite the better — the code has to travel
// with the percentage, which is why this is a $cond rather than a $max.
//
// The name follows the person; the team is fixed at first submit so a
// solve stays credited to the roster it was made on (see Submission)
// rather than moving with them if they switch sub-teams.
func (s *Store) UpsertSubmission(ctx context.Context, sub Submission) (*Submission, error) {
	filter := bson.M{"challengeId": sub.ChallengeID, "clerkId": sub.ClerkID}
	now := time.Now().UTC()

	// A missing matchPercent (first attempt) reads as -1, so it always loses.
	improved := bson.M{"$gt": bson.A{sub.MatchPercent, bson.M{"$ifNull": bson.A{"$matchPercent", -1}}}}
	// $literal keeps a code string that happens to start with "$" from being
	// read as a field path.
	update := bson.A{bson.M{"$set": bson.M{
		"teamId":       bson.M{"$ifNull": bson.A{"$teamId", sub.TeamID}},
		"name":         bson.M{"$literal": sub.Name},
		"attempts":     bson.M{"$add": bson.A{bson.M{"$ifNull": bson.A{"$attempts", 0}}, 1}},
		"code":         bson.M{"$cond": bson.A{improved, bson.M{"$literal": sub.Code}, "$code"}},
		"matchPercent": bson.M{"$cond": bson.A{improved, sub.MatchPercent, "$matchPercent"}},
		"submittedAt":  bson.M{"$cond": bson.A{improved, now, "$submittedAt"}},
	}}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var out Submission
	err := s.submissions.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out)
	if mongo.IsDuplicateKeyError(err) {
		// Two first attempts raced the unique index; the loser just retries
		// against the document the winner inserted.
		err = s.submissions.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out)
	}
	if err != nil {
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

// ListSolvedSubmissions returns every submission that cleared the pass
// threshold, across all sub-teams — the raw material for the standings.
//
// The filter is the same PassThreshold the Submission.Solved method uses,
// applied in the query so the board does not pull down every challenge ×
// every roster's worth of failed attempts just to throw most of them away.
func (s *Store) ListSolvedSubmissions(ctx context.Context) ([]Submission, error) {
	cur, err := s.submissions.Find(ctx, bson.M{"matchPercent": bson.M{"$gte": PassThreshold}})
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

// GetClock returns the comp clock, or a fresh unstarted one of the given
// length if no exec has touched it yet. The default is not written on
// read: a clock nobody has started has nothing worth persisting.
func (s *Store) GetClock(ctx context.Context, defaultSeconds int) (*Clock, error) {
	var c Clock
	err := s.clock.FindOne(ctx, bson.M{"_id": clockID}).Decode(&c)
	if errors.Is(err, mongo.ErrNoDocuments) {
		fresh := NewClock(defaultSeconds)
		return &fresh, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// SaveClock writes the single clock document.
func (s *Store) SaveClock(ctx context.Context, c Clock) error {
	c.ID = clockID
	c.UpdatedAt = time.Now().UTC()
	_, err := s.clock.ReplaceOne(ctx, bson.M{"_id": clockID}, c, options.Replace().SetUpsert(true))
	return err
}
