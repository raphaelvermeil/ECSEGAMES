// Package scunts stores the photo and video proof students submit for the
// Scunts scavenger hunt.
//
// Each submission is proof for one mission. It starts pending, visible only
// to execs and the submitting team; an exec accepting it marks the mission
// done for that team and snapshots the mission's points onto it. Those
// accepted points reach the Games leaderboard through AcceptedPoints, which
// cmd/api wires into the scores handler — this package never writes to
// scoreEntries itself.
//
// The media itself lives in Cloudflare R2, not in Mongo and not on the
// container's disk (which is wiped on every deploy). A submission document
// holds only the object key; bytes travel browser-to-R2 directly through a
// presigned URL, so a 100 MB video never passes through this server. See
// storage.go.
package scunts

import (
	"time"

	"github.com/ecsegames/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Kind is the broad media type of a submission, derived from the content
// type rather than stored by the client. The frontend renders an <img> or a
// <video> from it.
type Kind string

const (
	KindImage Kind = "image"
	KindVideo Kind = "video"
)

// Size and length caps.
//
// Images are compressed in the browser before upload (roughly 400 KB), so
// the image cap is a backstop against an uncompressed original rather than
// an expected size. Videos are likewise compressed in the browser (a
// 120-second clip lands around 40 MB); the video cap is sized for the
// fallback, where a browser that can't compress sends the original.
//
// MaxFiles is how many photos/videos one proof may carry, for missions that
// need more than one shot.
const (
	MaxImageBytes int64 = 10 << 20  // 10 MB
	MaxVideoBytes int64 = 200 << 20 // 200 MB
	MaxCaptionLen       = 200
	MaxFiles            = 10
)

// allowedTypes is the content types a submission may have, mapped to the
// kind each implies. image/heic is deliberately absent: Safari uploads it
// but no other browser can display it, so the client converts to JPEG
// first. video/quicktime is present because that is what an iPhone
// produces.
var allowedTypes = map[string]Kind{
	"image/jpeg":      KindImage,
	"image/png":       KindImage,
	"image/webp":      KindImage,
	"video/mp4":       KindVideo,
	"video/quicktime": KindVideo,
}

// extensions gives each allowed content type the file extension its object
// key should carry. The extension is cosmetic — nothing reads it back — but
// it makes objects recognisable when browsing the bucket.
var extensions = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"video/mp4":       ".mp4",
	"video/quicktime": ".mov",
}

// KindFor reports the kind a content type implies, and whether it is
// allowed at all.
func KindFor(contentType string) (Kind, bool) {
	k, ok := allowedTypes[contentType]
	return k, ok
}

// MaxBytesFor is the size cap that applies to a kind.
func MaxBytesFor(k Kind) int64 {
	if k == KindVideo {
		return MaxVideoBytes
	}
	return MaxImageBytes
}

// NewKey builds the object key for a new submission. The key is always
// generated here, never supplied by the client, so one caller cannot
// overwrite another's object. The team prefix is what lets Create check
// that a key belongs to the caller before recording it.
func NewKey(team models.Team, contentType string) string {
	return "scunts/" + string(team) + "/" + primitive.NewObjectID().Hex() + extensions[contentType]
}

// Submission is one piece of proof. Team and SubmittedByName are
// snapshotted at write time rather than joined on read: the gallery shows
// who submitted what at the moment they did it, the same way audit entries
// keep the actor's name as it was.
//
// PhotoURL is not stored. It is a presigned R2 URL minted per response (see
// Handler.List), because the bucket is private.
type Submission struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Team            models.Team        `bson:"team" json:"team"`
	Key             string             `bson:"key" json:"-"`
	Kind            Kind               `bson:"kind" json:"kind"`
	ContentType     string             `bson:"contentType" json:"contentType"`
	Size            int64              `bson:"size" json:"size"`
	Caption         string             `bson:"caption" json:"caption"`
	SubmittedBy     string             `bson:"submittedBy" json:"-"`
	SubmittedByName string             `bson:"submittedByName" json:"submittedByName"`
	SubmittedAt     time.Time          `bson:"submittedAt" json:"submittedAt"`

	// TaskID is the mission this is proof for. Absent on submissions made
	// before proof was tied to missions.
	TaskID primitive.ObjectID `bson:"taskId,omitempty" json:"taskId,omitempty"`
	// Status is pending until an exec accepts it. Absent (older
	// submissions) reads as accepted, since those were always public.
	Status SubmissionStatus `bson:"status,omitempty" json:"status,omitempty"`
	// Points is the mission's value snapshotted at acceptance, so editing a
	// mission later doesn't rewrite the leaderboard.
	Points     int        `bson:"points,omitempty" json:"points,omitempty"`
	AcceptedAt *time.Time `bson:"acceptedAt,omitempty" json:"acceptedAt,omitempty"`

	// Extra holds any files after the first, for proof that needs several
	// shots. The first file stays in the fields above so older single-file
	// submissions read the same as new ones.
	Extra []Media `bson:"extra,omitempty" json:"extra,omitempty"`

	// PhotoURL is filled in on the way out only.
	PhotoURL string `bson:"-" json:"photoUrl"`
}

// Media is one additional file on a submission.
type Media struct {
	Key         string `bson:"key" json:"-"`
	Kind        Kind   `bson:"kind" json:"kind"`
	ContentType string `bson:"contentType" json:"contentType"`
	Size        int64  `bson:"size" json:"size"`
	PhotoURL    string `bson:"-" json:"photoUrl"`
}

// SubmissionStatus is where a submission is in review.
type SubmissionStatus string

const (
	StatusPending  SubmissionStatus = "pending"
	StatusAccepted SubmissionStatus = "accepted"
)

// AcceptedPoint is one accepted proof's contribution to the leaderboard.
type AcceptedPoint struct {
	Team   models.Team `bson:"team"`
	Points int         `bson:"points"`
	At     time.Time   `bson:"acceptedAt"`
}
