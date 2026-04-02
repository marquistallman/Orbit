package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"strings"
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
	listRes, err := client.Users.Messages.List(user).MaxResults(50).Do()
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
		return nil, fmt.Errorf("tokens no encontrados para user %s: %w", userID, err)
	}
	if refreshToken == "" {
		return nil, fmt.Errorf("refresh_token vacío para user %s: el usuario debe reconectar su cuenta Google", userID)
	}

	conf := &oauth2.Config{
		ClientID:     s.config.GoogleClientID,
		ClientSecret: s.config.GoogleClientSecret,
		Scopes:       []string{"https://www.googleapis.com/auth/gmail.readonly"},
		Endpoint:     google.Endpoint,
	}

	// Sin Expiry almacenado en DB, marcamos el token como expirado para que
	// la librería oauth2 siempre use el refresh_token y obtenga un access_token fresco.
	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		Expiry:       time.Now().Add(-time.Second),
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
	var html, text string

	var walker func(*gmail.MessagePart)
	walker = func(p *gmail.MessagePart) {
		if p.Body != nil && p.Body.Data != "" {
			data, err := base64.RawURLEncoding.DecodeString(p.Body.Data)
			if err != nil {
				data, _ = base64.URLEncoding.DecodeString(p.Body.Data)
			}

			mime := strings.ToLower(p.MimeType)
			if mime == "text/html" && html == "" {
				html = string(data)
			} else if mime == "text/plain" && text == "" {
				text = string(data)
			}
		}
		for _, child := range p.Parts {
			walker(child)
		}
	}

	walker(payload)

	if html != "" {
		return html
	}
	return text
}
