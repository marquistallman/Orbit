# Orbit

Orbit is a personal AI assistant platform that centralizes your Gmail, Telegram messages, finances, and productivity tools into a single interface powered by an LLM agent.

## Architecture

| Service | Tech | Port | Role |
|---|---|---|---|
| `frontend` | React + Vite + Nginx | 5173 | Web UI |
| `auth-service` | Spring Boot | 8081 | Auth, OAuth2, user management |
| `ia-service` | FastAPI + Telethon | 5000 | AI agent, Telegram MTProto, memory |
| `gmail-service` | Go | 8082 | Gmail sync, email storage |
| `doc-service` | Node.js | 9002 | Document generation |
| `excel-service` | Node.js | 9004 | Spreadsheet generation |
| `code-service` | Node.js | 9003 | Sandboxed code execution |
| `mini-maps-service` | Node.js | 9005 | Map rendering |
| `postgres` | PostgreSQL 16 | 5432 | Primary database |
| `redis` | Redis 7 | 6379 | Rate limiting backend |
| `prometheus` | Prometheus | 9090 | Metrics collection |
| `grafana` | Grafana | 3000 | Metrics dashboards |

## Quick Start (Development)

### 1. Copy and fill environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your credentials — see "Environment Variables" below
```

### 2. Start all services

```bash
docker-compose up --build
```

Frontend will be available at [http://localhost:5173](http://localhost:5173).

### 3. Run without Docker (individual services)

```bash
# Python manager (starts ia-service and sub-services)
python manager.py

# Frontend
cd frontend && npm install && npm run dev

# auth-service
cd auth-service && ./mvnw spring-boot:run

# gmail-service
cd gmail-service && go run .
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values. The most critical ones:

### Required credentials

| Variable | Where to get it |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Choose a strong password |
| `JWT_SECRET` | Generate: `openssl rand -hex 64` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/) |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | [my.telegram.org/apps](https://my.telegram.org/apps) |

### Production-specific variables

```bash
# Set your public domain for OAuth redirects and CORS
APP_FRONTEND_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Frontend API URLs (injected at build time)
VITE_API_URL=https://yourdomain.com/api
VITE_IA_URL=https://yourdomain.com/ia
VITE_MINI_MAPS_URL=https://yourdomain.com/maps

# Lock down the database schema once it's stable
SPRING_JPA_DDL_AUTO=validate

# Grafana admin password
GRAFANA_ADMIN_PASSWORD=strong-random-password
```

## Features

- **Messages** — Unified inbox for Gmail and Telegram personal messages, with AI summarization and smart reply
- **Finance** — Automatic detection and parsing of banking emails (PSE, ACH Colombia, Bancolombia, Nequi, etc.)
- **Agent** — LLM-powered assistant (OpenRouter) with tools: web search, code execution, document generation, maps
- **Apps** — Connect and manage integrations (Gmail OAuth, Telegram MTProto) from a single panel
- **Dashboard** — Live overview of connected apps, recent tasks, AI-generated daily summary
- **Observability** — Prometheus metrics + Grafana dashboards + adaptive rate limiting

## Production Deployment Checklist

Before going live, complete all of these:

### Security (critical)
- [ ] Rotate all credentials if they were ever committed to git
- [ ] Set `JWT_SECRET` to a strong random value (`openssl rand -hex 64`)
- [ ] Set strong `POSTGRES_PASSWORD` (not `postgres`)
- [ ] Set `CORS_ALLOWED_ORIGINS` to your exact frontend domain (no wildcards)
- [ ] Set `APP_FRONTEND_URL` to your production domain
- [ ] Set `GRAFANA_ADMIN_PASSWORD` to a strong value
- [ ] Never commit `.env` or `.env.local` — they are in `.gitignore`

### Infrastructure
- [ ] Place an HTTPS reverse proxy (Nginx, Caddy, Traefik) in front of all services
- [ ] Set `SPRING_JPA_DDL_AUTO=validate` after the initial schema is created
- [ ] Ensure the `postgres-data` Docker volume is backed up regularly
- [ ] Configure your OAuth2 redirect URIs in Google Cloud Console for your production domain

### Optional hardening
- [ ] Remove or protect `/metrics` and `/actuator/prometheus` endpoints behind a firewall rule or auth
- [ ] Set Prometheus scrape targets to use internal Docker network names only
- [ ] Enable Grafana authentication (`GF_AUTH_*` env vars)

## OAuth2 Setup (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - Development: `http://localhost:8081/login/oauth2/code/google`
   - Production: `https://yourdomain.com/api/login/oauth2/code/google`
4. Enable: Gmail API, Google People API
5. Copy Client ID and Secret to `.env.local`

## Telegram MTProto Setup

Telegram integration uses the Telethon library for full personal account access (not the bot API).

1. Go to [my.telegram.org/apps](https://my.telegram.org/apps) and create an app
2. Copy `api_id` → `TELEGRAM_API_ID` and `api_hash` → `TELEGRAM_API_HASH` in `.env.local`
3. In the Orbit UI, go to **Apps** → **Telegram** → **Connect**
4. Enter your phone number and verify with the code sent to your Telegram app

Sessions are stored persistently in `TELEGRAM_SESSION_DB_PATH` (default: `/data/telegram_sessions.db`).

## Monitoring

- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana**: [http://localhost:3000](http://localhost:3000) (default login: `admin` / value of `GRAFANA_ADMIN_PASSWORD`)

Rate limiting metrics are exposed by `ia-service` at `/metrics` and scraped by Prometheus.

## Project Structure

```
Orbit/
├── frontend/          # React + Vite SPA
├── auth-service/      # Spring Boot — auth, OAuth2, user/app management
├── gmail-service/     # Go — Gmail API sync, email storage
├── IA-service/        # FastAPI — AI agent, Telegram, tools
│   ├── agents/        # Agent core and task memory
│   ├── ai/            # LLM interface, user memory, usage metering
│   ├── routes/        # API routers (agent, messages, telegram)
│   ├── telegram/      # Telethon client and session store
│   └── service/       # Micro-services (doc, excel, code, maps)
├── db/                # PostgreSQL init SQL
├── docker-compose.yml
└── .env.example       # Template for all environment variables
```
