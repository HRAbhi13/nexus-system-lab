"""
main.py - FastAPI Application Entry Point
NEXUS - Intelligent Cloud Storage Optimization System

Configures FastAPI instance, CORS middleware for frontend UI integration,
database table creation, and API route controllers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.storage.tier_manager import TierManager
from app.api import routes_files, routes_analytics, routes_optimizer, routes_tiers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifespan context.
    Initializes database tables and seeds standard cloud tiers on boot.
    """
    # 1. Startup: Create tables if not present
    init_db()

    # 2. Seed default cloud tiers
    db = SessionLocal()
    try:
        TierManager.seed_default_tiers(db)
    finally:
        db.close()

    yield
    # Shutdown logic (if any) goes here


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade backend engine for automated cloud storage optimization, "
        "cryptographic deduplication, compression advisory, and lifecycle cost prediction."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend UI communication (supports any localhost or web origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routers under /api/v1
app.include_router(routes_files.router, prefix=f"{settings.API_V1_PREFIX}/files", tags=["Files"])
app.include_router(routes_analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics"])
app.include_router(routes_optimizer.router, prefix=f"{settings.API_V1_PREFIX}/optimizer", tags=["Optimizer"])
app.include_router(routes_tiers.router, prefix=f"{settings.API_V1_PREFIX}/tiers", tags=["Storage Tiers"])


@app.get("/", tags=["System"])
def root():
    """System health and metadata index endpoint."""
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "simulation_note": "Simulated local cloud bucket with realistic AWS/GCP tier pricing models.",
    }


@app.get("/health", tags=["System"])
def health():
    """Liveness probe endpoint."""
    return {"status": "healthy"}
