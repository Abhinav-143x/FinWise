# FinWise — Complete Deployment Guide

---

## Local Development with Docker (Recommended)

This is the fastest way to get everything running. One command starts the full stack.

### Prerequisites

- Docker Desktop installed and running
- Git

### Step 1 — Clone and enter project

```bash
git clone <your-repo-url> finwise
cd finwise
```

### Step 2 — Create environment file

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and verify the defaults (they work out of the box for local):

```env
DEBUG=True
SECRET_KEY=change-me-use-a-long-random-string-in-production
DB_NAME=finwise
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Step 3 — Start everything

```bash
docker compose up --build
```

This will:
1. Start PostgreSQL and wait for it to be healthy
2. Run `python manage.py migrate` automatically
3. Collect static files
4. Start Gunicorn (backend) on port 8000
5. Start Vite dev server (frontend) on port 3000

### Step 4 — Open the app

| Service | URL |
|---|---|
| **App** | http://localhost:3000 |
| **API** | http://localhost:8000/api/v1/ |
| **Health** | http://localhost:8000/health/ |
| **Admin** | http://localhost:8000/admin/ |

### Step 5 — Create admin user (optional)

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## Fresh Start (If Migrations Break)

Run this exact sequence whenever you get migration errors:

```bash
# 1. Stop everything and wipe DB volume
docker compose down -v

# 2. Delete all migration files — keep __init__.py
# On Mac/Linux:
find backend/apps -path "*/migrations/*.py" -not -name "__init__.py" -delete
find backend/apps -path "*/migrations/*.pyc" -delete

# On Windows PowerShell:
Get-ChildItem -Path backend/apps -Recurse -Filter "*.py" |
  Where-Object { $_.DirectoryName -match "migrations" -and $_.Name -ne "__init__.py" } |
  Remove-Item

# 3. Create fresh migrations
docker compose run --rm backend python manage.py makemigrations users
docker compose run --rm backend python manage.py makemigrations profiles goals decisions
docker compose run --rm backend python manage.py makemigrations

# 4. Apply migrations
docker compose run --rm backend python manage.py migrate

# 5. Start app
docker compose up --build
```

---

## Local Development Without Docker

Use this if you prefer running services directly on your machine.

### Backend

```bash
# 1. Navigate to backend
cd backend

# 2. Create Python virtual environment
python -m venv .venv

# 3. Activate it
source .venv/bin/activate          # Mac/Linux
.venv\Scripts\activate             # Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Set up environment
cp .env.example .env
# Edit .env — set DB credentials to your local PostgreSQL

# 6. Create database (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE finwise;"

# 7. Run migrations
python manage.py migrate

# 8. (Optional) Create superuser
python manage.py createsuperuser

# 9. Start development server
python manage.py runserver
# → Backend running at http://localhost:8000
```

### Frontend

```bash
# Open a new terminal

# 1. Navigate to frontend
cd frontend

# 2. Install Node dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Default: VITE_API_URL=http://localhost:8000/api/v1

# 4. Start dev server
npm run dev
# → App running at http://localhost:3000
```

---

## Running Tests

```bash
# All tests
docker compose run --rm backend python manage.py test

# Engine unit tests (pure logic, no DB)
docker compose run --rm backend python manage.py test apps.decisions.tests

# API integration tests
docker compose run --rm backend python manage.py test apps.decisions.test_api

# Without Docker:
cd backend
python manage.py test
```

---

## Production Deployment

### Frontend → Vercel

```bash
# 1. Build
cd frontend
npm run build

# 2. Deploy dist/ to Vercel
# Or connect your Git repo to Vercel for automatic deployments

# 3. Set environment variable in Vercel dashboard:
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

### Backend → Render (Free tier)

1. Create a new **Web Service** on render.com
2. Connect your Git repository
3. Set:
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - **Root directory:** `backend`

4. Add environment variables:
```
DEBUG=False
SECRET_KEY=<generate a 50-char random string>
DB_NAME=<from Render PostgreSQL>
DB_USER=<from Render PostgreSQL>
DB_PASSWORD=<from Render PostgreSQL>
DB_HOST=<from Render PostgreSQL>
DB_PORT=5432
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
ALLOWED_HOSTS=your-backend.onrender.com
```

5. Add a **PostgreSQL** database on Render (free tier available)

6. After first deploy, run migrations via Render shell:
```bash
python manage.py migrate
```

### Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway init
railway up

# Add environment variables in Railway dashboard
# Add PostgreSQL plugin in Railway dashboard
# Run migrations
railway run python manage.py migrate
```

---

## Health Check

Once deployed, verify everything is working:

```bash
# Health endpoint (no auth required)
curl https://your-backend.onrender.com/health/

# Expected response:
{
  "status": "ok",
  "db": { "connected": true, "latency_ms": 2.1 },
  "version": "2.5"
}
```

---

## Docker Commands Reference

```bash
# Start everything (first time or after code changes)
docker compose up --build

# Start in background
docker compose up -d --build

# View logs
docker compose logs -f
docker compose logs backend -f
docker compose logs frontend -f

# Stop everything
docker compose down

# Stop and delete all data (DB volume)
docker compose down -v

# Run a one-off command
docker compose run --rm backend python manage.py <command>
docker compose run --rm backend python manage.py createsuperuser
docker compose run --rm backend python manage.py shell

# Rebuild single service
docker compose up --build backend

# Check service health
docker compose ps
```

---

## Common Issues

### Port already in use
```bash
# Change ports in docker-compose.yml:
# backend: "8001:8000"
# frontend: "3001:3000"
```

### Database connection refused
Make sure the `db` service is healthy before `backend` starts.
The `depends_on: condition: service_healthy` in docker-compose.yml handles this,
but if it fails: `docker compose restart backend`

### Migrations out of sync
Follow the **Fresh Start** section above.

### Frontend can't reach backend
Check `VITE_API_URL` in `frontend/.env.local` matches your backend port.
For Docker, the Vite proxy in `vite.config.js` handles `/api` → `http://localhost:8000`.

### `relation "profiles" does not exist`
The `apps.common` app must be in `INSTALLED_APPS` in `config/settings.py`.
Check that it appears before other apps. Then run a fresh migration sequence.
