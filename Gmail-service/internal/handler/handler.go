package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"gmail-service/internal/domain"
	"gmail-service/internal/service"
	"gmail-service/internal/utils"
)

type Handler struct {
	Service *service.GmailService
}

func NewHandler(s *service.GmailService) *Handler {
	return &Handler{Service: s}
}

// extractAuth0UserID obtiene el Auth0 user ID (sub claim) del JWT en Authorization header
// o del query parameter auth0UserId como fallback
func (h *Handler) extractAuth0UserID(r *http.Request) string {
	// Intentar extraer el 'sub' del JWT en Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		auth0UserID := utils.ExtractAuth0UserIDFromJWT(authHeader)
		if auth0UserID != "" {
			return auth0UserID
		}
	}

	// Fallback: query parameter (backward compatibility / internal calls)
	return r.URL.Query().Get("auth0UserId")
}

func (h *Handler) GetEmails(w http.ResponseWriter, r *http.Request) {
	log.Printf("[GetEmails] Incoming request - Method: %s, URL: %s", r.Method, r.URL.String())
	log.Printf("[GetEmails] Headers: %v", r.Header)
	
	auth0UserID := h.extractAuth0UserID(r)
	log.Printf("[GetEmails] Extracted Auth0 user ID: %s", auth0UserID)
	
	if auth0UserID == "" {
		log.Printf("[GetEmails] ERROR: Auth0 user ID is empty")
		http.Error(w, "Auth0 user ID required (via JWT sub claim or ?auth0UserId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	log.Printf("[GetEmails] Calling Service.GetEmails for Auth0 user ID: %s", auth0UserID)
	emails, err := h.Service.GetEmails(ctx, auth0UserID)
	if err != nil {
		log.Printf("[GetEmails] ERROR from Service: %v", err)
		http.Error(w, fmt.Sprintf("Error getting emails: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("[GetEmails] SUCCESS - Retrieved %d emails", len(emails))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(emails)
}

func (h *Handler) SyncEmails(w http.ResponseWriter, r *http.Request) {
	log.Printf("[SyncEmails] Incoming request - Method: %s, URL: %s", r.Method, r.URL.String())
	
	auth0UserID := h.extractAuth0UserID(r)
	log.Printf("[SyncEmails] Extracted Auth0 user ID: %s", auth0UserID)
	
	if auth0UserID == "" {
		log.Printf("[SyncEmails] ERROR: Auth0 user ID is empty")
		http.Error(w, "Auth0 user ID required (via JWT sub claim or ?auth0UserId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	// Sync sincrónico — espera a que todos los emails estén guardados en DB
	// antes de responder, para que el IA-service lea datos frescos.
	log.Printf("[SyncEmails] Starting sync for Auth0 user ID: %s", auth0UserID)
	count, err := h.Service.SyncEmails(ctx, auth0UserID)
	if err != nil {
		log.Printf("[SyncEmails] ERROR from Service: %v", err)
		http.Error(w, fmt.Sprintf("Error syncing: %v", err), http.StatusInternalServerError)
		return
	}
	
	log.Printf("[SyncEmails] SUCCESS - Synced %d emails", count)
	w.Write([]byte(fmt.Sprintf("Sincronizados %d correos", count)))
}

func (h *Handler) DeleteEmails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	auth0UserID := h.extractAuth0UserID(r)
	if auth0UserID == "" {
		http.Error(w, "Auth0 user ID required (via JWT sub claim or ?auth0UserId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	count, err := h.Service.DeleteEmailsByUserID(ctx, auth0UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error deleting emails: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(fmt.Sprintf("Eliminados %d emails", count)))
}

func (h *Handler) DebugSearch(w http.ResponseWriter, r *http.Request) {
	auth0UserID := h.extractAuth0UserID(r)
	q := r.URL.Query().Get("q")
	if auth0UserID == "" || q == "" {
		http.Error(w, "Auth0 user ID and q required (Auth0 user ID via JWT sub claim or ?auth0UserId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	results, err := h.Service.SearchMessages(ctx, auth0UserID, q)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func (h *Handler) SendEmail(w http.ResponseWriter, r *http.Request) {
	var req domain.EmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	auth0UserID := h.extractAuth0UserID(r)
	if auth0UserID == "" {
		http.Error(w, "Auth0 user ID required (via JWT sub claim or ?auth0UserId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	req.UserID = auth0UserID
	if err := h.Service.SendEmail(ctx, req); err != nil {
		http.Error(w, fmt.Sprintf("Error sending: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte("Correo enviado exitosamente"))
}
