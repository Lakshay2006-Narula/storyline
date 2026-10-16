"""Quick connection test to Neon PostgreSQL"""
import sys
from dotenv import load_dotenv
load_dotenv()

from db import _use_postgres, _pg_conn, DATABASE_URL, init_db

print(f"DATABASE_URL set: {'Yes' if DATABASE_URL else 'No'}")
print(f"Using PostgreSQL: {_use_postgres()}")
print()

if not _use_postgres():
    print("ERROR: psycopg not installed or DATABASE_URL missing")
    sys.exit(1)

print("Testing connection to Neon...")
try:
    with _pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            print(f"Connected! PostgreSQL version: {version[:50]}")
            
            cur.execute("SELECT current_database(), current_user")
            db, user = cur.fetchone()
            print(f"Database : {db}")
            print(f"User     : {user}")

    print()
    print("Initializing schema (creating tables)...")
    init_db()
    print("All tables created successfully on Neon!")

except Exception as e:
    print(f"Connection FAILED: {e}")
    sys.exit(1)
