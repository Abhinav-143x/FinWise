# FinWise

**Personal money decision assistant.**

> Before you spend, ask FinWise.

---

## What it does

Most finance apps track money. FinWise helps you **decide what to do with it**.

Set up your financial profile once — income, expenses, savings, EMIs, currency. Every tool uses it automatically. You only ever answer one question per decision: the price.

---

## The six decision tools

| Tool | The question | The answer |
|---|---|---|
| **Can I Afford This?** | Is this purchase safe right now? | SAFE / CAUTION / RISKY + reason |
| **Buy Now or Wait?** | When is the right time to buy? | Buy now / Wait 7 days / Wait 2 months |
| **Goal Impact** | Will this delay my savings goals? | Delays Trip by 19 days / No impact |
| **Safe to Spend** | What's my real budget this month? | One number. No inputs needed. |
| **Dream Planner** | When can I safely afford that thing I want? | Affordable in 5 months / Need ₹18k more |
| **Emergency Recovery** | Unexpected expense — now what? | Recovery in 2 months / Goal delayed 9 days |

Every result has the same shape:
```
SAFE / CAUTION / RISKY
One-line verdict in plain English
Why — 2-3 specific numbers
Next move — one concrete action
```

On CAUTION or RISKY results, **Scenario Comparison** appears automatically:
```
What if I save 10% more?    → SAFE (savings used drops from 47% to 39%)
What if I wait for salary?  → CAUTION (arrives in 8 days, much safer)
```

---

## Multi-currency

Your profile stores one base currency. Any purchase can be in any currency. FinWise converts live using open.er-api.com, caches rates for 1 hour, falls back to hardcoded rates if the API is down.

```
$500 = ₹41,500 (converted at live rates)
```

Supported: USD · EUR · GBP · INR · AED · CAD · AUD · JPY · SGD · BRL

---

## Try without signing up

Go to `/try` to run Affordability or Buy Now or Wait with your own numbers — no account needed, nothing saved. A prompt to create an account appears after the result.

---

## Share a decision

Every result can be shared via a link. The shared page shows the verdict, reasons, and next move — but no exact financial amounts (percentages only). Anyone with the link can see it; only you can generate it.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast, composable, no framework overhead |
| Styling | Tailwind CSS | Utility-first, dark mode via class strategy |
| State | Zustand | Minimal — auth store + profile cache hook |
| Backend | Django 5 + DRF | Mature, batteries-included, clean ORM |
| Auth | SimpleJWT | Stateless, auto-refresh, rotate-on-use |
| Database | PostgreSQL 16 | Reliable, JSONB columns for engine I/O |
| Containerisation | Docker Compose | One command to run everything |

---

## Run locally — 3 steps

```bash
# 1. Clone
git clone <repo-url> finwise && cd finwise

# 2. Create env file (defaults work out of the box)
cp backend/.env.example backend/.env

# 3. Start everything
docker compose up --build
```

Open http://localhost:3000

Full deployment instructions — including production deploy to Vercel + Render, migration reset steps, and all Docker commands — are in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Version history

| Version | What changed |
|---|---|
| V1 | Auth, Profile, Affordability engine, basic UI |
| V1.5 | Engine-profile coupling, CurrencyService, History delete |
| V2 | UI rebuild — centered forms, result-below-form, Goals edit, mobile bottom nav |
| V2.2 | Buy Now or Wait, Dream Planner, Emergency Recovery engines. Item names. Salary day. |
| V2.5 | Decision Memory, Insights, Dark mode, PWA, CSV export, Health endpoint, Landing page |
| V3.0 | Scenario comparison, Monthly projection, Guest mode, Shareable results, Email verification, Rate limiting, Permanent delete job |

---

## Principles

- **One profile. All tools.** Set finances once, never re-enter them.
- **Explain everything.** Every verdict shows the numbers behind it.
- **Non-judgmental.** "Possible, but waiting is safer." Never "bad purchase."
- **Few features, zero nonsense.** No bank sync. No charts for their own sake. No AI coach.
- **Pure engine logic.** Every decision engine is a pure function — testable in isolation, no DB.

---

## What's deliberately not built

Bank sync, stock/crypto tracking, complex charts, social features, AI chatbot, OCR receipts, subscription tracking. FinWise is a decision tool.

---

## Roadmap

- [ ] Push notifications — salary-day reminder via PWA
- [ ] Password reset via email
- [ ] Scenario save as goal — convert a scenario into a savings goal
- [ ] Monthly projection on all engine result pages
- [ ] Native app via React Native (backend APIs already complete)
