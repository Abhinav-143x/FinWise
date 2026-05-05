# FinWise — Developer Reference

Single source of truth for anyone building on or maintaining FinWise.
Covers architecture, data flow, every module, all APIs, and how to extend the system.

**Current version: V3.0**

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Repository layout](#2-repository-layout)
3. [Data flow — end to end](#3-data-flow--end-to-end)
4. [Backend modules](#4-backend-modules)
5. [Engine system — how it works](#5-engine-system--how-it-works)
6. [Frontend modules](#6-frontend-modules)
7. [Database schema](#7-database-schema)
8. [Full API reference](#8-full-api-reference)
9. [Auth system](#9-auth-system)
10. [Currency service](#10-currency-service)
11. [Decision memory](#11-decision-memory)
12. [Scenario system](#12-scenario-system)
13. [Projection system](#13-projection-system)
14. [Guest mode](#14-guest-mode)
15. [Email verification](#15-email-verification)
16. [Rate limiting](#16-rate-limiting)
17. [Environment variables](#17-environment-variables)
18. [Local setup](#18-local-setup)
19. [Testing](#19-testing)
20. [Adding a new engine](#20-adding-a-new-engine)
21. [Common pitfalls](#21-common-pitfalls)

---

## 1. Architecture overview

```
Browser / Mobile (PWA installable)
       │
       │  HTTPS  Bearer token
       ▼
┌────────────────────────────────────────┐
│  React 18 + Vite  (Vercel)             │
│  Zustand auth store                    │
│  useProfile hook (module-level cache)  │
│  6 engine pages + guest + share        │
│  ScenarioPanel, ProjectionChart        │
└──────────────┬─────────────────────────┘
               │  REST JSON
               ▼
┌────────────────────────────────────────┐
│  Django 5 + DRF  (Render / Railway)    │
│  JWT auth — SimpleJWT                  │
│  6 engine views + scenario + project.  │
│  Guest views (no auth, rate-limited)   │
│  Share views (public token lookup)     │
│  Email verification service           │
│  Decision memory + insights            │
│  Currency service (module cache)       │
└──────────────┬─────────────────────────┘
               │  psycopg2
               ▼
┌────────────────────────────────────────┐
│  PostgreSQL 16                         │
│  users / profiles / goals / decisions  │
│  JSONB for engine input + output       │
└──────────────┬─────────────────────────┘
               │  urllib  5s timeout
               ▼
    open.er-api.com  (live FX rates)
    Fallback: hardcoded rates in currency.py
```

Key design invariants:
- **Engines are pure functions.** No DB, no HTTP inside any engine file.
- **Profile is the financial source of truth.** Engines never ask users for finances.
- **Scenarios are ephemeral.** `scenario.py` re-runs engines without writing to DB.
- **JSONB for all engine I/O.** New engines need no migrations.
- **UUID primary keys everywhere.** `share_token` is a separate short token, not the PK.

---

## 2. Repository layout

```
finwise/
├── README.md              Public product overview
├── DEV_README.md          This file
├── CLAUDE.md              AI context + full version history
├── DECISION_TREE.md       Why every design decision was made
├── DEPLOYMENT.md          Full deploy guide (local + production)
├── V3_PLAN.md             Next version feature plan
├── docker-compose.yml     Full stack local dev with healthchecks
├── .env                   Root env (docker-compose reads this)
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── config/
│   │   ├── settings.py        Django settings + email config + throttle rates
│   │   ├── urls.py            Root URLs: /health/ + /api/v1/
│   │   ├── api_urls.py        /api/v1/ sub-routes (incl. /guest/)
│   │   └── wsgi.py
│   └── apps/
│       ├── common/
│       │   ├── currency.py    FX service (module cache + fallback)
│       │   ├── exceptions.py  Normalised error response shape
│       │   ├── health.py      GET /health/ — no auth, used by Docker
│       │   ├── signals.py     Auto-create Profile on User register
│       │   ├── throttles.py   AuthThrottle / GuestThrottle / StandardUserThrottle
│       │   ├── views.py       Currency rates + convert endpoints
│       │   └── urls.py
│       ├── users/
│       │   ├── models.py            Custom User (UUID PK, email auth, soft delete,
│       │   │                        is_email_verified, email_verify_token)
│       │   ├── serializers.py       Register, UserRead (incl. is_email_verified)
│       │   ├── views.py             Register, Login, Me, Logout, Delete,
│       │   │                        VerifyEmail, ResendVerification
│       │   ├── email_service.py     Token gen, send_verification_email, expiry check
│       │   ├── urls.py
│       │   └── management/
│       │       └── commands/
│       │           └── purge_deleted_users.py   GDPR permanent delete job
│       ├── profiles/
│       │   ├── models.py      Profile (1:1 User, salary_day, days_to_next_salary())
│       │   ├── serializers.py Cross-field validation (expenses + EMI < income)
│       │   ├── projection.py  compute_projection() — savings forecast pure function
│       │   └── views.py       GET/PATCH profile + GET projection/
│       ├── goals/
│       │   ├── models.py      Goal (target, current, monthly_contribution, is_active)
│       │   ├── serializers.py Goal read/write + computed fields
│       │   └── views.py       List/Create/Update/SoftDelete
│       └── decisions/
│           ├── models.py          Decision (engine_type, item_name, share_token,
│           │                      input_data JSONB, result_data JSONB)
│           ├── serializers.py     Thin input serialisers (_PurchaseBase)
│           ├── views.py           6 engine views + scenario + history +
│           │                      export + insights + share views
│           ├── guest_views.py     GuestAffordabilityView + GuestBuyNowWaitView
│           │                      (AllowAny, GuestThrottle, no DB writes)
│           ├── guest_urls.py      /api/v1/guest/ routes
│           ├── urls.py
│           ├── memory.py          get_memory() — prior check comparison
│           ├── insights.py        compute_insights() — aggregate history stats
│           ├── scenario.py        run_scenario() — ephemeral "what if" re-runs
│           └── engines/
│               ├── __init__.py            ENGINE_REGISTRY
│               ├── affordability.py       Can I Afford This?
│               ├── buy_now_wait.py        Buy Now or Wait?
│               ├── goal_impact.py         Goal Impact
│               ├── safe_spend.py          Safe to Spend
│               ├── dream_planner.py       Dream Purchase Planner
│               └── emergency_recovery.py  Emergency Recovery
│
└── frontend/
    ├── index.html          PWA meta, viewport-fit, SW registration
    ├── vite.config.js      Dev proxy /api → localhost:8000
    ├── tailwind.config.js  darkMode: "class", custom color tokens
    ├── public/
    │   ├── manifest.json   PWA install manifest
    │   └── sw.js           Service worker — app shell cache, API always network
    └── src/
        ├── main.jsx        React root, BrowserRouter, Toaster config
        ├── App.jsx         All routes (public + protected + guest + share)
        ├── index.css       Tailwind layers + all keyframes + dark variants
        ├── lib/
        │   └── api.js          Axios + JWT inject + 401 auto-refresh queue
        ├── store/
        │   └── authStore.js    Zustand: user, tokens, login/logout/register
        ├── hooks/
        │   ├── useProfile.js   Module-level profile + FX cache, invalidation
        │   └── useTheme.js     Dark/light toggle persisted to localStorage
        ├── components/
        │   ├── layout/
        │   │   ├── AppLayout.jsx        Sidebar, mobile bottom nav, dark toggle,
        │   │   │                        profile incomplete badge
        │   │   └── AuthGuard.jsx        Redirect unauthenticated to /login
        │   └── ui/
        │       ├── index.jsx            VerdictBadge, MemoryBadge, ResultCard,
        │       │                        FormField, PageHeader, EmptyState,
        │       │                        LoadingSpinner, SkeletonCard, InsightsCard,
        │       │                        ShareButton
        │       ├── CurrencySelect.jsx   Dropdown + formatCurrency + getCurrencySymbol
        │       ├── ProfileSetupBanner.jsx  Shown on engine pages when not onboarded
        │       ├── ScenarioPanel.jsx    "What if" chips + side-by-side comparison
        │       ├── ProjectionChart.jsx  Recharts savings forecast (6/12mo toggle)
        │       └── VerificationBanner.jsx  Email verify prompt on dashboard
        └── pages/
            ├── LandingPage.jsx        Marketing page with live verdict demos
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── GuestDecisionPage.jsx  /try + /try/timing — no auth, form + GuestPrompt
            ├── SharedResultPage.jsx   /share/:token — public sanitised result view
            ├── VerifyEmailPage.jsx    /verify-email?token= — token verification
            ├── DashboardPage.jsx      Finance snapshot + 6 quick actions +
            │                          InsightsCard + ProjectionChart + goals + history
            ├── ProfilePage.jsx        Financial baseline + salary_day + live disposable
            ├── GoalsPage.jsx          Grid cards + edit modal + progress bars + ETA
            ├── HistoryPage.jsx        Search + filter + delete + rerun + CSV export
            └── decisions/
                ├── AffordabilityPage.jsx
                ├── BuyNowWaitPage.jsx     (timing hero card)
                ├── GoalImpactPage.jsx     (goal chips + GoalImpactBreakdown)
                ├── SafeSpendPage.jsx      (one-button + ProjectionChart below result)
                ├── DreamPlannerPage.jsx   (quick-pick chips + MilestoneTimeline)
                └── EmergencyRecoveryPage.jsx  (expense type chips + recovery plan)
```

---

## 3. Data flow — end to end

Complete trace for `POST /api/v1/decisions/affordability/`:

```
1. USER types ₹45,000 into AffordabilityPage.jsx
   → zod schema validates: purchase_amount > 0
   → state: result=null, submitting=true

2. FRONTEND sends POST /api/v1/decisions/affordability/
   body: { purchase_amount: 45000, purchase_currency: "INR", item_name: "iPhone" }
   header: Authorization: Bearer <access_token>
   (api.js interceptor attaches token)

3. BACKEND request pipeline:
   a. SimpleJWT middleware verifies access token
   b. AffordabilityView.post() called
   c. AffordabilityInputSerializer validates body
   d. _require_profile(user) — loads Profile, raises 400 if not onboarded
   e. _to_profile_currency(45000, "INR", profile)
      → CurrencyService.convert() — checks module cache, fetches if stale
      → returns amount in profile.default_currency
   f. AffordabilityInput dataclass built from profile fields
      (monthly_income, fixed_expenses, current_savings, monthly_emi from DB)
   g. run(inp) executes pure engine — zero DB access
   h. _save() writes Decision row with JSONB result_data
   i. get_memory(user, "affordability", "iPhone", result.metrics)
      → queries Decision for prior "iPhone" check
      → computes savings_used_pct change, builds summary string
   j. _resp() builds full response dict including memory

4. FRONTEND receives response
   → setResult(data), setSubmitting(false)
   → ResultCard renders: MemoryBadge → verdict hero → MetricsRow → Why → Next Move
   → if CAUTION/RISKY: ScenarioPanel renders below with 4 chips
   → ShareButton rendered (copies /share/<token> URL on click)
   → smooth scroll to #result-anchor
```

Scenario flow (`POST /api/v1/decisions/scenario/`):
```
1. User clicks "Save 10% more" chip in ScenarioPanel
2. POST { decision_id, scenario_type: "save_more_10" }
3. ScenarioView loads original Decision, calls run_scenario()
4. run_scenario() modifies inputs (adds 10% income as extra expenses),
   re-runs same engine twice (original + modified), computes diff dict
5. NO Decision row written
6. Response: { original, modified, diff, verdict_improved, scenario meta }
7. ScenarioComparison renders side-by-side verdict cards + metrics diff chips
```

---

## 4. Backend modules

### `apps/common/currency.py`
Module-level `_cache` dict. `get_rates()` always returns, never raises.
Resolution: TTL check (3600s) → fetch open.er-api.com → stale-while-revalidate → hardcoded fallback.
All rates relative to USD. Cross-rate: `amount / from_rate * to_rate`.

### `apps/common/throttles.py`
Three DRF throttle classes:
- `AuthThrottle` (AnonRateThrottle, scope: "auth") — register/login: 10/hour
- `GuestThrottle` (AnonRateThrottle, scope: "guest") — guest engines: 5/hour per IP
- `StandardUserThrottle` (UserRateThrottle, scope: "user") — normal use: 200/minute

Applied globally in DRF settings. `AuthThrottle` applied explicitly to `RegisterView`.

### `apps/common/exceptions.py`
Custom DRF exception handler. All errors normalised to:
```json
{ "error": { "code": 400, "message": "...", "details": {...} } }
```

### `apps/users/email_service.py`
`generate_verify_token(user)` — creates UUID4 token, saves to user, returns token.
`send_verification_email(user, request)` — renders HTML + text email, calls `send_mail()`.
`is_token_expired(user)` — True if `email_verify_sent_at` is older than 48 hours.
In dev: `EMAIL_BACKEND = console` — emails print to terminal instead of sending.

### `apps/users/management/commands/purge_deleted_users.py`
`python manage.py purge_deleted_users [--days 30] [--dry-run]`
Queries `User.objects.filter(deleted_at__lte=cutoff)`, hard-deletes. CASCADE removes Profile, Goals, Decisions.
Run daily via Render/Railway scheduler or cron.

### `apps/profiles/projection.py`
`compute_projection(current_savings, monthly_income, fixed_expenses, monthly_emi, total_goal_contributions, months, impact_amount, currency) → dict`
Pure function. Computes `net_save = disposable - goal_contributions` per month.
Optional `impact_amount` subtracts a purchase from starting savings → second track.
Returns: `base_track[]`, `impact_track[]`, `milestones{}`, `months_to_emergency`.

### `apps/decisions/scenario.py`
`run_scenario(scenario_type, engine_type, original_input_data, profile, goals_qs) → dict`
Pure: no DB writes. Modifies base inputs per scenario type, calls the engine twice.
Supported scenarios: `save_more_10`, `wait_salary`, `savings_20pct`, `cut_expenses_10`.
Supported engine types: `affordability`, `buy_now_wait`, `goal_impact`, `safe_spend`.
Returns: `{ scenario, original, modified, diff, verdict_improved, currency }`.

### `apps/decisions/memory.py`
`get_memory(user, engine_type, item_name, current_metrics) → dict | None`
Returns None if: item_name empty, no prior check, or prior check is today.
Compares `savings_used_pct` from prior vs current metrics. ≥3% change = meaningful.

### `apps/decisions/insights.py`
`compute_insights(user) → dict`
Returns `enough_data: False` if fewer than 3 decisions.
Aggregates: verdict breakdown, top engine, top item, active streak (consecutive days).

### `apps/decisions/guest_views.py`
`GuestAffordabilityView` and `GuestBuyNowWaitView`.
`AllowAny` permission + `GuestThrottle`. Require all financial fields in body.
Validate: expenses + EMIs < income. No DB writes. Returns engine result + `"guest": True`.

---

## 5. Engine system — how it works

Every engine is a pure function:

```python
ENGINE_VERSION = 1

@dataclass
class MyInput:
    field: Decimal
    def __post_init__(self):
        self.field = Decimal(str(self.field))   # always coerce

@dataclass
class MyResult:
    verdict: str            # "SAFE" | "CAUTION" | "RISKY"
    recommendation: str     # one sentence, non-judgmental
    reasons: list[str]      # 2-3 specific facts
    better_moves: list[str] # 1-2 concrete next actions
    metrics: dict           # raw numbers for MetricsRow UI component
    version: int = ENGINE_VERSION
    # engine-specific extras added as needed

def run(inp: MyInput) -> MyResult:
    # deterministic — same input always produces same output
    # no DB, no HTTP, no side effects
    ...
```

Registered in `engines/__init__.py`:
```python
ENGINE_REGISTRY = {
    "affordability": {"run": run_affordability, "version": V_AFFORD},
    ...
}
```

**Scenario compatibility:** Scenarios call the engine's `run()` function directly with modified inputs. When you bump `ENGINE_VERSION`, the new algorithm applies to scenario re-runs too. Prior Decision rows keep their old `version` number for auditability.

### Thresholds quick reference

| Engine | SAFE | CAUTION | RISKY |
|---|---|---|---|
| Affordability | savings_used ≤30%, income ≤25%, emergency ≥3mo | any one moderate signal | savings_used >55% or any risky signal |
| Buy Now or Wait | savings <20%, income <25%, buffer >1.5mo | salary ≤14d away or save ≤45d | disposable ≤0 or months >3 |
| Safe to Spend | safe_pct ≥20% of income | safe_pct 5–20% | safe_pct <5% or disposable ≤0 |
| Dream Planner | months ≤2 | months ≤5 | months >5 |
| Emergency | emergency ≥3mo (healthy) | emergency 1–3mo (thin) | emergency <1mo (depleted) |

---

## 6. Frontend modules

### `src/lib/api.js`
Axios instance. Request interceptor: reads `localStorage.access_token`, attaches Bearer header.
Response interceptor on 401: queues failed requests (flag prevents duplicates), calls `/auth/token/refresh/`, replays queue, on failure clears tokens + redirects `/login`.

### `src/hooks/useProfile.js`
Module-level `_profileCache` and `_ratesCache`. One fetch per session regardless of how many components call `useProfile()`. `_fetching` flag prevents duplicate requests on simultaneous mounts. `invalidateProfileCache()` must be called after every profile PATCH.
Returns: `{ profile, currency, needsSetup, isReady, loading, refresh }`.

### `src/hooks/useTheme.js`
Reads `localStorage["fw-theme"]` on mount, falls back to `prefers-color-scheme`. Toggles `dark` class on `<html>`.

### Key components

| Component | File | Purpose |
|---|---|---|
| `ResultCard` | `ui/index.jsx` | Universal result: MemoryBadge → verdict hero → MetricsRow → goalImpacts → reasons → next move → ShareButton → ScenarioPanel |
| `ScenarioPanel` | `ui/ScenarioPanel.jsx` | 4 "what if" chips, fetches scenario, shows `ScenarioComparison` side-by-side |
| `ProjectionChart` | `ui/ProjectionChart.jsx` | Recharts line chart, 6/12mo toggle, optional purchase impact line |
| `MemoryBadge` | `ui/index.jsx` | Prior check summary with ↑/↓/~ indicator |
| `ShareButton` | `ui/index.jsx` | Calls `/decisions/<id>/share/`, copies URL to clipboard |
| `InsightsCard` | `ui/index.jsx` | Safe rate %, top tool, streak — shown after 3+ decisions |
| `SkeletonCard` | `ui/index.jsx` | Shimmer loading placeholder (animate-shimmer keyframe) |
| `VerificationBanner` | `ui/VerificationBanner.jsx` | Email verify prompt with Resend button |
| `GuestPrompt` | Inside `GuestDecisionPage.jsx` | Post-result CTA to create account |

### Public routes (no auth guard)

```
/              LandingPage
/login         LoginPage
/register      RegisterPage
/try           GuestDecisionPage (affordability variant)
/try/timing    GuestDecisionPage (buy-now-wait variant)
/share/:token  SharedResultPage
/verify-email  VerifyEmailPage
```

---

## 7. Database schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | varchar(254) | Unique, indexed |
| password | varchar | PBKDF2 hashed |
| is_active | bool | False = disabled (soft delete) |
| is_staff | bool | Admin access |
| deleted_at | timestamp | Soft delete timestamp |
| is_email_verified | bool | Set True by VerifyEmailView |
| email_verify_token | varchar(36) | UUID4, cleared after verify |
| email_verify_sent_at | timestamp | For 48hr expiry + 1hr resend throttle |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID FK | → users.id CASCADE |
| monthly_income | decimal(14,2) | After-tax take-home |
| fixed_expenses | decimal(14,2) | Rent + bills + subscriptions |
| current_savings | decimal(14,2) | Total liquid savings |
| monthly_emi | decimal(14,2) | Loan repayments |
| default_currency | char(3) | e.g. "INR" |
| country | char(10) | e.g. "IN" |
| salary_day | int 1–31 | Nullable. Used by Buy Now or Wait + projection. |
| is_onboarded | bool | True once income > 0 saved |
| created_at / updated_at | timestamp | Auto |

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID FK | → users.id CASCADE |
| name | varchar(200) | |
| target_amount | decimal(14,2) | |
| current_amount | decimal(14,2) | |
| monthly_contribution | decimal(14,2) | Used in Safe to Spend + Projection |
| currency | char(3) | |
| is_active | bool | False = soft deleted |
| created_at / updated_at | timestamp | Auto |

### `decisions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID FK | → users.id CASCADE |
| engine_type | varchar(25) | One of 6 engine types |
| item_name | varchar(200) | Optional. Used by memory + share label. |
| share_token | varchar(12) | Short URL-safe token. Blank until shared. |
| input_data | JSONB | Raw inputs passed to engine |
| result_data | JSONB | Full engine output |
| verdict | varchar(10) | SAFE / CAUTION / RISKY |
| currency | char(3) | Profile currency at decision time |
| version | smallint | Engine algorithm version |
| created_at | timestamp | Indexed, ordered DESC |

`result_data` structure (all engines):
```json
{
  "verdict": "CAUTION",
  "recommendation": "Possible now. Safer after next salary.",
  "reasons": ["Uses 47% of savings", "Leaves 1.4 months emergency cover"],
  "better_moves": ["Wait 8 days for salary — much safer position"],
  "metrics": {
    "savings_used_pct": 47.0,
    "income_ratio_pct": 18.0,
    "emergency_months_after": 1.4,
    "months_to_save": 0.8,
    "monthly_disposable": 2800.0
  }
}
```

Engine-specific extras in `result_data`:
- `buy_now_wait`: adds `timing`, `timing_label`
- `dream_planner`: adds `months_to_goal`, `already_affordable`, `amount_still_needed`, `suggested_monthly_save`, `milestones[]`
- `emergency_recovery`: adds `savings_after`, `recovery_months`, `goal_delay_days`, `cushion_status`, `recovery_plan[]`
- `safe_spend`: adds `safe_amount`

---

## 8. Full API reference

All under `/api/v1/` except `/health/`.
Authenticated routes require `Authorization: Bearer <access_token>`.

### Auth
```
POST /api/v1/auth/register/
  Throttle: AuthThrottle (10/hour anon)
  Body: { email, password, password_confirm }
  Returns: { user: {id, email, is_email_verified}, tokens: {access, refresh} }
  Side effects: Profile auto-created by signal. Verification email sent (non-blocking).

POST /api/v1/auth/login/           Body: { email, password }  → { access, refresh }
POST /api/v1/auth/token/refresh/   Body: { refresh }          → { access }
GET  /api/v1/auth/me/              → { id, email, is_email_verified, created_at }
POST /api/v1/auth/logout/          Body: { refresh }          → blacklists token
POST /api/v1/auth/delete-account/  Body: { password }         → soft deletes user

POST /api/v1/auth/verify-email/
  AllowAny. Body: { token }
  Marks is_email_verified=True, clears token. 400 if expired or invalid.

POST /api/v1/auth/resend-verification/
  Auth required. Rate-limited: 1 email per hour per user.
```

### Profile
```
GET   /api/v1/profile/
  Returns: { monthly_income, fixed_expenses, current_savings, monthly_emi,
             default_currency, country, salary_day, is_onboarded,
             monthly_disposable, emergency_fund_months, updated_at }

PATCH /api/v1/profile/
  Validation: expenses + EMIs < income (cross-field). is_onboarded auto-set when income > 0.

GET   /api/v1/profile/projection/
  Auth required. is_onboarded required.
  Query: months=6 (1–24), impact_decision_id=<uuid>
  Returns: { base_track[], impact_track[], milestones{}, months_to_emergency,
             monthly_net_save, has_impact_comparison, currency }
```

### Goals
```
GET    /api/v1/goals/          Paginated list (is_active=True only)
POST   /api/v1/goals/          Body: { name, target_amount, current_amount, monthly_contribution, currency }
GET    /api/v1/goals/<uuid>/
PATCH  /api/v1/goals/<uuid>/
DELETE /api/v1/goals/<uuid>/   Soft delete — sets is_active=False

Response includes: remaining_amount, progress_percent, months_to_complete
```

### Decision engines (authenticated, profile required)
```
POST /api/v1/decisions/affordability/
POST /api/v1/decisions/buy-now-wait/
POST /api/v1/decisions/goal-impact/
  Body: { purchase_amount, purchase_currency?, item_name? }

POST /api/v1/decisions/safe-spend/
  Body: {}

POST /api/v1/decisions/dream-planner/
  Body: { item_name, target_price, purchase_currency?, extra_monthly_save? }

POST /api/v1/decisions/emergency-recovery/
  Body: { expense_amount, expense_label?, expense_currency? }
```

Standard engine response:
```json
{
  "decision_id": "uuid",
  "verdict": "CAUTION",
  "recommendation": "...",
  "reasons": ["..."],
  "better_moves": ["..."],
  "metrics": { "savings_used_pct": 47.0, ... },
  "currency": "INR",
  "memory": {
    "days_ago": 22,
    "previous_verdict": "RISKY",
    "change_label": "better",
    "summary": "You checked this 22 days ago. Position improved by 18%."
  }
}
```

### Scenario (authenticated)
```
GET  /api/v1/decisions/scenarios/
  Returns list of available scenario types with labels + icons.

POST /api/v1/decisions/scenario/
  Body: { decision_id, scenario_type }
  scenario_type: save_more_10 | wait_salary | savings_20pct | cut_expenses_10
  Supported engine_types: affordability | buy_now_wait | goal_impact | safe_spend
  Does NOT save a Decision row. Returns:
  { scenario{type,label,icon}, original{...}, modified{...}, diff{}, verdict_improved, currency }
```

### Decision history (authenticated)
```
GET    /api/v1/decisions/history/      ?engine= &search= &page=
GET    /api/v1/decisions/<uuid>/       Full detail
DELETE /api/v1/decisions/<uuid>/       Hard delete (user's own only)
GET    /api/v1/decisions/insights/     Aggregate stats (requires 3+ decisions)
GET    /api/v1/decisions/export/       Streaming CSV — all user decisions
```

### Sharing
```
POST /api/v1/decisions/<uuid>/share/
  Auth required. Generates share_token (idempotent — returns same token if exists).
  Returns: { share_token, share_url }

GET  /api/v1/decisions/share/<token>/
  AllowAny. Sanitised result — no exact amounts, percentages only.
  Returns: { engine_type, verdict, recommendation, reasons, better_moves,
             timing_label?, metrics{pct/months only}, currency, created_at, engine_label }
```

### Guest engines (no auth, rate-limited)
```
POST /api/v1/guest/affordability/
POST /api/v1/guest/buy-now-wait/
  AllowAny. GuestThrottle: 5/hour per IP.
  Body: { purchase_amount, monthly_income, fixed_expenses, current_savings,
          monthly_emi?, currency?, purchase_currency? }
  Validation: expenses + EMIs < income.
  Returns: engine result + { "guest": true }. Nothing saved to DB.
```

### Currency
```
GET  /api/v1/currency/rates/
  Returns: { base: "USD", rates: {...}, meta: { source, age_seconds, currencies[] } }

POST /api/v1/currency/convert/
  Body: { amount, from_currency, to_currency }
  Returns: { amount, from_currency, to_currency, converted }
```

### Health
```
GET /health/
  AllowAny. No versioning prefix.
  Returns: { status: "ok"|"degraded", db: { connected, latency_ms }, version: "3.0" }
  HTTP 200 OK or 503 Degraded.
  Used by Docker healthcheck + load balancers.
```

---

## 9. Auth system

**Tokens:** SimpleJWT. Access: 60min TTL. Refresh: 7-day TTL, rotates on use.
**Storage:** `localStorage` (access_token, refresh_token).
**Auto-refresh:** 401 → queue requests → POST `/token/refresh/` → replay. Failure → clear + `/login`.
**Soft delete:** `is_active=False` fails JWT auth immediately. `deleted_at` used by purge job.
**Email verification:** Non-blocking. `is_email_verified` exposed in `/auth/me/` response.
**Resend throttle:** 1 email per hour enforced in view logic (not DRF throttle).

---

## 10. Currency service

File: `backend/apps/common/currency.py`

Module-level `_cache = { rates, fetched_at, source }`. Resolution:
1. Cache age < 3600s → return cached
2. Stale → fetch `open.er-api.com/v6/latest/USD` (5s timeout, User-Agent header)
3. Fetch success → update cache
4. Fetch fails + cache exists → return stale (stale-while-revalidate)
5. Fetch fails + no cache → load `FALLBACK_RATES_USD`, source="fallback"

Cross-rate conversion: `amount / from_rate * to_rate` (all rates vs USD).
Used in: engine views (purchase conversion), guest views, `/currency/convert/` endpoint.

---

## 11. Decision memory

File: `backend/apps/decisions/memory.py`

```python
get_memory(user, engine_type, item_name, current_metrics) → dict | None
```

Query: `Decision.objects.filter(user=user, engine_type=engine_type, item_name__iexact=item_name).order_by("-created_at").first()`

Returns None if: item_name empty, no prior check, or prior check is today.
Compares `savings_used_pct` in prior vs current metrics. ≥3% change = meaningful.
`change_label`: "better" (negative delta), "worse" (positive delta), "same" (<3%).

---

## 12. Scenario system

File: `backend/apps/decisions/scenario.py`

```python
run_scenario(scenario_type, engine_type, original_input_data, profile, goals_qs) → dict
```

Pure: no DB queries, no writes. Used by `ScenarioView` only.

Scenario modifiers (applied to base profile inputs before re-running engine):
| Scenario | Modification |
|---|---|
| `save_more_10` | `fixed_expenses += monthly_income × 10%` (simulates saving 10% more) |
| `wait_salary` | `days_to_next_salary=14` (forces timing engine to see salary soon) |
| `savings_20pct` | `current_savings × 1.20` |
| `cut_expenses_10` | `fixed_expenses × 0.90` |

`verdict_improved = True` when RISKY→CAUTION, RISKY→SAFE, or CAUTION→SAFE.

Frontend: `ScenarioPanel.jsx` renders 4 chip buttons. Clicking one POSTs to `/decisions/scenario/`, renders `ScenarioComparison` with original vs modified side-by-side.

---

## 13. Projection system

File: `backend/apps/profiles/projection.py`

```python
compute_projection(current_savings, monthly_income, fixed_expenses, monthly_emi,
                   total_goal_contributions, months=12, impact_amount=0, currency) → dict
```

`net_save = disposable - total_goal_contributions` accumulated monthly.
`impact_track`: if `impact_amount > 0`, computes second track starting `impact_amount` lower.
`months_to_emergency`: first month where savings reach 3× monthly_costs.

Endpoint: `GET /api/v1/profile/projection/?months=6&impact_decision_id=<uuid>`
Frontend: `ProjectionChart.jsx` — uses Recharts `LineChart`, 6/12mo toggle, shows both tracks if `has_impact_comparison=True`.
Placed on: Dashboard (always visible when onboarded), SafeSpendPage (below result).

---

## 14. Guest mode

Files: `apps/decisions/guest_views.py`, `apps/decisions/guest_urls.py`
Frontend: `src/pages/GuestDecisionPage.jsx`

Constraints:
- Only 2 engines: Affordability and Buy Now or Wait (others need goals/profile)
- `AllowAny` + `GuestThrottle` (5/hour per IP)
- All financial fields required in body — no profile lookup
- Cross-field validation: expenses + EMIs < income
- No Decision row written
- Returns engine result with `"guest": true`

Public routes: `/try` (Afford), `/try/timing` (Buy Now or Wait)
Post-result: `GuestPrompt` component → Register / Sign in CTAs
Landing page: "Try without signing up" button links to `/try`

---

## 15. Email verification

Files: `apps/users/email_service.py`, `apps/users/views.py` (VerifyEmailView, ResendVerificationView)
Frontend: `src/pages/VerifyEmailPage.jsx`, `src/components/ui/VerificationBanner.jsx`

Flow:
1. Register → `send_verification_email()` called in try/except (non-blocking)
2. Email contains link: `{FRONTEND_URL}/verify-email?token={uuid4}`
3. Frontend `VerifyEmailPage` calls `POST /auth/verify-email/ { token }`
4. View: checks token exists + not expired (48hr) → sets `is_email_verified=True`, clears token
5. Dashboard shows `VerificationBanner` while `user.is_email_verified === false`
6. Resend: `POST /auth/resend-verification/` — enforces 1hr cooldown in view logic

Dev mode: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` — emails print to terminal.
Production: set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` + SMTP credentials.

---

## 16. Rate limiting

File: `apps/common/throttles.py`

| Class | Parent | Scope | Default rate | Applied to |
|---|---|---|---|---|
| `AuthThrottle` | AnonRateThrottle | "auth" | 10/hour | RegisterView explicitly; login via SimpleJWT default |
| `GuestThrottle` | AnonRateThrottle | "guest" | 5/hour | GuestAffordabilityView, GuestBuyNowWaitView |
| `StandardUserThrottle` | UserRateThrottle | "user" | 200/minute | All authenticated endpoints (global default) |

Rates defined in `DEFAULT_THROTTLE_RATES` in DRF settings.
Override per-view with `throttle_classes = [MyThrottle]`.

---

## 17. Environment variables

### Backend (`backend/.env`)
| Variable | Required | Default | Notes |
|---|---|---|---|
| `SECRET_KEY` | Yes | weak dev default | 50+ random chars in production |
| `DEBUG` | No | True | Set False in production |
| `DB_NAME/USER/PASSWORD/HOST/PORT` | Yes | finwise/postgres/postgres/localhost/5432 | |
| `CORS_ALLOWED_ORIGINS` | Yes | localhost:3000 | Comma-separated |
| `ALLOWED_HOSTS` | Yes | * | Comma-separated |
| `EMAIL_BACKEND` | No | console | Set smtp for production |
| `EMAIL_HOST` | No | smtp.sendgrid.net | |
| `EMAIL_PORT` | No | 587 | |
| `EMAIL_USE_TLS` | No | True | |
| `EMAIL_HOST_USER` | No | "" | SMTP username |
| `EMAIL_HOST_PASSWORD` | No | "" | SMTP password / API key |
| `DEFAULT_FROM_EMAIL` | No | noreply@finwise.app | |
| `FRONTEND_URL` | No | http://localhost:3000 | Used in verification email links |

### Frontend (`frontend/.env.local`)
| Variable | Required | Default |
|---|---|---|
| `VITE_API_URL` | Yes | http://localhost:8000/api/v1 |

---

## 18. Local setup

### Docker (recommended)
```bash
git clone <repo> finwise && cd finwise
cp backend/.env.example backend/.env
docker compose up --build
# → http://localhost:3000
```

### Migration reset
```bash
docker compose down -v

# Mac/Linux
find backend/apps -path "*/migrations/*.py" -not -name "__init__.py" -delete

# Windows PowerShell
Get-ChildItem -Path backend/apps -Recurse -Filter "*.py" |
  Where-Object { $_.DirectoryName -match "migrations" -and $_.Name -ne "__init__.py" } |
  Remove-Item

docker compose run --rm backend python manage.py makemigrations users
docker compose run --rm backend python manage.py makemigrations profiles goals decisions
docker compose run --rm backend python manage.py migrate
docker compose up --build
```

V3.0 adds 3 new migrations:
- `users`: `is_email_verified`, `email_verify_token`, `email_verify_sent_at`
- `decisions`: `share_token`

### Without Docker
```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit DB credentials
python manage.py migrate && python manage.py runserver

# Frontend
cd frontend && npm install
cp .env.example .env.local
npm run dev
```

---

## 19. Testing

```bash
docker compose run --rm backend python manage.py test
docker compose run --rm backend python manage.py test apps.decisions.tests    # engine unit tests
docker compose run --rm backend python manage.py test apps.decisions.test_api  # integration tests
```

### V3.0 manual QA additions

- [ ] Guest: `/try` loads without auth, form submits, result shown, GuestPrompt appears
- [ ] Guest: `/try/timing` shows Buy Now or Wait variant
- [ ] Guest throttle: 6th request in an hour returns 429
- [ ] Share: click ShareButton → toast "Link copied" → open `/share/<token>` → result shown
- [ ] Share: shared page shows percentages, no exact income/savings amounts
- [ ] Scenario: CAUTION result shows ScenarioPanel below Next Move
- [ ] Scenario: click "Save 10% more" → side-by-side comparison renders
- [ ] Scenario: SAFE result — ScenarioPanel does NOT appear
- [ ] Projection: Dashboard shows ProjectionChart when onboarded
- [ ] Projection: 6mo / 12mo toggle works
- [ ] Projection: SafeSpend result shows ProjectionChart below result
- [ ] Email verify: register → check terminal for verify link (console backend)
- [ ] Email verify: open link → VerifyEmailPage shows ✓ success
- [ ] Email verify: VerificationBanner visible on dashboard before verify
- [ ] Email verify: VerificationBanner gone after verify
- [ ] Purge job: `python manage.py purge_deleted_users --dry-run` shows accounts without deleting
- [ ] Rate limit: `/api/v1/auth/register/` 11th attempt in an hour returns 429

---

## 20. Adding a new engine

Follow these 9 steps exactly:

1. Create `backend/apps/decisions/engines/my_engine.py` — Input/Result/run() pattern, set `ENGINE_VERSION = 1`
2. Register in `engines/__init__.py` → `ENGINE_REGISTRY`
3. Add `MY_ENGINE = "my_engine", "Label"` to `EngineType` in `decisions/models.py`
4. Add input serialiser in `decisions/serializers.py` (inherit `_PurchaseBase` or `serializers.Serializer`)
5. Add view in `decisions/views.py` — `_require_profile()`, run engine, `_save()`, `_resp()`
6. Add URL in `decisions/urls.py`
7. Create `frontend/src/pages/decisions/MyEnginePage.jsx` — `useProfile()` guard, form, result below
8. Add route in `frontend/src/App.jsx`
9. Add to `DECIDE_NAV` and `BOTTOM_NAV` in `AppLayout.jsx`

To support scenarios for the new engine, add a case in `scenario.py`'s `_build_and_run()` function.

---

## 21. Common pitfalls

**`relation "profiles" does not exist`**
`apps.common` not in `INSTALLED_APPS`. Must be first in `LOCAL_APPS`.

**Scenarios returning 400 "Scenarios not supported for this engine type"**
Add the engine_type to the supported list in `ScenarioView.post()` and implement a case in `scenario.py`'s `_build_and_run()`.

**Projection chart not showing**
Profile not onboarded (`is_onboarded=False`). `/profile/projection/` returns 400 if not onboarded.

**Verification email not arriving in dev**
`EMAIL_BACKEND` defaults to `console` — check the terminal where `docker compose logs backend` is running.

**Share token not generated**
`POST /decisions/<id>/share/` must be called first. `share_token` is blank by default.

**Guest throttle hitting too early**
5/hour is per IP. In local dev, all requests come from the same IP. Use `--dry-run` logic or temporarily bump `guest` rate in settings during development.

**`expenses + EMIs must be less than income`**
Cross-field validation in `ProfileSerializer.validate()` and `_GuestFinanceBase.validate()`. Intentional — negative disposable income makes every engine output meaningless.

**Memory badge never appears**
`item_name` must be non-empty on both checks, matching case-insensitively, from the same engine type.

**Dark mode flickers on page load**
`useTheme` reads localStorage synchronously in `useState` initialiser. If flickering persists add a `<script>` block in `index.html` before the React root to apply the `dark` class before paint.

**`port 5432 already in use`**
Local PostgreSQL running. Stop it or change port in `docker-compose.yml`.
