"""
test_api_routes.py - End-to-End Integration Tests for FastAPI REST APIs
Milestone 5: FastAPI REST API & Integration Testing
"""

import io
import os
import sys
import shutil
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, get_db
from app.main import app
from app.storage.local_storage import LocalStorageManager, storage_manager
from app.storage.tier_manager import TierManager


class TestAPIRoutes(unittest.TestCase):
    """
    End-to-end integration test suite verifying all REST API endpoints.
    """

    def setUp(self):
        """Set up in-memory database, isolated test bucket, and TestClient."""
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db: Session = self.Session()

        # Seed cloud tiers
        TierManager.seed_default_tiers(self.db)

        # Isolated bucket for test file storage
        self.temp_dir = tempfile.mkdtemp(prefix="nexus_api_test_bucket_")
        self.test_storage = LocalStorageManager(base_dir=Path(self.temp_dir))

        # Override storage_manager in routes with test_storage
        storage_manager.base_dir = Path(self.temp_dir)
        storage_manager.ensure_storage_dir()

        # Dependency override for database session
        def override_get_db():
            db_session = self.Session()
            try:
                yield db_session
            finally:
                db_session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        """Clean up dependency overrides and delete temporary bucket directory."""
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_root_and_health_endpoints(self):
        """
        Verify root and health check endpoints.
        """
        res_root = self.client.get("/")
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_root.json()["status"], "online")

        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "healthy")

    def test_file_upload_and_get_endpoints(self):
        """
        Verify uploading a file via multipart form, listing it, and querying by ID.
        """
        file_payload = b"Sample document payload for API testing."
        response = self.client.post(
            "/api/v1/files/upload",
            files={"file": ("project_proposal.pdf", io.BytesIO(file_payload), "application/pdf")},
            data={"storage_tier": "HOT"},
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["filename"], "project_proposal.pdf")
        self.assertEqual(data["category"], "Document")
        self.assertEqual(data["storage_tier"], "HOT")
        self.assertFalse(data["is_duplicate"])
        file_id = data["id"]

        # Query by ID
        res_get = self.client.get(f"/api/v1/files/{file_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["id"], file_id)

        # List files
        res_list = self.client.get("/api/v1/files")
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.json()
        self.assertEqual(list_data["total_count"], 1)
        self.assertEqual(len(list_data["files"]), 1)

    def test_duplicate_upload_detection_via_api(self):
        """
        Verify uploading identical content flags duplicate status via API.
        """
        content = b"Exact identical content duplicated across users."

        # First upload
        res1 = self.client.post(
            "/api/v1/files/upload",
            files={"file": ("original.txt", io.BytesIO(content), "text/plain")},
        )
        self.assertEqual(res1.status_code, 201)
        self.assertFalse(res1.json()["is_duplicate"])

        # Second upload with same content
        res2 = self.client.post(
            "/api/v1/files/upload",
            files={"file": ("copy.txt", io.BytesIO(content), "text/plain")},
        )
        self.assertEqual(res2.status_code, 201)
        self.assertTrue(res2.json()["is_duplicate"])
        self.assertEqual(res2.json()["original_file_id"], res1.json()["id"])

    def test_update_tier_and_delete_endpoints(self):
        """
        Verify updating file tier via PATCH and deleting via DELETE.
        """
        # Upload
        res_upload = self.client.post(
            "/api/v1/files/upload",
            files={"file": ("logs.txt", io.BytesIO(b"log data"), "text/plain")},
        )
        file_id = res_upload.json()["id"]

        # Patch tier to WARM
        res_patch = self.client.patch(
            f"/api/v1/files/{file_id}/tier",
            json={"new_tier": "WARM"},
        )
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["storage_tier"], "WARM")

        # Delete file
        res_del = self.client.delete(f"/api/v1/files/{file_id}")
        self.assertEqual(res_del.status_code, 200)

        # Verify 404 on subsequent get
        res_check = self.client.get(f"/api/v1/files/{file_id}")
        self.assertEqual(res_check.status_code, 404)

    def test_analytics_endpoints(self):
        """
        Verify analytics overview, category breakdown, tier distribution, and dashboard endpoints.
        """
        self.client.post(
            "/api/v1/files/upload",
            files={"file": ("test.pdf", io.BytesIO(b"A" * 1024), "application/pdf")},
        )
        self.client.post(
            "/api/v1/files/upload",
            files={"file": ("test.png", io.BytesIO(b"B" * 2048), "image/png")},
        )

        # Overview
        res_overview = self.client.get("/api/v1/analytics/overview")
        self.assertEqual(res_overview.status_code, 200)
        self.assertEqual(res_overview.json()["total_files"], 2)

        # Categories
        res_cat = self.client.get("/api/v1/analytics/categories")
        self.assertEqual(res_cat.status_code, 200)
        self.assertEqual(len(res_cat.json()), 2)

        # Tiers
        res_tiers = self.client.get("/api/v1/analytics/tiers")
        self.assertEqual(res_tiers.status_code, 200)

        # Brackets
        res_brackets = self.client.get("/api/v1/analytics/brackets")
        self.assertEqual(res_brackets.status_code, 200)

        # Dashboard
        res_dash = self.client.get("/api/v1/analytics/dashboard")
        self.assertEqual(res_dash.status_code, 200)
        dash_data = res_dash.json()
        self.assertIn("overview", dash_data)
        self.assertIn("category_distribution", dash_data)

    def test_optimizer_endpoints(self):
        """
        Verify duplicate audit, compression evaluation, lifecycle recommendations, and ROI endpoints.
        """
        shared_payload = b"Compressible repetitive log content\n" * 100

        # Upload two identical copies
        self.client.post(
            "/api/v1/files/upload",
            files={"file": ("sys.log", io.BytesIO(shared_payload), "text/plain")},
        )
        self.client.post(
            "/api/v1/files/upload",
            files={"file": ("sys_copy.log", io.BytesIO(shared_payload), "text/plain")},
        )

        # Duplicate audit
        res_dup = self.client.get("/api/v1/optimizer/duplicates")
        self.assertEqual(res_dup.status_code, 200)
        self.assertEqual(res_dup.json()["duplicate_files_count"], 1)

        # Compression audit
        res_comp = self.client.get("/api/v1/optimizer/compression")
        self.assertEqual(res_comp.status_code, 200)
        self.assertGreater(res_comp.json()["total_estimated_savings_bytes"], 0)

        # Lifecycle recommendations
        res_life = self.client.get("/api/v1/optimizer/lifecycle")
        self.assertEqual(res_life.status_code, 200)
        self.assertIn("recommendations", res_life.json())

        # Comprehensive ROI Report
        res_roi = self.client.get("/api/v1/optimizer/roi")
        self.assertEqual(res_roi.status_code, 200)
        roi_data = res_roi.json()
        self.assertIn("total_projected_monthly_savings", roi_data)
        self.assertIn("disclaimer", roi_data)
        self.assertIn("estimates", roi_data["disclaimer"].lower())

    def test_tiers_and_pricing_estimate_endpoints(self):
        """
        Verify listing cloud tiers and calculating hypothetical pricing estimates.
        """
        res_tiers = self.client.get("/api/v1/tiers")
        self.assertEqual(res_tiers.status_code, 200)
        self.assertGreaterEqual(len(res_tiers.json()), 4)

        # Get specific tier
        res_hot = self.client.get("/api/v1/tiers/HOT")
        self.assertEqual(res_hot.status_code, 200)
        self.assertEqual(res_hot.json()["id"], "HOT")

        # Estimate pricing for 100 GB over 12 months
        res_est = self.client.get("/api/v1/tiers/pricing/estimate?size_gb=100&months=12")
        self.assertEqual(res_est.status_code, 200)
        est_data = res_est.json()
        self.assertEqual(est_data["size_gb"], 100.0)
        self.assertIn("HOT", est_data["comparison"])
        self.assertIn("ARCHIVE", est_data["comparison"])
        # HOT should cost more than ARCHIVE
        hot_total = est_data["comparison"]["HOT"]["estimated_total_cost_usd"]
        arc_total = est_data["comparison"]["ARCHIVE"]["estimated_total_cost_usd"]
        self.assertGreater(hot_total, arc_total)


if __name__ == "__main__":
    unittest.main()
