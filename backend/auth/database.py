import os
import sqlite3
from pathlib import Path

# Configurable SQLite database path
AUTH_DB_PATH_ENV = os.getenv("AUTH_DB_PATH")
if AUTH_DB_PATH_ENV:
    DB_PATH = Path(AUTH_DB_PATH_ENV)
else:
    DB_PATH = Path(__file__).resolve().parent / "auth.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    # Ensure parent directory of database exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

