package events

import (
	"slices"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category classifies an event for colour-coding and filtering on the calendar.
type Category string

const (
	CategoryCompetition    Category = "Competition"
	CategoryMeals          Category = "Meals"
	CategoryAdministration Category = "Administration"
	CategoryCustom         Category = "Custom"
)

// allCategories is the single source of truth for defined event categories.
var allCategories = []Category{
	CategoryCompetition,
	CategoryMeals,
	CategoryAdministration,
	CategoryCustom,
}

// IsValidCategory reports whether c is one of the defined event categories.
func IsValidCategory(c Category) bool {
	return slices.Contains(allCategories, c)
}

// Event is a single entry on the Calendar tab. StartsAt/EndsAt are stored in
// UTC; views convert to the viewer's local timezone at render.
type Event struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title            string             `bson:"title" json:"title"`
	ShortDescription string             `bson:"shortDescription" json:"shortDescription"`
	LongDescription  string             `bson:"longDescription" json:"longDescription"`
	// Access and Captain are the two notices shown in event detail: access/
	// sustainability info, and what the team captain needs to do.
	Access       string    `bson:"access" json:"access"`
	Captain      string    `bson:"captain" json:"captain"`
	StartsAt     time.Time `bson:"startsAt" json:"startsAt"`
	EndsAt       time.Time `bson:"endsAt" json:"endsAt"`
	Location     string    `bson:"location" json:"location"`
	Category     Category  `bson:"category" json:"category"`
	CreatedBy    string    `bson:"createdBy" json:"createdBy"`
	CreatedAt    time.Time `bson:"createdAt" json:"createdAt"`
	LastEditedBy string    `bson:"lastEditedBy" json:"lastEditedBy"`
	LastEditedAt time.Time `bson:"lastEditedAt" json:"lastEditedAt"`
}
