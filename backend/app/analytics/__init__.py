"""
analytics/__init__.py - Expose AnalyticsEngine for clean imports
NEXUS - Intelligent Cloud Storage Optimization System
"""

from app.analytics.engine import AnalyticsEngine

__all__ = ["AnalyticsEngine"]
