# CLAUDE.md — AI Context for FinWise

This file exists so that any AI assistant working on this codebase can understand the full
context without reading every source file. Covers: what FinWise is, every version decision,
current state, architecture rules, and how to contribute correctly.

---

## What this product is

FinWise is a **personal money decision assistant** — not a tracker, not a ledger.

The core idea: most finance apps show you what you spent. FinWise tells you what to do before you spend.

**The user's mental model:**
> "I'm about to spend money. Should I? When? What does it delay?"

**The answer is always:**
> SAFE / CAUTION / RISKY + one-line reason + specific next move

---

## Current state (V3.0)

**Six decision engines** (all pure functions in `engines/`):
1. Can I Afford This? — `affordability.py`
2. Buy Now or Wait? — `buy_now_wait.py`
3. Goal Impact — `goal_impact.py`
4. Safe to Spend — `safe_spend.py`
5. Dream Planner — `dream_planner.py`
6. Emergency Recovery — `emergency_recovery.py`

**V3.0 additions:**
- Scenario comparison (`scenario.py`) — "what if" re-runs without DB writes
- Monthly projection (`profiles/projection.py`) — savings forecast with optional purchase impact
- Guest mode (`guest_views.py`) — unauthenticated engines at `/api/v1/guest/`, rate-limited
- Shareable results (`share_token` on Decision, `/api/v1/decisions/share/<token>/`)
- Email verification (`email_service.py`, `is_email_verified` on User)
- Rate limiting (`throttles.py`) — auth: 10/hr, guest: 5/hr, user: 200/min
- Permanent delete job (`management/commands/purge_deleted_users.py`) — GDPR compliance

**Infrastructure (cumulative):**
- React + Django + PostgreSQL
- JWT auth (auto-refresh on 401)
- Multi-currency (live FX + 1hr cache + hardcoded fallback)
- Decision memory (prior check comparison by item_name)
- Insights (aggregate history stats, shown after 3+ decisions)
- Dark mode (class strategy, persisted to localStorage)
- PWA (installable, offline app shell, API calls always network)
- CSV export (`GET /api/v1/decisions/export/`)
- Health endpoint (`GET /health/` — no auth, used by Docker)
- Skeleton loading, MemoryBadge, InsightsCard, ScenarioPanel, ProjectionChart, ShareButton

**What's deliberately not built:**
- Bank sync
- AI chatbot / LLM integration
- Stock/crypto tracking
- Charts for their own sake
- OCR / receipt scanning
- Subscription tracking
- Push notifications (planned V3.1)

---

## Version history and key decisions

### V1 — Foundation
**Built:** Auth, Profile, Affordability engine, basic UI.
**Key decisions:** Engines as pure functions. UUID PKs. Profile auto-created by signal on register.

### V1.5 — Engine-profile coupling
**Built:** All engines auto-load profile. CurrencyService. History delete.
**Key decision:** Users should never re-enter income. Profile is set once. Biggest UX fix.
**Key decision:** Module-level FX cache — not Redis, survives request lifecycle in one worker.

### V2 — UI rebuild
**Built:** Centered single-column layout. Result below form. Mobile bottom nav. Goals edit.
**Key decision:** "Form left / dead box right" was wrong. Vertical flow is correct for mobile.
**Key decision:** `data.results || data` broken for empty arrays — fixed to `"results" in data`.

### V2.2 — New engines
**Built:** Buy Now or Wait, Dream Planner, Emergency Recovery. `item_name` on decisions. `salary_day` on profile.
**Key decision:** Buy Now vs Wait gives a specific date, not just a verdict.
**Key decision:** Emergency reports goal delay in days — more human than months.

### V2.5 — Polish and intelligence
**Built:** Decision Memory, Insights, Dark mode, PWA, CSV export, Health endpoint.
**Key decision:** Memory makes the product compound — gets better with use.
**Key decision:** Health at `/health/` not `/api/v1/health/` — load balancers don't need versioning.

### V3.0 — Compounding
**Built:** Scenario comparison, Monthly projection, Guest mode, Shareable results, Email verification, Rate limiting, Permanent delete.
**Key decision:** Scenarios are ephemeral — not saved as Decision rows. No DB writes.
**Key decision:** Guest mode only offers 2 engines (Afford + Timing) because the other 4 need goals/profile data that doesn't exist for guests.
**Key decision:** Shared results show percentages only, never exact amounts. Privacy protection.
**Key decision:** Email verification is non-blocking — failure doesn't break registration.
**Key decision:** Rate limiting at DRF level, not nginx, so it's testable and portable.

---

## Architecture principles (never violate these)

### 1. Engines are pure functions
No database access inside any engine file. No HTTP calls. No Django models.
Everything is passed in as the Input dataclass. Same input → same output, always.

