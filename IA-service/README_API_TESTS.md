# IA-service API Test JSONs

Guia rapida para probar memoria, planes y consumo desde Swagger:

- Swagger: `http://localhost:5000/docs`
- Header usuario recomendado en todas las pruebas:
  - `X-User-Id: carlos-test`
- Header admin solo para cambiar plan:
  - `X-Admin-Key: TU_PLAN_ADMIN_API_KEY`

## Flujo recomendado (orden)

1. `DELETE /agent/memory`
2. `POST /agent/run` (guardar memoria)
3. `GET /agent/memory` (verificar memoria)
4. `POST /agent/run` (recuperacion de memoria)
5. `GET /agent/usage` (ver consumo)
6. `GET /agent/plan` (ver plan actual)
7. `POST /agent/plan` (admin, opcional)
8. `GET /agent/plan` (confirmar cambio)
9. `POST /agent/tool` (probar herramienta permitida)
10. `POST /agent/tool` (probar herramienta restringida en free)

## Endpoints con JSON

### 1) POST /agent/run
Guarda memoria de idioma y personas.

```json
{
  "task": "Siempre hablame en espanol. Mi jefe Carlos revisa los reportes. Mis companeros Ana y Luis trabajan conmigo."
}
```

### 2) POST /agent/run
Prueba de recuperacion de memoria.

```json
{
  "task": "Escribe un mensaje corto para mi jefe sobre el estado del proyecto."
}
```

### 3) POST /agent/tool
Herramienta permitida (ejemplo).

```json
{
  "tool_id": "finance_analysis",
  "payload": {
    "task": "analiza el flujo de caja del mes"
  }
}
```

### 4) POST /agent/tool
Herramienta que puede estar restringida en plan free.

```json
{
  "tool_id": "code_run",
  "payload": {
    "task": "print('hola')"
  }
}
```

### 5) POST /agent/plan (admin)
Cambiar plan del usuario.

```json
{
  "user_id": "carlos-test",
  "plan_name": "lite"
}
```

Valores validos de `plan_name`:
- `free`
- `lite`
- `standard`
- `pro`

### 6) POST /agent/plan (admin)
Volver a plan free.

```json
{
  "user_id": "carlos-test",
  "plan_name": "free"
}
```

## Endpoints sin body JSON

Estos endpoints no requieren body:

- `GET /agent/tools`
- `GET /agent/memory`
- `DELETE /agent/memory`
- `GET /agent/plan`
- `GET /agent/usage`
- `GET /agent/history`
- `GET /agent/status/{task_id}`
- `GET /`
- `GET /metrics`

## Respuestas esperadas (resumen)

- `GET /agent/memory`: lista `items` con memoria persistida por usuario.
- `GET /agent/plan`: plan actual y limites del usuario.
- `GET /agent/usage`: prompts/tokens/costo estimado y `remaining`.
- `POST /agent/tool` restringida en free: `403` con `tool_restricted_by_plan`.
- Cuota/rate limit excedido: `429`.
