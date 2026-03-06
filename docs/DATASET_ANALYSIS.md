# SmartContainer Risk Engine — Dataset Analysis

## Dataset Overview

Two CSV files are provided:

| File                  | Description                   | Date Range          |
|-----------------------|-------------------------------|---------------------|
| `Historical Data.csv` | Training/reference data        | Jan 2020 onward     |
| `Real-Time Data.csv`  | Live/test operationaldata      | Apr 2021 onward     |

---

## Field Descriptions

| Field                  | Type    | Description                                                     |
|------------------------|---------|-----------------------------------------------------------------|
| `Container_ID`         | Integer | Unique identifier for the container shipment                    |
| `Declaration_Date`     | Date    | Date when the customs declaration was filed (YYYY-MM-DD)        |
| `Declaration_Time`     | Time    | Time of declaration (HH:MM:SS)                                  |
| `Trade_Regime`         | String  | Import / Export / Transit                                       |
| `Origin_Country`       | String  | 2-letter ISO country code of cargo origin                       |
| `Destination_Port`     | String  | Port code (e.g., PORT_30, PORT_40)                              |
| `Destination_Country`  | String  | 2-letter ISO country code of destination                        |
| `HS_Code`              | Integer | Harmonized System commodity code (4–8 digits)                   |
| `Importer_ID`          | String  | Alphanumeric identifier for the importer entity                 |
| `Exporter_ID`          | String  | Alphanumeric identifier for the exporter entity                 |
| `Declared_Value`       | Float   | Declared monetary value of the cargo (currency unspecified)     |
| `Declared_Weight`      | Float   | Weight as declared in the customs document (kg)                 |
| `Measured_Weight`      | Float   | Actual measured weight of the container (kg)                    |
| `Shipping_Line`        | String  | Carrier/shipping line identifier                                |
| `Dwell_Time_Hours`     | Float   | Time the container spent at the port (hours)                    |
| `Clearance_Status`     | String  | **Target variable**: Clear / Low Risk / Critical                |

---

## Target Variable Distribution

Based on the provided samples:

| Status    | Observed Frequency | Notes                                            |
|-----------|--------------------|--------------------------------------------------|
| Clear     | ~75–80%            | Normal, cleared without inspection               |
| Low Risk  | ~15–20%            | Mild anomalies, may require document check       |
| Critical  | ~2–5%              | Significant anomalies, require physical inspection|

This is a **class-imbalanced** classification problem. The ML model must account for this.

---

## Key Feature Engineering Opportunities

### 1. Weight Discrepancy Ratio (Most Important Feature)
```
weight_discrepancy_pct = abs(Measured_Weight - Declared_Weight) / Declared_Weight × 100
```
- Observed Critical example: Container `94748548` → Declared 110kg, Measured 150.26kg → **36.6% discrepancy**
- Normal range: typically ±5%
- Red flags: > 15% discrepancy

### 2. Value-per-Kilogram Ratio
```
value_per_kg = Declared_Value / Declared_Weight
```
- Unusually high value/kg (e.g., cheap goods claiming high value) → customs fraud
- Unusually low value/kg (e.g., expensive goods undervalued) → duty evasion
- Can compute z-score against historical avg per HS code category

### 3. Dwell Time Anomaly
- Average dwell time: ~35–55 hours
- High dwell time (> 72h) indicates issues: documentation problems, system delays, or held shipment
- Very short dwell (< 5h) for complex cargo can also be suspicious (rushed clearance)
- Critical observed: `94748548` has 142.5 hours dwell time

### 4. Origin Country Risk Factor
- Certain origin countries have higher historical fraud/smuggling rates
- Can build a dynamic risk tier from historical data or use a static starting point
- Example tiers: HIGH (CN*, VN, ...), MEDIUM (...), LOW (DE, JP, US)
  *Note: CN is high volume but not necessarily high risk — must use proportion, not count

### 5. HS Code Sensitivity
- Certain HS code prefixes are associated with high-risk goods:
  - 93xxxx — Arms and ammunition
  - 85xxxx — Electronic equipment (often undervalued)
  - 71xxxx — Precious metals/stones
  - 29xxxx — Chemical products
  - 30xxxx — Pharmaceutical products

### 6. Importer/Exporter Historical Profile
- If `Importer_ID` has a history of high-risk shipments, new shipments get a risk boost
- Build aggregate: `avg_risk_per_importer`, `critical_count_per_importer`
- Novel importers (first-time or very few shipments) = higher uncertainty = slight risk boost

### 7. Trade Regime
- Transit shipments have less visibility into actual contents
- Import is most common
- Export anomalies less common but still relevant

### 8. Shipping Line Risk Profile
- Similar to importer profiling — some lines may historically correlate with risk
- `LINE_MODE_10`, `LINE_MODE_40` are synthetic in this dataset, but in real data, specific carriers have risk profiles

---

## Observed Anomaly Examples (from sample data)

| Container_ID | Key Anomaly                                           | Status   |
|-------------|--------------------------------------------------------|----------|
| 94748548    | Declared 110kg, Measured 150.26kg (+36.6%), Dwell 142.5h | **Critical** |
| 38614674    | Declared 108,019.2kg, Measured 123,340.6kg (+14.2%)   | Low Risk |
| 13844785    | Declared 4,953.5kg, Measured 5,965.2kg (+20.4%)        | Low Risk |

---

## Notes for Mock Risk Engine

The rule-based mock engine should implement these checks in priority order:

1. **Weight Discrepancy > 30%** → High contribution to risk
2. **Dwell Time > 96h** → High contribution
3. **Value/kg extreme outlier (> 3σ)** → Medium contribution
4. **Origin country in HIGH risk tier** → Low contribution
5. **HS Code in sensitive list** → Medium contribution
6. **New/unknown Importer_ID** → Low contribution

The composite score formula for mock:
```
score = (weight_factor × 0.35)
      + (dwell_factor × 0.20)
      + (value_factor × 0.25)
      + (country_factor × 0.10)
      + (hs_code_factor × 0.10)

Each factor is 0–100, composite is 0–100.
```

---

## Data Quality Notes

1. `Clearance_Status` values should be normalized: "Low Risk" → `LOW_RISK`, "Clear" → `CLEAR`, "Critical" → `CRITICAL`
2. Some `Declared_Weight` values are very large (e.g., 127,700 kg for JP fertilizer shipment — HS 310100) — these are likely valid bulk shipments
3. HS codes vary from 4 to 6 digits — store as string to avoid leading zero issues
4. Some shipping lines follow `LINE_MODE_XX` pattern (synthetic) vs specific lines like `LINE_W6UCD9` — both are valid
5. `Destination_Country` has value `ZZ` in some rows — likely unknown/transit; flag these

---

## Seeding Strategy

When seeding the database for demo purposes:
- Load all rows from `Historical Data.csv` into the `containers` table
- Run batch prediction on all of them to populate the `predictions` table
- This gives you a rich dataset of ~15,000+ containers with predictions pre-populated
- The dashboard analytics will have meaningful data from day one
