# IA Service

Servicio de IA backend para el proyecto Orbit, construido con FastAPI. Proporciona una API robusta para interactuar con un agente de IA que puede ejecutar tareas, seleccionar herramientas inteligentemente, y generar respuestas contextualmente relevantes.

## Características

- 🤖 **Agente de IA integrado**: Orquestación automática de tareas con selección inteligente de herramientas.
- 🛠️ **Múltiples herramientas**: Generación de emails, análisis financiero, documentos, Excel, mini maps y ejecución de código mediante microservicios.
- 🧠 **Memoria persistente por usuario**: Guarda preferencias e información contextual (por ejemplo idioma y personas relevantes) en SQLite.
- 💸 **Control de costos por plan**: Plan `free` por defecto con límites mensuales de prompts/tokens y métricas de consumo por usuario.
- 📝 **API tipada con Pydantic**: Validación automática de entrada/salida, documentación OpenAPI.
- 🧪 **Tests unitarios**: 14+ tests con pytest + TestClient para validar contratos API.
- 🔒 **Robustez de red**: Timeouts configurables, validación HTTP, manejo de errores resiliente.
- 🐳 **Docker-ready**: Dockerfile optimizado y docker-compose con variables de entorno.

## Documentación adicional

- Perfiles de costos y planes (Free/Lite/Standard/Pro): [README_COST_PROFILES.md](README_COST_PROFILES.md)

## Requisitos

- **Docker y Docker Compose** (recomendado)
- O **Python 3.11.9** con pip (desarrollo local)

## Ejecución con Docker

1. Asegúrate de tener Docker instalado y corriendo.

2. Crea/actualiza el archivo `.env` en la raíz de IA-service:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxxx...
   OPENROUTER_MODEL=openai/gpt-4o-mini
   HTTP_TIMEOUT_SECONDS=20
  MEMORY_DB_PATH=/data/agent_memory.db
  USAGE_DB_PATH=/data/usage.db
  DEFAULT_PLAN=free
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. Ejecuta el servicio:
   ```
   docker-compose up --build
   ```

El servidor estará disponible en http://localhost:5000

## Ejecución sin Docker (Entorno Virtual)

### Instalación

1. Navega a la carpeta IA-service:
   ```
   cd Orbit/IA-service
   ```

2. Crea un entorno virtual con Python 3.11.9:
   ```
   py -3.11 -m venv venv
   ```

3. Activa el entorno virtual:
   - En Windows: `.\venv\Scripts\Activate.ps1`
   - En Linux/Mac: `source venv/bin/activate`

4. Instala las dependencias:
   ```
   pip install -r requirements.txt
   ```

### Ejecución

```
uvicorn main:app --reload --port 5000
```

El servidor estará disponible en http://localhost:5000

## Tests

### Tests Automatizados

Ejecuta los tests automatizados (cobertura de API y contratos):

```
pytest tests/test_agent_routes.py -v
```

Los tests validan:
- ✅ Validación de entrada (Pydantic models)
- ✅ Códigos HTTP correctos (200, 404, 422)
- ✅ Estructura de respuestas (response models)
- ✅ Manejo de errores

Resultado esperado: **14/14 tests PASSING** ✅

### Pruebas Manuales (Testing Manual)

#### Opción 1: UI Interactiva (Recomendado 👍)

1. Inicia el servicio:
   ```
   docker-compose up --build
   ```

2. Abre en tu navegador: **http://localhost:5000/docs**

3. Verás Swagger UI donde puedes probar todos los endpoints interactivamente.

#### Opción 2: Curl desde PowerShell

