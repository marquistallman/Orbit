package main

import (
	"log"
	"net/http"

	"gmail-service/internal/config"
	"gmail-service/internal/database"
	"gmail-service/internal/handler"
	"gmail-service/internal/repository"
	"gmail-service/internal/service"
)

func main() {
	// 1. Cargar Configuración
	cfg := config.Load()

	// 2. Conectar a Base de Datos (Infrastructure)
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Fallo crítico al conectar DB: %v", err)
	}
	defer db.Close()

	// 3. Inicializar Capas (Dependency Injection)
	// Repositorio (SQL)
	repo := repository.NewPostgresRepository(db)

	// Servicio (Business Logic + External APIs)
	svc := service.NewGmailService(repo, cfg)

	// Handler (HTTP Transport)
	h := handler.NewHandler(svc)

	// 4. Definir Rutas
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Gmail Service OK")) })
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Gmail Service OK")) })
	mux.HandleFunc("/emails", h.GetEmails)
	mux.HandleFunc("/emails/sync", h.SyncEmails)
	mux.HandleFunc("/emails/send", h.SendEmail)
	mux.HandleFunc("/emails/debug-search", h.DebugSearch)
	mux.HandleFunc("/emails/delete", h.DeleteEmails)

	// Middleware CORS para permitir peticiones desde el frontend
	corsHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // En producción, usa tu dominio específico
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		mux.ServeHTTP(w, r)
	})

	// 5. Arrancar Servidor
	log.Printf("Servidor Gmail (SOLID) en puerto %s...", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, corsHandler); err != nil {
		log.Fatalf("Error en servidor: %v", err)
	}
}
