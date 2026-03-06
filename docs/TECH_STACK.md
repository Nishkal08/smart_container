# SmartContainer Risk Engine — Tech Stack

## Decision Matrix Summary

| Layer              | Technology          | Why Chosen                                               |
|--------------------|---------------------|----------------------------------------------------------|
| Application API    | Node.js + Express   | Fast dev, huge ecosystem, easy async, middleware pattern |
| ML Inference API   | FastAPI + Uvicorn   | Python ML ecosystem, auto docs, async, pydantic types    |
| Primary Database   | PostgreSQL          | Relational, ACID, great with Prisma ORM                  |
| ORM                | Prisma              | Type-safe, auto migrations, excellent DX                 |
| Cache + Queue Backend | Redis            | In-memory speed, BullMQ needs it, token blacklisting     |
| Job Queue          | BullMQ              | Robust, Redis-backed, retries, monitoring                |
| Real-time          | Socket.io           | Battle-tested WS abstraction, reconnection, namespaces   |
| Authentication     | JWT (local)         | No third-party deps, full control, free, production-ready|
| Password Hashing   | bcryptjs            | Industry standard, constant-time comparison              |
| Input Validation   | Zod (Node) / Pydantic (Python) | Type safety at runtime boundaries          |
| File Upload        | Multer              | Stream-based, memory efficient, easy integration         |
| CSV Parsing        | csv-parser          | Streaming CSV, low memory, handles large files           |
| HTTP Client        | Axios               | Interceptors, timeout handling, easy retry               |
| Logging            | Winston             | JSON structured logs, multiple transports                |
| Security Headers   | Helmet.js           | One-liner OWASP headers (XSS, CSRF, etc.)                |
| Rate Limiting      | express-rate-limit  | Simple, Redis-compatible for distributed limiting        |
| CORS               | cors package        | Configurable, express middleware                         |
| Container          | Docker + Compose    | Reproducible environment, multi-service orchestration    |
| Code Quality       | ESLint + Prettier   | Consistent formatting and code quality                   |

---

## Authentication: JWT (Local) vs Clerk

**Decision: JWT locally.**

| Criteria            | JWT (Local)                         | Clerk                            |
|---------------------|-------------------------------------|----------------------------------|
| Cost                | Free                                | Paid (after free tier limits)    |
| External Dependency | None                                | Clerk servers                    |
| Portfolio Value     | High (shows you built it)           | Low (just configured a service)  |
| Customizability     | Complete control                    | Limited to Clerk's API           |
| Offline Demo        | Works offline                       | Requires internet                |
| Implementation Time | ~2 hours                            | ~30 minutes                      |
| Production Readiness| High (battle-tested pattern)        | High (but locked to vendor)      |

Verdict: For a hackathon with demo potential and portfolio value, **JWT wins**.

---

## Deployment: Docker vs Render

**Decision: Docker + Docker Compose.**

| Criteria             | Docker + Compose                    | Render Free Tier                 |
|----------------------|-------------------------------------|----------------------------------|
| Multi-service setup  | Native (one `docker-compose up`)    | Complex (separate services)      |
| PostgreSQL + Redis   | Bundled in compose                  | Separate add-ons, limited free   |
| Reproducibility      | Identical on any machine            | Environment differences possible |
| Demo reliability     | Local = 100% uptime                 | Free tier sleeps after 15min     |
| Professional signal  | Very high (industry standard)       | Medium                           |
| Cloud deployment     | Railway/Fly.io/ECS (easy from Docker)| Render specific                  |

Verdict: **Docker + Compose locally**. If cloud URL needed for demo, use **Railway** — it accepts `docker-compose.yml` natively.

---

## Core Dependencies

### Node.js Backend (`backend/package.json`)

