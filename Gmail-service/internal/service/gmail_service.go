package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"time"

	"gmail-service/internal/config"
	"gmail-service/internal/domain"
	"gmail-service/internal/repository"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type GmailService struct {
	repo   repository.EmailRepository
	config *config.Config
}

func NewGmailService(repo repository.EmailRepository, cfg *config.Config) *GmailService {
	return &GmailService{repo: repo, config: cfg}
}

func (s *GmailService) GetEmails(ctx context.Context, userID string) ([]domain.Email, error) {
	return s.repo.GetEmailsByUserID(userID)
}

// SyncEmails lee de Gmail y guarda en DB usando el repositorio
func (s *GmailService) SyncEmails(ctx context.Context, userID string) (int, error) {
	log.Printf("Iniciando SyncEmails para userID: %s", userID)
	client, err := s.getGmailClient(ctx, userID)
	if err != nil {
		log.Printf("Error al obtener gmail client: %v", err)
		return 0, err
	}
	log.Println("Gmail client obtenido exitosamente")

	user := "me"
	listRes, err := client.Users.Messages.List(user).MaxResults(10).Do()
	if err != nil {
		log.Printf("Error al listar mensajes de gmail: %v", err)
		return 0, err
	}
	log.Printf("Se encontraron %d mensajes", len(listRes.Messages))

	count := 0
	for _, msg := range listRes.Messages {
		log.Printf("Procesando mensaje con ID: %s", msg.Id)
		fullMsg, err := client.Users.Messages.Get(user, msg.Id).Format("full").Do()
		if err != nil {
			log.Printf("Error al obtener mensaje completo: %v", err)
			continue
		}

		email := domain.Email{
			UserID:     userID,
			GmailID:    msg.Id,
			Subject:    getHeader(fullMsg.Payload.Headers, "Subject"),
			Sender:     getHeader(fullMsg.Payload.Headers, "From"),
			Snippet:    fullMsg.Snippet,
			BodyHTML:   getBodyFromPayload(fullMsg.Payload),
			ReceivedAt: time.Unix(fullMsg.InternalDate/1000, 0),
		}

		if err := s.repo.SaveEmail(email); err == nil {
			count++
		} else {
			log.Printf("Error al guardar email en la DB: %v", err)
		}
	}
	log.Printf("Se guardaron %d emails nuevos", count)
	return count, nil
}

func (s *GmailService) SendEmail(ctx context.Context, req domain.EmailRequest) error {
	client, err := s.getGmailClient(ctx, req.UserID)
	if err != nil {
		return err
	}

	msgStr := fmt.Sprintf("From: me\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", req.To, req.Subject, req.Body)
	msgBytes := []byte(msgStr)
	encodedMsg := base64.URLEncoding.EncodeToString(msgBytes)

	gMessage := &gmail.Message{Raw: encodedMsg}
	_, err = client.Users.Messages.Send("me", gMessage).Do()
	return err
}

// Helpers internos del servicio
func (s *GmailService) getGmailClient(ctx context.Context, userID string) (*gmail.Service, error) {
	accessToken, refreshToken, err := s.repo.GetOAuthTokens(userID)
	if err != nil {
		return nil, err
	}

	conf := &oauth2.Config{
		ClientID:     s.config.GoogleClientID,
		ClientSecret: s.config.GoogleClientSecret,
		Endpoint:     google.Endpoint,
	}

	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
	}

	tokenSource := conf.TokenSource(ctx, token)
	return gmail.NewService(ctx, option.WithHTTPClient(oauth2.NewClient(ctx, tokenSource)))
}

func getHeader(headers []*gmail.MessagePartHeader, name string) string {
	for _, h := range headers {
		if h.Name == name {
			return h.Value
		}
	}
	return ""
}

func getBodyFromPayload(payload *gmail.MessagePart) string {
	if payload.Body != nil && payload.Body.Data != "" {
		data, _ := base64.URLEncoding.DecodeString(payload.Body.Data)
		return string(data)
	}
	for _, part := range payload.Parts {
		if part.MimeType == "text/html" || part.MimeType == "text/plain" {
			if part.Body != nil && part.Body.Data != "" {
				data, _ := base64.URLEncoding.DecodeString(part.Body.Data)
				return string(data)
			}
		}
		if len(part.Parts) > 0 {
			return getBodyFromPayload(part)
		}
	}
	return ""
}
