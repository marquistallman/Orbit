# Frontend Agent Integration Notes

This document summarizes the frontend changes made to restore real integration with IA-service after branch synchronization.

## What Was Changed

1. `src/api/agent.ts`
- Replaced mock implementations with real HTTP calls.
- Added typed responses for:
  - `runAgent`
  - `getStatus`
  - `getHistory`
  - `getTools`
- Base URL resolution:
  - `VITE_IA_URL` when present (recommended for local dev)
  - fallback to `http://localhost:5000` in current frontend API config.
- Optional JWT forwarding from `localStorage` (`Authorization: Bearer ...`).

2. `src/pages/app/AgentPage.tsx`
- Replaced placeholder page with a functional agent UI.
- Added task input and execution action (`Run task`).
- Added tool listing action (`Load tools`).
- Added error handling and result panel rendering.
- Added visual indicator for detected tool usage.

3. `src/layouts/AppLayout.tsx`
- Added `Agent` item in top navigation (`/app/agent`).

## Why These Changes Were Needed

After syncing with `origin/Developer`, frontend had an updated app shell but the agent integration path was effectively mock/placeholder. This caused the agent page to appear present in routes but non-functional for real backend calls.

## Runtime Contract with IA-service

Used endpoints:
- `POST /agent/run`
- `GET /agent/tools`
- `GET /agent/status/{task_id}`
- `GET /agent/history`

Expected health endpoint for quick check:
- `GET /` -> `{ "status": "IA-service is running" }`

## Environment Setup

For local Vite dev (recommended):

```env
VITE_IA_URL=http://localhost:5000
```

For dockerized frontend behind nginx reverse proxy:
- Keep `VITE_IA_SERVICE_URL` unset and use fallback `/ai`.
- nginx must proxy `/ai/` to `ia-service`.

## Verification Performed

1. IA-service real runtime test:
- `GET http://localhost:5000/` -> **200 OK**
- `POST http://localhost:5000/agent/run` with sample task -> **200 OK** with generated response.
- `GET http://localhost:5000/agent/tools` -> **200 OK** with tools list.

2. Build/tests:
- Frontend build (`npm run build`) -> **PASS**
- IA-service tests (`pytest tests/test_agent_routes.py -q`) -> **14 passed**

## Notes

- `IA-service/logs/api_log.txt` may change during runtime tests; it is operational noise and should not be mixed with frontend integration commits.
