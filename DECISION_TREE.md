# DECISION_TREE.md — Why Everything Was Built the Way It Was

Every significant architectural and product decision made in FinWise,
in the order it was made, with full reasoning.

**Use this before changing anything.** The reasoning matters as much as the decision.
When a decision is revisited, add a dated note below the original entry.

---

## How to read this document

Each entry:
- **Decision:** What was chosen
- **Alternatives considered:** What else was possible
- **Reason:** Why this choice
- **Consequence:** Downstream effects
- **Revisit when:** Conditions for reconsideration

---

## Product decisions

---

### PD-01: FinWise is a decision tool, not a tracker

**Decision:** FinWise answers "should I spend this money?" — not "where did my money go?"

**Alternatives considered:**
- Full personal finance dashboard (Mint-style)
- Expense tracker with categories
- Budget planner with monthly targets

**Reason:**
Decision tools are underserved. Trackers require ongoing data entry, bank sync, and maintenance. The insight "you spent ₹12k on food last month" does not help you decide whether to buy a laptop today. There are already dozens of trackers. There is almost nothing that answers "should I buy this right now?" with real reasoning.

**Consequence:**
- No transaction history feature
- No categories, tagging, or recurring expense detection
- No budget vs actual tracking
- Users who want a tracker should use something else

**Revisit when:** User research shows decision data is not useful without spending context.

---

### PD-02: SAFE / CAUTION / RISKY — three verdicts only

**Decision:** Every engine returns exactly one of three verdicts.

**Alternatives considered:**
- Numeric score (1–100)
- Five-level rating
- Binary (Safe / Not Safe)
- Color only

**Reason:**
Three labels map to three human states: proceed, pause, stop. A numeric score requires calibration. Five levels creates paralysis. Binary loses the important middle ground. Three is unambiguous and immediately actionable.

**Consequence:**
The `Verdict` TextChoices enum in `decisions/models.py` enforces this at DB level. All engines must map internal scoring to exactly one of these three strings.

**Revisit when:** User testing shows CAUTION is consistently misinterpreted.

---

### PD-03: One financial profile per user, set once

**Decision:** A single Profile row per user. All engines read from it. Users never re-enter income/expenses.

**Alternatives considered:**
- Ask for financial context on each decision form
- Multiple profiles (personal / business / partner)
- Per-decision financial snapshot

**Reason:**
Re-entering finances on every decision is friction that kills usage. It also creates inconsistency — users might enter different numbers each time. One profile means consistent inputs, and means each engine form only asks one question: the purchase amount.

**Consequence:**
- Profile must be completed before any authenticated engine runs (`_require_profile()` enforces this)
- Guest mode (PD-07) is the only exception — it collects finances per-session
- `is_onboarded` flag controls the gate

**Revisit when:** Users want to model scenarios with hypothetical income ("what if I got a 20% raise?"). Currently handled by the Scenario engine.

---

### PD-04: Non-judgmental copy throughout

**Decision:** Results describe the financial situation, never the person's judgment or character.

**Alternatives considered:**
- Direct warnings ("This is a bad idea")
- Scores with labels ("Poor financial decision")
- Urgent warnings ("DANGER: DO NOT BUY")

**Reason:**
Users come to FinWise in a vulnerable state — they want something and are checking if they can afford it. Judgment makes them defensive and less likely to trust the app. Neutral, factual descriptions build trust. "Delays your Trip goal by 9 days" is a fact. "You can't afford this" is a judgment.

**Consequence:**
Copy rules documented in `CLAUDE.md`. All engine recommendations use phrases like "Possible, but waiting is safer" not "Don't buy this."

**Revisit when:** User testing shows neutral copy is interpreted as weakness.

---

### PD-05: Six engines cover the decision space

**Decision:** The six current engines cover every typical money decision a user makes. No new engines added without clear user demand.

**Alternatives considered:**
- EMI vs Cash (was in original plan, cut)
- Rent vs Buy (was in original plan, cut)
- Tax impact calculator
- Investment opportunity cost

**Reason:**
EMI vs Cash and Rent vs Buy were cut because they require many more inputs (interest rate, tenure, rental yield) which violates PD-03. Shipping underused features makes the product feel overwhelming.

**Consequence:**
The engine registry pattern (`engines/__init__.py`) means adding an engine is mechanical (9 steps in DEV_README §20). But it should not be done unless there is clear user demand.

