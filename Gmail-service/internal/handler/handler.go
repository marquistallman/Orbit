package handler

import (
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

	count, err := h.Service.SyncEmails(r.Context(), userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error syncing: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write([]byte(fmt.Sprintf("Sincronizados %d correos", count)))
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
