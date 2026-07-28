package handlers

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/ecsegames/backend/internal/models"
	"github.com/ecsegames/backend/internal/users"
	svix "github.com/svix/svix-webhooks/go"
)

// ClerkWebhook handles Clerk webhook events, syncing users into MongoDB.
type ClerkWebhook struct {
	users         *users.Repository
	signingSecret string
}

// NewClerkWebhook builds the handler. signingSecret is the Svix signing secret
// (CLERK_WEBHOOK_SIGNING_SECRET) for the Clerk webhook endpoint.
func NewClerkWebhook(repo *users.Repository, signingSecret string) *ClerkWebhook {
	return &ClerkWebhook{users: repo, signingSecret: signingSecret}
}

// clerkEvent is the minimal slice of a Clerk webhook payload we consume.
type clerkEvent struct {
	Type string `json:"type"`
	Data struct {
		ID             string `json:"id"`
		EmailAddresses []struct {
			ID           string `json:"id"`
			EmailAddress string `json:"email_address"`
		} `json:"email_addresses"`
		PrimaryEmailAddressID string `json:"primary_email_address_id"`
	} `json:"data"`
}

// Handle verifies the Svix signature, then upserts the user on user.created.
// Signature/verification problems return 4xx (no retry); storage failures
// return 5xx so Svix retries.
func (h *ClerkWebhook) Handle(w http.ResponseWriter, r *http.Request) {
	if h.signingSecret == "" {
		log.Printf("clerk webhook: CLERK_WEBHOOK_SIGNING_SECRET not set")
		http.Error(w, "webhook not configured", http.StatusServiceUnavailable)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "cannot read body", http.StatusBadRequest)
		return
	}

	wh, err := svix.NewWebhook(h.signingSecret)
	if err != nil {
		log.Printf("clerk webhook: invalid signing secret: %v", err)
		http.Error(w, "webhook misconfigured", http.StatusInternalServerError)
		return
	}
	if err := wh.Verify(body, r.Header); err != nil {
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}

	var evt clerkEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		http.Error(w, "bad payload", http.StatusBadRequest)
		return
	}

	// Only user creation is synced for now; acknowledge everything else.
	if evt.Type != "user.created" {
		w.WriteHeader(http.StatusOK)
		return
	}

	user := models.User{
		ClerkID:   evt.Data.ID,
		Email:     primaryEmail(evt),
		Role:      models.RoleStudent,
		CreatedAt: time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	if err := h.users.Upsert(ctx, user); err != nil {
		log.Printf("clerk webhook: upsert user %s failed: %v", user.ClerkID, err)
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}

	log.Printf("clerk webhook: synced user %s (%s)", user.ClerkID, user.Email)
	w.WriteHeader(http.StatusOK)
}

// primaryEmail returns the primary email address if identifiable, otherwise the
// first one, or "" when none are present.
func primaryEmail(evt clerkEvent) string {
	for _, e := range evt.Data.EmailAddresses {
		if e.ID == evt.Data.PrimaryEmailAddressID {
			return e.EmailAddress
		}
	}
	if len(evt.Data.EmailAddresses) > 0 {
		return evt.Data.EmailAddresses[0].EmailAddress
	}
	return ""
}