### 2. Profile is the financial source of truth
Engine views always call `_require_profile(user)` first.
If not onboarded → 400, not silent fallback.
No authenticated engine accepts income/expenses/savings from the user's request body.
(Guest engines are the only exception — they have no profile to load from.)

### 3. Scenarios are ephemeral
`scenario.py` re-runs engines with modified inputs. It never writes a Decision row.
Scenarios are computation-only. This is intentional — users explore, not commit.

### 4. One error response shape
All errors: `{ "error": { "code": N, "message": "...", "details": {...} } }`
Handled by `apps/common/exceptions.py`.

### 5. UUIDs everywhere
All primary keys are UUID4. `share_token` is a separate short token (urlsafe, 8 chars), not the PK.

### 6. Soft deletes + permanent purge
`User.deleted_at` + `is_active=False` for immediate functional death.
`purge_deleted_users` management command permanently removes after 30 days.
`Goal.is_active=False` for soft goal deletion.
Decision records are hard-deleted when user deletes one explicitly.

### 7. JSONB for engine I/O
`input_data` and `result_data` on Decision are JSONB.
New engines add different keys — no migrations needed.
Scenario results and projections are never stored — they're computed on demand.

### 8. Currency conversions happen in views, not engines
Views convert purchase amount to profile currency before building Input.
Engines only ever see amounts in one currency.

### 9. Email verification is non-blocking
`send_verification_email()` is wrapped in try/except in RegisterView.
Registration succeeds even if the email service is down. Tokens are 48 hours.

---

## How to talk to this codebase

**Adding a feature:**
1. Read `DECISION_TREE.md` — the decision may already be documented.
2. For a new engine: follow `DEV_README.md §15` exactly (9 steps).
3. For a new API feature: follow the existing view pattern. Use `_require_profile()`, `_save()`, `_resp()`.
4. No new DB tables for engine data — use JSONB on `result_data`.
5. No new state management — `useProfile` hook and Zustand auth store cover everything.
6. For guest/public endpoints: use `GuestThrottle`, `AllowAny` permission, never write to DB.

**Debugging:**
1. Check `DEV_README.md §16` (Common pitfalls) first.
2. Migrations: `apps.common` must be first in LOCAL_APPS.
3. Scenarios not working: check `engine_type` is one of the 4 supported types.
4. Memory not showing: `item_name` must be non-empty on both checks.
5. Email not sending: check `EMAIL_BACKEND` in settings — dev uses console backend.

**Changing an engine:**
1. Bump `ENGINE_VERSION` in the engine file.
2. Old Decision rows retain their old version number — full auditability.
3. Scenarios re-use the same engine function — bumping version affects scenarios too.
4. Document threshold changes in `DECISION_TREE.md`.

---

## What the product should never become

- A tracker ("here's your spending breakdown")
- A banker ("connect your account")
- A chatbot ("tell me about your finances")
- A social platform ("share with friends" in a feed sense)
- A dashboard with 10 charts

FinWise succeeds when a user can open it, enter a price, get a trustworthy answer in under 30 seconds, and optionally share it. Complexity that slows that down is wrong.

---

## Copy/tone rules

**Never:**
- "Bad purchase"
- "You shouldn't buy this"
- "Irresponsible spending"
- "Warning: risk detected"

**Always:**
- "Possible, but waiting is safer."
- "Your finances support this."
- "Delays your Trip goal by 9 days."
- "Recovery in 2 months."
- "Position improved by 18% since last check."

Verdicts describe the financial situation, not the person.

---

## File map for quick orientation

| I want to... | Go to |
|---|---|
| Understand the product | README.md |
| Understand every design decision | DECISION_TREE.md |
| Set up locally / deploy | DEPLOYMENT.md |
| Plan what comes next | V3_PLAN.md |
| Add a new engine | DEV_README.md §15 |
| Debug a bug | DEV_README.md §16 |
| Understand scenarios | `apps/decisions/scenario.py` + DEV_README.md §4 |
| Understand projections | `apps/profiles/projection.py` + DEV_README.md §4 |
| Understand guest mode | `apps/decisions/guest_views.py` + DEV_README.md §8 |
| Understand sharing | DEV_README.md §8 (share endpoints) |
| Understand email verification | `apps/users/email_service.py` + DEV_README.md §9 |
| Understand rate limiting | `apps/common/throttles.py` + DEV_README.md §4 |
| Understand the data model | DEV_README.md §7 |
| Understand the full API | DEV_README.md §8 |
| Understand currency conversion | DEV_README.md §10 |
| Understand auth flow | DEV_README.md §9 |
| Understand frontend state | DEV_README.md §6 |
