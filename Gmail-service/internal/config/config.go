package config

import "os"

type Config struct {
	DBHost             string
	DBUser             string
	DBPass             string
	DBName             string
	Port               string
	GoogleClientID     string
	GoogleClientSecret string
}

func Load() *Config {
	return &Config{
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBUser:             getEnv("POSTGRES_USER", "postgres"),
		DBPass:             getEnv("POSTGRES_PASSWORD", "postgres"),
		DBName:             "postgres",
		Port:               "8082",
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
