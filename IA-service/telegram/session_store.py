import sqlite3
import os
from datetime import datetime


class TelegramSessionStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telegram_sessions (
                    user_id   TEXT PRIMARY KEY,
                    session   TEXT NOT NULL,
                    phone     TEXT,
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            """)
            conn.commit()

    def save(self, user_id: str, session: str, phone: str = None):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO telegram_sessions (user_id, session, phone, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    session    = excluded.session,
                    phone      = excluded.phone,
                    updated_at = excluded.updated_at
            """, (user_id, session, phone, datetime.utcnow().isoformat()))
            conn.commit()

    def get(self, user_id: str) -> str | None:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT session FROM telegram_sessions WHERE user_id = ?", (user_id,)
            ).fetchone()
        return row[0] if row else None

    def delete(self, user_id: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM telegram_sessions WHERE user_id = ?", (user_id,))
            conn.commit()

    def has_session(self, user_id: str) -> bool:
        return self.get(user_id) is not None
