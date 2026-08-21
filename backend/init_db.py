#!/usr/bin/env python3
"""
FLYYY.AI Database Initialization Script

This script creates the database schema and seeds demo data.

Usage:
    python init_db.py

Prerequisites:
    - PostgreSQL running and accessible
    - DATABASE_URL environment variable set
    - Python 3.10+ with dependencies installed
"""

import sys
import os
from sqlalchemy import create_engine, text
from pathlib import Path

def get_database_url():
    """Get database URL from environment or use default."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Set it in backend/.env or export DATABASE_URL=postgresql://...")
        sys.exit(1)
    return db_url

def run_sql_file(engine, file_path):
    """Execute SQL file against the database."""
    if not os.path.exists(file_path):
        print(f"ERROR: SQL file not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        sql_content = f.read()
    
    try:
        with engine.connect() as connection:
            # Split by statement and execute
            for statement in sql_content.split(';'):
                statement = statement.strip()
                if statement:
                    print(f"  Executing: {statement[:50]}...")
                    connection.execute(text(statement))
            connection.commit()
        return True
    except Exception as e:
        print(f"ERROR executing {file_path}: {e}")
        return False

def main():
    """Initialize database schema and seed data."""
    print("=" * 60)
    print("FLYYY.AI Database Initialization")
    print("=" * 60)
    
    # Get database URL
    print("\n[1/3] Connecting to database...")
    db_url = get_database_url()
    print(f"  Database URL: {db_url.split('@')[0]}@...")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  ✓ Database connection successful")
    except Exception as e:
        print(f"  ✗ Failed to connect: {e}")
        sys.exit(1)
    
    # Create schema
    print("\n[2/3] Creating database schema...")
    schema_file = Path(__file__).parent / "schema.sql"
    if run_sql_file(engine, str(schema_file)):
        print("  ✓ Schema created successfully")
    else:
        print("  ✗ Failed to create schema")
        sys.exit(1)
    
    # Seed data
    print("\n[3/3] Seeding demo data...")
    seed_file = Path(__file__).parent / "seed.sql"
    if run_sql_file(engine, str(seed_file)):
        print("  ✓ Demo data seeded successfully")
    else:
        print("  ✗ Failed to seed data (non-critical)")
    
    # Verify
    print("\n[4/4] Verifying setup...")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT COUNT(*) FROM ai_assets"))
            count = result.scalar()
            print(f"  ✓ Found {count} AI assets in database")
            
            result = connection.execute(text("SELECT COUNT(*) FROM data_sources"))
            count = result.scalar()
            print(f"  ✓ Found {count} data sources in database")
    except Exception as e:
        print(f"  ✗ Verification failed: {e}")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✓ Database initialization complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Update backend/.env with your database credentials")
    print("  2. Run: cd backend && .venv/Scripts/Activate.ps1")
    print("  3. Run: uvicorn app.main:app --reload")
    print("  4. Open: http://127.0.0.1:8000/docs")
    print("\n")

if __name__ == "__main__":
    main()
