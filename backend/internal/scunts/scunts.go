// Package scunts stores the photo and video proof students submit for the
// Scunts scavenger hunt.
//
// It deliberately stores evidence and nothing else: there is no task list,
// no approve/reject state, and no points. Execs look at the gallery and
// award points through the existing scoring panel, so this package writes
// nothing into scoreEntries and does not touch the Games leaderboard — the
// same separation internal/cscomp keeps.
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
// an expected size. The video cap is the real constraint: a 30-second phone
// clip is 30-200 MB depending on whether the phone records 1080p or 4K.
const (
	MaxImageBytes int64 = 10 << 20  // 10 MB
	MaxVideoBytes int64 = 100 << 20 // 100 MB
	MaxCaptionLen       = 200
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

	// PhotoURL is filled in on the way out only.
	PhotoURL string `bson:"-" json:"photoUrl"`
}
