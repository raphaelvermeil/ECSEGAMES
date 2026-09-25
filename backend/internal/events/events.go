package events

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CategoryCompetition is the one built-in category: scoring hangs off it, so
// it can't be deleted.
const CategoryCompetition = "Competition"

// Category classifies events for colour-coding and filtering on the
// calendar. Execs create and delete them; events refer to them by Name.
type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Color     string             `bson:"color" json:"color"` // "#rrggbb"
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// defaultCategories seeds an empty categories collection — the four
// categories the schedule had before execs could manage their own.
var defaultCategories = []Category{
	{Name: CategoryCompetition, Color: "#ffd23f"},
	{Name: "Meals", Color: "#ff7b54"},
	{Name: "Administration", Color: "#4cc9f0"},
	{Name: "Custom", Color: "#c77dff"},
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
	Access   string    `bson:"access" json:"access"`
	Captain  string    `bson:"captain" json:"captain"`
	StartsAt time.Time `bson:"startsAt" json:"startsAt"`
	EndsAt   time.Time `bson:"endsAt" json:"endsAt"`
	Location string    `bson:"location" json:"location"`
	// Categories holds category names. It can be empty: deleting a category
	// removes it from every event that had it.
	Categories []string  `bson:"categories" json:"categories"`
	CreatedAt  time.Time `bson:"createdAt" json:"createdAt"`
}