**Prueba 1 - Email/Gmail:**
```powershell
$body = @{
    task = "write a professional email to my boss about Q1 results"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/agent/run" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Prueba 2 - Análisis Financiero:**
```powershell
$body = @{
    task = "analyze my investment portfolio performance for tech stocks in the last quarter and give recommendations"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/agent/run" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Prueba 3 - Genérica (Cualquier cosa):**
```powershell
$body = @{
    task = "create a comprehensive python project structure for a web scraper with best practices"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/agent/run" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Response esperado (200):**
```json
{
  "task_id": "uuid-unique-id",
  "task": "...",
  "status": null,
  "tool_used": null,
  "tool_result": null,
  "response": "...",
  "error": null,
  "created_at": null
}
```

#### Opción 3: Herramientas GUI

Usa **Postman** o **Insomnia** (apps de desktop):
- **URL:** `POST http://localhost:5000/agent/run`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "task": "write a gmail about vacation plans"
  }
  ```

### Casos de Uso de Prueba

El agente se adapta automáticamente según palabras clave en la tarea:

| Palabra clave | Ejemplo de tarea | Herramienta seleccionada |
|---------------|------------------|------------------------|
| email, gmail, write | "write an email about..." | `email_generate` |
| finance, investment, portfolio, stock | "analyze my stocks..." | `finance_analysis` |
| document, edit, file | "create a document..." | `document_edit` |
| excel, spreadsheet, xlsx | "create a spreadsheet..." | `excel_edit` |
| mini map, map, route, location | "build a map for delivery points" | `mini_maps` |
| code, script, program | "write a python script..." | `code_run` |
| (ninguna) | "general question or task" | Consulta solo el LLM |

## Documentación de la API

La documentación interactiva OpenAPI está disponible en: **http://localhost:5000/docs**

### Endpoints principales

#### POST `/agent/run`
Ejecuta una tarea con el agente de IA.

**Request:**
```json
{
  "task": "write email about project status"
}
```

**Response (200):**
```json
{
  "task_id": "uuid",
  "task": "write email about project status",
  "status": "completed",
  "tool_used": "email_generate",
  "tool_result": "...",
  "response": "..."
}
```

Notas de memoria automática:
- Si el usuario escribe instrucciones como "siempre háblame en español", el agente las recuerda para próximos mensajes.
- Si menciona relaciones como "mi jefe Carlos" o compañeros de proyecto, se almacenan como contexto reutilizable.

#### GET `/agent/tools`
Lista todas las herramientas disponibles.

**Response (200):**
```json
{
  "tools": {
    "gmail_read": {"description": "...", "endpoint": "..."},
    "email_generate": {"description": "...", "endpoint": "..."},
    "finance_analysis": {"description": "...", "endpoint": "..."},
    "document_edit": {"description": "...", "endpoint": "..."},
    "excel_edit": {"description": "...", "endpoint": "..."},
    "code_run": {"description": "...", "endpoint": "..."},
    "mini_maps": {"description": "...", "endpoint": "..."}
  }
}
```

#### POST `/agent/select-tool`
Devuelve solo el id de la herramienta recomendada para una tarea.

**Request:**
```json
{
  "task": "create a monthly spreadsheet"
}
```

**Response (200):**
```json
{
  "tool_id": "excel_edit"
}
```

#### POST `/agent/action`
Ejecuta una herramienta específica.

**Request:**
```json
{
  "tool": "email_generate",
  "payload": {"task": "write thank you email"}
}
```

#### POST `/agent/tool`
Ejecuta una herramienta directamente por ID.

**Request:**
```json
{
  "tool_id": "finance_analysis",
  "payload": {"task": "analyze Q4 revenue"}
}
```

#### GET `/agent/memory`
Lista la memoria persistida del usuario actual.

#### DELETE `/agent/memory`
Borra la memoria persistida del usuario actual.

#### GET `/agent/plan`
Devuelve el plan activo del usuario (por defecto `free`) y sus límites.

#### GET `/agent/usage`
Devuelve consumo mensual estimado por usuario (prompts, tokens de entrada/salida y costo aproximado).

#### GET `/agent/status/{task_id}`
Obtiene el estado de una tarea.

**Response (200):**
```json
{
  "task": "...",
  "status": "completed",
  "result": {...}
}
```

**Response (404):** Task not found

#### GET `/agent/history`
Obtiene el historial de tareas ejecutadas.

**Response (200):**
```json
{
  "tasks": [
    {"task": "...", "status": "completed", "result": {...}},
    ...
  ]
}
```

#### GET `/`
Health check del servicio.

**Response (200):**
```json
{
  "status": "IA-service is running"
}
```

## Estructura del proyecto

```
IA-service/
├── main.py                      # Entrypoint FastAPI
├── requirements.txt             # Dependencias oficiales
├── .env                         # Variables de entorno (local)
├── docker-compose.yml           # Orquestación con Docker
├── Dockerfile                   # Imagen del contenedor
├── agents/
│   ├── agent.py                # Lógica principal del agente
│   ├── task_memory.py          # Almacenamiento temporal de tareas
│   └── main.py                 # Configuración (legacy)
├── routes/
│   └── agent_routes.py         # Endpoints de la API (input/output tipados)
├── ai/
│   ├── model_client.py         # Cliente OpenRouter con timeouts
│   └── memory.py               # Persistencia opcional
├── tools/
│   ├── registry.py             # Registro de herramientas
│   ├── tool_selector.py        # Selector por keywords
│   ├── tool_executor.py        # Ejecutor con validación HTTP
│   ├── email_tool.py           # Herramienta de emails
│   └── finance_tool.py         # Herramienta de análisis financiero
├── auth/
│   └── token_vault.py          # Gestión de tokens (auth)
├── utils/
│   └── logger.py               # Logging centralizado
├── service/
│   ├── doc-service/main.py     # Microservicio Word/PDF + descargas
│   ├── excel-service/main.py   # Microservicio Excel + descargas
│   ├── code-service/main.py    # Microservicio de ejecución y snippets de código
│   └── mini-maps-service/main.py # Microservicio de mini mapas 9x9
└── tests/
    ├── test_agent_routes.py    # Suite de tests (14 tests)
    └── __init__.py
