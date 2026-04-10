package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gmail-service/internal/clients"
	"gmail-service/internal/config"
	"gmail-service/internal/domain"
	"gmail-service/internal/repository"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type GmailService struct {
	repo              repository.EmailRepository
	config            *config.Config
	authServiceClient *clients.AuthServiceClient
}

func NewGmailService(repo repository.EmailRepository, cfg *config.Config) *GmailService {
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://auth-service:8080"  // Default para Docker
	}
	return &GmailService{
		repo:              repo,
		config:            cfg,
		authServiceClient: clients.NewAuthServiceClient(authServiceURL),
	}
}

func (s *GmailService) GetEmails(ctx context.Context, userID string) ([]domain.Email, error) {
	return s.repo.GetEmailsByUserID(userID)
}

// SyncEmails lee de Gmail con paginación desde el inicio del año actual y guarda en DB
func (s *GmailService) SyncEmails(ctx context.Context, userID string) (int, error) {
	log.Printf("Iniciando SyncEmails para userID: %s", userID)
	client, err := s.getGmailClient(ctx, userID)
	if err != nil {
		log.Printf("Error al obtener gmail client: %v", err)
		return 0, err
	}
	log.Println("Gmail client obtenido exitosamente")

	// Filtrar desde el 1 de enero del año actual, solo emails potencialmente financieros
	startOfYear := time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	afterFilter := fmt.Sprintf("after:%s", startOfYear.Format("2006/01/02"))

	// Query de Gmail para traer solo emails de bancos/pagos o con asuntos financieros
	// Esto reduce dramáticamente el volumen vs traer toda la bandeja
	financialQuery := `in:anywhere ` + afterFilter + ` (` +
		`from:(bancolombia OR nequi OR daviplata OR davivienda OR bbva OR scotiabank OR itau OR paypal OR stripe OR mercadopago OR wompi OR payu OR epayco OR serviciopse OR achcolombia OR pagos.achcolombia OR avalpay OR redeban OR credibanco OR siigo OR aliexpress OR amazon OR rappi OR uber OR claro OR movistar OR tigo OR epm OR avianca OR latam OR virginmobile OR tarjetatullave OR codensa) ` +
		`OR subject:(factura OR recibo OR invoice OR receipt OR "compra realizada" OR "compra aprobada" OR "pago realizado" OR "pago aprobado" OR "pago exitoso" OR "transaccion aprobada" OR transferencia OR retiro OR extracto OR nomina OR salary OR "order confirmed" OR "payment confirmed" OR subscription OR topup OR recarga OR PSE OR "pago PSE" OR "tu pago" OR "tu compra" OR comprobante OR "estado de cuenta")` +
		`)`
	log.Printf("Query Gmail: %s", financialQuery)

	user := "me"
	seenIDs := map[string]bool{}
	var allMessages []struct{ Id string }

	// Ejecutar múltiples queries y combinar resultados deduplicando por ID
	queries := []string{
		// Query específico para PSE/ACH Colombia — garantiza captura de todos los PSE
		`in:anywhere ` + afterFilter + ` from:serviciopse`,
		`in:anywhere ` + afterFilter + ` from:achcolombia`,
		// Query financiero general
		financialQuery,
	}

	for _, q := range queries {
		pageToken := ""
		for {
			req := client.Users.Messages.List(user).
				Q(q).
				MaxResults(500)
			if pageToken != "" {
				req = req.PageToken(pageToken)
			}
			listRes, err := req.Do()
			if err != nil {
				log.Printf("Error al listar mensajes: %v", err)
				break
			}
			for _, m := range listRes.Messages {
				if !seenIDs[m.Id] {
					seenIDs[m.Id] = true
					allMessages = append(allMessages, struct{ Id string }{m.Id})
				}
			}
			log.Printf("Total acumulado: %d msgs", len(allMessages))
			if listRes.NextPageToken == "" {
				break
			}
			pageToken = listRes.NextPageToken
		}
	}

	log.Printf("Total mensajes a procesar: %d", len(allMessages))

	count := 0
	for _, msg := range allMessages {
		fullMsg, err := client.Users.Messages.Get(user, msg.Id).Format("full").Do()
		if err != nil {
			log.Printf("Error al obtener mensaje %s: %v", msg.Id, err)
			continue
		}

		email := domain.Email{
			UserID:     userID,
			GmailID:    msg.Id,
			Subject:    getHeader(fullMsg.Payload.Headers, "Subject"),
			Sender:     getHeader(fullMsg.Payload.Headers, "From"),
			Snippet:    fullMsg.Snippet,
			BodyHTML:   getBodyFromPayload(fullMsg.Payload),
			ReceivedAt: time.Unix(fullMsg.InternalDate/1000, 0).UTC(),
		}

		if err := s.repo.SaveEmail(email); err == nil {
			count++
		} else {
			log.Printf("Error al guardar email %s: %v", msg.Id, err)
		}
	}
	log.Printf("Se guardaron %d emails nuevos del año %d", count, time.Now().Year())
	return count, nil
}

