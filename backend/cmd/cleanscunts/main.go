// Command cleanscunts deletes Scunts media in R2 that no submission points
// at: uploads whose submission was never recorded (tab closed mid-submit, a
// rejected or half-finished multi-file proof) and anything else left behind.
// Run with MONGO_URI and the R2_* settings set:
//
//	go run ./cmd/cleanscunts           # dry run: list what would be deleted
//	go run ./cmd/cleanscunts -delete   # actually delete it
//
// Only objects older than an hour are considered, so an upload still in
// flight (its presigned URL lives 5 minutes) is never mistaken for an orphan.
package main

import (
	"context"
	"flag"
	"log"
	"time"

	"github.com/ecsegames/backend/internal/config"
	"github.com/ecsegames/backend/internal/db"
	"github.com/ecsegames/backend/internal/scunts"
)

const minAge = time.Hour

func main() {
	doDelete := flag.Bool("delete", false, "delete orphans instead of just listing them")
	flag.Parse()

	cfg := config.Load()
	if cfg.MongoURI == "" {
		log.Fatal("MONGO_URI is not set")
	}
	storage, err := scunts.NewStorage(cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretKey, cfg.R2Bucket)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	database, err := db.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo: %v", err)
	}

	// List the bucket before reading Mongo: a file uploaded and recorded in
	// between is then either too young to list or already in the key set.
	objects, err := storage.ListOlderThan(ctx, "scunts/", time.Now().Add(-minAge))
	if err != nil {
		log.Fatalf("list R2: %v", err)
	}
	used, err := scunts.NewStore(database).AllKeys(ctx)
	if err != nil {
		log.Fatalf("read submissions: %v", err)
	}

	orphans := 0
	for _, key := range objects {
		if used[key] {
			continue
		}
		orphans++
		if !*doDelete {
			log.Printf("would delete %s", key)
			continue
		}
		if err := storage.Delete(ctx, key); err != nil {
			log.Fatalf("delete %s: %v", key, err)
		}
		log.Printf("deleted %s", key)
	}

	if *doDelete {
		log.Printf("done: %d objects checked, %d orphans deleted", len(objects), orphans)
	} else {
		log.Printf("dry run: %d objects checked, %d orphans found (rerun with -delete to remove them)", len(objects), orphans)
	}
}
