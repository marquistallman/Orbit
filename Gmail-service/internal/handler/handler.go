package handler

import (
	"context"
	"encoding/json"
	"fmt"
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

// extractUserID obtiene el userId del Authorization header o fallback a query param
func (h *Handler) extractUserID(r *http.Request) string {
	// Intentar extraer del Authorization header primero
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		userID := utils.ResolveUserIDFromToken(authHeader, "")
		if userID != "" {
			return userID
		}
	}

	// Fallback: query parameter (backward compatibility)
	return r.URL.Query().Get("userId")
}

func (h *Handler) GetEmails(w http.ResponseWriter, r *http.Request) {
	userID := h.extractUserID(r)
	if userID == "" {
		http.Error(w, "userId required (via Authorization header or ?userId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	emails, err := h.Service.GetEmails(ctx, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error getting emails: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(emails)
}

func (h *Handler) SyncEmails(w http.ResponseWriter, r *http.Request) {
	userID := h.extractUserID(r)
	if userID == "" {
		http.Error(w, "userId required (via Authorization header or ?userId param)", http.StatusBadRequest)
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
	// El IA-service tiene timeout=60s; el sync toma ~26s para ~180 emails.
	count, err := h.Service.SyncEmails(ctx, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error syncing: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(fmt.Sprintf("Sincronizados %d correos", count)))
}

func (h *Handler) DeleteEmails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := h.extractUserID(r)
	if userID == "" {
		http.Error(w, "userId required (via Authorization header or ?userId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	count, err := h.Service.DeleteEmailsByUserID(ctx, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error deleting emails: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(fmt.Sprintf("Eliminados %d emails", count)))
}

func (h *Handler) DebugSearch(w http.ResponseWriter, r *http.Request) {
	userID := h.extractUserID(r)
	q := r.URL.Query().Get("q")
	if userID == "" || q == "" {
		http.Error(w, "userId and q required (userId via Authorization header or ?userId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	results, err := h.Service.SearchMessages(ctx, userID, q)
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

	userID := h.extractUserID(r)
	if userID == "" {
		http.Error(w, "userId required (via Authorization header or ?userId param)", http.StatusBadRequest)
		return
	}

	// Pasar el Authorization header en el contexto
	authToken := r.Header.Get("Authorization")
	ctx := r.Context()
	if authToken != "" {
		ctx = context.WithValue(ctx, "authToken", authToken)
	}

	req.UserID = userID
	if err := h.Service.SendEmail(ctx, req); err != nil {
		http.Error(w, fmt.Sprintf("Error sending: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte("Correo enviado exitosamente"))
}
