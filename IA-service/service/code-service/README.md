# code-service

Microservicio de ejecución de código liviano para análisis (baja interacción con otros servicios).

## Puerto

- Contenedor: `9003`

## Variables de entorno

- `CODE_EXEC_TIMEOUT_SECONDS` (default `5`): límite de tiempo por ejecución.
- `CODE_MAX_MEMORY_MB` (default `128`): límite de memoria para ejecuciones Python en entornos Unix/Linux.
- `CODE_MAX_CHARS` (default `12000`): tamaño máximo del código.
- `CODE_MAX_OUTPUT_CHARS` (default `4000`): truncado de salida.
- `CODE_MAX_STDIN_CHARS` (default `4000`): límite de entrada estándar.
- `CODE_MAX_SQL_RESULT_ROWS` (default `200`): filas máximas retornadas por result set SQL.
- `CODE_MAX_SQL_STATEMENTS` (default `30`): máximo de sentencias SQL por ejecución.
- `CODE_STRICT_MODE` (default `true`): bloquea patrones peligrosos por lenguaje.
- `CODE_PYTHON_ALLOWED_IMPORTS`: allowlist de imports Python permitidos.
- `CODE_JS_ALLOWED_MODULES`: allowlist de módulos JS permitidos.
- `CODE_PYTHON_BLOCK_PATTERNS`: regex bloqueadas para Python (separadas por `;;`).
- `CODE_JS_BLOCK_PATTERNS`: regex bloqueadas para JavaScript (separadas por `;;`).
- `CODE_SQL_BLOCK_PATTERNS`: regex bloqueadas para SQL (separadas por `;;`).
- `CODE_SNIPPETS_DB_PATH` (default `./snippets.db`): ruta SQLite para persistencia real de snippets.

Default recomendado de `CODE_PYTHON_ALLOWED_IMPORTS` (análisis financiero + Excel):

`math,statistics,decimal,datetime,time,json,csv,sqlite3,collections,itertools,functools,fractions,random,re,typing,pathlib,openpyxl`

## Lenguajes soportados

- `python`
- `sql` (SQLite en memoria)
- `javascript` (Node.js)

## Endpoints

### `GET /`
Health check y configuración activa.

### `POST /run`
Ejecuta código.

Request ejemplo Python:

```json
{
  "language": "python",
  "code": "print('hola')",
  "stdin": ""
}
```

Request ejemplo SQL:

```json
{
  "language": "sql",
  "code": "create table t(x int); insert into t values (1); select * from t;"
}
```

Request ejemplo JavaScript:

```json
{
  "language": "javascript",
  "code": "console.log('hola js')"
}
```

Response ejemplo:

```json
{
  "language": "sql",
  "memory_limit_mb": 128,
  "exit_code": 0,
  "stdout": "[...]",
  "stderr": "",
  "timed_out": false,
  "warnings": [],
  "result_sets": [
    {
      "columns": ["x"],
      "rows": [{"x": 1}],
      "row_count": 1
    }
  ]
}
```

Notas:

- Retorna `timed_out: true` si excede tiempo.
- Rechaza payloads mayores a `CODE_MAX_CHARS`.
- El límite de memoria usa `resource` y no aplica en Windows del host.
- En `strict mode` se bloquean patrones de riesgo (filesystem/red/eval/imports peligrosos).
- En `strict mode` también se valida allowlist de imports/módulos.
- Si necesitas ajustar políticas en producción, hazlo vía variables de entorno sin tocar código.

### `GET /snippets`
Lista snippets persistidos en SQLite.

Parámetro opcional:

- `limit` (default `20`, max `200`)

### `GET /snippets/{id}`
Obtiene un snippet por id.

- `404` si no existe.

### `POST /snippets`
Guarda un snippet en SQLite.

Request:

```json
{
  "title": "EDA quick",
  "language": "python",
  "code": "print('ok')"
}
```

Response incluye `created_at` UTC.

### `DELETE /snippets/{id}`
Elimina un snippet específico.

- `404` si no existe.

### `PUT /snippets/{id}`
Actualiza uno o varios campos de un snippet (`title`, `language`, `code`).

Request ejemplo:

```json
{
  "title": "EDA quick v2",
  "code": "print('updated')"
}
```

- `400` si no se envía ningún campo.
- `404` si no existe.

### `DELETE /snippets?confirm=true`
Elimina todos los snippets.

- Requiere `confirm=true` para evitar borrado accidental.
- Si no se envía, retorna `400`.

## Persistencia

- En Docker Compose se monta `./db/generated/code:/data`.
- Ruta recomendada de DB: `/data/snippets.db`.
- Esto permite conservar snippets tras reinicios del contenedor.

## Ejecución local

```bash
uvicorn main:app --host 0.0.0.0 --port 9003
```

## Dependencias

- FastAPI
- sqlite3 (stdlib)