**Revisit when:** Analytics shows which engines are used and which aren't.

---

### PD-06: Scenarios are ephemeral — not saved as Decision rows

**Decision:** `run_scenario()` re-runs engines with modified inputs but never writes to the DB.

**Alternatives considered:**
- Save scenario runs as separate Decision rows with a `is_scenario=True` flag
- Store scenarios as child records under the original decision
- Save only if user explicitly requests it

**Reason:**
Scenarios are exploratory. Saving them would pollute the decision history with what-if runs that the user didn't act on. History should reflect actual financial checks, not hypothetical explorations. The memory system (`memory.py`) would also be confused by scenario rows.

**Consequence:**
- ScenarioView returns data directly without calling `_save()`
- Scenario results cannot be shared (no decision_id)
- History and insights are unaffected by scenario usage

**Revisit when:** Users frequently want to revisit a specific scenario they ran.

---

### PD-07: Guest mode limited to 2 engines

**Decision:** Only Affordability and Buy Now or Wait available without signup.

**Alternatives considered:**
- All 6 engines available as guest
- Only 1 engine (Affordability only)
- Full guest mode with sessionStorage profile

**Reason:**
Goal Impact, Safe to Spend, Dream Planner, and Emergency Recovery all depend on goals data or produce results that are meaningless without a real profile history. Goal Impact with no goals says "no active goals — no impact." Safe to Spend needs accurate monthly expenses. These results would be low-trust for a first-time user. The 2 simplest engines produce trustworthy results from manually entered data.

**Consequence:**
`guest_views.py` implements only `GuestAffordabilityView` and `GuestBuyNowWaitView`.
The `GuestPrompt` component after the result explicitly mentions "all 6 tools" to motivate signup.

**Revisit when:** User conversion data shows that guests who run goal impact convert better.

---

### PD-08: Shared results show percentages, not absolute amounts

**Decision:** The public share page shows `savings_used_pct: 47%` not `savings_used: ₹21,150`.

**Alternatives considered:**
- Show all data (fully transparent)
- Show no numbers at all (verdict + text only)
- Let user choose what to share

**Reason:**
Users may want to share a result with a partner or friend without revealing their exact income, savings, or purchase price. Percentages are sufficient to convey the financial reasoning without exposing private details. "Uses 47% of savings" is as informative as "uses ₹21,150 of ₹45,000 savings" for understanding the result.

**Consequence:**
`PublicSharedDecisionView` filters metrics: `{k: v for k, v in metrics.items() if "pct" in k or "months" in k or "days" in k}`
The item_name is also not returned — just the engine type label.

**Revisit when:** Users complain that shared results lack context for recipients.

---

## Architecture decisions

---

### AD-01: Engines as pure functions

**Decision:** Every engine is `run(Input) → Result`. No DB. No HTTP. No Django.

**Alternatives considered:**
- Engines as Django model methods
- Engines that query DB directly for goals/profile
- Engines as Celery tasks

**Reason:**
Pure functions are trivially testable without mocks. 100 unit tests run in milliseconds with no database. They are version-controlled independently from infrastructure. When ENGINE_VERSION is bumped, old Decision rows retain their version number for auditability. The scenario system (AD-07) depends entirely on this — scenarios re-call `run()` with modified inputs.

**Consequence:**
- All data gathered in the view and passed in
- Test file imports engine functions directly — zero Django setup needed
- Scenarios work for free because they just call `run()` again

**Revisit when:** An engine genuinely needs DB access for something that cannot be pre-loaded.

---

### AD-02: JSONB for engine input and output

**Decision:** `input_data` and `result_data` on Decision are JSONB columns.

**Alternatives considered:**
- Separate table per engine type
- EAV (entity-attribute-value) table
- Flat columns with many NULLs

**Reason:**
Six engines with different schemas would require six tables. JSONB lets each engine store whatever it needs without migrations. We never need to SQL-filter on engine-specific fields — we only paginate by user/engine/created_at.

**V3.0 update:** Scenario results and projection data are NOT stored in JSONB — they are computed on demand. Only final Decision rows go in the DB.

**Consequence:**
Adding fields to an engine result requires no migration. New engines need no new tables.

**Revisit when:** Reporting needs to aggregate on engine-specific fields.

---

### AD-03: UUID primary keys

**Decision:** All primary keys are UUIDv4. `share_token` is a separate short token.

**Alternatives considered:**
- Auto-increment integers
- ULID (time-sortable)

