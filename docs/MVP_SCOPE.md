# SmartContainer Risk Engine — MVP Scope

## What Is Our MVP?

The Minimum Viable Product demonstrates the **full end-to-end flow** of the system with real (or realistic mock) data. A judge should be able to:

1. Register/login as a customs analyst
2. Upload a CSV of container shipments
3. Trigger batch risk assessment
4. View results with risk levels and explanations in a table
5. Download the results as a CSV
6. See aggregate analytics (risk distribution, top risky shippers)

---

## MVP Feature Checklist

### Must Have (MVP Core)

| # | Feature                          | Module       | Status   |
|---|----------------------------------|--------------|----------|
| 1 | User registration & login (JWT)  | Auth         | 🔨 Today |
| 2 | Upload CSV of containers         | Containers   | 🔨 Today |
| 3 | Single container risk prediction | Predictions  | 🔨 Today |
| 4 | Batch risk prediction (async)    | Predictions  | 🔨 Today |
| 5 | View predictions (risk + explanation) | Predictions | 🔨 Today |
| 6 | Download predictions as CSV      | Predictions  | 🔨 Today |
| 7 | Batch job status tracking        | Jobs         | 🔨 Today |
| 8 | Risk summary dashboard (API)     | Analytics    | 🔨 Today |
| 9 | FastAPI mock ML service          | ML Service   | 🔨 Today |
| 10| Docker Compose setup             | DevOps       | 🔨 Today |

### Should Have (MVP+)

| # | Feature                          | Module       | Status   |
|---|----------------------------------|--------------|----------|
| 11| Real ML model integration        | ML Service   | 📅 Tomorrow |
| 12| React dashboard frontend         | Frontend     | 📅 Tomorrow |
| 13| SHAP explainability in responses | ML Service   | 📅 Tomorrow |
| 14| WebSocket real-time job progress | Backend      | 🔨 Today |
| 15| Country risk map data            | Analytics    | 🔨 Today |
| 16| Top risky importer/exporter list | Analytics    | 🔨 Today |

### Nice to Have (Demo Polish)

| # | Feature                          | Priority |
|---|----------------------------------|----------|
| 17| Bull Board queue monitor UI      | Medium   |
| 18| HS Code intelligence layer       | Medium   |
| 19| Importer/Exporter risk profiling  | High     |
| 20| Webhook alerts for CRITICAL containers | Low |
| 21| Configurable risk thresholds     | Medium   |
| 22| Audit log table                  | Medium   |
| 23| PDF report export                | Low      |

---

## MVP Demo Script (5-minute walkthrough)

```
1. Open browser → localhost:5173 (React dashboard)

2. Login as admin (pre-seeded account)
   ↳ Show: JWT auth, protected routes

3. Upload Historical Data.csv
   ↳ Show: File drag-drop, "1500 containers uploaded" confirmation

4. Click "Analyze All" → triggers batch prediction
   ↳ Show: Job created, progress bar filling in real-time (Socket.io)
   ↳ "1500/1500 containers analyzed in 12 seconds"

5. Go to Containers table
   ↳ Show: Badge colors (green/yellow/red) per risk level
   ↳ Filter by CRITICAL → shows ~75 containers

6. Click one CRITICAL container
   ↳ Show: Risk score 87/100
   ↳ Explanation: "Measured weight 36.6% higher than declared (110kg vs 150kg).
                   Unusual dwell time of 142 hours."
   ↳ Anomalies: weight_discrepancy, dwell_time

7. Go to Analytics page
   ↳ Show: Pie chart — Clear 78%, Low Risk 17%, Critical 5%
   ↳ Risk trends line chart
   ↳ Table: Top 10 risky importers by average score
   ↳ Country risk map (CN, VN highlighted)

8. Click "Export CSV" → Download predictions file
   ↳ Show: Standard output format (Container_ID, Risk_Score, Risk_Level, Explanation)
```

---

## What Makes Our MVP Different from Competitors?

### Typical Hackathon Submission
- Jupyter notebook with model training
- Static CSV output
- Maybe a simple Flask app
- No API, no auth, no persistence

### Our Submission
- **Production-grade API** with authentication, rate limiting, security headers
- **Async batch processing** via real job queue (BullMQ) — handles 10,000 containers without blocking
- **Real-time progress updates** via WebSocket — not polling
- **Structured explainability** — each prediction explains exactly why in plain English
- **SHAP-ready** — when real model arrives, explainability is already wired in
- **Docker Compose** — `docker-compose up` and everything runs, no manual setup
- **Export-ready** — outputs the exact format required by the problem statement (CSV with all 4 required columns)
- **Audit trail** — every prediction logged with user, timestamp, model version
- **Scalable design** — can add more workers, more API nodes, more ML replicas

---

## Out of Scope for MVP

- Multi-tenant organization support (one user pool is fine for hackathon)
- Email verification / password reset (not required for demo)
- HTTPS/TLS (handled by reverse proxy in production, not needed locally)
- Advanced ML model (Day 2 task)
- Mobile app
