package repository

import (
	"database/sql"
	"fmt"
	"gmail-service/internal/domain"
)

// Interface Segregation: El servicio solo conoce esto, no la DB directa
type EmailRepository interface {
	GetOAuthTokens(userID string) (accessToken, refreshToken string, err error)
	SaveEmail(email domain.Email) error
	GetEmailsByUserID(userID string) ([]domain.Email, error)
}

type PostgresEmailRepository struct {
	DB *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresEmailRepository {
	return &PostgresEmailRepository{DB: db}
}

func (r *PostgresEmailRepository) GetEmailsByUserID(userID string) ([]domain.Email, error) {
	query := `
		SELECT id, user_id, gmail_id, subject, snippet, sender, received_at, body_html
		FROM emails
		WHERE user_id = $1
		ORDER BY received_at DESC
	`
	rows, err := r.DB.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error getting emails: %w", err)
	}
	defer rows.Close()

	var emails []domain.Email
	for rows.Next() {
		var e domain.Email
		if err := rows.Scan(&e.ID, &e.UserID, &e.GmailID, &e.Subject, &e.Snippet, &e.Sender, &e.ReceivedAt, &e.BodyHTML); err != nil {
			return nil, fmt.Errorf("error scanning email: %w", err)
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (r *PostgresEmailRepository) GetOAuthTokens(userID string) (string, string, error) {
	var accessToken string
	var refreshToken sql.NullString // Usar sql.NullString para manejar valores NULL de la DB
	// Ajustar consulta según tu esquema real de user_oauth_accounts
	query := `SELECT access_token, refresh_token FROM user_oauth_accounts WHERE user_id = $1 LIMIT 1`

	err := r.DB.QueryRow(query, userID).Scan(&accessToken, &refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("error obteniendo tokens: %w", err)
	}
	// Devuelve el string del token o un string vacío si es NULL, sin causar un crash.
	return accessToken, refreshToken.String, nil
}

func (r *PostgresEmailRepository) SaveEmail(e domain.Email) error {
	query := `
		INSERT INTO emails (id, user_id, gmail_id, subject, snippet, sender, received_at, body_html, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (gmail_id) DO UPDATE SET 
			subject = EXCLUDED.subject,
			snippet = EXCLUDED.snippet,
			body_html = EXCLUDED.body_html,
			received_at = EXCLUDED.received_at`

	_, err := r.DB.Exec(query,
		e.UserID,
		e.GmailID,
		e.Subject,
		e.Snippet,
		e.Sender,
		e.ReceivedAt,
		e.BodyHTML)
	return err
}