**Reason:**
Sequential integer IDs expose information: total user count, join date, decision volume. UUIDs are opaque. `share_token` is a separate 8-char URL-safe token — shorter for sharing, but not the PK so it doesn't affect DB performance.

**Consequence:**
All FK references use UUID. URL params use UUID. `share_token` is generated on demand via `secrets.token_urlsafe(8)`.

---

### AD-04: Soft delete for users and goals

**Decision:** `User.deleted_at + is_active=False`. `Goal.is_active=False`.

**Alternatives considered:**
- Hard delete
- Archive table
- Tombstone flag only

**Reason:**
Soft delete preserves data for recovery. `is_active=False` makes the account immediately dead (JWT auth fails). `purge_deleted_users` management command (V3.0) handles permanent removal after 30 days — closing the GDPR gap.

**V3.0 update:** The purge job is now implemented. Run daily: `python manage.py purge_deleted_users`.

**Consequence:**
Queries for active goals must always filter `is_active=True`.
Decisions are hard-deleted when user explicitly deletes one.
Users permanently removed after 30 days by the purge job.

---

### AD-05: Module-level cache for FX rates

**Decision:** FX rates cached in a module-level Python dict, not Redis.

**Alternatives considered:**
- Redis with django-redis
- Django cache framework
- Database caching
- No caching (fetch every request)

**Reason:**
Adding Redis adds infrastructure. For a single-server deployment, module-level cache works within one Gunicorn worker. The 1-hour TTL keeps rates fresh. The fallback chain (live → stale → hardcoded) means the app never fails due to FX issues.

**Consequence:**
With multiple workers, each worker has its own cache — slightly more API calls.
With multiple servers, caches are independent.

**Revisit when:** Scaling to multiple servers makes independent caches problematic.

---

### AD-06: Profile cached in frontend module scope

**Decision:** Profile + FX rates cached in module-level variables in `useProfile.js`, not React Query.

**Alternatives considered:**
- React Query with global cache
- Redux store
- Context API with provider
- Fetch on every page mount

**Reason:**
React Query is a substantial dependency for what is "fetch once, read many." Module-level variables survive component unmounts. `_fetching` flag prevents duplicate requests. `invalidateProfileCache()` provides explicit invalidation.

**Consequence:**
Must call `invalidateProfileCache()` after every profile PATCH. Profile is stale until then.

---

### AD-07: Scenarios use engine pure functions directly

**Decision:** `scenario.py` calls the same `run()` functions used by engine views, with modified inputs.

**Alternatives considered:**
- Separate scenario calculation logic
- Calling the engine views via HTTP
- Pre-computing scenarios on every decision save

**Reason:**
The pure function design (AD-01) makes this free. No duplication. No HTTP overhead. Modifying inputs and re-running is 3 lines of code. If an engine is updated (bumped version), scenarios automatically use the new logic.

**Consequence:**
Scenarios only work for engine types where `_build_and_run()` in `scenario.py` has a case. Currently: affordability, buy_now_wait, goal_impact, safe_spend.
Dream Planner and Emergency Recovery not yet supported — they require more input parameters that don't fit the simple modifier model.

---

### AD-08: Email verification is non-blocking

**Decision:** Registration succeeds even if the email service is down.

**Alternatives considered:**
- Block registration until email is verified
- Send email synchronously and fail registration on error
- Queue email in Celery

**Reason:**
If the email backend is misconfigured (wrong SMTP credentials), blocking registration means zero users can sign up. Email delivery is unreliable — timeouts, rate limits, spam filters. The product is fully usable without a verified email. Verification is a trust signal, not a feature gate.

**Consequence:**
`send_verification_email()` is wrapped in try/except in RegisterView. Users can use the app immediately after registration. `VerificationBanner` on dashboard nudges them to verify.

---

### AD-09: Rate limiting at DRF level, not nginx

**Decision:** DRF throttle classes rather than nginx rate limiting.

**Alternatives considered:**
- nginx `limit_req_zone` + `limit_req`
- Cloudflare rate limiting (infra-level)
- Django middleware

**Reason:**
DRF throttle classes are: testable (can import and test in Django tests), deployable without nginx changes, scope-aware (different rates for auth vs guest vs user), and portable across hosting providers. They work identically on Render, Railway, and local Docker.

**Consequence:**
Rate limit state is in-memory per worker. With multiple workers, a determined attacker can make N×rate requests before hitting the limit. Acceptable for the current threat model.

