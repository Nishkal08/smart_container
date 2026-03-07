# SmartContainer — AI-Powered Container Risk Intelligence System

> **Helping customs officers identify suspicious shipments before they clear the border.**

SmartContainer is a full-stack, production-grade microservice platform that applies machine learning to shipping container data to automatically score, classify, and explain risk on every container in a dataset. Customs officers and trade-compliance analysts upload bulk shipment manifests, trigger batch predictions, and immediately receive prioritised inspection lists — ranked by risk score and backed by plain-English anomaly explanations.

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
