// Command seed fills the events collection with a fixed batch of fake Games
// events for local testing. Run with `go run ./cmd/seed`.
package main

import (
	"context"
	"log"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/events"
	"go.mongodb.org/mongo-driver/bson"
)

// seededBy marks every event this script creates, so re-running it replaces
// the previous batch instead of piling up duplicates.
const seededBy = "seed-script"

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	database, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}

	if _, err := database.Collection("events").DeleteMany(ctx, bson.M{"createdBy": seededBy}); err != nil {
		log.Fatalf("clear previous seed data: %v", err)
	}

	store := events.NewStore(database)
	fake := fakeEvents()
	now := time.Now().UTC()
	for _, e := range fake {
		e.CreatedBy = seededBy
		e.LastEditedBy = seededBy
		e.CreatedAt = now
		e.LastEditedAt = now
		if _, err := store.Create(ctx, e); err != nil {
			log.Fatalf("create event %q: %v", e.Title, err)
		}
		log.Printf("created %q", e.Title)
	}

	log.Printf("seeded %d events", len(fake))
}

// d builds a UTC timestamp on the fixed Games weekend (25-27 September 2026).
func d(day, hour, minute int) time.Time {
	return time.Date(2026, time.September, day, hour, minute, 0, 0, time.UTC)
}

