// Command seed replaces the events and scoreEntries collections with a
// fixed batch of fake Games data for local testing. Run with
// `go run ./cmd/seed`. Users are left untouched — this script only ever
// wipes and recreates events and their score entries.
package main

import (
	"context"
	"log"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/events"
	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/scores"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	database, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}

	if _, err := database.Collection("events").DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("clear events: %v", err)
	}
	if _, err := database.Collection("scoreEntries").DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("clear score entries: %v", err)
	}

	store := events.NewStore(database)
	fake := fakeEvents()
	now := time.Now().UTC()
	eventIDs := map[string]primitive.ObjectID{}
	for _, e := range fake {
		e.CreatedAt = now
		created, err := store.Create(ctx, e)
		if err != nil {
			log.Fatalf("create event %q: %v", e.Title, err)
		}
		eventIDs[e.Title] = created.ID
		log.Printf("created %q", e.Title)
	}

	// Written straight to the collection rather than through scores.Store:
	// Upsert stamps awardedAt with time.Now(), and the leaderboard plots
	// awardedAt — so going through the store would pile the entire weekend
	// onto a single instant and flatten the graph into one vertical jump.
	docs := []any{}
	awards := fakeAwards()
	sunday := lastSunday(now)
	for _, a := range awards {
		id, ok := eventIDs[a.event]
		if !ok {
			log.Fatalf("award references unknown event %q", a.event)
		}
		for i, team := range seedTeams {
			docs = append(docs, scores.ScoreEntry{
				ID:          primitive.NewObjectID(),
				EventID:     id,
				Team:        team,
				Value:       a.points[i],
				Description: "Seeded result",
				AwardedAt:   a.awardAt(sunday),
			})
		}
	}
	if _, err := database.Collection("scoreEntries").InsertMany(ctx, docs); err != nil {
		log.Fatalf("insert seed scores: %v", err)
	}

	log.Printf("seeded %d events and %d score entries across %d scored events (weekend of %s)",
		len(fake), len(docs), len(awards), sunday.AddDate(0, 0, -2).Format("Jan 2"))
}

// seedTeams fixes the column order used by seedAward.points.
var seedTeams = [4]models.Team{
	models.TeamElectrical,
	models.TeamComputer,
	models.TeamSoftware,
	models.TeamOldPatrol,
}

// seedAward is one event's results: points for all four teams, stamped at
// the time that event finished.
//
// day/hour/min are relative to the Games weekend rather than absolute:
// day is an offset from Sunday (-2 Friday, -1 Saturday, 0 Sunday), which
// awardAt resolves against the most recent weekend. The events themselves
// keep their fixed September dates — but the leaderboard plots awardedAt
// on a shared x-axis, so pinning awards to a date months from the other
// entries in the collection would squeeze every one of them into a sliver
// at one edge of the chart and leave the rest of it empty.
type seedAward struct {
	event  string
	day    int
	hour   int
	min    int
	points [4]int // electrical, computer, software, oldPatrol
}

// lastSunday returns the most recent Sunday, midnight UTC. If today is
// Sunday it steps back a week, so no award is ever stamped in the future.
func lastSunday(now time.Time) time.Time {
	d := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	for {
		d = d.AddDate(0, 0, -1)
		if d.Weekday() == time.Sunday {
			return d
		}
	}
}

func (a seedAward) awardAt(sunday time.Time) time.Time {
	return sunday.AddDate(0, 0, a.day).Add(
		time.Duration(a.hour)*time.Hour + time.Duration(a.min)*time.Minute)
}

// fakeAwards is the weekend's scoring ledger, shaped so the leaderboard
// graph actually shows something: the lead changes hands seven times, one
// team takes a penalty (the only negative award, which puts a visible dip
// in its curve), and second place finishes tied.
//
// Final: Software 315, Computer 295, Old Patrol 295, Electrical 245.
func fakeAwards() []seedAward {
	return []seedAward{
		{"Captains Challenge", -2, 17, 0, [4]int{20, 15, 30, 10}},
		{"Park Day", -1, 12, 30, [4]int{25, 40, 10, 30}},
		{"CS Games comp", -1, 14, 0, [4]int{15, 20, 50, 5}},
		{"Chicken Rush", -1, 18, 30, [4]int{45, 25, 5, 35}},
		{"Boiler Room", -1, 22, 30, [4]int{20, 10, 15, 40}},
		{"Scunts", 0, 9, 0, [4]int{30, 55, 45, 25}},
		{"Damn Things", 0, 11, 0, [4]int{40, 20, 35, 15}},
		{"Mini forge", 0, 14, 30, [4]int{10, 30, 25, 50}},
		{"Ultimate Rallies", 0, 16, 30, [4]int{-10, 35, 40, 30}},
		{"BOAT races and closing ceremonies", 0, 19, 30, [4]int{50, 45, 60, 55}},
	}
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
