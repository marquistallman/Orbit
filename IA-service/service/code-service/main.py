import os
import tempfile
import subprocess
import sqlite3
import time
import re
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

try:
    import resource
except ImportError:  # pragma: no cover
    resource = None

app = FastAPI()

HTTP_TIMEOUT_SECONDS = int(os.getenv("CODE_EXEC_TIMEOUT_SECONDS", "5"))
MAX_CODE_CHARS = int(os.getenv("CODE_MAX_CHARS", "12000"))
MAX_OUTPUT_CHARS = int(os.getenv("CODE_MAX_OUTPUT_CHARS", "4000"))
MAX_MEMORY_MB = int(os.getenv("CODE_MAX_MEMORY_MB", "128"))
MAX_STDIN_CHARS = int(os.getenv("CODE_MAX_STDIN_CHARS", "4000"))
MAX_SQL_RESULT_ROWS = int(os.getenv("CODE_MAX_SQL_RESULT_ROWS", "200"))
MAX_SQL_STATEMENTS = int(os.getenv("CODE_MAX_SQL_STATEMENTS", "30"))
STRICT_MODE = os.getenv("CODE_STRICT_MODE", "true").lower() in ("1", "true", "yes", "on")
SNIPPETS_DB_PATH = os.getenv("CODE_SNIPPETS_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "snippets.db"))
SUPPORTED_LANGUAGES = ("python", "sql", "javascript")

DEFAULT_ALLOWED_PYTHON_IMPORTS = (
    "math,statistics,decimal,datetime,time,json,csv,sqlite3,"
    "collections,itertools,functools,fractions,random,re,typing,pathlib,openpyxl"
)
DEFAULT_ALLOWED_JS_MODULES = ""

FORBIDDEN_PATTERNS = {
    "python": [
        r"\bimport\s+os\b",
        r"\bimport\s+subprocess\b",
        r"\bimport\s+socket\b",
        r"\bfrom\s+os\s+import\b",
        r"\bfrom\s+subprocess\s+import\b",
        r"\bopen\s*\(",
        r"\bexec\s*\(",
        r"\beval\s*\(",
    ],
    "javascript": [
        r"\brequire\s*\(\s*['\"]fs['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]child_process['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]net['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]http['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]https['\"]\s*\)",
        r"\bprocess\.env\b",
        r"\beval\s*\(",
        r"\bFunction\s*\(",
    ],
    "sql": [
        r"\battach\b",
        r"\bdetach\b",
        r"\bload_extension\b",
        r"\bpragma\b",
        r"\bvacuum\b",
    ],
}


def _parse_csv_env(raw: str) -> set[str]:
    if not raw:
        return set()
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _parse_pattern_env(raw: str, fallback: list[str]) -> list[str]:
    if not raw:
        return fallback
    parsed = [item.strip() for item in raw.split(";;") if item.strip()]
    return parsed if parsed else fallback


PYTHON_ALLOWED_IMPORTS = _parse_csv_env(os.getenv("CODE_PYTHON_ALLOWED_IMPORTS", DEFAULT_ALLOWED_PYTHON_IMPORTS))
JS_ALLOWED_MODULES = _parse_csv_env(os.getenv("CODE_JS_ALLOWED_MODULES", DEFAULT_ALLOWED_JS_MODULES))

FORBIDDEN_PATTERNS = {
    "python": _parse_pattern_env(os.getenv("CODE_PYTHON_BLOCK_PATTERNS", ""), FORBIDDEN_PATTERNS["python"]),
    "javascript": _parse_pattern_env(os.getenv("CODE_JS_BLOCK_PATTERNS", ""), FORBIDDEN_PATTERNS["javascript"]),
    "sql": _parse_pattern_env(os.getenv("CODE_SQL_BLOCK_PATTERNS", ""), FORBIDDEN_PATTERNS["sql"]),
}


class CodeRunRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(default="python")  # python | sql | javascript
    stdin: str = Field(default="")


class SnippetRequest(BaseModel):
    title: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    language: str = Field(default="python")


class SnippetUpdateRequest(BaseModel):
    title: str | None = Field(default=None)
    code: str | None = Field(default=None)
    language: str | None = Field(default=None)


def _ensure_db_dir():
    parent = os.path.dirname(SNIPPETS_DB_PATH)
    if parent:
        os.makedirs(parent, exist_ok=True)


def _db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(SNIPPETS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    _ensure_db_dir()
    conn = _db_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                language TEXT NOT NULL,
                code TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


_init_db()


def _normalize_language(language: str) -> str:
    normalized = (language or "").lower().strip()
    if normalized not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Use: {list(SUPPORTED_LANGUAGES)}")
    return normalized


def _assert_safe_code(language: str, code: str):
    if not STRICT_MODE:
        return

    for pattern in FORBIDDEN_PATTERNS.get(language, []):
        if re.search(pattern, code, flags=re.IGNORECASE):
            raise HTTPException(status_code=400, detail=f"Blocked by strict mode pattern: {pattern}")


def _extract_python_imports(code: str) -> set[str]:
    modules: set[str] = set()

    for match in re.finditer(r"^\s*import\s+([a-zA-Z0-9_.,\s]+)", code, flags=re.MULTILINE):
        clause = match.group(1)
        for part in clause.split(","):
            base = part.strip().split(" as ")[0].strip().split(".")[0]
            if base:
                modules.add(base.lower())

    for match in re.finditer(r"^\s*from\s+([a-zA-Z0-9_\.]+)\s+import\s+", code, flags=re.MULTILINE):
        base = match.group(1).split(".")[0].strip()
        if base:
            modules.add(base.lower())

    return modules


def _extract_js_modules(code: str) -> set[str]:
    modules: set[str] = set()

    patterns = [
        r"require\(\s*['\"]([^'\"]+)['\"]\s*\)",
        r"import\s+[^\n]*?from\s+['\"]([^'\"]+)['\"]",
        r"import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
        r"import\s+['\"]([^'\"]+)['\"]",
    ]

    for pattern in patterns:
        for m in re.finditer(pattern, code):
            value = m.group(1).strip().lower()
            if value:
                modules.add(value)

    return modules


def _assert_allowed_modules(language: str, code: str):
    if not STRICT_MODE:
        return

    if language == "python" and PYTHON_ALLOWED_IMPORTS:
        found = _extract_python_imports(code)
        blocked = sorted(mod for mod in found if mod not in PYTHON_ALLOWED_IMPORTS)
        if blocked:
            raise HTTPException(
                status_code=400,
                detail=f"Python imports not allowed: {blocked}. Allowed: {sorted(PYTHON_ALLOWED_IMPORTS)}",
            )

    if language == "javascript" and JS_ALLOWED_MODULES:
        found = _extract_js_modules(code)
        blocked = []
        for mod in found:
            # Block local path imports in strict mode by default.
            if mod.startswith("./") or mod.startswith("../") or mod.startswith("/"):
                blocked.append(mod)
                continue
            if mod not in JS_ALLOWED_MODULES:
                blocked.append(mod)

        if blocked:
            raise HTTPException(
                status_code=400,
                detail=f"JavaScript modules not allowed: {sorted(blocked)}. Allowed: {sorted(JS_ALLOWED_MODULES)}",
            )


@app.get("/")
def health():
    return {
        "status": "code service running",
        "timeout_seconds": HTTP_TIMEOUT_SECONDS,
        "max_code_chars": MAX_CODE_CHARS,
        "max_memory_mb": MAX_MEMORY_MB,
        "max_stdin_chars": MAX_STDIN_CHARS,
        "max_sql_result_rows": MAX_SQL_RESULT_ROWS,
        "max_sql_statements": MAX_SQL_STATEMENTS,
        "strict_mode": STRICT_MODE,
        "supported_languages": list(SUPPORTED_LANGUAGES),
        "python_allowed_imports": sorted(PYTHON_ALLOWED_IMPORTS),
        "js_allowed_modules": sorted(JS_ALLOWED_MODULES),
        "snippets_db_path": SNIPPETS_DB_PATH,
    }


@app.get("/snippets")
def list_snippets(limit: int = 20):
    safe_limit = max(1, min(limit, 200))
    conn = _db_connection()
    try:
        rows = conn.execute(
            "SELECT id, title, language, code, created_at FROM snippets ORDER BY id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
        snippets = [dict(r) for r in rows]
    finally:
        conn.close()

    return {"snippets": snippets, "count": len(snippets)}


@app.get("/snippets/{snippet_id}")
def get_snippet(snippet_id: int):
    conn = _db_connection()
    try:
        row = conn.execute(
            "SELECT id, title, language, code, created_at FROM snippets WHERE id = ?",
            (snippet_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Snippet not found")

    return {"snippet": dict(row)}


@app.post("/snippets")
def save_snippet(data: SnippetRequest):
    lang = _normalize_language(data.language)

    created_at = datetime.now(timezone.utc).isoformat()
    conn = _db_connection()
    try:
        cur = conn.execute(
            "INSERT INTO snippets (title, language, code, created_at) VALUES (?, ?, ?, ?)",
            (data.title, lang, data.code, created_at),
        )
        conn.commit()
        snippet_id = cur.lastrowid
    finally:
        conn.close()

    item = {
        "id": snippet_id,
        "title": data.title,
        "language": lang,
        "code": data.code,
        "created_at": created_at,
    }
    return {"message": "Snippet saved", "snippet": item}


@app.delete("/snippets/{snippet_id}")
def delete_snippet(snippet_id: int):
    conn = _db_connection()
    try:
        cur = conn.execute("DELETE FROM snippets WHERE id = ?", (snippet_id,))
        conn.commit()
    finally:
        conn.close()

    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Snippet not found")

    return {"message": "Snippet deleted", "id": snippet_id}


@app.put("/snippets/{snippet_id}")
def update_snippet(snippet_id: int, data: SnippetUpdateRequest):
    updates = []
    params = []

    if data.title is not None:
        updates.append("title = ?")
        params.append(data.title)
    if data.language is not None:
        updates.append("language = ?")
        params.append(_normalize_language(data.language))
    if data.code is not None:
        updates.append("code = ?")
        params.append(data.code)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    params.append(snippet_id)

    conn = _db_connection()
    try:
        cur = conn.execute(
            f"UPDATE snippets SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        conn.commit()

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Snippet not found")

        row = conn.execute(
            "SELECT id, title, language, code, created_at FROM snippets WHERE id = ?",
            (snippet_id,),
        ).fetchone()
    finally:
        conn.close()

    return {"message": "Snippet updated", "snippet": dict(row)}


@app.delete("/snippets")
def delete_all_snippets(confirm: bool = Query(default=False)):
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass confirm=true to delete all snippets")

    conn = _db_connection()
    try:
        cur = conn.execute("DELETE FROM snippets")
        conn.commit()
        deleted = cur.rowcount
    finally:
        conn.close()

    return {"message": "All snippets deleted", "deleted_count": deleted}


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + "\n...[output truncated]"


def _limit_memory():
    if resource is None:
        return
    limit_bytes = MAX_MEMORY_MB * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
    cpu_limit = max(1, HTTP_TIMEOUT_SECONDS)
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit))


def _safe_env(for_js: bool = False) -> dict[str, str]:
    env = {
        "PYTHONIOENCODING": "utf-8",
        "PATH": os.getenv("PATH", ""),
    }
    if for_js:
        # Constrain Node heap for safer execution profile.
        env["NODE_OPTIONS"] = f"--max-old-space-size={max(32, MAX_MEMORY_MB)}"
    return env


def _run_python(code: str, stdin: str):
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = os.path.join(tmp_dir, "snippet.py")
        with open(tmp_path, "w", encoding="utf-8") as tmp:
            tmp.write(code)

        kwargs = {
            "input": stdin,
            "text": True,
            "capture_output": True,
            "timeout": HTTP_TIMEOUT_SECONDS,
            "check": False,
            "cwd": tmp_dir,
            "env": _safe_env(for_js=False),
        }
        if os.name != "nt" and resource is not None:
            kwargs["preexec_fn"] = _limit_memory

        result = subprocess.run(["python", "-I", tmp_path], **kwargs)
        return {
            "exit_code": result.returncode,
            "stdout": _truncate(result.stdout),
            "stderr": _truncate(result.stderr),
            "timed_out": False,
        }


def _run_javascript(code: str, stdin: str):
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = os.path.join(tmp_dir, "snippet.js")
        with open(tmp_path, "w", encoding="utf-8") as tmp:
            tmp.write(code)

        kwargs = {
            "input": stdin,
            "text": True,
            "capture_output": True,
            "timeout": HTTP_TIMEOUT_SECONDS,
            "check": False,
            "cwd": tmp_dir,
            "env": _safe_env(for_js=True),
        }
        if os.name != "nt" and resource is not None:
            kwargs["preexec_fn"] = _limit_memory

        result = subprocess.run(
            ["node", "--disallow-code-generation-from-strings", tmp_path],
            **kwargs,
        )

        return {
            "exit_code": result.returncode,
            "stdout": _truncate(result.stdout),
            "stderr": _truncate(result.stderr),
            "timed_out": False,
        }


def _run_sql(code: str):
    start = time.perf_counter()
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    collected = []
    warnings = []

    try:
        statements = [part.strip() for part in code.split(";") if part.strip()]
        if len(statements) > MAX_SQL_STATEMENTS:
            return {
                "exit_code": 1,
                "stdout": "",
                "stderr": _truncate(f"Too many SQL statements. Max {MAX_SQL_STATEMENTS}"),
                "timed_out": False,
                "warnings": warnings,
                "result_sets": collected,
            }

        for stmt in statements:
            cursor.execute(stmt)
            if stmt.lower().startswith("select"):
                rows = cursor.fetchall()
                cols = [d[0] for d in cursor.description] if cursor.description else []
                collected.append({
                    "columns": cols,
                    "rows": [dict(r) for r in rows[:MAX_SQL_RESULT_ROWS]],
                    "row_count": len(rows),
                })

            if (time.perf_counter() - start) > HTTP_TIMEOUT_SECONDS:
                warnings.append(f"SQL time budget exceeded ({HTTP_TIMEOUT_SECONDS}s)")
                break

        conn.commit()
    except sqlite3.Error as exc:
        return {
            "exit_code": 1,
            "stdout": "",
            "stderr": _truncate(str(exc)),
            "timed_out": False,
            "warnings": warnings,
            "result_sets": collected,
        }
    finally:
        conn.close()

    return {
        "exit_code": 0,
        "stdout": _truncate(str(collected) if collected else "SQL executed successfully"),
        "stderr": "",
        "timed_out": False,
        "warnings": warnings,
        "result_sets": collected,
    }


@app.post("/run")
def run_code(data: CodeRunRequest):
    lang = _normalize_language(data.language)

    if len(data.code) > MAX_CODE_CHARS:
        return {
            "error": f"Code too large. Max {MAX_CODE_CHARS} chars",
            "max_code_chars": MAX_CODE_CHARS,
        }

    if len(data.stdin) > MAX_STDIN_CHARS:
        return {
            "error": f"stdin too large. Max {MAX_STDIN_CHARS} chars",
            "max_stdin_chars": MAX_STDIN_CHARS,
        }

    _assert_safe_code(lang, data.code)
    _assert_allowed_modules(lang, data.code)

    try:
        if lang == "python":
            result_payload = _run_python(data.code, data.stdin)
        elif lang == "javascript":
            result_payload = _run_javascript(data.code, data.stdin)
        else:
            result_payload = _run_sql(data.code)

        return {
            "language": lang,
            "memory_limit_mb": MAX_MEMORY_MB,
            "strict_mode": STRICT_MODE,
            **result_payload,
        }
    except FileNotFoundError as exc:
        return {
            "language": lang,
            "memory_limit_mb": MAX_MEMORY_MB,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Runtime not found: {str(exc)}",
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "language": lang,
            "memory_limit_mb": MAX_MEMORY_MB,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Execution timed out after {HTTP_TIMEOUT_SECONDS}s",
            "timed_out": True,
        }
