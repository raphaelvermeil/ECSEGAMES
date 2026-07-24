package db

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect dials MongoDB and pings it to confirm the connection is live.
// Returns the named database handle. If uri is empty it returns an error
// rather than dialing, so local dev without a cluster fails clearly.
func Connect(ctx context.Context, uri, dbName string) (*mongo.Database, error) {
	if uri == "" {
		return nil, fmt.Errorf("MONGO_URI is not set")
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("mongo connect: %w", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("mongo ping: %w", err)
	}
	return client.Database(dbName), nil
}
