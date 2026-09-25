package scunts

import (
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category is which mission sheet a task came from. They run at different
// times and places, so the list is grouped rather than merged: coord
// missions target a specific person, the night lists are tied to a venue.
type Category string

const (
	CategoryGeneral    Category = "general"
	CategoryCoord      Category = "coord"
	CategoryBoilerRoom Category = "boilerRoom"
	CategoryPubCrawl   Category = "pubCrawl"
)

// Section is one heading on the checklist. Key is what tasks store as their
// Category; Prefix is the letter(s) a mission's number carries (G1, B22).
// The four built-ins below are seeded at boot; execs can add more.
type Section struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"-"`
	Key    Category           `bson:"key" json:"key"`
	Label  string             `bson:"label" json:"label"`
	Prefix string             `bson:"prefix" json:"prefix"`
	Order  int                `bson:"order" json:"order"`
}

// builtinSections keep their existing keys so tasks created before sections
// were stored still land under them.
var builtinSections = []Section{
	{Key: CategoryGeneral, Label: "General", Prefix: "G", Order: 0},
	{Key: CategoryCoord, Label: "Coords", Prefix: "C", Order: 1},
	{Key: CategoryBoilerRoom, Label: "Boiler Room", Prefix: "B", Order: 2},
	{Key: CategoryPubCrawl, Label: "Pub Crawl", Prefix: "P", Order: 3},
}

// MaxSectionLabelLen and MaxSectionPrefixLen bound a new section's name and
// number prefix.
const (
	MaxSectionLabelLen  = 60
	MaxSectionPrefixLen = 3
)

// DefaultTaskPoints is what a new task is worth. Every mission is flat-rated
// for now — the source sheets carry 1-3 point values that are deliberately
// ignored, so this lives as a field rather than a constant in case that
// changes.
const DefaultTaskPoints = 100

// MaxTaskTextLen bounds a mission's text. The longest in the seed sheets is
// around 140 characters; this leaves room without being unbounded.
const MaxTaskTextLen = 500

// Task is one mission on a checklist. Order is the position within its
// category, kept as its own field so an exec adding a mission mid-event
// doesn't have to renumber anything — new tasks land at the end.
type Task struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Category  Category           `bson:"category" json:"category"`
	Text      string             `bson:"text" json:"text"`
	Note      string             `bson:"note,omitempty" json:"note,omitempty"`
	Points    int                `bson:"points" json:"points"`
	Order     int                `bson:"order" json:"order"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// Completion records that one team finished one task. There is at most one
// per (task, team) — enforced by a unique index, which is what makes the
// toggle race-safe when two teammates tap the same box at once.
//
// It is deliberately team-scoped rather than user-scoped: the whole team
// shares one checklist, and any teammate may tick or un-tick.
type Completion struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"-"`
	TaskID     primitive.ObjectID `bson:"taskId" json:"-"`
	Team       models.Team        `bson:"team" json:"-"`
	DoneBy     string             `bson:"doneBy" json:"-"`
	DoneByName string             `bson:"doneByName" json:"doneByName"`
	DoneAt     time.Time          `bson:"doneAt" json:"doneAt"`
}

// TaskView is a task as one team sees it: the mission plus whether that
// team has ticked it and who did. Completion state is resolved per request
// against the caller's team, so the same task looks different to Software
// than it does to Electrical.
type TaskView struct {
	Task
	Done       bool       `json:"done"`
	DoneByName string     `json:"doneByName,omitempty"`
	DoneAt     *time.Time `json:"doneAt,omitempty"`
}
