# Orbit — Frontend

Web interface for the **Orbit AI Operator** system, built with React + Vite + TypeScript.

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — bundler and dev server
- **React Router DOM v6** — navigation and protected routes
- **Zustand** — global session state
- **Canvas API** — orbital animations

---

## Prerequisites

- Node.js >= 18
- npm >= 9
- Docker Desktop (for PostgreSQL)
- Auth-service running on `http://localhost:12001` (when started with docker-compose)

---

## Installation

```bash
cd frontend
npm install
```

---

## Running in development

**Step 1 — Start PostgreSQL with Docker:**
```bash
cd ..  # go to project root
docker-compose up -d postgres
```

**Step 2 — Start auth-service:**
```bash
cd auth-service
./mvnw spring-boot:run
```
Wait for: `Started AuthServiceApplication in X seconds`

**Step 3 — Start frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:12000`

> ⚠️ **Important:** Always start PostgreSQL before the auth-service. Without it, the backend won't start.

---

## Implemented features

### Backend Security/Observability Impact

Recent backend hardening updates (distributed rate limit, adaptive cooldowns, Prometheus metrics) do not require mandatory frontend code changes.

- Existing frontend API flows remain valid.
- No auth UX behavior was changed by these monitoring/security updates.
- Optional improvement: read `X-RateLimit-*` headers to provide user feedback before receiving `429` responses.

### Authentication
- **Login** — form with validation, calls `POST /api/auth/login`
- **Register** — form with validation, calls `POST /api/auth/register`
- **Forgot password** — recovery link screen
- **Protected routes** — redirects to login if no active session
- **Logout** — clears token and session

### OAuth2 (social buttons)
Google, LinkedIn, GitHub and Facebook buttons redirect to the backend to start the OAuth2 flow:

| Button | Endpoint |
|--------|----------|
| Google | `http://localhost:12001/oauth2/authorization/google` |
| LinkedIn | `http://localhost:12001/oauth2/authorization/linkedin` |
| GitHub | `http://localhost:12001/oauth2/authorization/github` |
| Facebook | `http://localhost:12001/oauth2/authorization/facebook` |

For these to work, the auth-service team must add real credentials to the root `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

### Dashboard
- Animated orbital diagram with pulsing nucleus and 3 orbiting nodes
- Smart daily summary
- Connected apps status panel
- Daily metrics (Tasks, Emails, Events, Bookings)
- Recent Tasks and Apps State panels

### Messages
- Message list with filters by status (all / unread / urgent) and source (Gmail / Slack)
- Message detail view
- Actions: Reply, Forward, Archive
- **Summarize with AI** — calls `POST /agent/run` on the IA-service
- **Reply with AI** — generates an automatic draft reply
- Editable reply box

---

## Connecting to the IA-service

The Messages page already uses real integration with fallback:

1. It tries IA-service first (`POST /agent/action` with `gmail_read`)
2. If IA fails or returns empty, it falls back to Gmail-service (`/emails` and optional `/emails/sync`)
3. Make sure IA-service runs on `http://localhost:12002`
4. Make sure Gmail-service runs on `http://localhost:12003`

Required `.env` for IA-service:

```env
# If IA-service runs inside docker-compose:
TOKEN_VAULT_URL=http://auth-service:8080
# If IA-service runs locally from your host:
# TOKEN_VAULT_URL=http://localhost:12001
OPENROUTER_API_KEY=your_api_key
JWT_SECRET=orbit-super-secret-key-that-is-long-enough-for-hs256-algorithm
```

---

## Folder structure

```
frontend/src/
├── api/              # HTTP call layer
│   ├── auth.ts       # login, register
│   ├── messages.ts   # messages + AI
│   ├── agent.ts      # AI agent
│   ├── finance.ts    # finance
│   └── apps.ts       # connected apps
├── store/
│   ├── authStore.ts  # user session (zustand)
│   └── agentStore.ts # agent state
├── components/
│   ├── orbit/        # canvas animations (OrbitalNucleus, CardBorder)
│   ├── ui/           # reusable components (AuthCard, DashCard, etc.)
│   └── layout/       # ProtectedRoute
├── pages/
│   ├── auth/         # Login, Register, ForgotPassword
│   └── app/          # Dashboard, Messages, Finance, Agent, Chat, Profile
├── layouts/
│   ├── AuthLayout.tsx    # orbital background, no sidebar
│   └── AppLayout.tsx     # horizontal topbar
├── router/
│   └── index.tsx     # protected routes with lazy loading
├── styles/
│   └── globals.css   # clockpunk CSS variables
└── types/
    └── index.ts      # TypeScript interfaces
```

---

## Docker

### Build and run the frontend container

```bash
# From the project root
docker-compose up --build frontend
```

Frontend will be available at `http://localhost:12000`

### Run the full stack

```bash
# Step 1 — make sure the root .env exists with all variables
# Step 2 — start everything
docker-compose up --build
```

### Useful Docker commands

```bash
# View frontend logs
docker-compose logs -f frontend

# Restart a specific service
docker-compose restart frontend

# Stop everything
docker-compose down

# Stop and remove volumes (resets the database)
docker-compose down -v

# Rebuild a specific service
docker-compose up --build frontend
```

### Verify services are running

```bash
docker ps                          # list running containers
curl http://localhost:12000         # frontend
curl http://localhost:12001         # auth-service
```

---

## Files included in commit

```
frontend/
├── src/              ✅
├── Dockerfile        ✅
├── nginx.conf        ✅
├── .dockerignore     ✅
├── package.json      ✅
├── package-lock.json ✅
├── vite.config.ts    ✅
├── tsconfig*.json    ✅
├── index.html        ✅
└── README.md         ✅

❌ Do NOT commit:
├── .env              (real credentials)
├── node_modules/     (too heavy)
└── dist/             (generated on build)
```
