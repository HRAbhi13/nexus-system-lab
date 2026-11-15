# NEXUS Web Console — Frontend Application

> **Tagline**: Smarter Storage. Optimized Future.  
> **Platform**: Intelligent Cloud Storage Optimization Platform  
> **College Project**: NEXUS — Interactive System Intelligence Lab

The **NEXUS Web Console** is an enterprise-grade cloud storage optimization dashboard designed for visualizing storage utilization, auditing duplicate objects using cryptographic SHA-256 fingerprints, analyzing compression viability, applying lifecycle tier policies (HOT, WARM, COLD, ARCHIVE), and tracking recurring cloud spend.

---

## 🚀 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Data Visualizations**: Recharts
- **Design Aesthetic**: Modern Cloud Management Console (Dark navy navigation, clean slate surface, high-contrast badges)

---

## 📁 Frontend Architecture

```
frontend/
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── tsconfig.node.json             # Vite TypeScript config
├── vite.config.ts                 # Vite bundler configuration
├── tailwind.config.js             # Tailwind CSS theme & brand colors
├── postcss.config.js              # PostCSS plugins
├── index.html                     # HTML5 entrypoint & Google Fonts
├── src/
│   ├── main.tsx                   # React DOM root mounting
│   ├── App.tsx                    # Main state orchestrator & view router
│   ├── index.css                  # Tailwind directives & custom scrollbars
│   ├── types/
│   │   └── index.ts               # Core TypeScript domain models
│   ├── data/
│   │   └── mockData.ts            # Realistic cloud storage simulation dataset
│   └── components/
│       ├── layout/
│       │   ├── Sidebar.tsx        # Dark navy enterprise sidebar
│       │   └── Header.tsx         # Breadcrumbs, health score, global actions
│       ├── common/
│       │   ├── TierBadge.tsx      # HOT, WARM, COLD, ARCHIVE visual badges
│       │   ├── CategoryBadge.tsx  # File format category tags
│       │   ├── StatCard.tsx       # KPI metrics with trend comparisons
│       │   ├── FileUploadModal.tsx# Drag-and-drop ingestion with simulated hashing
│       │   ├── FileDetailsModal.tsx # Full metadata inspector & tier migrator
│       │   └── NotificationToast.tsx # Floating user feedback toasts
│       └── views/
│           ├── OverviewView.tsx   # Executive dashboard with KPIs & trend charts
│           ├── FileManagerView.tsx# Searchable file table with category/tier filters
│           ├── DuplicateDetectionView.tsx # SHA-256 cluster auditor & deduplicator
│           ├── CompressionAdvisorView.tsx # Entropy analysis & byte reduction
│           ├── StorageOptimizerView.tsx   # Automated inactivity lifecycle tiering
│           ├── AnalyticsView.tsx  # Multi-tier charts & size histogram
│           └── SettingsView.tsx   # Cloud rates, thresholds & API configuration
```

---

## 🧭 Core Application Sections

1. **Overview Dashboard**: High-level telemetry covering total storage (TB), file counts, duplicate volumes, projected monthly savings (45%), storage tier pie chart, and spend projection area chart.
2. **File Manager**: Comprehensive table with real-time text search, category pills, tier filters, duplicate toggles, metadata drawer inspection, and simulated deletion.
3. **Duplicate Detection**: Groups files sharing identical SHA-256 hashes into collision clusters, identifies canonical primary objects, and simulates purging redundant copies.
4. **Compression Advisor**: Evaluates file compressibility by format entropy (SQL, CSV, JSON, LOG), calculates projected byte reduction (up to 75%), and simulates batch compression.
5. **Storage Optimizer**: Outlines the 4 cloud storage tiers (HOT, WARM, COLD, ARCHIVE) and evaluates object inactivity against lifecycle rules (>30d, >90d, >365d) to recommend cost-saving demotions.
6. **Analytics**: Recharts visualizations for category volumes (GB), tier distribution percentages, file size histogram binning, and 6-month cumulative savings projections.
7. **Settings**: Configures cloud provider rates ($/GB/mo), inactivity threshold days, currency formatting, and toggles between Mock Data Mode and future Live FastAPI integration.

---

## 🛠 Getting Started

### 1. Installation

```bash
cd frontend
npm install
```

### 2. Development Server

Start the local Vite development server:

```bash
npm run dev
```

The Web Console will be accessible at: `http://localhost:3000`

### 3. Production Build

To verify and produce an optimized production bundle:

```bash
npm run build
```

This compiles TypeScript (`tsc`) and builds the static assets to `frontend/dist/`.