func (s *GmailService) DeleteEmailsByUserID(ctx context.Context, userID string) (int64, error) {
	return s.repo.DeleteEmailsByUserID(userID)
}

// SearchMessages ejecuta un query de Gmail y devuelve subjects+senders de los primeros resultados (debug)
func (s *GmailService) SearchMessages(ctx context.Context, userID string, q string) ([]map[string]string, error) {
	client, err := s.getGmailClient(ctx, userID)
	if err != nil {
		return nil, err
	}
	listRes, err := client.Users.Messages.List("me").Q(q).MaxResults(10).Do()
	if err != nil {
		return nil, err
	}
	var results []map[string]string
	for _, m := range listRes.Messages {
		msg, err := client.Users.Messages.Get("me", m.Id).Format("metadata").MetadataHeaders("Subject", "From").Do()
		if err != nil {
			continue
		}
		row := map[string]string{"id": m.Id}
		for _, h := range msg.Payload.Headers {
			if h.Name == "Subject" {
				row["subject"] = h.Value
			}
			if h.Name == "From" {
				row["from"] = h.Value
			}
		}
		results = append(results, row)
	}
	return results, nil
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
	// Try two strategies to get Google tokens:
	// 1. FIRST: Query local DB (userID assumed to be UUID)
	// 2. FALLBACK: Query Auth0 (userID assumed to be Auth0 sub)
	
	var tokenResp *clients.OAuthTokenResponse
	var err error
	
	log.Printf("[getGmailClient] Getting Google tokens for user: %s", userID)
	
	// Strategy 1: Try to get from local DB
	log.Printf("[getGmailClient] [Strategy 1] Trying local DB for user %s...", userID)
	accessToken, refreshToken, err := s.repo.GetOAuthTokens(userID)
	if err == nil && accessToken != "" {
		log.Printf("[getGmailClient] [Strategy 1] SUCCESS: Got tokens from local DB for user %s", userID)
		tokenResp = &clients.OAuthTokenResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			Provider:     "google",
		}
	} else {
		log.Printf("[getGmailClient] [Strategy 1] Failed to get from local DB: %v. Trying Auth0...", err)
		
		// Strategy 2: Try Auth0 Management API (userID assumed to be Auth0 sub)
		log.Printf("[getGmailClient] [Strategy 2] Trying Auth0 Management API for user %s...", userID)
		tokenResp, err = s.authServiceClient.GetGoogleTokensFromAuth0(userID)
		if err != nil {
			log.Printf("[getGmailClient] [Strategy 2] ERROR: %v", err)
			log.Printf("[getGmailClient] Could not get Google tokens from DB or Auth0 for user %s", userID)
			return nil, fmt.Errorf("could not get Google token for user %s: %w", userID, err)
		}
		log.Printf("[getGmailClient] [Strategy 2] SUCCESS: Got tokens from Auth0 for user %s", userID)
	}

	if tokenResp == nil || tokenResp.AccessToken == "" {
		log.Printf("[getGmailClient] ERROR: Google access_token is empty for user %s", userID)
		return nil, fmt.Errorf("Google access_token is empty for user %s", userID)
	}

	if tokenResp.RefreshToken == "" {
		log.Printf("[getGmailClient] WARNING: refresh_token is empty for user %s", userID)
		return nil, fmt.Errorf("refresh_token is empty for user %s: user must reconnect their Google account", userID)
	}

	log.Printf("[getGmailClient] Got Google tokens for user %s (access has expiry check)", userID)

	conf := &oauth2.Config{
		ClientID:     s.config.GoogleClientID,
		ClientSecret: s.config.GoogleClientSecret,
		Scopes:       []string{"https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"},
		Endpoint:     google.Endpoint,
	}

	// Mark token as expired so oauth2 lib will use refresh_token to get a fresh access_token
	token := &oauth2.Token{
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
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
