# Frontend - IA-Service Integration Guide

## Overview

The frontend is now fully integrated with the IA-service backend. Users can interact with the AI agent through a dedicated interface.

## Architecture

### API Layer (`src/api/`)

- **`auth.ts`**: Authentication API (login, register, profile)
- **`agent.ts`**: AI Agent API (new)
  - `runAgentTask()` - Execute a task with the AI agent
  - `getAvailableTools()` - List available tools
  - `executeAgentAction()` - Execute a specific action
  - `getTaskDetail()` - Get task status
  - `checkAgentHealth()` - Health check

### State Management (`src/store/`)

- **`authStore.ts`**: Authentication state (existing)
- **`agentStore.ts`**: Agent tasks and results (new)
  - Persists tasks to localStorage
  - Maintains task history
  - Tracks current selected task

### Pages (`src/app/pages/`)

- **`dashboard.tsx`**: Main dashboard
- **`profile.tsx`**: User profile view
- **`edit-profile.tsx`**: User profile editing
- **`agent.tsx`**: **NEW** - AI Agent interface

### Routes

```
/app                    → Dashboard
/app/profile            → View profile
/app/profile/edit       → Edit profile
/app/agent              → AI Agent interface (NEW)
```

## Configuration

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Development (Local)
VITE_API_URL=http://localhost:8080/api
VITE_IA_SERVICE_URL=http://localhost:5000

# Production (Docker Compose)
VITE_API_URL=http://auth-service:8080/api
VITE_IA_SERVICE_URL=http://ia-service:5000
```

### Docker Configuration

The `Dockerfile` in the frontend uses nginx. To pass environment variables at build time:

```dockerfile
ARG VITE_API_URL=http://localhost:8080/api
ARG VITE_IA_SERVICE_URL=http://localhost:5000
```

## Usage

### Running the Frontend

#### Option 1: Local Development

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

#### Option 2: With Docker Compose (Full Stack)

```bash
# From project root
docker-compose up --build
```

- Frontend: http://localhost:5173
- Auth Service: http://localhost:8080
- IA Service: http://localhost:5000
- Database: localhost:5432

### Using the Agent Interface

1. Navigate to `/app/agent` (Agent page in the dashboard)
2. Type your task in the textarea:
   - Email tasks: "write a professional email about..."
   - Financial tasks: "analyze my tech stock portfolio..."
   - Generic tasks: "create a python project structure..."
3. Click "Execute Task"
4. View results in the right panel
5. Click on previous tasks to see history

### Available Tools

The agent automatically detects keywords in your task and uses appropriate tools:

| Keyword | Tool | Example |
|---------|------|---------|
| email, gmail, write | email_generate | "write a thank you email" |
| finance, stock, portfolio | finance_analysis | "analyze Q1 revenue" |
| document, edit, file | document_edit | "create a contract document" |
| code, script, program | code_run | "write a python script" |
| (none) | LLM only | "explain quantum computing" |

## API Integration Details

### Task Execution Flow

```
Frontend (Client)
    ↓
POST /agent/run {task: "..."}
    ↓
FastAPI Router
    ↓
Agent Orchestrator
    ↓
Tool Selection (keyword-based)
    ↓
Tool Execution (if needed)
    ↓
LLM Query (OpenRouter)
    ↓
Response
    ↓
Frontend Store (Zustand)
    ↓
UI Update
```

### Error Handling

The agent API includes comprehensive error handling:

- **Network errors**: Returns HTTP status code
- **Validation errors**: Returns 422 with Pydantic validation details
- **Missing tasks**: Returns 404
- **Service unavailable**: Health check endpoint available at `/health`

### Authentication

All agent endpoints support optional Bearer token authentication:

```typescript
Authorization: Bearer <token>
```

The frontend automatically includes the token from `authStore` if available.

## Troubleshooting

### "IA-service is not available"

**Solution**: Make sure the IA-service is running:

```bash
# Option 1: Full stack with Docker Compose
docker-compose up --build

# Option 2: IA-service local development
cd IA-service
docker-compose up --build
```

### CORS issues

**Solution**: The IA-service CORS should be configured in the docker-compose.yml. Check that the frontend URL is allowed.

### Environment variables not loading

**Solution**: Make sure `.env.local` is in the `frontend/` directory (not root):

```bash
frontend/
  ├── .env.local          ← Here
  ├── src/
  ├── package.json
  └── ...
```

### Tasks not persisting

**Solution**: localStorage might be disabled or blocked. Check:

1. Browser DevTools → Application → Local Storage
2. Private/Incognito mode doesn't persist by default
3. Check browser console for errors

## Development Tips

### Adding New Tools

1. Update IA-service `tools/registry.py` to register the tool
2. The tool will automatically appear in the frontend's "Available Tools" list
3. Update keyword detection in `tools/tool_selector.py`

### Modifying the Agent UI

The agent page is fully customizable. Key components:

- `frontend/src/app/pages/agent.tsx` - Main page component
- `frontend/src/store/agentStore.ts` - State management
- `frontend/src/api/agent.ts` - API client

### Adding Authentication to Agent Endpoints

By default, agent endpoints don't require auth. To enable:

1. Update IA-service routes to check Bearer token
2. Frontend automatically includes token if available
3. Implement token validation in the agent backend

## Next Steps

- [ ] Implement multi-step agent loops (observation/retry)
- [ ] Add task filtering/search in history
- [ ] Export task results (JSON, PDF)
- [ ] Real-time task updates (WebSocket)
- [ ] User preferences for tools/model selection
- [ ] Rate limiting and quota management
- [ ] Analytics and task metrics dashboard

## References

- [IA-service README](../IA-service/README.md)
- [API Documentation](../IA-service/README.md#documentación-de-la-api)
- [Frontend Stack](README.md)
