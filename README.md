# SmartContainer — AI-Powered Container Risk Intelligence System

> **Helping customs officers identify suspicious shipments before they clear the border.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.x-FF6600)](https://xgboost.readthedocs.io)

---

## The Problem

Every day, thousands of shipping containers arrive at ports around the world. Customs agencies physically inspect only a fraction — selecting the wrong ones wastes resources, while missing a fraudulent shipment means contraband, duty evasion, or worse clears the border.

Traditional rule-based flagging is rigid and easily gamed. Analysts manually sifting through spreadsheets of declared weights, HS codes, and importer histories cannot keep up with modern trade volumes.

**SmartContainer solves this.** It applies XGBoost machine learning to every container's manifest data — weight discrepancies, declared value anomalies, dwell times, origin-country risk profiles, and HS code sensitivity — to automatically score, classify, and explain risk for every single shipment in seconds.

---

## What We Built

SmartContainer is a **production-grade, full-stack microservice platform** with:

- A **React SaaS dashboard** where customs analysts and admins manage shipments end-to-end
- A **Node.js/Express API gateway** that handles authentication, data ingestion, job orchestration, and analytics
- A **FastAPI ML service** that runs XGBoost inference with SHAP explainability on every container
- **Real-time batch processing** — upload 10,000 containers as a CSV, trigger a batch job, and watch a live progress bar fill as every container gets scored via BullMQ workers
- **Instant explainability** — every prediction comes with the top feature contributions in plain English (e.g. *"36% weight discrepancy between declared and measured cargo"*)

---

## Live Demo Walkthrough

| Step | Action | Result |
|------|--------|--------|
| 1 | Register / Login | JWT-authenticated session, role-based access (ADMIN / ANALYST / VIEWER) |
| 2 | Upload CSV | Drag-drop a shipment manifest → bulk upsert into PostgreSQL |
| 3 | Start Batch Job | Select containers → BullMQ queues chunks of 50 → workers call ML service |
| 4 | Watch Live Progress | Socket.IO streams `processed_count / total_containers` in real-time |
| 5 | View Predictions | Table with risk score, level badge, SHAP-driven explanation summary |
| 6 | Inspect Container | Side drawer: gauge chart, feature contributions, anomaly details |
| 7 | Export CSV | One-click download of `Container_ID, Risk_Score, Risk_Level, Explanation_Summary` |
| 8 | Analytics Dashboard | Risk distribution, trend charts, top risky shippers, country risk view |

---

## Screenshots

> *(Run `npm run dev` in `frontend/` and navigate to `http://localhost:5173/`)*

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards, risk-level doughnut chart, score trend over time, recent critical containers |
| **Containers** | Filterable / sortable table, risk badge, inline rescore, inline delete confirmation |
| **Predictions** | Global stats (real totals from analytics API), search/filter, framer-motion detail drawer |
| **Batch Jobs** | Live progress bar, job status, retry stuck jobs |
| **Upload** | Drag-drop CSV, animated processing overlay, upload confirmation |
| **Insights** | Country risk map data, top risky importers/exporters |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER (React)                    │
│  Dashboard · Containers · Predictions · Jobs · Upload   │
│  TailwindCSS · shadcn/ui · framer-motion · Recharts     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + WSS (Socket.IO)
                        ▼
┌─────────────────────────────────────────────────────────┐
│           NODE.JS / EXPRESS  API GATEWAY                │
│                                                         │
│  Auth · Containers · Predictions · Jobs · Analytics     │
│  JWT · Zod validation · Helmet · Rate limiting          │
│                                                         │
│  ┌───────────────┐   ┌────────────────────────────┐    │
│  │  BullMQ Queue │   │  Socket.IO + Redis pub/sub  │    │
│  │  (50 ctrs/job)│──▶│  (live progress streaming)  │    │
│  └──────┬────────┘   └────────────────────────────┘    │
└─────────┼───────────────────────────────────────────────┘
          │ BullMQ Workers (Node.js)
          ▼
┌─────────────────────────────────────────────────────────┐
│              FASTAPI  ML  SERVICE                       │
│                                                         │
│  XGBoost model + SHAP TreeExplainer                     │
│  POST /predict/single  ·  POST /predict/batch           │
│  Falls back to rule-based engine if artifact missing    │
└───────────────────────┬─────────────────────────────────┘
          │             │
          ▼             ▼
   ┌────────────┐  ┌──────────────────────────────────┐
   │ PostgreSQL │  │ Redis                            │
   │ (Prisma)   │  │ BullMQ backend + token blacklist │
   │            │  │ + rate-limit counters            │
   │ users      │  └──────────────────────────────────┘
   │ containers │
   │ predictions│
   │ batch_jobs │
   │ audit_logs │
   └────────────┘
```

### Request Flow — Batch Prediction

```
1. POST /containers/upload  → CSV parsed, rows bulk-upserted to PostgreSQL
2. POST /predictions/batch  → BatchJob record created (QUEUED), container IDs
                              paginated and pushed as 50-container BullMQ chunks
3. Worker picks up job      → calls FastAPI POST /predict/batch (up to 50 items)
4. FastAPI                  → XGBoost inference + SHAP contributions per container
5. Worker saves results     → Prisma upsert into predictions table, increments
                              processed_count on BatchJob, publishes to Redis
6. Redis pub/sub → Socket.IO → frontend progress bar updates in real-time
7. Job status → COMPLETED   → analyst sees full prediction table
```

---

## ML Model — XGBoost with SHAP Explainability

### Training Features (17 total)

| Feature | Description |
|---------|-------------|
| `Weight_Diff` | Absolute difference: measured − declared weight |
| `Weight_Diff_Pct` | Percentage weight discrepancy (most predictive) |
| `Weight_Risk_Level` | Binned weight discrepancy tier |
| `Value_per_Weight` | Declared value ÷ declared weight (under/over-valuation) |
| `Value_Risk_Level` | Binned value anomaly tier |
| `Long_Dwell` | Binary flag: dwell time > threshold |
| `Dwell_Time_Hours` | Raw hours container sat at port |
| `Suspicion_Score` | Combined weight × value interaction feature |
| `Total_Risk_Level` | Multi-factor combined risk indicator |
| `Origin_Country` | Label-encoded origin ISO code |
| `Destination_Country` | Label-encoded destination ISO code |
| `Destination_Port` | Encoded port identifier |
| `HS_Code` | Harmonized System commodity code |
| `Shipping_Line` | Carrier identifier |
| `Declared_Value` | Raw declared cargo value |
| `Declared_Weight` | Raw declared weight |
| `Measured_Weight` | Raw measured weight |

### Target Classes

| Class | Label | Risk Score Range |
|-------|-------|-----------------|
| 0 | CLEAR | 0 – 30 |
| 1 | LOW_RISK | 31 – 60 |
| 2 | CRITICAL | 61 – 100 |

**Risk score formula:** `50 × P(LOW_RISK) + 100 × P(CRITICAL)` — a continuous 0–100 signal derived from class probabilities.

### Explainability

Every prediction includes SHAP TreeExplainer values mapped to human-readable reasons:

```json
{
  "feature_contributions": [
    { "feature": "Weight_Diff_Pct", "direction": "increases_risk",
      "description": "significant percentage weight discrepancy", "magnitude": 0.82 },
    { "feature": "Long_Dwell",      "direction": "increases_risk",
      "description": "container stayed unusually long at port",  "magnitude": 0.41 }
  ]
}
```

When the trained model artifact is absent, the engine falls back to a deterministic rule-based scorer — so every demo environment works out of the box.

---

## Dataset

| File | Rows | Description |
|------|------|-------------|
| `Historical Data.csv` | ~10 000+ | Training reference data (Jan 2020 onward) |
| `Real-Time Data.csv` | ~10 000+ | Operational test data (Apr 2021 onward) |

**Key fields:** `Container_ID`, `Declaration_Date`, `Origin_Country`, `Destination_Port`, `HS_Code`, `Importer_ID`, `Exporter_ID`, `Declared_Value`, `Declared_Weight`, `Measured_Weight`, `Dwell_Time_Hours`, `Clearance_Status` (target).

Real-world class distribution: ~75–80% CLEAR · ~15–20% LOW_RISK · ~2–5% CRITICAL — a heavily imbalanced classification problem requiring careful handling.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast DX, component ecosystem |
| Styling | TailwindCSS + shadcn/ui | High-density SaaS aesthetic |
| Animations | framer-motion + GSAP | Smooth page transitions, spring drawers |
| Charts | Recharts | React-native, customisable |
| Server state | TanStack Query | Polling, caching, optimistic updates |
| Client state | Zustand | Sidebar, filters, global UI |
| API gateway | Node.js + Express | Async I/O, middleware pattern |
| ORM | Prisma | Type-safe, auto migrations |
| ML service | FastAPI + Uvicorn | Python ML ecosystem, async, Pydantic |
| ML model | XGBoost + SHAP | SOTA gradient boosting + explainability |
| Database | PostgreSQL 16 | Relational, ACID, indexed queries |
| Cache / Queue backend | Redis 7 | BullMQ, token blacklisting, rate limits |
| Job queue | BullMQ | Retry, concurrency, chunk-based |
| Real-time | Socket.IO + Redis pub/sub | Worker → Redis → Socket → browser |
| Auth | JWT (access + refresh) | No vendor dependency, offline demo |
| Validation | Zod (Node) + Pydantic (Python) | Runtime type safety at every boundary |
| Security | Helmet.js + bcryptjs | OWASP headers, constant-time hashing |
| Containers | Docker + Compose | One-command reproducible environment |

---

## Security

- Passwords hashed with **bcryptjs** (salt rounds 12)
- JWT access tokens (15 min) + refresh tokens (7 days) with Redis blacklist on logout
- **Helmet.js** sets all OWASP security headers (CSP, X-Frame-Options, HSTS, etc.)
- **Rate limiting** on all auth routes (Redis-backed, distributed-safe)
- **Zod / Pydantic** validation at every external boundary — no raw user input reaches the database
- ML service behind internal network only — not exposed externally; authenticated via shared `INTERNAL_API_KEY`
- Soft-delete pattern on containers — no hard data loss, full audit trail

---

## Database Schema

```
users          id · email · password_hash · name · role · is_active
containers     id · container_id · origin_country · hs_code · importer_id ·
               declared_value · declared_weight · measured_weight · dwell_time_hours ·
               deleted_at (soft delete) · uploaded_by → users
predictions    id · container_id (unique) · risk_score · risk_level · explanation_summary ·
               anomalies (JSON) · feature_contributions (JSON) ·
               weight_discrepancy_pct · value_per_kg · model_version · batch_job_id
batch_jobs     id · name · status · total_containers · processed_count · failed_count ·
               started_at · completed_at · created_by → users
audit_logs     id · user_id · action · resource_type · resource_id · ip_address · metadata
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1`  
Authentication: `Authorization: Bearer <access_token>` on all protected routes.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account (name, email, password, role) |
| POST | `/auth/login` | Login → access + refresh tokens |
| POST | `/auth/refresh` | Rotate access token |
| POST | `/auth/logout` | Blacklist token |

### Containers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/containers` | List with filters (risk_level, origin, search, page) |
| POST | `/containers` | Create single container |
| POST | `/containers/upload` | Bulk CSV upload (multipart/form-data) |
| GET | `/containers/:id` | Get with latest prediction |
| DELETE | `/containers/:id` | Soft delete |

### Predictions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/predictions/:containerId` | Score single container |
| POST | `/predictions/batch` | Queue batch job |
| GET | `/predictions` | List with filters (page, risk_level, search) |
| GET | `/predictions/export` | Download CSV (4 columns) |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List batch jobs |
| GET | `/jobs/:id` | Job + container-level predictions |
| POST | `/jobs/:id/retry` | Retry stuck/failed job |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/summary` | Global counts + risk distribution |
| GET | `/analytics/risk-distribution` | Risk level breakdown |
| GET | `/analytics/trends` | Risk score over time |
| GET | `/analytics/top-risky-shippers` | Top importer/exporter risk profiles |
| GET | `/analytics/country-risk` | Risk by origin country |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service status (DB + Redis + ML service) |

---

## Quick Start

### Prerequisites
- Docker + Docker Compose v2
- (Optional for local dev) Node.js 20+, Python 3.11+

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<another-long-random-secret>
ML_SERVICE_API_KEY=<shared-key>
```

Create `ml_service/.env`:
```env
INTERNAL_API_KEY=<same-value-as-ML_SERVICE_API_KEY>
IS_MOCK_MODEL=true
```

### 2. Start all services

```bash
docker compose up --build
```

| Service | Internal Host | Exposed Port |
|---------|-------------|--------------|
| Backend (Node.js) | `backend:3000` | `localhost:3000` |
| ML Service (FastAPI) | `ml_service:8000` | internal only |
| PostgreSQL | `postgres:5432` | internal only |
| Redis | `redis:6379` | internal only |

### 3. Migrate database and seed

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js
docker compose exec backend node prisma/seedContainers.js
```

### 4. Verify

```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok","services":{"database":"ok","redis":"ok","ml_service":"ok"}}
```

### 5. Open dashboard

```
http://localhost:5173   (if running frontend separately with `npm run dev`)
```

Default seed credentials:
```
admin@smartcontainer.com  /  Admin@123    (role: ADMIN)
analyst@smartcontainer.com / Analyst@123  (role: ANALYST)
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
node src/app.js
```

### ML Service

```bash
cd ml_service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
smart_container/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 5 models: User, Container, Prediction, BatchJob, AuditLog
│   │   ├── seed.js                # Demo users
│   │   └── seedContainers.js      # 500 sample containers
│   └── src/
│       ├── modules/
│       │   ├── auth/              # JWT register/login/refresh/logout
│       │   ├── containers/        # CRUD + CSV upload
│       │   ├── predictions/       # Single + batch predict, CSV export
│       │   ├── jobs/              # BullMQ job tracking + retry
│       │   ├── analytics/         # Dashboard stats, trends, country risk
│       │   └── admin/             # User management
│       ├── config/                # DB, Redis, BullMQ, Socket.IO setup
│       ├── middleware/            # Auth, Zod validate, rate-limit, error handler
│       └── utils/                 # csv.parser, apiClient, logger, response
├── ml_service/
│   └── app/
│       ├── models/risk_engine.py  # XGBoost inference + SHAP + rule fallback
│       ├── schemas/prediction.py  # Pydantic I/O contracts
│       ├── api/v1/predict.py      # FastAPI endpoints
│       └── core/                  # Config + API key auth
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── dashboard/         # KPI cards, charts, recent critical
│       │   ├── containers/        # Filterable table, detail drawer
│       │   ├── predictions/       # Global stats, framer-motion drawer
│       │   ├── jobs/              # Live progress, retry
│       │   ├── upload/            # Drag-drop CSV
│       │   ├── insights/          # Country risk, top shippers
│       │   └── auth/              # Login, Register, ForgotPassword
│       └── components/            # Shared UI: Sidebar, Charts, Badges
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── TECH_STACK.md
│   ├── DATASET_ANALYSIS.md
│   ├── FRONTEND_DESIGN.md
│   └── MVP_SCOPE.md
├── docker-compose.yml
├── Historical Data.csv            # Training reference dataset
└── Real-Time Data.csv             # Operational test dataset
```

---

## Roadmap

| Feature | Status |
|---------|--------|
| XGBoost model training + artifact deployment | In progress |
| Real-time Socket.IO batch progress | ✅ Done |
| SHAP feature contributions per prediction | ✅ Done |
| Framer-motion animated prediction drawer | ✅ Done |
| Inline delete confirmation (no confirm()) | ✅ Done |
| Global analytics stats in predictions page | ✅ Done |
| CSV export (4-column, clean) | ✅ Done |
| Importer / Exporter risk profiling | Planned |
| Configurable risk thresholds | Planned |
| Webhook alerts for CRITICAL containers | Planned |
| PDF inspection report export | Planned |
| Audit log viewer (admin) | Planned |

---

## Team

> Built for the SmartContainer Hackathon Challenge — March 2026

---

## Quick Start

### Prerequisites
- Docker + Docker Compose v2
- (Optional for local dev) Node.js 20+, Python 3.11+

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:
```
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<another-long-random-secret>
ML_SERVICE_API_KEY=<shared-key-also-set-in-ml_service-.env>
```

Create `ml_service/.env`:
```
INTERNAL_API_KEY=<same-value-as-ML_SERVICE_API_KEY>
IS_MOCK_MODEL=true
```

### 2. Start all services

```bash
docker compose up --build
```

Services:
| Service | Internal Host | Exposed |
|---------|--------------|---------|
| backend | backend:3000 | `localhost:3000` |
| ml_service | ml_service:8000 | none |
| postgres | postgres:5432 | none |
| redis | redis:6379 | none |

### 3. Run database migrations + seed

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js
docker compose exec backend node prisma/seedContainers.js
```

### 4. Verify

```bash
curl http://localhost:3000/api/v1/health
```

---

## Local Development (without Docker)

### Backend (Node.js)

```bash
cd backend
npm install
# Ensure DATABASE_URL and REDIS_URL point to local instances
npx prisma migrate dev
npx prisma db seed
node src/app.js
```

### ML Service (FastAPI)

```bash
cd ml_service
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## API Reference

Full API spec: [`docs/API_SPEC.md`](docs/API_SPEC.md)

### Auth endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, get JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate token |

### Container endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/containers` | List with filters |
| POST | `/api/v1/containers` | Create single |
| POST | `/api/v1/containers/upload` | Bulk upload CSV |
| GET | `/api/v1/containers/:id` | Get by ID |
| DELETE | `/api/v1/containers/:id` | Soft delete |

### Prediction endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/predictions/:containerId` | Predict single |
| POST | `/api/v1/predictions/batch` | Queue batch |
| GET | `/api/v1/predictions` | List predictions |
| GET | `/api/v1/predictions/export` | Export CSV |

### Jobs endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/jobs` | List batch jobs |
| GET | `/api/v1/jobs/:id` | Job details + progress |

### Analytics endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/analytics/summary` | Overall summary |
| GET | `/api/v1/analytics/risk-distribution` | Risk level counts |
| GET | `/api/v1/analytics/trends` | Risk over time |
| GET | `/api/v1/analytics/top-risky-shippers` | Top risky importers |
| GET | `/api/v1/analytics/country-risk` | Risk by origin country |

---

## Risk Scoring

The mock engine scores containers 0–100 across 5 weighted factors:

| Factor | Weight | Signal |
|--------|--------|--------|
| Weight discrepancy | 35% | \|measured − declared\| / declared |
| Value per kg anomaly | 25% | Under/over-valuation signal |
| Dwell time | 20% | Extended port dwell |
| Country risk | 10% | Origin country tier |
| HS code sensitivity | 10% | Commodity type |

**Risk levels:**
- **CLEAR** — score 0–30
- **LOW_RISK** — score 31–60
- **CRITICAL** — score 61–100

When the real model is ready, only `ml_service/app/models/risk_engine.py` needs to be updated.

## Project Structure

```
smart_container/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── seedContainers.js
│   ├── src/
│   │   ├── app.js
│   │   ├── config/          # env, db, redis, bullmq, socket
│   │   ├── middleware/      # auth, validate, rateLimit, error
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── containers/
│   │   │   ├── predictions/
│   │   │   ├── jobs/
│   │   │   ├── analytics/
│   │   │   └── health/
│   │   └── utils/           # logger, response, csv.parser, apiClient
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── ml_service/
│   ├── app/
│   │   ├── api/v1/predict.py
│   │   ├── core/            # config, security
│   │   ├── models/          # risk_engine.py  ← swap this for real model
│   │   ├── schemas/         # pydantic models
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── TECH_STACK.md
│   ├── EXECUTION_PLAN.md
│   ├── DATASET_ANALYSIS.md
│   └── MVP_SCOPE.md
├── docker-compose.yml
├── .gitignore
└── README.md
```
