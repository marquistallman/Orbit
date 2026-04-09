package utils

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// ResolveUserIDFromToken extrae el user_id del JWT sin validar firma
// Busca "id" (Java) o "sub" (Supabase) en el payload
func ResolveUserIDFromToken(token string, fallback string) string {
	if token == "" {
		return fallback
	}

	// Remover "Bearer " si existe
	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimSpace(token)

	// JWT debe tener 3 partes separadas por puntos: header.payload.signature
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return fallback
	}

	// Decodificar payload (segunda parte)
	payloadPart := parts[1]
	
	// Añadir padding si es necesario
	padding := (4 - len(payloadPart)%4) % 4
	payloadPart += strings.Repeat("=", padding)

	payload, err := base64.URLEncoding.DecodeString(payloadPart)
	if err != nil {
		return fallback
	}

	// Parsear JSON
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return fallback
	}

	// Buscar UUIDs válidos en "id" o "sub"
	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	
	for _, field := range []string{"id", "sub"} {
		if val, ok := claims[field]; ok {
			valStr := fmt.Sprintf("%v", val)
			if uuidRegex.MatchString(strings.ToLower(valStr)) {
				return valStr
			}
		}
	}

	// Fallback: email u otro valor
	if email, ok := claims["email"]; ok {
		return fmt.Sprintf("%v", email)
	}

	if sub, ok := claims["sub"]; ok {
		return fmt.Sprintf("%v", sub)
	}

	return fallback
}

// ExtractAuthorizationToken extrae el token del header Authorization
func ExtractAuthorizationToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) == 2 && parts[0] == "Bearer" {
		return parts[1]
	}
	return ""
}
