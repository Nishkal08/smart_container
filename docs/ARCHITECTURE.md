# SmartContainer Risk Engine — System Architecture

## Overview

The SmartContainer Risk Engine is a microservices-style system composed of:

1. **Node.js Express API** — Application control layer (auth, business logic, job orchestration)
2. **FastAPI ML Service** — Model inference engine (risk scoring, anomaly detection, explainability)
3. **PostgreSQL** — Primary persistent data store
4. **Redis** — Cache, rate limiting, job queue backend
5. **BullMQ** — Distributed job queue for async batch processing
6. **Socket.io** — Real-time batch job progress updates to clients

---

## High-Level Architecture Diagram

```
┌───────────────────────────────────────────────────────┐
│                      CLIENT LAYER                     │
│          (Browser Dashboard / Postman / CLI)          │
└─────────────────────────┬─────────────────────────────┘
                          │ HTTPS / WSS
                          ▼
┌───────────────────────────────────────────────────────┐
│                NODE.JS EXPRESS API GATEWAY            │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Auth Module│  │  Containers  │  │  Predictions│  │
│  │  (JWT/bcrypt│  │  (Upload CSV │  │  (Trigger + │  │
│  │   register/ │  │   CRUD ops)  │  │  View results│  │
│  │   login)    │  └──────────────┘  └─────────────┘  │
│  └─────────────┘                                      │
│  ┌─────────────┐  ┌──────────────┐                    │
│  │  Jobs Module│  │  Analytics   │                    │
│  │  (BullMQ    │  │  (Dashboard  │                    │
│  │   Queue Mgmt│  │   Stats)     │                    │
│  └─────────────┘  └──────────────┘                    │
│                                                       │
│  Middleware: Auth | RateLimit | Validate | ErrorHandler│
└────┬──────────────┬────────────────┬──────────────────┘
     │              │                │
     ▼              ▼                ▼
┌─────────┐  ┌──────────┐  ┌────────────────┐
│PostgreSQL│  │  Redis   │  │  FastAPI       │
│(Prisma  │  │(Cache +  │  │  ML Service    │
│ ORM)    │  │ BullMQ   │  │                │
│         │  │ backend) │  │ ┌────────────┐ │
│ Tables: │  └──────────┘  │ │ Mock Engine│ │
│ users   │       ▲        │ │ (rules-    │ │
│ contain │       │        │ │ based now) │ │
│  ers    │  ┌────┴─────┐  │ │ Real Model │ │
│ predict │  │  BullMQ  │  │ │ tomorrow   │ │
│  ions   │  │  Workers │────│            │ │
│ jobs    │  │(Node.js) │  │ └────────────┘ │
│ audit_  │  └──────────┘  │                │
│  logs   │                │ /predict/single│
└─────────┘                │ /predict/batch │
                           │ /health        │
                           └────────────────┘
```

---

## Request Flow: Single Container Prediction

```
Client
  │
  ├─ POST /api/v1/predictions/single
  │       ├─ Auth middleware checks JWT
  │       ├─ Zod schema validation
  │       ├─ Container upserted in PostgreSQL
  │       ├─ Node.js calls FastAPI POST /predict/single
  │       │       └─ FastAPI mock engine calculates:
  │       │               ├─ weight_discrepancy_pct
  │       │               ├─ value_per_kg_score
  │       │               ├─ dwell_time_score
  │       │               ├─ country_risk_score
  │       │               └─ composite risk_score (0–100)
  │       ├─ Prediction saved to DB
  │       └─ Response: { container_id, risk_score, risk_level, explanation }
```

---

## Request Flow: Batch CSV Upload + Prediction

```
Client
  │
  ├─ POST /api/v1/containers/upload (multipart CSV)
  │       ├─ Multer handles file
  │       ├─ csv-parser parses rows
  │       ├─ Bulk insert containers into PostgreSQL
  │       └─ Response: { uploaded: N, job_id }
  │
  ├─ POST /api/v1/predictions/batch { container_ids: [...] | job_id }
  │       ├─ BatchJob record created in DB (status: QUEUED)
  │       ├─ N individual tasks pushed to BullMQ
  │       └─ Response: { batch_job_id, status: "QUEUED" }
  │
  │   [BullMQ Worker - async processing]
  │       ├─ Picks up each task
  │       ├─ Calls FastAPI /predict/single per container
  │       ├─ Saves prediction to DB
  │       ├─ Updates batch_job progress counter
  │       └─ Emits Socket.io event: { job_id, processed, total, pct }
  │
  └─ WebSocket (Socket.io) → Client receives live progress
```

