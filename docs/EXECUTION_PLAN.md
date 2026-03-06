# SmartContainer Risk Engine — Execution Plan

## Project Timeline Overview

| Phase | Description                          | Status        |
|-------|--------------------------------------|---------------|
| 0     | Setup + Documentation                | ✅ Done today |
| 1     | Backend API (Node.js)                | 🔨 Today      |
| 2     | ML Mock Service (FastAPI)            | 🔨 Today      |
| 3     | Database + Docker                    | 🔨 Today      |
| 4     | Real ML Model Integration            | 📅 Tomorrow   |
| 5     | Frontend Dashboard                   | 📅 Tomorrow   |
| 6     | Testing + Polish + Demo Prep         | 📅 Tomorrow   |

---

## Phase 0 — Setup & Documentation (Day 1, Morning)

- [x] Read and analyze problem statement
- [x] Analyze dataset fields and patterns
- [x] Design system architecture
- [x] Write ARCHITECTURE.md
- [x] Write EXECUTION_PLAN.md
- [x] Write TECH_STACK.md
- [x] Write API_SPEC.md
- [x] Write DATASET_ANALYSIS.md
- [x] Write MVP_SCOPE.md
- [x] Define folder structure

---

## Phase 1 — Backend API (Day 1)

### 1.1 Project Scaffolding
- [x] Initialize Node.js project (`backend/package.json`)
- [x] Install all dependencies
- [x] Configure ESLint + Prettier (optional)
- [x] Setup environment variables (`.env.example`)
- [x] Setup main `app.js` with Express

### 1.2 Configuration Layer
- [x] `src/config/env.js` — Validate and export all env vars
- [x] `src/config/db.js` — Prisma client singleton
- [x] `src/config/redis.js` — ioredis client singleton
- [x] `src/config/bullmq.js` — Queue definitions

### 1.3 Middleware
- [x] `auth.middleware.js` — JWT verification
- [x] `rateLimit.middleware.js` — Redis-backed rate limiting
- [x] `validate.middleware.js` — Zod request validation helper
- [x] `error.middleware.js` — Global error handler + 404 handler

### 1.4 Utilities
- [x] `logger.js` — Winston structured logger
- [x] `response.js` — Standard API response helpers (`success()`, `error()`)
- [x] `csv.parser.js` — Parse uploaded CSV to container objects
- [x] `apiClient.js` — Axios client for calling FastAPI ML service

### 1.5 Auth Module (`/api/v1/auth`)
- [x] `POST /register` — Hash password, create user, return tokens
- [x] `POST /login` — Verify credentials, return access + refresh token
- [x] `POST /refresh` — Issue new access token from refresh token
- [x] `POST /logout` — Blacklist token in Redis

### 1.6 Containers Module (`/api/v1/containers`)
- [x] `GET /` — Paginated, filterable list (filter by origin, risk level, date)
- [x] `GET /:id` — Single container with its latest prediction
- [x] `POST /` — Create single container record
- [x] `POST /upload` — Upload CSV, parse, bulk insert containers
- [x] `DELETE /:id` — Soft delete (admin only)

### 1.7 Predictions Module (`/api/v1/predictions`)
- [x] `POST /single` — Predict single container, save result
- [x] `POST /batch` — Queue batch prediction job, return job_id
- [x] `GET /` — Paginated predictions (filterable by risk level)
- [x] `GET /:containerId` — Get prediction for specific container
- [x] `GET /export` — Download predictions as CSV

### 1.8 Jobs Module (`/api/v1/jobs`)
- [x] `GET /` — List all batch jobs
- [x] `GET /:id` — Job status + progress
- [x] BullMQ Worker — Processes prediction tasks asynchronously
- [x] Socket.io events — Push progress to subscribed clients

### 1.9 Analytics Module (`/api/v1/analytics`)
- [x] `GET /summary` — Total containers, risk distribution counts
- [x] `GET /risk-distribution` — Pie chart data (Clear/Low/Critical)
- [x] `GET /trends` — Risk levels over time (daily/weekly)
- [x] `GET /top-risky-shippers` — Top importers/exporters by avg risk score
- [x] `GET /country-risk` — Origin country risk map data

---

## Phase 2 — ML Mock Service (Day 1)

### FastAPI Endpoints
- [x] `POST /predict/single` — Single container prediction
- [x] `POST /predict/batch` — Batch container prediction (list)
- [x] `GET /health` — Health check

