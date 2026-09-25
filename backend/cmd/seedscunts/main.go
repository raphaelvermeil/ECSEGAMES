// Command seedscunts loads the Scunts mission checklist from the event's
// three source sheets into Mongo. Run with MONGO_URI set:
//
//	go run ./cmd/seedscunts
//
// It replaces the scuntsTasks collection wholesale, so re-running it after
// editing the lists below is safe. Team tick marks (scuntsCompletions) are
// cleared too — the task IDs change on a reseed, so keeping them would
// leave rows pointing at missions that no longer exist.
//
// Missions an exec adds through the app live in the same collection and are
// therefore wiped by a reseed. Once the event is running, edit in the app
// rather than here.
package main

import (
	"context"
	"log"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/scunts"
	"go.mongodb.org/mongo-driver/bson"
)

// seedTask is a mission before it gets an order and a timestamp.
type seedTask struct {
	Text string
	Note string
}

// The general list — "SCUNTS // EMPORIUM PICKS, 43 of the good ones".
// Playable anywhere, any time during the weekend.
var general = []seedTask{
	{Text: "Convince a stranger that you are studying something completely absurd, and keep the story going for 1 minute."},
	{Text: "Ask a stranger to settle a completely pointless debate between two teammates."},
	{Text: "Challenge a stranger to rock-paper-scissors. Best of 5, loser must dramatically accept defeat."},
	{Text: "Ask a stranger's dog if you can pet its owner. Do not actually pet the owner."},
	{Text: "Get a stranger to cluck like a chicken with your team."},
	{Text: "Give a stranger a vegetable, refuse to explain why, and walk away."},
	{Text: "Have the whole team recreate a Renaissance painting in public."},
	{Text: "Have a teammate narrate another teammate's actions like a nature documentary for 2 minutes."},
	{Text: "Convince a stranger that one member of your team is mildly famous."},
	{Text: "Ask a stranger to take a completely ordinary photo of your team, then pose like it is a Vogue shoot."},
	{Text: "Challenge a stranger to a completely serious thumb-war championship."},
	{Text: "Get a stranger to judge your team's synchronized dance routine."},
	{Text: "Have the whole team freeze like mannequins for one minute."},
	{Text: "Recreate the opening scene of a fake movie in public."},
	{Text: "Give a 60-second TED Talk on why pigeons are government employees."},
	{Text: "Interview a teammate like they just won the World Cup."},
	{Text: "Perform synchronized swimming on dry land."},
	{Text: "Have a teammate pretend to be a GPS and verbally navigate the team for one block."},
	{Text: "Walk one block in synchronized slow motion."},
	{Text: "Invent a team handshake involving at least 8 separate moves."},
	{Text: "Make a human wheelbarrow race between two pairs of teammates."},
	{Text: "Have the entire team communicate only through animal noises for 3 minutes."},
	{Text: "Recreate a famous album cover using only your team and whatever is around you."},
	{Text: "Make a fake commercial for the most boring object you can find."},
	{Text: "Conduct a serious product review of a random street object."},
	{Text: "Have one teammate act like a celebrity while the rest pretend to be paparazzi."},
	{Text: "Perform a dramatic breakup scene between two teammates over something stupid."},
	{Text: "Stage an over-the-top reunion between teammates who saw each other five minutes ago."},
	{Text: "Ask a stranger to give your team a random word, then freestyle a 20-second song about it."},
	{Text: "Make a teammate give an acceptance speech for an award they clearly did not deserve."},
	{Text: "Create and perform a team national anthem."},
	{Text: "Have one teammate pretend to be a museum exhibit while another gives a guided tour."},
	{Text: "Do a 30-second interpretive dance explaining engineering."},
	{Text: "Have a teammate dramatically reenact Newton discovering gravity using something other than an apple."},
	{Text: "Create a human Leaning Tower of Pisa."},
	{Text: "Perform the worst magic trick your team can invent with full confidence."},
	{Text: "Make an instrument out of something you already have and perform a 20-second concert."},
	{Text: "Have the team act out the solar system, including someone aggressively playing the Sun."},
	{Text: "Film a fake wildlife documentary about your own team as if they are a newly discovered species."},
	{Text: "Have one teammate act like a tour guide and explain a completely normal street corner as if it is a UNESCO site."},
	{Text: "Have two teammates recreate an intense sports face-off before playing rock-paper-scissors."},
	{Text: "Make up a completely fake urban legend about wherever you currently are and tell it dramatically on camera."},
	{Text: "Find a stranger willing to give your team a random mission, then complete it as long as it is safe, free, legal, and reasonable."},
}

