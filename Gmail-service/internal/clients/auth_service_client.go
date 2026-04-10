package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// OAuthTokenResponse es la respuesta con tokens de un proveedor
type OAuthTokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    string `json:"expiresAt"`
	Provider     string `json:"provider"`
}

// Auth0M2MTokenResponse es la respuesta de Auth0 para obtener M2M token
type Auth0M2MTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// Auth0Identity representa una identidad vinculada a un usuario en Auth0
type Auth0Identity struct {
	Connection   string `json:"connection"`
	UserID       string `json:"user_id"`
	Provider     string `json:"provider"`
	IsSocial     bool   `json:"isSocial"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// AuthServiceClient obtiene Google tokens desde Auth0 Management API directamente
type AuthServiceClient struct {
	BaseURL string
	Client  *http.Client

	// Auth0 M2M para obtener Google tokens
	auth0Domain       string
	auth0M2MClientID  string
	auth0M2MClientSec string
}

// NewAuthServiceClient crea un nuevo cliente para obtener tokens desde Auth0
func NewAuthServiceClient(baseURL string) *AuthServiceClient {
	return &AuthServiceClient{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
		auth0Domain:       os.Getenv("AUTH0_DOMAIN"),
		auth0M2MClientID:  os.Getenv("AUTH0_M2M_CLIENT_ID"),
		auth0M2MClientSec: os.Getenv("AUTH0_M2M_CLIENT_SECRET"),
	}
}

// getAuth0M2MToken obtiene un M2M access token desde Auth0
func (c *AuthServiceClient) getAuth0M2MToken() (string, error) {
	if c.auth0Domain == "" || c.auth0M2MClientID == "" || c.auth0M2MClientSec == "" {
		return "", fmt.Errorf("Auth0 M2M credentials not configured in environment")
	}

	tokenURL := fmt.Sprintf("https://%s/oauth/token", c.auth0Domain)

	payload := map[string]string{
		"client_id":     c.auth0M2MClientID,
		"client_secret": c.auth0M2MClientSec,
		"audience":      fmt.Sprintf("https://%s/api/v2/", c.auth0Domain),
		"grant_type":    "client_credentials",
	}

	jsonPayload, _ := json.Marshal(payload)
	resp, err := c.Client.Post(tokenURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("[getAuth0M2MToken] Error posting to Auth0: %v", err)
		return "", fmt.Errorf("failed to get M2M token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[getAuth0M2MToken] Non-200 response from Auth0: %d, body: %s", resp.StatusCode, string(body))
		return "", fmt.Errorf("Auth0 returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp Auth0M2MTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		log.Printf("[getAuth0M2MToken] Error decoding M2M token response: %v", err)
		return "", fmt.Errorf("failed to decode M2M token: %w", err)
	}

	log.Printf("[getAuth0M2MToken] Successfully obtained M2M token")
	return tokenResp.AccessToken, nil
}

// GetGoogleTokensFromAuth0 obtiene Google access_token y refresh_token desde Auth0 Management API
// usando el Auth0 user ID (sub claim, ej: "google-oauth2|123456789")
func (c *AuthServiceClient) GetGoogleTokensFromAuth0(auth0UserID string) (*OAuthTokenResponse, error) {
	if auth0UserID == "" {
		return nil, fmt.Errorf("auth0UserID is required")
	}

	log.Printf("[GetGoogleTokensFromAuth0] Getting Google tokens for Auth0 user: %s", auth0UserID)

	// Obtener M2M token
	m2mToken, err := c.getAuth0M2MToken()
	if err != nil {
		log.Printf("[GetGoogleTokensFromAuth0] Failed to get M2M token: %v", err)
		return nil, fmt.Errorf("failed to get M2M token: %w", err)
	}

	// Consultar Auth0 Management API para obtener identidades del usuario
	identitiesURL := fmt.Sprintf("https://%s/api/v2/users/%s/identities", c.auth0Domain, auth0UserID)
	req, _ := http.NewRequest("GET", identitiesURL, nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", m2mToken))

	resp, err := c.Client.Do(req)
	if err != nil {
		log.Printf("[GetGoogleTokensFromAuth0] HTTP request error: %v", err)
		return nil, fmt.Errorf("failed to query Auth0 identities: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[GetGoogleTokensFromAuth0] Auth0 returned status %d for user %s: %s", resp.StatusCode, auth0UserID, string(body))
		return nil, fmt.Errorf("Auth0 returned %d: %s", resp.StatusCode, string(body))
	}

	// Auth0 devuelve un array de identidades
	var identities []Auth0Identity
	if err := json.NewDecoder(resp.Body).Decode(&identities); err != nil {
		log.Printf("[GetGoogleTokensFromAuth0] Error decoding identities: %v", err)
		return nil, fmt.Errorf("failed to decode identities: %w", err)
	}

	// Buscar la identidad Google
	for _, identity := range identities {
		if identity.Provider == "google-oauth2" {
			if identity.AccessToken == "" {
				log.Printf("[GetGoogleTokensFromAuth0] Google identity found but access_token is empty")
				return nil, fmt.Errorf("Google access_token not found in Auth0 identity")
			}

			log.Printf("[GetGoogleTokensFromAuth0] Successfully retrieved Google tokens for user %s", auth0UserID)
			return &OAuthTokenResponse{
				AccessToken:  identity.AccessToken,
				RefreshToken: identity.RefreshToken,
				Provider:     "google-oauth2",
			}, nil
		}
	}

	log.Printf("[GetGoogleTokensFromAuth0] No Google identity found for user %s", auth0UserID)
	return nil, fmt.Errorf("Google OAuth identity not linked for user %s - user must connect their Google account", auth0UserID)
}
