package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"gmail-service/internal/domain"
	"gmail-service/internal/service"
)

type Handler struct {
	Service *service.GmailService
}

func NewHandler(s *service.GmailService) *Handler {
	return &Handler{Service: s}
}

func (h *Handler) GetEmails(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}

	emails, err := h.Service.GetEmails(r.Context(), userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error getting emails: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(emails)
}

func (h *Handler) SyncEmails(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}

	// Sync sincrónico — espera a que todos los emails estén guardados en DB
	// antes de responder, para que el IA-service lea datos frescos.
	// El IA-service tiene timeout=60s; el sync toma ~26s para ~180 emails.
	count, err := h.Service.SyncEmails(context.Background(), userID)
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
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}
	count, err := h.Service.DeleteEmailsByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error deleting emails: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(fmt.Sprintf("Eliminados %d emails", count)))
}

func (h *Handler) DebugSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	q := r.URL.Query().Get("q")
	if userID == "" || q == "" {
		http.Error(w, "userId and q required", http.StatusBadRequest)
		return
	}
	results, err := h.Service.SearchMessages(r.Context(), userID, q)
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
	if err := h.Service.SendEmail(r.Context(), req); err != nil {
		http.Error(w, fmt.Sprintf("Error sending: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte("Correo enviado exitosamente"))
}
