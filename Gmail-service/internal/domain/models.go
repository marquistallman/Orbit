git branch -D Nicopackage domain

import "time"

type Email struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	GmailID    string    `json:"gmailId"`
	Subject    string    `json:"subject"`
	Snippet    string    `json:"snippet"`
	Sender     string    `json:"sender"`
	ReceivedAt time.Time `json:"receivedAt"`
	BodyHTML   string    `json:"bodyHtml"`
}

type EmailRequest struct {
	UserID  string `json:"userId"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}
