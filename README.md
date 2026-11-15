# NEXUS — Intelligent Cloud Storage Optimization System

NEXUS is an enterprise-grade backend intelligence system designed to analyze, optimize, and reduce cloud storage expenses across modern multi-tier cloud environments. By leveraging content-addressed cryptographic hashing, metadata categorization, intelligent compression advisory, inactivity lifecycle tiering, and high-performance analytical aggregation, NEXUS identifies redundant storage, projects cost savings, and recommends optimal lifecycle policies.

---

## 🏛 System Architecture

The NEXUS backend is structured around a clean, decoupled, layered architecture:

```
[ Client / Frontend Application ]
                 │
                 ▼
     [ FastAPI REST API Layer ]
       ├── /api/v1/files       (Ingestion, metadata querying, tier mutation, deletion)
       ├── /api/v1/analytics   (Pandas-powered aggregations, category/tier breakdowns)
       ├── /api/v1/optimizer   (Deduplication audit, compression advisory, lifecycle ROI)
       └── /api/v1/tiers       (Cloud tier catalog & hypothetical cost calculators)
                 │
  ┌──────────────┴──────────────┐
  ▼                             ▼
[ File & Ingestion Services ]   [ Intelligence & Optimization Engine ]
  • Streaming SHA-256 Hasher      • Duplicate File Detector (Hash clustering)
  • Categorization Engine         • Algorithmic Compression Advisor
  • Tier Management & Seeding     • Lifecycle Tier Recommender (Access aging)
                                  • Cost & Projected ROI Calculator
  │                             │
  └──────────────┬──────────────┘
                 ▼
      [ Persistence & Storage ]
       ├── SQLAlchemy ORM (SQLite / PostgreSQL-ready)
       └── Local Simulated Cloud Storage Bucket (Adapter for S3/GCS/Azure)
```

---

## 🚀 Key Features

### 1. File Management & Metadata Ingestion
- **Multipart Streaming Ingestion**: Upload files with chunked streaming directly to simulated cloud storage.
- **Cryptographic Content Hashing**: Instant 64 KB chunked SHA-256 calculation for immutable identity and duplicate detection on ingest.
- **Automated Categorization**: Rule-based categorization across 8 distinct categories (`Document`, `Image`, `Video`, `Audio`, `Archive`, `Code`, `Data`, `Other`).
- **Access Tracking**: Tracks creation, update, and last-access timestamps for storage lifecycle analysis.

### 2. Intelligent Storage Optimization Engine
- **Duplicate Detection**: Group files by cryptographic SHA-256 hash to identify identical files, calculate wasted capacity, and designate primary files.
- **Algorithmic Compression Advisory**: Evaluates compressibility based on MIME type and file format entropy characteristics, providing estimated compressed sizes and bandwidth savings.
- **Lifecycle Tier Recommender**: Monitors file inactivity against cloud storage policies (e.g., >30 days $\to$ WARM, >90 days $\to$ COLD, >365 days $\to$ ARCHIVE) to recommend downward tier transitions.
- **Cost & Projected ROI Calculator**: Compares current baseline spend against optimized spend post-deduplication and tier transitions.
  > *Note: All projected savings, compression ratios, and ROI metrics are calculated estimates and do not represent guaranteed billing totals.*

### 3. Analytics Engine
- **High-Performance Pandas Processing**: In-memory relational data frames perform aggregated group-bys, summary statistics, and percentage shares.
- **Multi-Dimensional Metrics**: Storage by category, storage by tier, and size distribution binning (Tiny, Small, Medium, Large, Huge).

### 4. Simulated Cloud Storage vs. Real Cloud Integrations
- **Simulated Cloud Storage (`LocalStorageManager`)**: Stores uploaded blobs in an isolated local storage bucket (`backend/storage_data/`), using UUID-based storage keys and sanitized filenames.
- **Cloud Interface Compatibility**: Designed with an adapter pattern that easily swaps the local driver for AWS S3 (`boto3`), Google Cloud Storage (`google-cloud-storage`), or Azure Blob Storage (`azure-storage-blob`).

---

## 🛠 Tech Stack

- **Language**: Python 3.13+
- **Framework**: FastAPI (High-performance ASGI REST API)
- **Data Persistence**: SQLAlchemy 2.0 ORM with SQLite (PostgreSQL compatible)
- **Analytics & Math**: Pandas 2.0+, Scikit-learn
- **Data Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **Testing**: Pytest & Starlette TestClient

---

## 📁 Repository Structure

