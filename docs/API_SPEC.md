# SmartContainer Risk Engine — API Specification

Base URL: `http://localhost:3000/api/v1`

All protected routes require: `Authorization: Bearer <access_token>`

---

## Authentication

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Customs",
  "email": "john@port.gov",
  "password": "SecurePass123!",
  "role": "ANALYST"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@port.gov", "name": "John Customs", "role": "ANALYST" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/login`
Login and receive tokens.

**Request Body:**
```json
{ "email": "john@port.gov", "password": "SecurePass123!" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@port.gov", "role": "ANALYST" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/refresh`
Get a new access token using refresh token.

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

---

### POST `/auth/logout`
Blacklist current access token.

**Headers:** `Authorization: Bearer <token>`  
**Response 200:** `{ "success": true, "message": "Logged out" }`

---

## Containers

### GET `/containers`
Paginated list of containers.

**Query Params:**
| Param           | Type    | Description                                      |
|-----------------|---------|--------------------------------------------------|
| page            | number  | Page number (default: 1)                         |
| limit           | number  | Items per page (default: 20, max: 100)           |
| origin_country  | string  | Filter by origin country code (e.g., CN)         |
| risk_level      | string  | Filter by risk level (CLEAR/LOW_RISK/CRITICAL)   |
| date_from       | string  | Filter by declaration date from (YYYY-MM-DD)     |
| date_to         | string  | Filter by declaration date to (YYYY-MM-DD)       |
| trade_regime    | string  | Import / Export / Transit                        |
| search          | string  | Search by container_id, importer_id, exporter_id |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "containers": [ { "id": "...", "container_id": "97061800", "origin_country": "BE", "..." } ],
    "pagination": { "page": 1, "limit": 20, "total": 1542, "totalPages": 78 }
  }
}
```

---

### GET `/containers/:id`
Single container with its most recent prediction.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "container": {
      "id": "uuid", "container_id": "97061800", "origin_country": "BE",
      "declared_weight": 108.0, "measured_weight": 106.51, "dwell_time_hours": 37.6,
      "prediction": {
        "risk_score": 18, "risk_level": "CLEAR",
        "explanation_summary": "Weight discrepancy is negligible (1.4%). Dwell time within normal range.",
        "anomalies": [], "created_at": "2026-03-05T10:00:00Z"
      }
    }
  }
}
```

---

### POST `/containers`
Create a single container record.

**Request Body:**
```json
{
  "container_id": "97061800",
  "declaration_date": "2020-01-01",
  "declaration_time": "20:16:40",
  "trade_regime": "Import",
  "origin_country": "BE",
  "destination_port": "PORT_30",
  "destination_country": "UG",
  "hs_code": "440890",
  "importer_id": "QLRUBN9",
  "exporter_id": "0VKY2BR",
  "declared_value": 372254.4,
  "declared_weight": 108.0,
  "measured_weight": 106.51,
  "shipping_line": "LINE_MODE_10",
  "dwell_time_hours": 37.6
}
```

**Response 201:** Container object.

---

### POST `/containers/upload`
Upload a CSV file of containers.

**Content-Type:** `multipart/form-data`  
**Form Field:** `file` (CSV file, max 10MB)

**Response 202:**
```json
{
  "success": true,
  "data": {
    "uploaded": 1500,
    "skipped": 12,
    "errors": 0,
    "batch_job_id": "uuid"
  }
}
```

---

### DELETE `/containers/:id`
Soft-delete a container. **Admin only.**

**Response 200:** `{ "success": true, "message": "Container deleted" }`

---

## Predictions

### POST `/predictions/single`
Predict risk for a single container (by container DB id or container_id).

**Request Body:**
```json
{ "container_id": "97061800" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "container_id": "97061800",
    "risk_score": 18,
    "risk_level": "CLEAR",
    "explanation_summary": "Weight discrepancy is within normal tolerance (1.4%). No anomalies detected.",
    "anomalies": [],
    "weight_discrepancy_pct": 1.38,
    "value_per_kg": 3447.73,
    "is_mock": true,
    "model_version": "mock-v1.0",
    "created_at": "2026-03-05T10:00:00Z"
  }
}
```

---

### POST `/predictions/batch`
Queue a batch prediction job.

**Request Body:**
```json
{
  "container_ids": ["97061800", "85945189", "77854751"],
  "job_name": "Jan 2020 batch"
}
```
*OR provide a `batch_job_id` from an upload to predict all containers in that upload.*

**Response 202:**
```json
{
  "success": true,
  "data": {
    "batch_job_id": "uuid",
    "status": "QUEUED",
    "total_containers": 3,
    "message": "Batch prediction queued. Monitor progress via WebSocket or GET /jobs/:id"
  }
}
```

