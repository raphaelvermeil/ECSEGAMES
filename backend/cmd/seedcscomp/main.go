// Command seedcscomp builds the CS competition: it renders the 30 target
// images to disk and upserts the matching challenge documents. Run with
// `go run ./cmd/seedcscomp` (needs MONGO_URI and a Chrome on the host).
//
// The targets are rendered here, through the same cscomp.Renderer the
// server scores submissions with, and that is the whole point of this
// command existing. Antialiasing along a rotated or clipped edge differs
// between rendering engines, versions and viewports — a target drawn in
// any other tool would leave a fringe of mismatched pixels on every shape
// and would hold even a perfect answer well below the pass threshold.
// Same renderer, same browser, same 300x200 viewport, or the scores mean
// nothing.
//
// Reruns replace rather than duplicate: challenges are upserted on their
// name (see cscomp.Store.UpsertChallenge), so the ObjectIDs survive and
// existing submissions and claims keep pointing at the right challenge.
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/cscomp"
	"github.com/ecsegames/backend/internal/db"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	database, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}

	renderer, err := cscomp.NewRenderer(cfg.ChromePath, cfg.ChromeNoSandbox, 1)
	if err != nil {
		log.Fatalf("start chrome: %v", err)
	}
	defer renderer.Close()

	if err := os.MkdirAll(cfg.CSCompSolutionsDir, 0o755); err != nil {
		log.Fatalf("create solutions dir: %v", err)
	}

	store := cscomp.NewStore(database)
	if err := store.EnsureIndexes(ctx); err != nil {
		log.Fatalf("ensure indexes: %v", err)
	}

	n := 0
	for _, lv := range levels {
		for i, pt := range lv.parts {
			png, err := renderer.Render(ctx, targetDoc(lv, pt))
			if err != nil {
				log.Fatalf("render %q: %v", pt.title, err)
			}
			path := filepath.Join(cfg.CSCompSolutionsDir, cscomp.Slug(pt.title)+".png")
			if err := os.WriteFile(path, png, 0o644); err != nil {
				log.Fatalf("write %s: %v", path, err)
			}

			if _, err := store.UpsertChallenge(ctx, cscomp.Challenge{
				Name:    pt.title,
				Level:   lv.n,
				Part:    i + 1,
				Points:  points(lv.n),
				Starter: starter(lv, pt),
			}); err != nil {
				log.Fatalf("upsert challenge %q: %v", pt.title, err)
			}
			n++
			log.Printf("level %d part %d: %s", lv.n, i+1, pt.title)
		}
	}

	log.Printf("seeded %d challenges and wrote %d target images to %s", n, n, cfg.CSCompSolutionsDir)
}

// points is a challenge's worth: its level times a hundred, the rule the
// standings board states outright ("POINTS = LEVEL x 100 PER SOLVED
// PART"). Uncapped, so level 6 is worth six times a level 1 part and
// clearing the hard scenes actually decides the board.
func points(level int) int {
	return level * 100
}

// css renders one shape's inline style. Ported from the mock's css()
// verbatim, including which properties are omitted: a transparent or
// missing background and an empty border-radius are left off rather than
// written out, because that is what the target images were drawn from.
//
// pretty controls spacing only — the compact form goes into the target
// document, the spaced form into the starter code a student reads.
func css(r rect, pretty bool) string {
	var b strings.Builder
	b.WriteString("left: " + strconv.Itoa(r.x) + "px")
	b.WriteString("; top: " + strconv.Itoa(r.y) + "px")
	b.WriteString("; width: " + strconv.Itoa(r.w) + "px")
	b.WriteString("; height: " + strconv.Itoa(r.h) + "px")
	if r.bg != "" {
		b.WriteString("; background: " + r.bg)
	}
	if r.radius != "" {
		b.WriteString("; border-radius: " + r.radius)
	}
	if r.extra != "" {
		b.WriteString("; " + r.extra)
	}
	s := b.String()
	if pretty {
		return s
	}
	return strings.ReplaceAll(strings.ReplaceAll(s, "; ", ";"), ": ", ":")
}

func shape(r rect, pretty bool) string {
	return `<i style="` + css(r, pretty) + `"></i>`
}

// targetDoc is the markup a challenge's target image is rendered from —
// the answer, in other words. It never leaves this command: students get
// the PNG, not this.
func targetDoc(lv level, pt part) string {
	var b strings.Builder
	b.WriteString("<style>body{margin:0;background:" + lv.bg + "}i{position:absolute;display:block}</style>")
	for _, r := range pt.rects {
		b.WriteString(shape(r, false))
	}
	return b.String()
}

// starter is the scaffold the editor opens with: the boilerplate, a count
// of what is left, and the first shape or two already placed. Ported from
// the mock's starter() — levels 3 and up hand over two shapes because the
// scenes get harder to get oriented in.
func starter(lv level, pt part) string {
	given := 1
	if lv.n >= 3 {
		given = 2
	}
	left := len(pt.rects) - given
	noun := "shapes"
	if left == 1 {
		noun = "shape"
	}

	var b strings.Builder
	b.WriteString("<style>\n  body { margin: 0; background: " + lv.bg + " }\n")
	b.WriteString("  i { position: absolute; display: block }\n</style>\n\n")
	b.WriteString("<!-- " + strconv.Itoa(left) + " more " + noun + " to place -->\n")
	for _, r := range pt.rects[:given] {
		b.WriteString(shape(r, true) + "\n")
	}
	return b.String()
}