**Revisit when:** DDoS or credential stuffing becomes a real concern — move to nginx or Cloudflare at that point.

---

### AD-10: Share token is separate from primary key

**Decision:** `share_token = CharField(max_length=12)` on Decision, not the PK.

**Alternatives considered:**
- Use the Decision UUID as the share URL (`/share/<uuid>`)
- Generate a separate short ID as PK

**Reason:**
Using the UUID as the share URL exposes the decision ID in a public URL. A shared link recipient who guesses adjacent UUIDs could find other decisions (if they knew the pattern). The short token (`secrets.token_urlsafe(8)` = 10–11 chars) is unguessable and contains no timing information. The UUID PK remains internal.

**Consequence:**
Two identifiers per shareable decision: UUID (internal) and share_token (public).
`share_token` is blank by default — generated only when user clicks Share.
`PublicSharedDecisionView` looks up by `share_token`, not UUID.

---

## UI/UX decisions

---

### UD-01: Result appears below the form, not beside it

**Decision:** Single-column layout. Result renders below after submit.

**Alternatives considered:**
- Two-column (form left, result right)
- Modal
- Separate results page

**Reason:**
On mobile, side-by-side means one column is too narrow, or there's a "dead box" on the right before submission. Vertical flow matches how mobile users scroll. The result appearing below means the user's eye naturally travels to it. Smooth scroll to `#result-anchor` guides them there.

---

### UD-02: ScenarioPanel only appears on CAUTION / RISKY

**Decision:** ScenarioPanel is not shown when the result is SAFE.

**Alternatives considered:**
- Always show ScenarioPanel
- Show only on RISKY
- Show in all cases but collapsed by default

**Reason:**
A SAFE result means "proceed." Showing scenarios on a SAFE result creates doubt where there is none. "What if I saved 10% more?" after a SAFE verdict is noise. The user just wants to know it's fine. CAUTION and RISKY results genuinely benefit from "here's what would change this."

---

### UD-03: ProjectionChart on Dashboard and SafeSpend only (not all pages)

**Decision:** Projection shown on Dashboard (always) and Safe to Spend result (contextually). Not on every engine page.

**Alternatives considered:**
- Show on all 6 engine result pages
- Show only on dashboard
- Show as a separate "Projections" page

**Reason:**
Safe to Spend is the one result most naturally paired with "where will I be in 6 months?" — it's about the current month's budget. On Dashboard it provides at-a-glance financial trajectory. On other engine pages, a projection would feel like clutter — the user just asked a specific question and wants a specific answer.

---

### UD-04: GuestPrompt appears after result, not before

**Decision:** The prompt to create an account shows after the guest result is displayed.

**Alternatives considered:**
- Show signup prompt on page load (before form)
- Show in a banner at the top of the page
- Show as a modal after result

**Reason:**
A prompt before the result creates friction before the user has experienced any value. After the result, the user has just received a useful answer — this is the highest-intent moment for conversion. The prompt says "save your profile — skip this next time" which directly references the inconvenience they just experienced (typing their finances manually).

---

### UD-05: Dark mode via class strategy, not media query

**Decision:** Tailwind `darkMode: "class"` — `dark` class on `<html>`.

**Alternatives considered:**
- `darkMode: "media"` (follows system only)
- CSS variables + JS toggle
- Separate theme stylesheet

**Reason:**
`class` strategy gives users explicit control. They can use light mode even if their system is dark, and vice versa. `useTheme` hook respects system preference on first visit, then respects explicit choice via localStorage on subsequent visits.

---

## Data decisions

---

### DD-01: `item_name` as plain varchar, not a separate items table

**Decision:** `item_name` is `CharField(max_length=200)` on Decision.

**Alternatives considered:**
- Separate Item model with FK from Decision
- Tag-based system
- Structured product catalog

**Reason:**
Items are freeform. "iPhone 15", "trip to Goa", "drum kit" — no schema exists. A separate table adds a join with no benefit. `item_name__iexact` query for memory is efficient with a DB index.

---

### DD-02: `salary_day` as int (day of month), not date

**Decision:** `Profile.salary_day` stores 1–31, not a full date.

**Alternatives considered:**
- Full date (requires monthly update)
- ISO weekday number
- Unix timestamp

