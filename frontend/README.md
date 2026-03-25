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
- Auth-service running on `http://localhost:8080`

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

Open `http://localhost:5173`

> ⚠️ **Important:** Always start PostgreSQL before the auth-service. Without it, the backend won't start.

---

## Implemented features

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
| Google | `http://localhost:8080/oauth2/authorization/google` |
| LinkedIn | `http://localhost:8080/oauth2/authorization/linkedin` |
| GitHub | `http://localhost:8080/oauth2/authorization/github` |
| Facebook | `http://localhost:8080/oauth2/authorization/facebook` |

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

The Messages page uses mocks currently. When the IA-service is running:

1. Open `src/api/messages.ts`
2. Uncomment the blocks marked `// REAL:`
3. Comment out the mock blocks
4. Make sure the IA-service runs on `http://localhost:8001`

### Known issue in IA-service

The current `main.py` has a broken import:

```python
# ❌ This fails — ModelClient does not exist as a class
from ai.model_client import ModelClient
```

`model_client.py` only exports the `call_model` function. Replace `main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.agent_routes import router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def health_check():
    return {"status": "IA-service is running"}
```

Required `.env` for IA-service:

```env
TOKEN_VAULT_URL=http://localhost:3000
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

Frontend will be available at `http://localhost:5173`

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
curl http://localhost:5173         # frontend
curl http://localhost:8080         # auth-service
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