// Boiler Room @ Reggie's. The source sheet has 20 numbered rows but seven
// of them were never filled in (4, 6, 12, 13, 14, 17, 20) and row 5 holds
// only the word "Do" — those are omitted rather than seeded blank. Execs
// can add the missing ones in the app.
var boilerRoom = []seedTask{
	{Text: "Enter Reggie's in all black with one neon-green accessory."},
	{Text: "Take a team photo doing the full Matrix bullet-time lean."},
	{Text: "Tell a teammate \"I know kung fu\" and immediately hit a synchronized pose."},
	{Text: "Win a consensual dance battle."},
	{Text: "Do the Macarena during the least appropriate non-Macarena song."},
	{Text: "Recreate \"there is no spoon\" using any object as the prop."},
	{Text: "Make a human loading bar from 0% to 100% with 5 people."},
	{Text: "Ask the DJ if he used ChatGPT for his transitions."},
	{Text: "Give a staff member a compliment."},
	{Text: "Do the Neo lean-back pose without falling over."},
	{Text: "Mime typing furiously on an invisible keyboard while a teammate narrates fake code."},
	{Text: "Invent a dance move called \"404: Move Not Found.\""},
}

// Pub crawl. The numbered rows plus the unnumbered extras listed under
// them. "SUB GPA SHOTGUN" and "SUB GPA SAMOSA" are section markers in the
// sheet rather than missions, so they are not seeded, and the duplicated
// "same birthday as you" row appears once. Two more are left out as
// unplayable as written: the one needing a photo of a coord that was never
// supplied, and the one pointing at "Alexandre's stop", which the sheet
// never identifies.
var pubCrawl = []seedTask{
	{Text: "Propose to a team member on Crescent street."},
	{Text: "Reenact your favourite Matrix scene with the whole team."},
	{Text: "Perform a magic trick for a stranger."},
	{Text: "Get a consensual group photo with police officers."},
	{Text: "Ask a stranger for their LinkedIn."},
	{Text: "Find a stranger with the same birthday as you."},
	{Text: "Create a secret handshake with a stranger."},
	{Text: "Flash mob Lush Life at Piranha."},
	{Text: "Record and post a thirst trap on your team's Instagram page."},
	{Text: "Have a push-up contest with a stranger."},
	{Text: "Apply for a job at Tim Hortons."},
	{Text: "Karaoke a song with a stranger."},
	{Text: "Make a new friend during the crawl."},
	{Text: "Sing a verse of Fetty Wap to a stranger."},
	{Text: "Bring the coat check lady at the final stop a flower."},
	{Text: "Leave an honest review for one bar you visited."},
	{Text: "Teach a stranger the ECSESS chant."},
	{Text: "Hype up a gambler at Piranha."},
	{Text: "Ask a Concordia student if they applied to McGill."},
	{Text: "Try to convince a stranger that we live in a simulation."},
	{Text: "Tell a stranger to record you doing a speech, then start barking on all fours.", Note: "Bonus points for crawling towards them"},
	{Text: "Tell a stranger a joke that doesn't make sense, ask if they get it, and if they say yes ask them to explain it."},
	{Text: "Speedrun the Scientology building on Saint Denis."},
	{Text: "Drink a beverage upside down.", Note: "Hint: a wall or a friend could be useful. Bonus for finishing it"},
	{Text: "Put on a puppet show with sock puppets made from your socks."},
	{Text: "Check out of Provigo with a cucumber and a bottle of lotion — just those two."},
	{Text: "Do a Kiss or Slap. If rejected, repeat \"Damn I'm ugly\"."},
	{Text: "Give or ask a stranger for looksmaxxing advice."},
	{Text: "Text your ex a Drake verse."},
	{Text: "Create a Facebook dating profile with pictures of different people on your team.", Note: "Bonus if you get a match"},
	{Text: "Make a LinkedIn post about ECSE Games."},
}

func main() {
	cfg := config.Load()
	if cfg.MongoURI == "" {
		log.Fatal("MONGO_URI is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	database, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo: %v", err)
	}

	// Wipe both: task IDs are regenerated here, so any surviving tick would
	// point at a mission that no longer exists.
	for _, name := range []string{"scuntsTasks", "scuntsCompletions"} {
		if _, err := database.Collection(name).DeleteMany(ctx, bson.M{}); err != nil {
			log.Fatalf("clear %s: %v", name, err)
		}
	}

	now := time.Now().UTC()
	total := 0
	for _, group := range []struct {
		category scunts.Category
		tasks    []seedTask
	}{
		{scunts.CategoryGeneral, general},
		{scunts.CategoryBoilerRoom, boilerRoom},
		{scunts.CategoryPubCrawl, pubCrawl},
	} {
		docs := make([]any, 0, len(group.tasks))
		for i, t := range group.tasks {
			docs = append(docs, scunts.Task{
				Category:  group.category,
				Text:      t.Text,
				Note:      t.Note,
				Points:    scunts.DefaultTaskPoints,
				Order:     i,
				CreatedAt: now,
			})
		}
		if _, err := database.Collection("scuntsTasks").InsertMany(ctx, docs); err != nil {
			log.Fatalf("insert %s: %v", group.category, err)
		}
		log.Printf("seeded %2d missions into %s", len(docs), group.category)
		total += len(docs)
	}
	log.Printf("done: %d missions at %d points each", total, scunts.DefaultTaskPoints)
}
