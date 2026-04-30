# FinWise

**Personal money decision assistant.**

Before you spend, ask FinWise.

---

## What it solves

Most finance apps track your money. FinWise helps you **decide what to do with it**.

Got a purchase in mind? FinWise tells you if it's safe, when the right time is, what it delays, and how to recover if something unexpected happens. All in under 30 seconds.

---

## Six decision tools

| Tool | Question answered |
|---|---|
| **Can I Afford This?** | Is this purchase safe right now? |
| **Buy Now or Wait?** | Should I buy today, or wait 14 days / next salary / 2 months? |
| **Goal Impact** | Which savings goals does this delay, and by how many days? |
| **Safe to Spend** | What's my real discretionary budget this month? |
| **Dream Planner** | When can I safely afford that bike / laptop / trip? |
| **Emergency Recovery** | Unexpected expense — what's my recovery plan? |

Every result:
- Has a clear `SAFE / CAUTION / RISKY` verdict
- Explains *why* in plain language
- Gives a specific next move
- Never judges you

---

## Multi-currency

Set your base currency in your profile. Check any purchase in any currency — FinWise converts live and shows you both values.

```
$500 = ₹41,500
```

Supported: USD, EUR, GBP, INR, AED, CAD, AUD, JPY, SGD, BRL

---

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand
- **Backend:** Django 5, Django REST Framework, SimpleJWT
- **Database:** PostgreSQL
- **Hosting:** Vercel (frontend) + Render/Railway (backend)

---

## Run locally

**With Docker (recommended):**

```bash
git clone <repo-url> finwise && cd finwise
docker compose up --build
# Frontend: http://localhost:3000
# API:      http://localhost:8000/api/v1/
```

**Without Docker:**

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DB credentials
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Roadmap

- [ ] Salary-date aware timing (V2.2 — done)
- [ ] Scenario comparison ("what if I saved 20% more?")
- [ ] Monthly spending projections
- [ ] PWA / installable on phone
- [ ] Guest mode (no signup required)
- [ ] Native mobile app (React Native)

---

## Principles

- **Few features. Zero nonsense.**
- **Reliable outputs** over fancy UI.
- **Explain everything.** Never a black-box verdict.
- **Never tracks.** FinWise is a decision tool, not a ledger.
