// Package scores tracks the points an event has awarded each team. Each
// team gets at most one entry per event: awarding again overwrites the
// entry's value in place rather than adding a row, and every overwrite is
// recorded in the audit trail (see internal/audit) so the points panel can
// show a per-team history alongside the current value. A "delete" clears
// the entry back to not-yet-graded — it stays in storage (soft-deleted, so
// its history survives) rather than being removed outright.
package scores

import (
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ScoreEntry is the current points award for one team on one event.
// AwardedAt is the time of the entry's latest submission: it advances on
// every overwrite rather than being fixed at first award.
type ScoreEntry struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EventID     primitive.ObjectID `bson:"eventId" json:"eventId"`
	Team        models.Team        `bson:"team" json:"team"`
	Value       int                `bson:"value" json:"value"`
	Description string             `bson:"description" json:"description"`
	AwardedAt   time.Time          `bson:"awardedAt" json:"awardedAt"`
	Cleared     bool               `bson:"cleared" json:"cleared"`
}
