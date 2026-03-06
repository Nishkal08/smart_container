# setup.ps1
# SmartContainer — One-shot local development environment setup
# Run from the project root: .\setup.ps1
# Prerequisites: Docker Desktop must be running

param(
    [switch]$SkipSeed,           # Skip seeding admin user
    [switch]$SkipContainerSeed   # Skip seeding containers from CSV
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "[OK]  $msg" -ForegroundColor Green  }
function Write-Info($msg) { Write-Host "[..] $msg"  -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR] $msg" -ForegroundColor Red    }

# ── 1. Check Docker ──────────────────────────────────────────────────────────
Write-Step "Checking Docker"
try {
    $null = docker info 2>&1
    Write-Ok "Docker is running"
} catch {
    Write-Err "Docker is not running or not installed."
    Write-Host ""
    Write-Host "Install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "After installing, start Docker Desktop and re-run this script." -ForegroundColor White
    exit 1
}

# ── 2. Start Postgres + Redis ─────────────────────────────────────────────────
Write-Step "Starting PostgreSQL and Redis (dev services)"
Set-Location $Root
docker-compose -f docker-compose.dev.yml up -d
Write-Ok "Containers started"

# ── 3. Wait for Postgres to be healthy ───────────────────────────────────────
Write-Step "Waiting for PostgreSQL to be ready"
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    $status = docker inspect --format="{{.State.Health.Status}}" sc_postgres_dev 2>$null
    Write-Info "Attempt $attempts — postgres status: $status"
} while ($status -ne "healthy" -and $attempts -lt 20)

if ($status -ne "healthy") {
    Write-Err "PostgreSQL did not become healthy in time. Check: docker logs sc_postgres_dev"
    exit 1
}
Write-Ok "PostgreSQL is healthy"

# ── 4. npm install ───────────────────────────────────────────────────────────
Write-Step "Installing Node.js dependencies"
Set-Location $BackendDir
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Ok "node_modules already present — skipping npm install"
}

# ── 5. Prisma generate ───────────────────────────────────────────────────────
Write-Step "Generating Prisma client"
npx prisma generate
Write-Ok "Prisma client generated"

# ── 6. Apply database schema ─────────────────────────────────────────────────
Write-Step "Applying database schema (prisma db push)"
npx prisma db push --accept-data-loss
Write-Ok "Schema applied"

# ── 7. Seed admin & analyst users ────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Step "Seeding users (admin + analyst)"
    node prisma/seed.js
    Write-Ok "Users seeded"
}

# ── 8. Seed containers from CSV ──────────────────────────────────────────────
if (-not $SkipContainerSeed) {
    $csvPath = Join-Path $Root "Historical Data.csv"
    if (Test-Path $csvPath) {
        Write-Step "Seeding containers from Historical Data.csv"
        node prisma/seedContainers.js
        Write-Ok "Containers seeded"
    } else {
        Write-Info "Historical Data.csv not found at project root — skipping container seed"
    }
}

# ── 9. Create logs directory ─────────────────────────────────────────────────
Write-Step "Ensuring logs/ directory exists"
$logsDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}
Write-Ok "logs/ directory ready"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Start the backend:   cd backend  ;  npm run dev" -ForegroundColor White
Write-Host "  Prisma Studio:       cd backend  ;  npx prisma studio" -ForegroundColor White
Write-Host "  Stop containers:     docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host ""
Write-Host "  Default credentials:" -ForegroundColor Yellow
Write-Host "    Admin    : admin@smartcontainer.dev  / Admin123!" -ForegroundColor Yellow
Write-Host "    Analyst  : analyst@smartcontainer.dev / Analyst123!" -ForegroundColor Yellow
Write-Host ""
