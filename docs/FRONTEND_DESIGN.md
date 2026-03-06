# SmartContainer Risk Engine - Frontend Design & Architecture

## 1. Project Overview & UX Vision
**SmartContainer Risk Engine** is an intelligent command center for customs officers and trade analysts to identify high-risk container shipments.
**Vibe**: Strip/Linear/Vercel — Minimalist, high data density, soft dark theme, zero clutter. 
**Interaction**: Smooth page transitions (Framer Motion), subtle hover effects (GSAP/CSS), and highly legible data visualization.

---

## 2. Tech Stack Setup
- **Core**: React 18, Vite
- **Routing**: React Router DOM v6
- **Server State Management**: `@tanstack/react-query` (Ideal for polling batch jobs and caching analytics)
- **Client State**: `zustand` (For sidebar, filters, and global UI state)
- **Styling**: TailwindCSS, `clsx`, `tailwind-merge`
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Icons**: `lucide-react`
- **Charts**: `recharts` (Great balance of customization and React integration)
- **Animations**: `framer-motion` (Page transitions, panel slides), `gsap` (optional, for specific micro-interactions)
- **API Client**: `axios`

---

## 3. Design Language & Theming

### 3.1. Color Palette (Dark Mode First)
- **Backgrounds**:
  - App Background: `#09090b` (Dark Slate/Zinc 950)
  - Card/Panel Background: `#18181b` (Zinc 900)
  - Hover/Active State: `#27272a` (Zinc 800)
- **Typography & Borders**:
  - Primary Text: `#fafafa` (Zinc 50)
  - Muted Text: `#a1a1aa` (Zinc 400)
  - Borders: `#27272a` (Zinc 800)
- **Primary Accent**: Soft Blue/Teal (`#38bdf8` / `#2dd4bf`)
- **Risk Semantic Colors**:
  - **Critical (Red)**: `bg-rose-500/10 text-rose-500 border-rose-500/20`
  - **Low Risk (Amber)**: `bg-amber-500/10 text-amber-500 border-amber-500/20`
  - **Clear (Green)**: `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`

### 3.2. Typography
- **Primary Font**: `Inter` or `Plus Jakarta Sans` (Clean, geometric, highly legible for numbers)
- Tabular nums (`tabular-nums` in Tailwind) should be used for all tables and metrics to prevent shifting.

---

## 4. Layout Structure

### 4.1. Shell (SaaS Layout)
- **Top Navigation Bar**:
  - Left: Minimal Logo + "SmartContainer"
  - Center: Global Search (Cmd+K command palette for Container IDs)
  - Right: Environment Status (API Connection/Socket status), User Profile Dropdown.
- **Left Sidebar (Collapsible)**:
  - Modules: Dashboard, Containers, Anomaly Insights, Batch Jobs, Upload Dataset
  - Admin (if Role=ADMIN): System Stats, User Management

### 4.2. Container Detail Side Panel (Slide-in)
- Using Framer Motion `<AnimatePresence>` for a smooth right-to-left slide-over.
- **Header**: Container ID + Risk Badge + Close Button.
- **Body**: 
  - **Metadata Card**: Origin, Destination, Importer, Exporter, Date.
  - **Explainability**: Progress bars for `weight_discrepancy_pct`, `value_per_kg`.
  - **Anomalies**: Chips/tags for detected anomalies.

---

## 5. Page Specifications

### 5.1. Dashboard Page (`/dashboard`)
- **Header**: "Command Center", Date range filter.
- **Stats Row**: Total Processed, Critical Incidents, Avg Risk Score.
- **Widgets**:
  - *Risk Distribution*: Recharts Donut Chart (`/api/v1/analytics/risk-distribution`).
  - *Container Volume/Trends*: Recharts Area Chart (`/api/v1/analytics/trends`).
  - *Top Risk Origins*: Horizontal Bar Chart (`/api/v1/analytics/country-risk`).
  - *Suspicious Shipments (Value vs Weight)*: Scatter Chart.
- **Bottom Data Table**: Latest High-Risk Containers (Polling or paginated).

### 5.2. Containers Directory (`/containers`)
- Complex Data Table with Shadcn UI.
- Filters: Date Range, Trade Regime, Risk Level, Origin Country.
- Pagination controls.
- Click row -> Opens Detail Side Panel.

### 5.3. Upload & Batch Job View (`/upload` & `/jobs`)
- **Upload**: React Dropzone component. Connects to `/api/v1/containers/upload?predict=true`.
- **Jobs Table**: Polls `/api/v1/jobs` to show live progress bars of background processing.

### 5.4. Anomaly Insights (`/insights`)
- Maps and patterns.
- Trade route heatmap & Top suspicious Shippers.

---

## 6. Directory Structure
```text
src/
├── assets/          # Images, svgs, etc.
├── components/      # Reusable UI parts
│   ├── ui/          # Shadcn primitives (buttons, inputs, tables)
│   ├── charts/      # Recharts wrapper components
│   ├── layout/      # Sidebar, TopNav, AppShell
│   └── shared/      # RiskBadge, StatCard, ContainerSidePanel
├── hooks/           # Custom React hooks (useContainers, useJobs)
├── lib/             # Utility functions
│   ├── api.js       # Axios client setup (interceptor for auth)
│   └── utils.js     # tailwind-merge (cn), formatting functions
├── pages/           # Route components
│   ├── auth/        # Login, Register
│   ├── dashboard/   # Dashboard widgets
│   ├── containers/  # Container list
│   ├── insights/    # Anomaly insights
│   ├── jobs/        # Batch jobs
│   └── upload/      # Upload functionality 
├── store/           # Zustand stores (useAuthStore, useUIStore)
├── App.jsx          # Router provider
└── index.css        # Tailwind directives and base CSS variables
```

## 7. Next Steps for Implementation
1. Initialize Vite + React project.
2. Install Tailwind + Shadcn UI dependencies.
3. Configure Axios client with JWT request/response interceptors + refresh logic.
4. Build App Shell (Sidebar + Topbar + Routing).
5. Build Authentication flow (Login).
6. Build Dashboard layout and integrate analytics API endpoints.
7. Build Containers Table and Slide-in Panel.
8. Build Upload component and Batch Jobs tracker.
