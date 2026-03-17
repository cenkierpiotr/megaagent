import sqlite3
import datetime
import os

DB_PATH = "/shared/audit.db"

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            agent TEXT,
            command TEXT,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_command(agent, command, status="executed"):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO audit_logs (timestamp, agent, command, status) VALUES (?, ?, ?, ?)",
        (datetime.datetime.now().isoformat(), agent, command, status)
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Audit DB initialized at {DB_PATH}")
