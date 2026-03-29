import base64
import json
import os
import re
import sqlite3
from datetime import datetime
from typing import Any


def _utc_now() -> str:
    return datetime.utcnow().isoformat()


def _ensure_db_dir(db_path: str) -> None:
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)


class UserMemoryStore:
    """Lightweight persistent memory by user for preferences and people context."""

    def __init__(self, db_path: str):
        _ensure_db_dir(db_path)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                memory_key TEXT NOT NULL,
                memory_type TEXT NOT NULL,
                memory_value TEXT NOT NULL,
                source_text TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, memory_key)
            )
            """
        )
        self.conn.commit()

    def _upsert(self, user_id: str, memory_key: str, memory_type: str, memory_value: dict[str, Any], source_text: str) -> None:
        now = _utc_now()
        payload = json.dumps(memory_value, ensure_ascii=True)
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO user_memory (user_id, memory_key, memory_type, memory_value, source_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, memory_key) DO UPDATE SET
                memory_type=excluded.memory_type,
                memory_value=excluded.memory_value,
                source_text=excluded.source_text,
                updated_at=excluded.updated_at
            """,
            (user_id, memory_key, memory_type, payload, source_text, now, now),
        )
        self.conn.commit()

    def extract_and_store(self, user_id: str, text: str) -> list[str]:
        saved: list[str] = []
        if not text:
            return saved

        lowered = text.lower()
        lang = None
        if re.search(r"(siempre|por favor|quiero que).*(habl|respond).*(espanol|espa\u00f1ol)", lowered):
            lang = "es"
        elif re.search(r"(siempre|por favor|quiero que).*(habl|respond).*(ingles|ingl\u00e9s|english)", lowered):
            lang = "en"

        if lang:
            self._upsert(user_id, "preference:response_language", "preference", {"language": lang}, text)
            saved.append("preference:response_language")

        boss_match = re.search(r"mi\s+(?:jefe|jefa)\s+([a-zA-Z\u00c0-\u017f]+)", text, flags=re.IGNORECASE)
        if boss_match:
            name = boss_match.group(1).strip()
            key = f"person:{name.lower()}"
            self._upsert(user_id, key, "person", {"name": name, "role": "jefe"}, text)
            saved.append(key)

        mates_match = re.search(r"(?:companeros|compa\u00f1eros)\s+([a-zA-Z\u00c0-\u017f,\sy\-]+)", text, flags=re.IGNORECASE)
        if mates_match:
            raw_names = mates_match.group(1)
            for part in re.split(r",|\sy\s", raw_names):
                name = part.strip(" .")
                if not name or not re.match(r"^[a-zA-Z\u00c0-\u017f\-]+$", name):
                    continue
                key = f"person:{name.lower()}"
                self._upsert(user_id, key, "person", {"name": name, "role": "companero"}, text)
                saved.append(key)

        return saved

    def list_memory(self, user_id: str) -> list[dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT memory_key, memory_type, memory_value, source_text, created_at, updated_at
            FROM user_memory
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "memory_key": row["memory_key"],
                "memory_type": row["memory_type"],
                "memory_value": json.loads(row["memory_value"]),
                "source_text": row["source_text"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

    def clear_memory(self, user_id: str) -> int:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM user_memory WHERE user_id = ?", (user_id,))
        deleted = cur.rowcount
        self.conn.commit()
        return deleted

    def build_system_context(self, user_id: str) -> str:
        items = self.list_memory(user_id)
        if not items:
            return ""

        lang = None
        people: list[str] = []
        for item in items:
            if item["memory_key"] == "preference:response_language":
                lang = item["memory_value"].get("language")
            if item["memory_type"] == "person":
                name = item["memory_value"].get("name")
                role = item["memory_value"].get("role")
                if name and role:
                    people.append(f"{name} ({role})")

        lines = ["Known user memory context:"]
        if lang == "es":
            lines.append("- Preferred response language: Spanish.")
        elif lang == "en":
            lines.append("- Preferred response language: English.")
        if people:
            lines.append("- Relevant people: " + ", ".join(sorted(set(people))) + ".")
        return "\n".join(lines)


def resolve_user_id(token: str | None, fallback: str = "anonymous") -> str:
    if not token:
        return fallback
    raw = token.replace("Bearer ", "").strip()
    if raw.count(".") != 2:
        return fallback
    try:
        payload_part = raw.split(".")[1]
        padding = "=" * (-len(payload_part) % 4)
        decoded = base64.urlsafe_b64decode(payload_part + padding).decode("utf-8")
        payload = json.loads(decoded)
        return str(payload.get("id") or payload.get("email") or payload.get("sub") or fallback)
    except Exception:
        return fallback