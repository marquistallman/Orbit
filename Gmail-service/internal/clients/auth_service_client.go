package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// OAuthTokenResponse es la respuesta con tokens de un proveedor
type OAuthTokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    string `json:"expiresAt"`
	Provider     string `json:"provider"`
}

// AuthServiceClient hace requests a auth-service (como proxy a Auth0)
type AuthServiceClient struct {
	BaseURL string
	Client  *http.Client
}

// NewAuthServiceClient crea un nuevo cliente
func NewAuthServiceClient(baseURL string) *AuthServiceClient {
	return &AuthServiceClient{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetTokenByUserIDAndProvider obtiene el token específico de un proveedor
// Intenta via auth-service primero, y si falla, llama directamente a Auth0
func (c *AuthServiceClient) GetTokenByUserIDAndProvider(userID string, provider string, authToken string) (*OAuthTokenResponse, error) {
	// Intentar primero via auth-service (proxy)
	token, err := c.getTokenViaAuthService(userID, provider, authToken)
	if err == nil {
		return token, nil
	}

	// Fallback: llamar directamente a Auth0 Management API
	return c.getTokenViaAuth0Direct(userID, provider, authToken)
}

// getTokenViaAuthService obtiene el token via auth-service
func (c *AuthServiceClient) getTokenViaAuthService(userID string, provider string, authToken string) (*OAuthTokenResponse, error) {
	url := fmt.Sprintf("%s/api/oauth/users/%s/token/%s", c.BaseURL, userID, provider)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Pasar el Authorization header al auth-service
	if authToken != "" {
		req.Header.Set("Authorization", authToken)
	}
	req.Header.Set("User-Agent", "gmail-service/1.0")

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error calling auth-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("auth-service returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp OAuthTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	return &tokenResp, nil
}

// getTokenViaAuth0Direct obtiene el token llamando directamente a Auth0 Management API
// Usado como fallback si auth-service falla
func (c *AuthServiceClient) getTokenViaAuth0Direct(userID string, provider string, authToken string) (*OAuthTokenResponse, error) {
	// Esta es una llamada directa a Auth0 Management API
	// En producción, necesitarías M2M credentials configuradas
	// Por ahora, retornamos un error indicando que se debe usar auth-service

	// El userID aquí sería el Auth0 user ID (ej: google-oauth2|...)
	
	// TODO: Implementar fallback directo con M2M token si es necesario
	return nil, fmt.Errorf("auth-service no disponible y fallback a Auth0 Management API no configurado")
}