---

### GET `/predictions`
Paginated list of predictions.

**Query Params:** `page`, `limit`, `risk_level`, `date_from`, `date_to`, `is_mock`

**Response 200:** Paginated list of prediction objects.

---

### GET `/predictions/:containerId`
Get prediction for a specific container.

**Response 200:** Single prediction object.

---

### GET `/predictions/export`
Download all matching predictions as CSV.

**Query Params:** Same as `GET /predictions`  
**Response:** `Content-Type: text/csv` — CSV file download

**CSV columns:** `Container_ID, Risk_Score, Risk_Level, Explanation_Summary, Weight_Discrepancy_Pct, Value_Per_Kg, Model_Version, Created_At`

---

## Jobs

### GET `/jobs`
List all batch jobs for the current user.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "name": "Jan 2020 batch", "status": "COMPLETED",
      "total_containers": 1500, "processed_count": 1500, "failed_count": 2,
      "created_at": "...", "completed_at": "..."
    }
  ]
}
```

---

### GET `/jobs/:id`
Get detailed job status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid", "name": "Jan 2020 batch", "status": "PROCESSING",
    "total_containers": 1500, "processed_count": 742, "failed_count": 0,
    "progress_pct": 49.5,
    "created_at": "..."
  }
}
```

---

## Analytics

### GET `/analytics/summary`
Overall system statistics.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_containers": 15420,
    "total_predictions": 14800,
    "risk_distribution": {
      "CLEAR": 11200, "LOW_RISK": 2800, "CRITICAL": 800
    },
    "avg_risk_score": 28.4,
    "containers_today": 142,
    "critical_today": 12
  }
}
```

---

### GET `/analytics/risk-distribution`
Risk level counts (for pie/donut chart).

---

### GET `/analytics/trends`
Daily risk counts over time.

**Query Params:** `period` (7d / 30d / 90d)

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "date": "2026-03-01", "CLEAR": 120, "LOW_RISK": 35, "CRITICAL": 12 },
    { "date": "2026-03-02", "CLEAR": 145, "LOW_RISK": 28, "CRITICAL": 8 }
  ]
}
```

---

### GET `/analytics/top-risky-shippers`
Top importers/exporters by average risk score.

**Query Params:** `type` (importer|exporter), `limit` (default: 10)

---

### GET `/analytics/country-risk`
Aggregated risk score by origin country (for map visualization).

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "country": "CN", "avg_risk_score": 31.2, "total": 4200, "critical": 89 },
    { "country": "VN", "avg_risk_score": 28.1, "total": 1800, "critical": 42 }
  ]
}
```

---

## WebSocket Events (Socket.io)

**Connection:** `ws://localhost:3000`  
**Auth:** Pass JWT in handshake: `{ auth: { token: "Bearer eyJ..." } }`

### Events Emitted by Server

| Event              | Payload                                                   |
|--------------------|-----------------------------------------------------------|
| `job:progress`     | `{ job_id, processed, total, pct, status }`               |
| `job:completed`    | `{ job_id, total, failed_count, completed_at }`           |
| `job:failed`       | `{ job_id, error }`                                       |
| `prediction:new`   | `{ container_id, risk_level, risk_score }`                |

### Events Sent by Client

| Event              | Payload                  | Description              |
|--------------------|--------------------------|--------------------------|
| `subscribe:job`    | `{ job_id: "uuid" }`     | Subscribe to job updates |
| `unsubscribe:job`  | `{ job_id: "uuid" }`     | Unsubscribe              |

---

## Health Checks

### GET `/health`
Node.js API health (public, no auth).

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "ml_service": "ok"
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "declared_weight must be a positive number",
    "details": [ { "field": "declared_weight", "message": "Expected number, received string" } ]
  }
}
```

### Error Codes

| HTTP Status | Code                  | Meaning                                       |
|-------------|-----------------------|-----------------------------------------------|
| 400         | VALIDATION_ERROR      | Request body/params failed schema validation  |
| 401         | UNAUTHORIZED          | Missing or invalid JWT                        |
| 403         | FORBIDDEN             | Authenticated but not permitted               |
| 404         | NOT_FOUND             | Resource does not exist                       |
| 409         | CONFLICT              | Duplicate container_id                        |
| 413         | FILE_TOO_LARGE        | Uploaded file exceeds 10MB                    |
| 422         | UNPROCESSABLE         | CSV has invalid format                        |
| 429         | RATE_LIMITED          | Too many requests                             |
| 500         | INTERNAL_ERROR        | Unexpected server error                       |
| 503         | ML_SERVICE_UNAVAILABLE| FastAPI service is down                       |