**Reason:**
Salary is typically on the same day each month ("25th of every month"). Storing the day number never goes stale. `days_to_next_salary()` method handles month-end edge cases (e.g. February when salary_day=31 → uses last day of month).

---

### DD-03: Decisions are immutable — only created, never updated

**Decision:** Each engine run creates a new Decision row. Records are never modified after creation.

**Alternatives considered:**
- Update existing decision with new run
- Store "runs" as child records
- Versioned decisions

**Reason:**
Immutability is correct for audit logs. The history of checks is the value — it enables Decision Memory (prior check comparison). Updating would lose that history. Scenarios explicitly avoid writing rows to preserve this (PD-06).

---

### DD-04: `share_token` generated on demand, blank by default

**Decision:** `share_token` is blank on new Decision rows. Generated only when user clicks Share.

**Alternatives considered:**
- Generate token on every save
- Use UUID as share identifier
- Generate token lazily in GET response

**Reason:**
Not every decision will be shared. Pre-generating tokens wastes entropy and creates URLs for decisions the user never intended to share. Lazy generation means only decisions where the user explicitly chose to share have a public URL. The `POST /decisions/<id>/share/` endpoint is idempotent — calling it twice returns the same token.

---

## Security decisions

---

### SD-01: JWT stored in localStorage

**Decision:** Access and refresh tokens stored in `localStorage`.

**Alternatives considered:**
- httpOnly cookies (XSS-safe, requires CSRF handling)
- sessionStorage (lost on tab close)
- Memory only (lost on refresh)

**Reason:**
httpOnly cookies require more backend configuration and complicate cross-origin requests. For this product's risk profile (no financial transactions, no bank data), localStorage is an acceptable trade-off.

**Consequence:** XSS could expose tokens. Mitigated by: short access TTL (60min), refresh rotation, no third-party scripts.

**Revisit when:** FinWise integrates with banking APIs or handles actual money movement.

---

### SD-02: Soft delete with 30-day permanent purge

**Decision:** `deleted_at` + `is_active=False` for immediate functional death. `purge_deleted_users` management command for permanent removal after 30 days.

**V3.0 update:** The purge job is now implemented (`management/commands/purge_deleted_users.py`). The GDPR gap from earlier versions is closed. Run it daily.

**Consequence:** A background scheduler (Render cron, Railway scheduler, or system cron) must invoke this daily. It is not automatic.

---

### SD-03: Guest endpoints rate-limited at DRF level

**Decision:** `GuestThrottle` (5/hour per IP) on both guest engine endpoints.

**Alternatives considered:**
- No rate limiting for simplicity
- Higher limit (20/hour)
- IP blocking

**Reason:**
Guest endpoints write nothing to the DB and require no auth. Without throttling, a script could run thousands of financial calculations per second, consuming CPU and making the app slow for real users. 5/hour is generous for legitimate use (you don't check the same purchase 5 times in an hour) but restrictive for abuse.

---

## What was considered and explicitly rejected

| Feature | Reason rejected |
|---|---|
| AI/LLM advice | Adds latency, cost, hallucination risk. Engine logic is deterministic and auditable. LLM is not. |
| Bank account sync | Requires OAuth, webhook handling, credential storage, PCI compliance. Months of work for marginal insight. |
| Push notifications | Requires Redis + Celery + VAPID keys. Planned for V3.1 — infrastructure cost not yet justified. |
| Recurring expense detection | Requires transaction history. Not in scope. |
| Social / sharing feed | FinWise is private. Sharing a result link (V3.0) is as far as social features should go. |
| Charts for their own sake | "3.2 months emergency cover" is more useful than a bar chart. One number beats a visualisation. |
| Offline decisions | Decisions require live profile + FX rates. A cached offline decision would be untrustworthy. PWA caches app shell only. |
| Multiple currencies per profile | Complicates every engine. One base currency + conversion at input is cleaner. |
| Scenario rows in DB | Would pollute history with hypothetical what-if runs. Scenarios are ephemeral by design (PD-06). |
| Share exact financial amounts | Privacy concern — percentages convey reasoning without exposing sensitive numbers (PD-08). |
| Guest mode for all 6 engines | Goal Impact, Safe to Spend, Dream Planner, Emergency need profile/goals data that guests don't have (PD-07). |
| EMI vs Cash engine | Requires interest rate, tenure — too many inputs, violates PD-03. |
| Rent vs Buy engine | Requires rental yield, mortgage rate, property appreciation — too many inputs. |
