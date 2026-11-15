"""
database.py - Database Connection and Session Management
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# In SQLite, check_same_thread=False is required for FastAPI multithreaded requests
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides an isolated SQLAlchemy database session per request.
    Ensures sessions are cleanly closed when requests finish.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Create database tables for all registered SQLAlchemy models.
    """
    Base.metadata.create_all(bind=engine)
