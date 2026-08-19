// Package scores tracks points awarded to teams for a segment of an event.
// Entries are never hard-deleted — the scoring table shows a full history
// including corrections, so a "delete" is a revoke that keeps the row
// visible (struck through) rather than removing it.
package scores

import (
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ScoreEntry is a single points award against an event.
type ScoreEntry struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EventID      primitive.ObjectID `bson:"eventId" json:"eventId"`
	Team         models.Team        `bson:"team" json:"team"`
	Segment      string             `bson:"segment" json:"segment"`
	Value        int                `bson:"value" json:"value"`
	Description  string             `bson:"description" json:"description"`
	AwardedBy    string             `bson:"awardedBy" json:"awardedBy"`
	AwardedAt    time.Time          `bson:"awardedAt" json:"awardedAt"`
	LastEditedBy string             `bson:"lastEditedBy" json:"lastEditedBy"`
	LastEditedAt time.Time          `bson:"lastEditedAt" json:"lastEditedAt"`
	Revoked      bool               `bson:"revoked" json:"revoked"`
	RevokedBy    string             `bson:"revokedBy,omitempty" json:"revokedBy,omitempty"`
	RevokedAt    *time.Time         `bson:"revokedAt,omitempty" json:"revokedAt,omitempty"`
}