```json
{
  "dependencies": {
    "express": "^4.18",
    "@prisma/client": "^5.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x",
    "socket.io": "^4.x",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "zod": "^3.x",
    "axios": "^1.x",
    "multer": "^1.x",
    "csv-parser": "^3.x",
    "winston": "^3.x",
    "cors": "^2.x",
    "helmet": "^7.x",
    "express-rate-limit": "^7.x",
    "rate-limit-redis": "^4.x",
    "dotenv": "^16.x",
    "uuid": "^9.x",
    "compression": "^1.x",
    "express-async-errors": "^3.x",
    "morgan": "^1.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "nodemon": "^3.x",
    "jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

### FastAPI Service (`ml_service/requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.0
pydantic-settings==2.2.1
pandas==2.2.1
numpy==1.26.4
python-dotenv==1.0.1
httpx==0.27.0
# Day 2 (real model):
# scikit-learn==1.5.0
# xgboost==2.0.3
# lightgbm==4.3.0
# shap==0.45.0
# joblib==1.4.0
```

---

## What Other Tech Can We Add to Stand Out?

### Suggested Additions (Beyond MVP)

| Feature                        | Tech                    | Impact   |
|-------------------------------|-------------------------|----------|
| API Documentation (auto-gen)  | Swagger via swagger-jsdoc | Medium |
| ML Explainability              | SHAP values in response | Very High |
| Containerization               | Docker multi-stage build | High    |
| Background Job Monitoring      | Bull Board (visual UI)  | High     |
| Database Migrations            | Prisma Migrate          | High     |
| Seed Data from CSV             | Custom seed script      | Medium   |
| Structured Audit Logs          | Winston + DB            | Medium   |
| Async CSV export               | BullMQ job → download   | Medium   |
| Health check endpoints         | /health (deep)          | Medium   |
| OpenAPI/Swagger                | fastapi auto-docs /docs | Low      |
| TypeScript migration           | tsc                     | Medium   |
| Unit tests                     | Jest + Supertest        | High     |

### Standout Ideas — Things That Will WOW Judges

1. **Importer/Exporter Risk Profiling**
   - Track historical risk scores per `Importer_ID` / `Exporter_ID`
   - A new shipment from a historically risky importer gets a risk boost
   - Endpoint: `GET /api/v1/analytics/shipper-profile/:id`

2. **Anomaly Explanation Cards (SHAP-based)**
   - For each prediction: "Weight 23% higher than declared — accounts for 40% of risk"
   - Visual bar showing which features contributed most
   - When real model is ready, drop SHAP values right into the existing `anomalies` JSON field

3. **HS Code Intelligence Layer**
   - Map HS codes to product categories
   - Flag HS codes historically associated with high-risk shipments
   - Endpoint: `GET /api/v1/analytics/hs-code-risk`

4. **Country-of-Origin Dynamic Risk Map**
   - Aggregate risk scores by origin country
   - Returns GeoJSON-compatible data for map visualization
   - Refreshes dynamically as new predictions come in

5. **Configurable Risk Thresholds (Admin)**
   - Admin can set what score counts as "Critical" vs "Low Risk"
   - Stored in DB, picked up by FastAPI at inference time
   - Endpoint: `PUT /api/v1/admin/thresholds`

6. **Real-time Progress via Socket.io**
   - Batch jobs push live progress: "247/1000 containers processed (24.7%)"
   - No polling — proper WebSocket events

7. **Bull Board Integration**
   - Visual dashboard at `/admin/queues` showing job queue status
   - Shows pending, active, completed, failed tasks

8. **Export to PDF Report**
   - One-click downloadable risk assessment report
   - Uses `pdfkit` or `puppeteer` to generate a professional report

9. **Webhook Alerts for Critical Containers**
   - When a CRITICAL risk container is detected, fire a webhook to a configured URL
   - Mimics integration with customs workflow systems

10. **Rate Limiting with Redis (Distributed)**
    - IP-based and user-based rate limiting backed by Redis
    - Works correctly even with multiple Node.js instances (scales horizontally)