```
nexus-system-lab/
├── README.md                           # Master project documentation
├── docs/                               # Architectural and requirements documentation
│   ├── architecture.md                 # System components and data flow
│   ├── features.md                     # Feature requirements & API contract
│   └── development-roadmap.md          # Milestone breakdown and progress
├── frontend/                           # Reserved for Frontend UI (maintained independently)
└── backend/
    ├── requirements.txt                # Production and development dependencies
    ├── app/
    │   ├── main.py                     # FastAPI application factory & middleware
    │   ├── core/                       # Core application configuration & database engine
    │   │   ├── config.py               # Tier definitions, rates, and paths
    │   │   └── database.py             # SQLAlchemy SessionLocal, engine, and get_db
    │   ├── models/                     # Database ORM models
    │   │   ├── file_metadata.py        # File metadata entity with hash indexing
    │   │   └── storage_tier.py         # Storage tier reference entity
    │   ├── schemas/                    # Pydantic request/response validation schemas
    │   │   ├── file_schema.py          # File CRUD and list schemas
    │   │   ├── optimizer_schema.py     # Deduplication, compression, and ROI schemas
    │   │   └── analytics_schema.py     # Aggregation, tier, and category metric schemas
    │   ├── services/                   # Core business logic services
    │   │   ├── hasher.py               # Streaming SHA-256 chunked hasher
    │   │   ├── categorizer.py          # Extension and MIME categorizer
    │   │   └── file_service.py         # Ingestion, duplicate check, and file operations
    │   ├── storage/                    # Storage and cloud bucket managers
    │   │   ├── local_storage.py        # Simulated cloud bucket storage manager
    │   │   └── tier_manager.py         # Tier seeding and pricing queries
    │   ├── optimizer/                  # Intelligence and optimization engine
    │   │   ├── duplicate_detector.py   # Hash clustering and duplicate file auditor
    │   │   ├── compression_advisor.py  # Algorithmic compressibility evaluation
    │   │   ├── tier_recommender.py     # Inactivity threshold lifecycle recommender
    │   │   └── cost_calculator.py      # Storage spend prediction and ROI calculator
    │   ├── analytics/                  # High-performance analytics engine
    │   │   └── engine.py               # Pandas aggregation and distribution engine
    │   └── api/                        # REST API endpoint route handlers
    │       ├── routes_files.py         # File ingestion, retrieval, tiering, deletion
    │       ├── routes_analytics.py     # Storage dashboard and distribution metrics
    │       ├── routes_optimizer.py     # Duplicates, compression, lifecycle, and ROI
    │       └── routes_tiers.py         # Tier definitions and hypothetical estimates
    └── tests/                          # Comprehensive Pytest test suite (54 tests)
        ├── test_core.py                # Database and config unit tests
        ├── test_hasher.py              # SHA-256 chunked hashing unit tests
        ├── test_categorizer.py         # File categorization unit tests
        ├── test_local_storage.py       # Simulated cloud storage unit tests
        ├── test_file_service.py        # File ingestion & CRUD unit tests
        ├── test_duplicate_detector.py  # Duplicate audit unit tests
        ├── test_compression_advisor.py # Compression recommendation unit tests
        ├── test_tier_recommender.py    # Inactivity tier lifecycle unit tests
        ├── test_cost_calculator.py     # Spend and ROI calculation unit tests
        ├── test_analytics_engine.py    # Pandas aggregation unit tests
        └── test_api_routes.py          # End-to-end REST API integration tests
```

---

## 🚦 Getting Started

### 1. Prerequisites
- Python 3.11+ (Python 3.13 recommended)
- Git

### 2. Environment Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Backend Server

```bash
# From within the backend directory
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **Interactive Swagger API Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc API Documentation**: `http://127.0.0.1:8000/redoc`
- **Health Check Endpoint**: `http://127.0.0.1:8000/health`

---

## 🧪 Running Automated Tests

NEXUS includes an end-to-end test suite covering unit, functional, and integration layers:

```bash
# Run the complete test suite with verbose output
pytest -v backend/tests/
```

All 54 test cases validate configuration, cryptographic hashing, file categorization, local bucket simulation, metadata persistence, duplicate clustering, compression heuristics, lifecycle migrations, ROI calculations, analytics aggregations, and REST API integration.

---

## 🌐 REST API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Application health and status check |
| `POST` | `/api/v1/files/upload` | Upload file (multipart form) with automatic hashing and duplicate tagging |
| `GET` | `/api/v1/files` | List files with optional filtering by tier, category, or duplicate status |
| `GET` | `/api/v1/files/{file_id}` | Retrieve file metadata by ID |
| `PATCH` | `/api/v1/files/{file_id}/tier` | Update file storage tier (e.g., migrate to COLD) |
| `DELETE` | `/api/v1/files/{file_id}` | Delete file metadata and underlying storage object |
| `GET` | `/api/v1/analytics/overview` | Overall storage utilization, total files, and duplicates count |
| `GET` | `/api/v1/analytics/categories` | Storage breakdown grouped by file category |
| `GET` | `/api/v1/analytics/tiers` | Storage breakdown grouped by cloud tier |
| `GET` | `/api/v1/analytics/brackets` | File size distribution histogram brackets |
| `GET` | `/api/v1/analytics/dashboard` | Aggregated dashboard combining all analytical metrics |
| `GET` | `/api/v1/optimizer/duplicates` | Audit all duplicate file clusters and wasted storage bytes |
| `GET` | `/api/v1/optimizer/compression` | Evaluate compressible files and estimated compression ratios |
| `GET` | `/api/v1/optimizer/lifecycle` | Recommend inactive file migrations across storage tiers |
| `GET` | `/api/v1/optimizer/roi` | Comprehensive storage savings and projected ROI analysis report |
| `GET` | `/api/v1/tiers` | List all available cloud storage tiers and pricing rates |
| `GET` | `/api/v1/tiers/{tier_id}` | Get specific storage tier details |
| `GET` | `/api/v1/tiers/pricing/estimate`| Compute hypothetical cloud storage costs across tiers for given size/duration |

---

## 👥 Team Collaboration & Boundaries

- **Backend & Storage Intelligence**: Implemented exclusively in `backend/` and `docs/`.
- **Frontend UI**: Maintained independently on the `frontend_ui` branch inside the `frontend/` directory. No backend work modifies frontend files.
