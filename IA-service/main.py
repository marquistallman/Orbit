import logging
# Configuración básica para asegurar que los logs salgan a stdout inmediatamente
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.agent_routes import router as agent_router

app = FastAPI(
    title="AI Agent Service",
    version="1.0"
)

# Comma-separated list for production domains, fallback to localhost for dev.
raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() in ("1", "true", "yes", "on")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)

@app.get("/")
def health_check():
    return {"status": "IA-service is running"}

# Endpoint para evitar 404 de Prometheus
@app.get("/metrics")
def metrics():
    return {"status": "ok"}
