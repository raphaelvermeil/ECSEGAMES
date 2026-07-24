package handlers

import (
	"encoding/json"
	"net/http"
)

// Health responds 200 with a small JSON status payload.
func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