### Mock Risk Engine Logic
The mock engine produces deterministic, rule-based risk scores using these factors:

| Factor                  | Weight | Logic                                     |
|-------------------------|--------|-------------------------------------------|
| Weight Discrepancy      | 35%    | `abs(measured - declared) / declared`     |
| Value-per-kg Anomaly    | 25%    | z-score against historical averages       |
| Dwell Time              | 20%    | > 72h = high risk, > 48h = medium         |
| Origin Country Risk     | 10%    | Static risk tier list                     |
| HS Code Sensitivity     | 10%    | Dual-use / restricted goods codes         |

**Risk Level Thresholds:**
- `0–30` → `CLEAR`
- `31–60` → `LOW_RISK`
- `61–100` → `CRITICAL`

**Explanation Generation:**
Each prediction includes a human-readable explanation citing the top 1–2 factors that drove the score highest.

---

## Phase 3 — Database + Docker (Day 1)

- [x] `prisma/schema.prisma` — Full schema definition
- [x] `prisma/seed.js` — Seed admin user + sample data
- [x] `backend/Dockerfile`
- [x] `ml_service/Dockerfile`
- [x] `docker-compose.yml` — Orchestrate all 4 services
- [x] `.gitignore`
- [x] `README.md`

---

## Phase 4 — Real ML Model Integration (Day 2, Morning)

> **Prerequisite:** ML model is ready and trained.

### Steps
1. ML team exports model as `model.pkl` (or ONNX, joblib, etc.)
2. Place model file in `ml_service/models/artifacts/`
3. Update `ml_service/app/models/risk_engine.py`:
   - Replace rule-based logic with actual model inference
   - Load model at startup (`@app.on_event("startup")`)
   - Use SHAP for explainability: `shap.TreeExplainer(model).shap_values(X)`
4. Update `prediction.py` schemas if needed for new output fields
5. Set `IS_MOCK_MODEL=false` in environment
6. Verify predictions match expected format
7. Run integration test: `POST /predict/single` with real data

### Model Integration Notes
- The Node.js backend does **not change** — it always calls the same FastAPI endpoint
- Only `risk_engine.py` and `requirements.txt` change on Day 2
- Add `SHAP`, `scikit-learn`, `xgboost`/`lightgbm` to `requirements.txt`
- The `is_mock` field in the `predictions` DB table will flip to `false`

---

## Phase 5 — Frontend Dashboard (Day 2)

> Tech: React + Vite + Tailwind CSS + Recharts

### Pages to Build
1. **Login Page** — JWT login form
2. **Dashboard** — Summary stats cards + risk distribution pie chart
3. **Upload Page** — CSV drag-drop upload + batch prediction trigger
4. **Containers Table** — Paginated with filter/sort, each row shows risk badge
5. **Container Detail** — Single container view with explanation card
6. **Batch Jobs** — Job list with live progress bar (Socket.io)
7. **Analytics** — Trend charts, country map, top shippers

---

## Phase 6 — Testing, Polish & Demo Prep (Day 2)

- [ ] Integration tests for all API endpoints (Jest + Supertest)
- [ ] FastAPI endpoint tests (Pytest)
- [ ] Populate DB with real historical data (seed script with CSV)
- [ ] README with quick-start instructions
- [ ] Demo walkthrough script
- [ ] Prepare presentation slides

---

## Daily Standup Checklist

### End of Day 1 — What should be done
- [ ] All docs complete
- [ ] Backend API fully functional (all modules)
- [ ] FastAPI mock service running and returning proper predictions
- [ ] Docker Compose brings up all 4 services with `docker-compose up`
- [ ] Can register user, log in, upload CSV, trigger batch job, see predictions

### End of Day 2 — What should be done
- [ ] Real ML model integrated
- [ ] Frontend dashboard running
- [ ] All core features demoed end-to-end
- [ ] Export CSV of predictions working
- [ ] README complete with setup instructions

---

## Risk Register

| Risk                          | Mitigation                                          |
|-------------------------------|-----------------------------------------------------|
| ML model not ready in time    | Mock engine produces realistic demo data            |
| PostgreSQL setup issues       | Docker handles it; no local install needed          |
| CSV format doesn't match      | csv.parser.js has flexible column mapping           |
| BullMQ/Redis connectivity     | Docker network handles service discovery            |
| FastAPI unreachable           | Health check endpoint + graceful retry in apiClient |
