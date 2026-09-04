// Package audit records who changed what on an event (or its score
// entries) and when, so the Schedule tab's history view has something to
// show. Every entry carries the parent event's ID regardless of which
// entity actually changed, so a single query answers "everything that
// happened to this event."
package audit

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Verb is the action an entry records. Matches the vocabulary the history
// view renders with (see the design handoff doc): created/edited are
// neutral, awarded is positive, deleted covers both event deletion and
// score-entry revocation.
type Verb string

const (
	VerbCreated Verb = "created"
	VerbEdited  Verb = "edited"
	VerbAwarded Verb = "awarded"
	VerbDeleted Verb = "deleted"
)

// EntityType distinguishes which kind of record an entry is about.
type EntityType string

const (
	EntityEvent      EntityType = "event"
	EntityScoreEntry EntityType = "scoreEntry"
)

// Diff is one changed field, before and after. Values are pre-formatted
// strings (not typed) since they exist purely for display.
type Diff struct {
	Label string `bson:"label" json:"label"`
	From  string `bson:"from" json:"from"`
	To    string `bson:"to" json:"to"`
}

// Entry is a single history row. Actor is the acting user's display name,
// resolved from their profile and snapshotted at write time (see each
// package's actorName helper) — not a stable Clerk ID, so it reads as a
// person in the UI and won't retroactively change if their profile is
// later edited. Falls back to the raw Clerk ID for a user with no name on
// file yet.
type Entry struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EventID    primitive.ObjectID `bson:"eventId" json:"eventId"`
	EntityType EntityType         `bson:"entityType" json:"entityType"`
	EntityID   primitive.ObjectID `bson:"entityId" json:"entityId"`
	Verb       Verb               `bson:"verb" json:"verb"`
	Actor      string             `bson:"actor" json:"actor"`
	At         time.Time          `bson:"at" json:"at"`
	Text       string             `bson:"text" json:"text"`
	Diffs      []Diff             `bson:"diffs,omitempty" json:"diffs,omitempty"`
}