---

## Database Schema (PostgreSQL via Prisma)

```
users
  id, email, password_hash, name, role(ADMIN|ANALYST|VIEWER),
  is_active, created_at, updated_at

containers
  id, container_id(unique), declaration_date, declaration_time,
  trade_regime, origin_country, destination_port, destination_country,
  hs_code, importer_id, exporter_id, declared_value, declared_weight,
  measured_weight, shipping_line, dwell_time_hours,
  source(UPLOAD|API|SEED), uploaded_by(→users), created_at

predictions
  id, container_id(→containers), risk_score(0-100),
  risk_level(CLEAR|LOW_RISK|CRITICAL), explanation_summary,
  anomalies(JSON array), weight_discrepancy_pct, value_per_kg,
  model_version, is_mock(bool), batch_job_id(→batch_jobs), created_at

batch_jobs
  id, name, status(QUEUED|PROCESSING|COMPLETED|FAILED),
  total_containers, processed_count, failed_count,
  created_by(→users), started_at, completed_at, created_at

audit_logs
  id, user_id(→users), action, resource_type, resource_id,
  ip_address, user_agent, metadata(JSON), created_at
```

---

## Service Communication

| From          | To           | Protocol   | Auth               |
|---------------|--------------|------------|--------------------|
| Client        | Node.js API  | HTTPS/WSS  | JWT Bearer token   |
| Node.js API   | FastAPI      | HTTP       | X-Internal-API-Key |
| Node.js Worker| FastAPI      | HTTP       | X-Internal-API-Key |
| Node.js API   | PostgreSQL   | TCP        | DB credentials     |
| Node.js API   | Redis        | TCP        | Redis password     |
| BullMQ Worker | Redis        | TCP        | Redis password     |

---

## Security Architecture

```
1. JWT Auth
   - Access token: 15min expiry, RS256 signed
   - Refresh token: 7 days, stored in httpOnly cookie
   - Blacklist via Redis on logout

2. FastAPI Internal Security
   - X-Internal-API-Key header (never exposed publicly)
   - FastAPI port NOT exposed to public in Docker

3. Input Validation
   - All request bodies validated via Zod schemas (Node.js)
   - All request bodies validated via Pydantic schemas (FastAPI)

4. Rate Limiting
   - Global: 100 req/15min per IP
   - Auth endpoints: 10 req/15min per IP
   - Upload: 5 uploads/hour per user

5. SQL Injection Prevention
   - All queries via Prisma ORM (parameterized)

6. OWASP Headers
   - Helmet.js sets all security headers
   - CORS restricted to known origins
```

---

## Deployment Architecture (Docker)

```
docker-compose.yml
  │
  ├── postgres     (port 5432, internal only)
  ├── redis        (port 6379, internal only)
  ├── ml_service   (port 8000, internal only — accessible via Node.js only)
  └── backend      (port 3000, PUBLIC)
  
  All services on internal Docker network: smart_container_net
  Only backend port 3000 is port-forwarded to host.
```

---

## Scalability Considerations

| Bottleneck          | Current Solution      | Scale-up Path                    |
|---------------------|----------------------|----------------------------------|
| ML Inference        | Single FastAPI        | Add FastAPI replicas + load balancer |
| Batch Jobs          | Single BullMQ worker  | Add more worker processes         |
| DB read load        | Single PostgreSQL     | Read replicas + connection pool   |
| Session/Cache       | Single Redis          | Redis Cluster                    |
| File uploads        | Local /uploads folder | S3/MinIO object storage           |

---

## Key Design Patterns

- **Module-per-feature** – Each feature (auth, containers, predictions, jobs, analytics) is a self-contained folder with its own routes, controller, service, and validator.
- **Service layer** – Controllers are thin (handle HTTP), services contain all business logic, making unit testing possible.
- **Worker pattern** – BullMQ workers are separate processes that can be scaled independently.
- **Repository pattern via Prisma** – All DB access goes through Prisma client instances in services.
- **Structured logging** – Every request, error, and job event is logged via Winston with JSON format for easy parsing.
