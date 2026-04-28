# FinWise — Financial Decision Assistant

> Stop guessing. Start deciding.

FinWise answers your real money questions with a clear verdict and transparent reasoning — not just charts.

---

## What it does

| Engine | Question answered |
|---|---|
| **Can I Afford This?** | Is this purchase safe given my savings, income, and expenses? |
| **Goal Impact** | Will this purchase delay my savings goals? |
| **Safe to Spend** | What's my real discretionary budget this month? |

Every result returns: `SAFE / CAUTION / RISKY` + recommendation + reasons + better moves.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Hook Form |
| Backend | Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) |
| Hosting | Vercel (frontend) + Render/Railway (backend) |

---

## Project Structure

```
finwise/
├── backend/
│   ├── apps/
│   │   ├── users/          # Custom user model, JWT auth
│   │   ├── profiles/       # Financial baseline (income, expenses, savings)
│   │   ├── goals/          # Savings goals CRUD
│   │   ├── decisions/      # Engine orchestration, history
│   │   │   └── engines/
│   │   │       ├── affordability.py   # Can I Afford This?
│   │   │       ├── goal_impact.py     # Goal Impact
│   │   │       └── safe_spend.py      # Safe to Spend
│   │   └── common/         # Shared utilities, signals
│   └── config/             # Django settings, URLs
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/     # AppLayout, AuthGuard
│       │   └── ui/         # ResultCard, VerdictBadge, FormField, etc.
│       ├── pages/
│       │   ├── decisions/  # AffordabilityPage, GoalImpactPage, SafeSpendPage
│       │   └── ...         # Dashboard, Profile, Goals, History
│       ├── store/          # Zustand auth store
│       └── lib/            # Axios instance with JWT interceptors
└── docker-compose.yml
```

---

## Quick Start (Docker — recommended)

### Prerequisites
- Docker + Docker Compose installed

```bash
# 1. Clone the repo
git clone <your-repo-url> finwise
cd finwise

# 2. Start everything
docker compose up --build

# 3. Create a superuser (in a new terminal)
docker compose exec backend python manage.py createsuperuser

# 4. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1/
# Django Admin: http://localhost:8000/admin/
```

---

## Manual Setup (without Docker)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY, DB credentials

# Run database migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start dev server
python manage.py runserver
# API available at http://localhost:8000/api/v1/
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# VITE_API_URL=http://localhost:8000/api/v1

# Start dev server
npm run dev
# App available at http://localhost:3000
```

---

## API Reference

### Auth
```
POST /api/v1/auth/register/        Register + get tokens
POST /api/v1/auth/login/           Login + get tokens
POST /api/v1/auth/token/refresh/   Refresh access token
GET  /api/v1/auth/me/              Current user
POST /api/v1/auth/logout/          Invalidate refresh token
POST /api/v1/auth/delete-account/  Soft-delete account
```

### Profile
```
GET   /api/v1/profile/   Get profile
PATCH /api/v1/profile/   Update profile
```

### Goals
```
GET    /api/v1/goals/         List goals
POST   /api/v1/goals/         Create goal
GET    /api/v1/goals/<id>/    Get goal
PATCH  /api/v1/goals/<id>/    Update goal
DELETE /api/v1/goals/<id>/    Soft-delete goal
```

### Decisions
```
POST /api/v1/decisions/affordability/   Can I Afford This?
POST /api/v1/decisions/goal-impact/     Goal Impact
POST /api/v1/decisions/safe-spend/      Safe to Spend
GET  /api/v1/decisions/history/         Paginated history (filter: ?engine=affordability)
GET  /api/v1/decisions/<id>/            Decision detail
```

### Example: Affordability Check

**Request:**
```json
POST /api/v1/decisions/affordability/
{
  "purchase_amount": 800,
  "monthly_income": 5000,
  "fixed_expenses": 2000,
  "current_savings": 10000,
  "monthly_emi": 200,
  "currency": "USD"
}
```

**Response:**
```json
{
  "decision_id": "uuid",
  "verdict": "CAUTION",
  "recommendation": "Buying now is possible, but waiting 1 month is safer.",
  "reasons": [
    "Uses 8% of your savings.",
    "Costs 16% of your monthly income."
  ],
  "better_moves": [
    "Wait 1 month to save up from disposable income."
  ],
  "metrics": {
    "savings_used_pct": 8.0,
    "income_ratio_pct": 16.0,
    "emergency_months_after": 5.8,
    "months_to_save": 0.3,
    "monthly_disposable": 2800.0
  }
}
```

---

## Running Tests

```bash
cd backend

# All tests
python manage.py test

# Engine unit tests only
python manage.py test apps.decisions.tests

# API integration tests only
python manage.py test apps.decisions.test_api
```

---

## Adding a New Engine (Phase 2)

1. Create `backend/apps/decisions/engines/emi.py` with:
   - An `Input` dataclass
   - A `Result` dataclass  
   - A `run(inp) -> Result` pure function
   - An `ENGINE_VERSION` constant

2. Register it in `engines/__init__.py`:
   ```python
   from .emi import run as run_emi, EmiInput, ENGINE_VERSION as EMI_VERSION
   ENGINE_REGISTRY["emi_vs_cash"] = { "run": run_emi, ... }
   ```

3. Add serializer in `decisions/serializers.py`

4. Add view in `decisions/views.py`

5. Add URL in `decisions/urls.py`

6. Add frontend page in `frontend/src/pages/decisions/`

7. Register in `EngineType` choices in `decisions/models.py`

---

## Supported Currencies

`INR USD EUR GBP AED CAD AUD JPY SGD BRL`

To add more: update `SUPPORTED_CURRENCIES` in `config/settings.py` and the `CURRENCIES` array in `frontend/src/components/ui/CurrencySelect.jsx`.

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set VITE_API_URL env var to your backend URL
```

### Backend → Render / Railway
```bash
# Set environment variables:
DEBUG=False
SECRET_KEY=<strong-random-key>
DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
ALLOWED_HOSTS=your-backend.onrender.com

# Build command: pip install -r requirements.txt
# Start command: gunicorn config.wsgi:application
```

---

## Phase Roadmap

| Phase | Features | Status |
|---|---|---|
| 1 | Auth, Profile, Affordability Engine, Results UI | ✅ Built |
| 2 | Goal Impact, Safe to Spend, History | ✅ Built |
| 3 | UI polish, currency settings, guest mode | 🔜 Next |
| 4 | EMI vs Cash, Rent vs Buy engines | 🔜 Future |

---

## Design Decisions

- **Engines are pure functions** — no DB calls, fully testable in isolation
- **UUID primary keys** — no sequential ID exposure
- **Soft deletes** — user data preserved for analytics
- **Decision audit log** — every result stored with version number for A/B testing
- **Profile pre-fill** — forms auto-fill from saved profile for speed
- **JWT with refresh rotation** — secure, stateless auth with auto-renewal
