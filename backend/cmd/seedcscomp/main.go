// Command seedcscomp builds the CS competition: it renders every target
// image to disk and upserts the matching challenge documents. Run with
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
	var authored []string
	for _, lv := range levels {
		for i, pt := range lv.parts {
			authored = append(authored, pt.title)
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
				Example: lv.example,
			}); err != nil {
				log.Fatalf("upsert challenge %q: %v", pt.title, err)
			}
			n++
			log.Printf("level %d part %d: %s", lv.n, i+1, pt.title)
		}
	}

	// levels.go is the only definition of the set, so anything left in the
	// database under a name it no longer mentions is a part that was
	// renamed or dropped. Left alone it keeps showing up in the picker,
	// sharing a part number with whatever replaced it.
	stale, err := store.PruneChallengesNotIn(ctx, authored)
	if err != nil {
		log.Fatalf("prune challenges: %v", err)
	}
	for _, name := range stale {
		log.Printf("pruned stale challenge %q (its image, if any, is still on disk)", name)
	}

	log.Printf("seeded %d challenges and wrote %d target images to %s", n, n, cfg.CSCompSolutionsDir)
}

// levelPoints is what one solved part is worth, by level. The gaps grow
// with difficulty: small steps through the absolute-positioning levels
// (1-6), then big jumps where flexbox (7-8) and nesting (9-10) start. A
// level 10 part takes a strong student about half an hour, so it is worth
// far more than a level 1 part, not just ten times as much.
var levelPoints = map[int]int{
	1: 100, 2: 150, 3: 200, 4: 350, 5: 450,
	6: 600, 7: 850, 8: 1000, 9: 1200, 10: 1500,
}

// points is a challenge's worth. A level missing from the table is a
// mistake in levels.go, so the seed stops rather than scoring it zero.
func points(level int) int {
	p, ok := levelPoints[level]
	if !ok {
		log.Fatalf("no points set for level %d", level)
	}
	return p
}

// css renders one shape's inline style. Ported from the mock's css()
// verbatim, including which properties are omitted: a transparent or
// missing background and an empty border-radius are left off rather than
// written out, because that is what the target images were drawn from.
//
// pretty is the starter code a student reads, the compact form the target
// document. The starter measures from the bottom, as the editor's cursor
// readout does; the target keeps top, which lays out the same box.
func css(r rect, pretty bool) string {
	var b strings.Builder
	b.WriteString("left: " + strconv.Itoa(r.x) + "px")
	if pretty {
		// A border sits outside height, so the box's bottom edge is that
		// much lower than y + h. The rects only ever use the "border:Npx"
		// shorthand.
		border := 0
		if _, after, ok := strings.Cut(r.extra, "border:"); ok {
			border, _ = strconv.Atoi(after[:strings.Index(after, "px")])
		}
		b.WriteString("; bottom: " + strconv.Itoa(200-r.y-r.h-2*border) + "px")
	} else {
		b.WriteString("; top: " + strconv.Itoa(r.y) + "px")
	}
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
//
// A flow-layout part carries its own markup and only wants the background
// prepended; the absolute rule the rect levels rely on would change how a
// flex child lays out, so it is not written for them.
func targetDoc(lv level, pt part) string {
	if pt.target != "" {
		return "<style>body{margin:0;background:" + lv.bg + "}</style>" + pt.target
	}

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
	// A flow-layout part's scaffold is written by hand rather than derived:
	// what a student is handed there is a container and one child, which is
	// a shape no count of leading rects describes.
	if pt.scaffold != "" {
		return "<style>\n  body { margin: 0; background: " + lv.bg + " }\n</style>\n\n" + pt.scaffold
	}

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
