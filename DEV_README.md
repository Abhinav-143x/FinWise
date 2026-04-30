# FinWise — Developer Guide

---

## Architecture

```
finwise/
├── backend/          Django + DRF API
│   ├── apps/
│   │   ├── users/          Custom user model, JWT auth
│   │   ├── profiles/        Financial baseline (1-per-user)
│   │   ├── goals/           Savings goals CRUD
│   │   ├── decisions/       Engine orchestration + history
│   │   │   └── engines/     Pure-function engine modules
│   │   └── common/          Currency service, signals, utils
│   └── config/              Settings, root URLs
└── frontend/         React + Vite + Tailwind
    └── src/
        ├── components/
        │   ├── layout/      AppLayout, AuthGuard
        │   └── ui/          ResultCard, VerdictBadge, FormField…
        ├── hooks/           useProfile (shared cache)
        ├── pages/
        │   └── decisions/   One page per engine
        ├── store/           Zustand auth store
        └── lib/             Axios instance with JWT interceptors
```

---

## Engine pattern

Every engine is a **pure function** in `backend/apps/decisions/engines/`.

```python
# Pattern every engine follows:
@dataclass
class MyInput:
    field: Decimal
    ...
    def __post_init__(self):
        # coerce to Decimal

@dataclass
class MyResult:
    verdict: str          # "SAFE" | "CAUTION" | "RISKY"
    recommendation: str   # one-line summary
    reasons: list[str]
    better_moves: list[str]
    metrics: dict
    version: int = ENGINE_VERSION

def run(inp: MyInput) -> MyResult:
    # pure logic, no DB, no HTTP
    ...
```

**Adding a new engine:**
1. Create `engines/my_engine.py` following the pattern above
2. Register in `engines/__init__.py`
3. Add `EngineType` choice in `decisions/models.py`
4. Add input serializer in `decisions/serializers.py`
5. Add view in `decisions/views.py`
6. Add URL in `decisions/urls.py`
7. Create `frontend/src/pages/decisions/MyEnginePage.jsx`
8. Add route in `frontend/src/App.jsx`
9. Add to nav in `frontend/src/components/layout/AppLayout.jsx`

---

## Database schema

### `users`
| Column | Type |
|---|---|
| id | UUID PK |
| email | varchar unique |
| password | hashed |
| is_active | bool |
| deleted_at | timestamp nullable |

### `profiles`
| Column | Type |
|---|---|
| id | UUID PK |
| user_id | FK → users |
| monthly_income | decimal |
| fixed_expenses | decimal |
| current_savings | decimal |
| monthly_emi | decimal |
| default_currency | char(3) |
| country | char(10) |
| salary_day | int nullable (1–31) |
| is_onboarded | bool |

### `goals`
| Column | Type |
|---|---|
| id | UUID PK |
| user_id | FK → users |
| name | varchar |
| target_amount | decimal |
| current_amount | decimal |
| monthly_contribution | decimal |
| currency | char(3) |
| is_active | bool |

### `decisions`
| Column | Type |
|---|---|
| id | UUID PK |
| user_id | FK → users |
| engine_type | varchar (affordability / goal_impact / safe_spend / buy_now_wait / dream_planner / emergency_recovery) |
| item_name | varchar (optional label) |
| input_data | jsonb |
| result_data | jsonb |
| verdict | varchar (SAFE / CAUTION / RISKY) |
| currency | char(3) |
| version | int |
| created_at | timestamp |

---

## API routes

### Auth
```
POST /api/v1/auth/register/
POST /api/v1/auth/login/
POST /api/v1/auth/token/refresh/
GET  /api/v1/auth/me/
POST /api/v1/auth/logout/
POST /api/v1/auth/delete-account/
```

### Profile
```
GET   /api/v1/profile/
PATCH /api/v1/profile/
```

### Goals
```
GET    /api/v1/goals/
POST   /api/v1/goals/
GET    /api/v1/goals/<id>/
PATCH  /api/v1/goals/<id>/
DELETE /api/v1/goals/<id>/   (soft delete)
```

### Decisions — engines
```
POST /api/v1/decisions/affordability/
POST /api/v1/decisions/goal-impact/
POST /api/v1/decisions/safe-spend/
POST /api/v1/decisions/buy-now-wait/
POST /api/v1/decisions/dream-planner/
POST /api/v1/decisions/emergency-recovery/
```

### Decisions — history
```
GET    /api/v1/decisions/history/?engine=&search=&page=
GET    /api/v1/decisions/<id>/
DELETE /api/v1/decisions/<id>/
```

### Currency
```
GET  /api/v1/currency/rates/
POST /api/v1/currency/convert/
```

---

## Engine input shapes

**affordability / goal-impact / buy-now-wait**
```json
{ "purchase_amount": 800, "purchase_currency": "USD", "item_name": "MacBook" }
```

**safe-spend** — no body, all from profile

**dream-planner**
```json
{ "item_name": "Bike", "target_price": 50000, "purchase_currency": "INR", "extra_monthly_save": 2000 }
```

**emergency-recovery**
```json
{ "expense_amount": 15000, "expense_label": "Hospital bill", "expense_currency": "INR" }
```

---

## Environment variables

**Backend `.env`**
```
DEBUG=True
SECRET_KEY=<strong-random>
DB_NAME=finwise
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
```

**Frontend `.env.local`**
```
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Local setup

```bash
# 1. Clone
git clone <repo> finwise && cd finwise

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Build commands

```bash
# Backend tests
cd backend
python manage.py test                           # all tests
python manage.py test apps.decisions.tests      # engine unit tests
python manage.py test apps.decisions.test_api   # integration tests

# Frontend build
cd frontend
npm run build    # outputs to dist/
npm run preview  # preview production build

# Docker
docker compose up --build       # start everything
docker compose down -v          # stop + wipe volumes
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py makemigrations
```

---

## Currency service

`backend/apps/common/currency.py`

- Fetches live rates from `open.er-api.com` (free, no key)
- In-memory cache, 1-hour TTL
- Stale-while-revalidate: uses last known rates if fetch fails
- Hardcoded fallback rates if no cache exists at all
- All amounts converted via USD as base

```python
from apps.common.currency import convert, get_rates
result = convert(Decimal("500"), "USD", "INR")  # → Decimal("41750.00")
```

---

## Frontend state

**Auth:** Zustand store (`src/store/authStore.js`)  
- Tokens in `localStorage`
- Auto-refresh on 401 via Axios interceptor

**Profile + rates:** Module-level cache (`src/hooks/useProfile.js`)
- Fetched once per session
- `invalidateProfileCache()` called after profile save
- All engine pages read from this — no per-page fetching

---

## Testing checklist

Before shipping:
- [ ] Register new user → profile auto-created
- [ ] Complete profile → is_onboarded = true
- [ ] All 6 engines return correct verdict shape
- [ ] Currency conversion: USD purchase on INR profile
- [ ] Goals: create, edit, delete
- [ ] History: filter, search, delete, rerun
- [ ] Mobile: bottom nav works, forms usable
- [ ] Profile salary_day: affects Buy Now vs Wait output

---

## Future roadmap

| Feature | Priority |
|---|---|
| Scenario compare ("what if I saved 10% more") | High |
| Monthly spending projection chart | High |
| PWA install support | Medium |
| Guest mode (no signup) | Medium |
| Decision memory ("You checked this 30 days ago, now 18% safer") | Medium |
| Native app via React Native | Low |
| Bank sync | V3+ |