```

## Arquitectura

### Flujo de ejecución

1. **Cliente** → POST `/agent/run` con `{task: "..."}`
2. **main.py** → Monta router de rutas
3. **agent_routes.py** → Valida entrada con Pydantic, llama `Agent.run()`
4. **agent.py** → Orquesta el flujo:
   - Selecciona herramienta por palabras clave
   - Ejecuta tool (si aplica)
   - Prepara prompt dinámico según tipo de tarea
   - Llama modelo LLM (OpenRouter)
   - Post-procesa (ej: genera documento si corresponde)
5. **model_client.py** → Llamada HTTP con timeout a OpenRouter
6. **Response** ← Validado con response_model, retorna al cliente

### Capas

- **API Layer**: `main.py` + `routes/agent_routes.py` (tipado con Pydantic)
- **Agent Layer**: `agents/agent.py` (orquestación, estado)
- **LLM Layer**: `ai/model_client.py` (integración OpenRouter)
- **Tool Layer**: `tools/*` (selección, ejecución, integración microservicios)
- **Auth/Utils**: `auth/`, `utils/` (tokens, logging)

## Configuración

### Variables de entorno (`.env`)

```
# Modelo y API
OPENROUTER_API_KEY=sk-or-v1-...                  # API key OpenRouter
OPENROUTER_MODEL=openai/gpt-4o-mini              # Modelo a usar
HTTP_TIMEOUT_SECONDS=20                          # Timeout HTTP (default 20s)

# Seguridad
JWT_SECRET=your-secret-key-change-in-production  # JWT para auth

# Opcionales
TOKEN_VAULT_URL=http://localhost:8001            # Servicio de tokens
GMAIL_SERVICE_URL=http://gmail-service:8082      # URL Gmail service
DOC_SERVICE_URL=http://doc-service:9002          # URL Doc service
EXCEL_SERVICE_URL=http://excel-service:9004      # URL Excel service
CODE_SERVICE_URL=http://code-service:9003        # URL Code service
MINI_MAPS_SERVICE_URL=http://mini-maps-service:9005 # URL Mini Maps service
CODE_SNIPPETS_DB_PATH=/data/snippets.db          # SQLite persistente para snippets de code-service
CODE_PYTHON_ALLOWED_IMPORTS=math,statistics,decimal,datetime,time,json,csv,sqlite3,collections,itertools,functools,fractions,random,re,typing,pathlib,openpyxl
CODE_JS_ALLOWED_MODULES=
CODE_PYTHON_BLOCK_PATTERNS=
CODE_JS_BLOCK_PATTERNS=
CODE_SQL_BLOCK_PATTERNS=
```

## Microservicios específicos

### doc-service (Word/PDF)
- `POST /edit`: crea archivos `docx`, `pdf` o `both`.
- `POST /apply-changes`: aplica cambios sobre un archivo existente (`docx` o revisión `pdf`) usando reemplazos y texto adicional.
- `GET /files/{file_name}`: descarga el archivo generado.
- Puerto por defecto: `9002`.

### excel-service
- `POST /edit`: crea un archivo `xlsx` con una o varias hojas.
- `GET /files/{file_name}`: descarga el archivo generado.
- Puerto por defecto: `9004`.

### code-service (pequeño editor de código)
- `POST /run`: ejecuta snippets en `python`, `sql` (SQLite) o `javascript` con timeout.
- `GET /snippets`: lista snippets en memoria.
- `POST /snippets`: guarda snippets persistentes en SQLite.
- `GET /snippets/{id}`: obtiene snippet por id.
- `DELETE /snippets/{id}`: elimina snippet por id.
- `PUT /snippets/{id}`: actualiza snippet por id.
- `DELETE /snippets?confirm=true`: elimina todos los snippets.
- Límite configurable de memoria por ejecución: `CODE_MAX_MEMORY_MB` (default `128`).
- Límite configurable de tiempo: `CODE_EXEC_TIMEOUT_SECONDS` (default `5`).
- Límites adicionales: `CODE_MAX_STDIN_CHARS`, `CODE_MAX_SQL_RESULT_ROWS`, `CODE_MAX_SQL_STATEMENTS`.
- Seguridad por políticas: `CODE_STRICT_MODE=true` bloquea patrones peligrosos.
- Allowlist configurable: `CODE_PYTHON_ALLOWED_IMPORTS`, `CODE_JS_ALLOWED_MODULES`.
- Blocklist configurable: `CODE_PYTHON_BLOCK_PATTERNS`, `CODE_JS_BLOCK_PATTERNS`, `CODE_SQL_BLOCK_PATTERNS`.
- Persistencia DB configurable: `CODE_SNIPPETS_DB_PATH`.
- Puerto por defecto: `9003`.

### mini-maps-service
- `GET /`: UI interactiva con Leaflet para crear marcadores circulares.
- `GET /api/points`: lista puntos persistidos por `user_id`.
- `POST /api/points`: crea marcador con `name`, `lat`, `lng`, `color`, `radius`.
- `PUT /api/points/{point_id}`: edita nombre, color y radio.
- `DELETE /api/points/{point_id}`: elimina marcador.
- `POST /map`: endpoint legado compatible con integración por coordenadas `x,y`.
- Puerto por defecto: `9005`.

### Integración frontend
- Pantalla de UI: `/app/documents`.
- Crea documentos y hojas de cálculo desde el frontend.
- Incluye botones de descarga directa e historial de descargas recientes.
- El historial persiste en `localStorage` bajo la clave `orbit-docs-recent-downloads` (máximo 12 elementos).
- Incluye botón **Limpiar historial** para vaciar el historial local y sincronizar `localStorage`.
- Al limpiar, la UI solicita confirmación (modal) para evitar borrados accidentales.
- Pantalla de UI para mini maps y editor de código: `/app/labs`.

## Cobertura de issues (#37, #38, #39, #40)

### #37 Word/PDF
- ✅ Crear documentos Word/PDF.
- ✅ Descargar archivos generados.
- ✅ Editar documentos existentes vía `POST /apply-changes` para cambios enviados por IA.

### #38 Mini Maps
- ✅ Microservicio dedicado con mapa interactivo y marcadores editables.
- ✅ Persistencia de puntos por usuario (`user_id`).
- ✅ Exposición por API para consumo desde frontend o agente (incluye endpoint legado).

### #39 Pequeño editor de código
- ✅ Microservicio independiente con baja interacción con otros servicios.
- ✅ Dos lenguajes livianos orientados a análisis (`python`, `sql`).
- ✅ Límite de tiempo por ejecución.
- ✅ Límite de memoria configurable.
- ✅ Persistencia real de snippets en DB SQLite.

### #40 Editor Excel
- ✅ Crear y gestionar workbooks (`POST /edit`).
- ✅ Análisis básico de datos (`POST /analyze`).
- ✅ Conversión de Excel a Word (`POST /to-word`).
- ✅ Descarga de artefactos generados (`GET /files/{file_name}`).

## Mejoras implementadas (Pasos 1-4)

### Paso 1: Unificación de flujo
- ✅ Eliminada lógica duplicada en `main.py`
- ✅ Centralizado router en `agent_routes.py`
- ✅ Arquitectura clara: entrypoint → rutas → agente

### Paso 2: Robustez y Docker
- ✅ Timeouts configurables en llamadas HTTP
- ✅ Validación HTTP (`raise_for_status()`)
- ✅ Manejo de JSON inválido
- ✅ Dockerfile usando `requirements.txt`
- ✅ docker-compose con variables de entorno

### Paso 3: Tipado de inputs
- ✅ Modelos Pydantic: `AgentRunRequest`, `AgentActionRequest`, `AgentToolRequest`
- ✅ Validación automática de campos obligatorios
- ✅ HTTP 422 para validaciones fallidas

### Paso 4: Response models y tests
- ✅ Response models estándar para todos los endpoints
- ✅ 14 tests unitarios con pytest
- ✅ Cobertura de validación, códigos HTTP, contratos API

### Paso 5: Capacidades y microservicios
- ✅ Endpoint `POST /agent/select-tool` para devolver `tool_id`
- ✅ Registro de tools internas y externas unificado
- ✅ `document_edit` para Word/PDF
- ✅ `excel_edit` para generación de Excel
- ✅ `code_run` para ejecutar snippets controlados
- ✅ `mini_maps` para generar mini mapas desde coordenadas
- ✅ Descarga de archivos en `doc-service` y `excel-service`

## Próximas mejoras opcionales

- [ ] Selector de tools por LLM (en lugar de keywords)
- [ ] Persistencia en DB (vs RAM)
- [ ] Agent loop multi-paso con retry y observación
- [ ] Métricas de Prometheus/observabilidad
- [ ] Rate limiting y autenticación JWT
- [ ] Documentación de cada herramienta

## Troubleshooting

### Error: `OPENROUTER_API_KEY` no configurada
Asegúrate de crear `.env` con la clave válida.

### Error: Timeout en llamadas a herramientas
Aumenta `HTTP_TIMEOUT_SECONDS` en `.env` si los microservicios son lentos.

### Error en tests: `ImportError: No module named ...`
Ejecuta `pip install -r requirements.txt` para instalar dependencias.

### Docker error: `port 5000 already in use`
Cambia en `docker-compose.yml`: `ports: - "5001:5000"` (mapeo diferente).

## Autor

Equipo de desarrollo Orbit - 2026