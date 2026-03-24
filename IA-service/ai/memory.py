import sqlite3
from typing import Dict, Any

class Memory:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.create_table()

    def create_table(self):
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task TEXT NOT NULL,
                result TEXT NOT NULL
            )
        ''')
        self.conn.commit()

    def get_memory(self, task: str):
        self.cursor.execute('SELECT result FROM memory WHERE task = ?', (task,))
        row = self.cursor.fetchone()
        return row[0] if row else None

    def save_memory(self, task: str, result: str):
        self.cursor.execute('INSERT INTO memory (task, result) VALUES (?, ?)', (task, result))
        self.conn.commit()