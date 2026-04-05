# Orbit

Orbit is a personal AI assistant platform that centralizes your Gmail, Telegram messages, finances, and productivity tools into a single interface powered by an LLM agent.

## Architecture

| Service | Tech | Port (Dynamic) | Role |
|---|---|---|---|
| `frontend` | React + Vite | Assigned by manager | Web UI |
| `auth-service` | Spring Boot | Assigned by manager | Auth, OAuth2, user management |
| `ia-service` | FastAPI + Telethon | Assigned by manager | AI agent, Telegram MTProto, memory |
| `gmail-service` | Go | Assigned by manager | Gmail sync, email storage |
| `doc-service` | Python FastAPI | Assigned by manager | Document generation |
| `excel-service` | Python FastAPI | Assigned by manager | Spreadsheet generation |
| `code-service` | Python FastAPI | Assigned by manager | Sandboxed code execution |
| `mini-maps-service` | Python FastAPI | Assigned by manager | Map rendering |
| `postgres` | PostgreSQL | 5432 | Primary database |
| `redis` | Redis | 6379 | Rate limiting backend |
| `prometheus` | Prometheus | 9090 | Metrics collection |
| `grafana` | Grafana | 3000 | Metrics dashboards |

**Note:** Ports are now assigned dynamically by the manager to avoid conflicts. No more fixed ports.

## Quick Start (Development)

### Prerequisites
- Python 3.11+
- Java 17+ (for auth-service)
- Go 1.25+ (for gmail-service)
- Node.js 22+ (for frontend)
- tmux (for background services)
- PostgreSQL and Redis (can be started via manager)

### 1. Bootstrap environment
```bash
python3 manager.py --bootstrap
```
This installs system dependencies (Java, Go, Node.js, tmux, etc.), Python packages, and creates `.env` with defaults.

### 2. Configure environment
```bash
python3 manager.py --config
```
Interactive setup for credentials and settings (no manual editing needed).

### 3. Start all services
```bash
python manager.py --start
```
Services start in tmux sessions. Frontend available at the assigned port (check console output).

### 5. Access
- Frontend: `http://localhost:<FRONTEND_PORT>` (assigned dynamically)
- Check status: `python manager.py --status`
- Stop services: `python manager.py --stop`

## Production Deployment

### Server Requirements
- Ubuntu/Debian/CentOS server with sudo access
- Python 3.11+, Java 17+, Go 1.25+, Node.js 22+
- tmux, curl, git
- Firewall configured to allow assigned ports

### Step-by-Step Deployment

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd orbit
   ```

2. **Bootstrap project**
   ```bash
   python3 manager.py --bootstrap
   ```

3. **Configure environment**
   ```bash
   python3 manager.py --config
   ```

4. **Start infrastructure (optional, if not using external)**
   ```bash
   python3 manager.py --start-infra
   ```

5. **Start services**
   ```bash
   python3 manager.py --start
   ```

7. **Setup reverse proxy (nginx example)**
   ```bash
   sudo apt install nginx
   # Configure nginx to proxy to assigned ports
   # Example: proxy_pass http://127.0.0.1:<FRONTEND_PORT>;
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

8. **Setup SSL (certbot)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

9. **Enable Cloudflare tunnel (optional)**
   - Set `CLOUDFLARE_TUNNEL_HOSTNAME=yourdomain.com`
   - Run: `python3 manager.py --cloudflare`

10. **Monitor**
    - Status: `python3 manager.py --status`
    - Logs: `tmux attach -t <service-name>` or check `<service-dir>/<Service_Name>.log` (e.g., `auth-service/Auth_Service.log`)
    - Metrics: Grafana at port 3000

### Troubleshooting
- **Port conflicts**: Manager assigns free ports, but check with `netstat -tlnp`
- **Services fail**: Check logs in tmux: `tmux attach -t <service>` or review log files in each service directory (e.g., `auth-service/Auth_Service.log`)
- **Dependencies missing**: Run `--bootstrap` again
- **Permissions**: Ensure user can bind to ports <1024 if needed, or use high ports
- **Firewall**: `sudo ufw allow <port>` for assigned ports

## Environment Variables

The manager creates `.env` with defaults. Use `python3 manager.py --config` for interactive setup of sensitive values. Do not edit manually.

### Auto-configured (do not set)
- `AUTH_PORT`, `IA_PORT`, etc. (assigned dynamically)

### Configured via --config
| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | DB credentials |
| `JWT_SECRET` | Random secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `OPENROUTER_API_KEY` | LLM API key |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram API |
| `APP_FRONTEND_URL` | Public frontend URL |
| `CLOUDFLARE_TUNNEL_HOSTNAME` | Cloudflare domain |
| `GRAFANA_ADMIN_PASSWORD` | Grafana password |

## Features

- **Messages** — Unified inbox for Gmail and Telegram
- **Finance** — Banking email parsing
- **Agent** — LLM assistant with tools
- **Apps** — Integration management
- **Dashboard** — Live overview
- **Observability** — Prometheus + Grafana

## Security Notes
- Never commit `.env` or `.env.local`
- Use strong passwords
- Configure firewall properly
- Keep dependencies updated

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
