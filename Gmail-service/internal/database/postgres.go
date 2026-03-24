package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"gmail-service/internal/config"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Connect(cfg *config.Config) (*sql.DB, error) {
	connStr := fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=disable",
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBName)

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, err
	}

	// Lógica de reintento (Wait-For-DB)
	for i := 0; i < 15; i++ {
		if err = db.Ping(); err == nil {
			log.Println("Conexión a PostgreSQL establecida.")
			return db, nil
		}
		log.Printf("Esperando a la base de datos... (%d/15): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("no se pudo conectar a la DB tras reintentos: %w", err)
}
