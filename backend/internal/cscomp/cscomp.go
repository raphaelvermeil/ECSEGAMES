// Package cscomp runs the CS competition: 40 CSS challenges a student
// replicates by writing HTML and CSS, scored on how closely the result
// matches a target image.
//
// The scoring is deliberately server-authoritative. A submission carries
// only the student's code — never a percentage — and the server renders
// that code itself (see render.go) before diffing the pixels against a
// solution PNG the client cannot influence (see compare.go). Anything the
// browser computes is decoration; the number that counts is produced here.
//
// The comp is self-contained: it keeps its own sub-teams (five students,
// separate from the four Games teams), its own claims, and its own
// submission history. It writes nothing into scoreEntries and does not
// touch the Games leaderboard.
package cscomp

import (
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PassThreshold is the match percentage at or above which a challenge is
// solved, awarding its full points. Below it the challenge is worth
// nothing — there is no partial credit.
const PassThreshold = 98.0

// MaxCodeBytes caps a submission's source. Untrusted markup gets rendered
// in a real browser, so the size is bounded before any of it reaches
// Chrome.
const MaxCodeBytes = 64 * 1024

// Challenge is one of the 50 tasks: level 1-10, part 1-5. The solution
// image is not stored on the document — it lives on disk at
// <solutionsDir>/<Slug(Name)>.png, which is why Name is unique.
type Challenge struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name    string             `bson:"name" json:"name"`
	Level   int                `bson:"level" json:"level"`
	Part    int                `bson:"part" json:"part"`
	Points  int                `bson:"points" json:"points"`
	Starter string             `bson:"starterCode" json:"starterCode"`
	// Example is the worked snippet the editor shows beside the target: the
	// level's technique demonstrated on a scene that is not one of the parts.
	// Empty on the levels that teach no technique, and the panel is hidden
	// when it is.
	Example   string    `bson:"example" json:"example"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

// Slug turns a challenge name into its solution image's basename:
// "The quad at golden hour" -> "the-quad-at-golden-hour". The names are
// unique (enforced by index), so the derived paths never collide.
func Slug(name string) string {
	return strings.ReplaceAll(strings.ToLower(name), " ", "-")
}

// Team is a comp sub-team of up to five students. It is unrelated to
// models.Team — a sub-team mixes people from any of the four Games teams.
// Membership lives on the user document (User.CSCompTeamID) rather than
// here, so a roster is a query rather than an array to keep in sync.
type Team struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// TeamSize is the cap on a sub-team's roster.
const TeamSize = 5

// Submission is one student's best attempt at one challenge — at most one
// document per (challenge, student). Code and MatchPercent always describe
// the *best* attempt so far, not the latest one; Attempts counts every
// try.
//
// TeamID and Name are snapshots taken at submit time. That keeps team
// progress a single {teamId: X} query and keeps a solve credited to the
// person who made it even if they later leave the sub-team.
type Submission struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChallengeID  primitive.ObjectID `bson:"challengeId" json:"challengeId"`
	ClerkID      string             `bson:"clerkId" json:"clerkId"`
	TeamID       primitive.ObjectID `bson:"teamId" json:"teamId"`
	Name         string             `bson:"name" json:"name"`
	Code         string             `bson:"code" json:"code"`
	MatchPercent float64            `bson:"matchPercent" json:"matchPercent"`
	Attempts     int                `bson:"attempts" json:"attempts"`
	SubmittedAt  time.Time          `bson:"submittedAt" json:"submittedAt"`
}

// Solved reports whether this submission cleared the pass threshold.
func (s Submission) Solved() bool { return s.MatchPercent >= PassThreshold }

// Claim is a teammate calling dibs on a challenge, so a sub-team can split
// the work without two people building the same part. Two unique indexes
// enforce the rules (see Store.EnsureIndexes): one claimer per challenge
// per team, and one claim per person per level.
//
// Level is denormalized from the challenge so the per-level rule can be an
// index rather than a lookup.
type Claim struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TeamID      primitive.ObjectID `bson:"teamId" json:"teamId"`
	ChallengeID primitive.ObjectID `bson:"challengeId" json:"challengeId"`
	ClerkID     string             `bson:"clerkId" json:"clerkId"`
	Name        string             `bson:"name" json:"name"`
	Level       int                `bson:"level" json:"level"`
	ClaimedAt   time.Time          `bson:"claimedAt" json:"claimedAt"`
}
