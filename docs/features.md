# NEXUS — Intelligent Cloud Storage Optimization System
## Core Features & Analytical Formulations

---

## 1. File Management & Ingestion

- **Multi-Part File Ingestion**: Supports single and batch file uploads via standard HTTP multipart protocols.
- **Cryptographic SHA-256 Fingerprinting**: Generates content hashes in 64 KB streaming chunks, preventing RAM exhaustion on large files.
- **Automated Categorization**: Automatically groups files into defined categories:
  - `Document`: `.pdf`, `.docx`, `.doc`, `.txt`, `.rtf`, `.odt`
  - `Spreadsheet`: `.xlsx`, `.xls`, `.csv`, `.tsv`
  - `Image`: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`
  - `Video`: `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`
  - `Audio`: `.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`
  - `Archive`: `.zip`, `.tar`, `.gz`, `.7z`, `.rar`
  - `Code`: `.py`, `.js`, `.ts`, `.html`, `.css`, `.json`, `.sql`, `.cpp`, `.java`
  - `Other`: Unrecognized binary or miscellaneous files.
- **Granular Metadata Persistence**: Tracks file name, real file size, SHA-256 digest, MIME type, storage tier, upload timestamp, and last-accessed timestamp.

---

## 2. Intelligent Duplicate Detection

- **Hash-Collision Free Deduplication**: Uses SHA-256 digests ($2^{256}$ keyspace) to ensure zero false-positive duplicate identifications.
- **Master vs Redundant Classification**: Identifies the earliest uploaded instance of identical files as the "Master" and marks all subsequent instances as "Redundant".
- **Wasted Capacity Formulation**:
  $$\text{Wasted Duplicate Bytes} = \sum_{h \in \text{Duplicate Hashes}} (N_h - 1) \times \text{Size}(h)$$
  where $N_h$ is the total count of copies sharing hash $h$, and $\text{Size}(h)$ is the size in bytes of a single copy.

---

## 3. Compression Advisory Engine

- **Compressibility Evaluation**: Examines file types and sizes to estimate potential compression savings without compressing prematurely:
  - High Compressibility (~60% - 75% savings): Log files, text documents, CSV/TSV, JSON, source code.
  - Moderate Compressibility (~25% - 40% savings): Uncompressed PDFs, DOCX, presentation files.
  - Negligible Compressibility (< 5% savings): Already compressed assets (JPEG, PNG, MP4, MP3, ZIP).
- **Projected Storage Savings**:
  $$\text{Savings}_{\text{comp}} = \text{Original Size} \times \text{Expected Compression Ratio}$$

---

## 4. Cloud Lifecycle Tier Recommender

- **Inactivity & Age-Based Lifecycle Transitions**:
  - **HOT** ($0 - 30$ days since last access): Default ingestion tier for active reads and writes.
  - **WARM** ($31 - 90$ days since last access): Infrequent access tier; saves ~45% storage cost.
  - **COLD** ($91 - 180$ days since last access): Long-term cold tier; saves ~82% storage cost.
  - **ARCHIVE** ($> 180$ days since last access): Deep archival storage; saves ~95% storage cost.
- **Automated Reallocation Strategy**: Identifies stale files lingering in expensive tiers and creates actionable transition recommendations.

---

## 5. Cloud Cost & ROI Calculator

- **Cost Estimation Formulation**:
  $$\text{Monthly Cost} = \sum_{t \in \text{Tiers}} \left( \text{GB}_t \times \text{Rate}_t \right) + \sum_{t \in \text{Tiers}} \left( \text{Retrievals}_t \times \text{RetrievalRate}_t \right)$$
- **Optimization ROI**:
  $$\text{Total Savings (\$/mo)} = \text{Current Total Cost} - \text{Optimized Total Cost}$$
  $$\text{Percentage Savings (\%)} = \left( \frac{\text{Total Savings}}{\text{Current Total Cost}} \right) \times 100$$

---

## 6. Pandas-Powered Analytics & Reporting

- **Category Breakdown**: Aggregates storage volume and file counts per file category.
- **Duplicate Volume Metrics**: Total wasted megabytes, count of duplicate files, and top duplicate clusters.
- **Tier Distribution**: Percentage of total capacity stored in Hot, Warm, Cold, and Archive.
- **Executive Summary**: Comprehensive health score of current storage utilization.