func fakeEvents() []events.Event {
	return []events.Event{
		{
			Title:            "Scunts",
			ShortDescription: "Running scavenger hunt, open the whole weekend.",
			LongDescription:  "A weekend-long scavenger hunt. Tasks are posted in the Games channel on Friday morning and stay open until the closing ceremonies. Submit photo or video proof with your team tag.",
			Access:           "Every task can be completed without running, climbing or drinking. Tasks marked with a leaf score double when completed without single-use plastic.",
			Captain:          "Captains hold the submission link, decide which tasks the team attempts, and are the only ones who can post proof.",
			Category:         events.CategoryCustom,
			Location:         "Across campus",
			StartsAt:         d(25, 9, 0),
			EndsAt:           d(27, 0, 0),
		},
		{
			Title:            "Damn Things",
			ShortDescription: "Build-it challenges released in batches all weekend.",
			LongDescription:  "Small engineering build challenges released in batches. Judged on function first, style second. Materials are supplied at the Trottier build table.",
			Access:           "Seated build stations are available at the front of the room. Leftover material goes back to the shared bin.",
			Captain:          "Captains collect materials, keep the build log, and hand in each finished thing for judging.",
			Category:         events.CategoryCustom,
			Location:         "Trottier build table",
			StartsAt:         d(25, 9, 0),
			EndsAt:           d(27, 0, 0),
		},
		{
			Title:            "Captains Challenge",
			ShortDescription: "Captains only. Sets the tone and the first points of the weekend.",
			LongDescription:  "The three captains face off in a short relay of mental and physical tasks. Everyone else watches and heckles. Points carry into the overall standings.",
			Access:           "Every task has a seated alternative. Water is served in reusable cups from the ECSESS bar.",
			Captain:          "This is the captains event. Captains compete in person and cannot substitute a teammate.",
			Category:         events.CategoryCompetition,
			Location:         "McConnell Lobby",
			StartsAt:         d(25, 15, 0),
			EndsAt:           d(25, 17, 0),
		},
		{
			Title:            "Opening ceremony",
			ShortDescription: "Rules, scoring and the segment lineup for the weekend.",
			LongDescription:  "The Games officially open. Execs walk through the scoring rules, the segment lineup and the conduct policy. Team chants happen at the end.",
			Access:           "Step-free entry from the north door. Captioned slides, and a quiet room next door for the whole ceremony.",
			Captain:          "Captains are called up by name to collect the team banner and confirm the roster.",
			Category:         events.CategoryAdministration,
			Location:         "FDA Auditorium",
			StartsAt:         d(25, 18, 0),
			EndsAt:           d(25, 19, 30),
		},
		{
			Title:            "Park Day",
			ShortDescription: "Outdoor games, food and the loudest cheering of the weekend.",
			LongDescription:  "An afternoon of lawn games in the park. Low stakes, high volume. Points are awarded per game rather than overall.",
			Access:           "Paved paths to every station. Shade and seating on the west side. Bring your own bottle, the refill station is by the entrance.",
			Captain:          "Captains assign teammates to stations and report scores to the exec at the tent.",
			Category:         events.CategoryCustom,
			Location:         "Jeanne-Mance Park",
			StartsAt:         d(26, 11, 0),
			EndsAt:           d(26, 15, 0),
		},
		{
			Title:            "CS Games comp",
			ShortDescription: "Timed programming and design heats, judged live.",
			LongDescription:  "The CS Games qualifier runs as three timed heats. Teams of two work from a supplied brief and are scored on correctness, clarity and speed. Laptops required.",
			Access:           "Height-adjustable desks at the front two rows. Briefs are provided in plain text as well as on the projector.",
			Captain:          "Captains submit the pairings before the first heat and hold the tiebreak vote.",
			Category:         events.CategoryCompetition,
			Location:         "Trottier 0100",
			StartsAt:         d(26, 12, 0),
			EndsAt:           d(26, 16, 0),
		},
		{
			Title:            "Chicken Rush",
			ShortDescription: "Team relay across campus. Fastest team takes the segment.",
			LongDescription:  "A timed relay with a checkpoint at each engineering building. Teams move as a group and check in with the exec at each stop.",
			Access:           "The full route is step-free and can be walked rather than run. Checkpoint snacks come in compostable packaging.",
			Captain:          "Captains keep the checkpoint card and decide the running order.",
			Category:         events.CategoryCompetition,
			Location:         "Start: Macdonald steps",
			StartsAt:         d(26, 17, 0),
			EndsAt:           d(26, 19, 0),
		},
		{
			Title:            "Boiler Room",
			ShortDescription: "Late set in the basement. No points, all attendance.",
			LongDescription:  "The Saturday night party. Three DJ sets, one bar, no scoring. Bring ID.",
			Access:           "Ear plugs at the door and a low-volume seated area at the back. Cups are reusable with a deposit.",
			Captain:          "Captains are on call as the sober contact for their team.",
			Category:         events.CategoryCustom,
			Location:         "McConnell Basement",
			StartsAt:         d(26, 21, 0),
			EndsAt:           d(26, 23, 30),
		},
		{
			Title:            "Pancake kegger",
			ShortDescription: "Pancakes from ten, standings from eleven.",
			LongDescription:  "Sunday starts with pancakes and the current standings on the projector. Nothing is scored, everything is discussed.",
			Access:           "Gluten-free and vegan batter on the second griddle. Compost and recycling stations at both exits.",
			Captain:          "Captains pick up the printed standings sheet and any point disputes are raised here.",
			Category:         events.CategoryMeals,
			Location:         "Thomson House",
			StartsAt:         d(27, 10, 0),
			EndsAt:           d(27, 13, 0),
		},
		{
			Title:            "Mini forge",
			ShortDescription: "Small-scale build sprint with supplied materials.",
			LongDescription:  "A ninety-minute build sprint. Teams get an identical kit and a single constraint revealed at the start.",
			Access:           "Seated stations, tool guards on every station, and a mandatory eye-protection check. Kits are reclaimed and reused next year.",
			Captain:          "Captains collect the kit and sign the safety sheet for the team.",
			Category:         events.CategoryCompetition,
			Location:         "Trottier build table",
			StartsAt:         d(27, 13, 0),
			EndsAt:           d(27, 15, 0),
		},
		{
			Title:            "Ultimate Rallies",
			ShortDescription: "Round-robin ultimate on the lower field.",
			LongDescription:  "Three-way round robin, fifteen minutes a side. Standard rules, self-refereed, spirit score counts for a quarter of the points.",
			Access:           "Sideline seating and shade. A non-contact substitute role is available for anyone who wants to play without the running.",
			Captain:          "Captains submit the lineup and give the spirit score for the other teams.",
			Category:         events.CategoryCompetition,
			Location:         "Lower field",
			StartsAt:         d(27, 15, 0),
			EndsAt:           d(27, 17, 0),
		},
		{
			Title:            "BOAT races and closing ceremonies",
			ShortDescription: "Final segment, then final standings and trophies.",
			LongDescription:  "The last segment of the weekend, followed immediately by the closing ceremonies. Standings are locked once the last race finishes.",
			Access:           "Step-free viewing area along the near side. Non-alcoholic entries score the same. All cups are reusable.",
			Captain:          "Captains race first, then accept the trophy and read the team total on stage.",
			Category:         events.CategoryCompetition,
			Location:         "FDA Auditorium",
			StartsAt:         d(27, 18, 0),
			EndsAt:           d(27, 21, 0),
		},
	}
}
