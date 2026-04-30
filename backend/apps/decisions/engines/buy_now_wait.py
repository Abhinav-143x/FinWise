"""
Buy Now vs Wait Engine — "Should I buy now or wait?"

Analyses timing: cashflow position, days to next salary, goal buffers.
Returns a specific timing recommendation — not just a verdict.

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional
import math

ENGINE_VERSION = 1

# Thresholds
COMFORTABLE_SAVINGS_RATIO = Decimal("0.20")   # <20% of savings: buy now
THIN_BUFFER_MONTHS = Decimal("1.5")           # <1.5 months emergency: wait
SAFE_INCOME_RATIO = Decimal("0.25")           # <25% monthly income: buy now


@dataclass
class BuyNowWaitInput:
    purchase_amount: Decimal
    monthly_income: Decimal
    fixed_expenses: Decimal
    current_savings: Decimal
    monthly_emi: Decimal = Decimal("0")
    days_to_next_salary: Optional[int] = None   # None = unknown
    currency: str = "USD"

    def __post_init__(self):
        for f in ["purchase_amount", "monthly_income", "fixed_expenses",
                  "current_savings", "monthly_emi"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class BuyNowWaitResult:
    verdict: str                    # SAFE / CAUTION / RISKY
    timing: str                     # "buy_now" | "wait_salary" | "wait_weeks" | "wait_months"
    timing_label: str               # Human: "Buy now" / "Wait 14 days" / "Wait 2 months"
    recommendation: str
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


def run(inp: BuyNowWaitInput) -> BuyNowWaitResult:
    """Pure function. Returns timing recommendation with reasoning."""
    disposable = inp.monthly_income - inp.fixed_expenses - inp.monthly_emi
    savings_after = inp.current_savings - inp.purchase_amount
    monthly_costs = inp.fixed_expenses + inp.monthly_emi

    savings_ratio = (
        inp.purchase_amount / inp.current_savings
        if inp.current_savings > 0 else Decimal("999")
    )
    income_ratio = (
        inp.purchase_amount / inp.monthly_income
        if inp.monthly_income > 0 else Decimal("999")
    )
    emergency_months_after = (
        savings_after / monthly_costs
        if monthly_costs > 0 and savings_after > 0 else Decimal("0")
    )
    days_to_save = None
    if disposable > 0 and inp.purchase_amount > 0:
        months_needed = float(inp.purchase_amount / disposable)
        days_to_save = math.ceil(months_needed * 30)

    reasons = []
    better_moves = []

    # Case 1: Can't afford at all right now
    if disposable <= 0:
        return BuyNowWaitResult(
            verdict="RISKY",
            timing="wait_months",
            timing_label="Wait — expenses exceed income",
            recommendation="Your expenses exceed income. Buying now is not advisable.",
            reasons=["Monthly costs exceed income — no buffer available."],
            better_moves=["Reduce fixed expenses before making this purchase."],
            metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
        )

    # Case 2: Very comfortable — buy now
    if (savings_ratio <= COMFORTABLE_SAVINGS_RATIO
            and income_ratio <= SAFE_INCOME_RATIO
            and emergency_months_after >= THIN_BUFFER_MONTHS):
        return BuyNowWaitResult(
            verdict="SAFE",
            timing="buy_now",
            timing_label="Buy now",
            recommendation="Your finances are in a healthy position. Good time to buy.",
            reasons=[
                f"Uses only {float(savings_ratio)*100:.0f}% of savings.",
                f"Leaves {float(emergency_months_after):.1f} months emergency buffer.",
            ],
            better_moves=["Proceed with confidence."],
            metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
        )

    # Case 3: Salary coming soon — worth waiting
    if inp.days_to_next_salary and inp.days_to_next_salary <= 14:
        days = inp.days_to_next_salary
        label = f"Wait {days} day{'s' if days != 1 else ''} (next salary)"
        reasons.append(f"Salary arrives in {days} days — much safer timing.")
        if emergency_months_after < THIN_BUFFER_MONTHS:
            reasons.append(f"Current buffer only {float(emergency_months_after):.1f} months — thin.")
        better_moves.append(f"Set a reminder for your salary date.")
        return BuyNowWaitResult(
            verdict="CAUTION",
            timing="wait_salary",
            timing_label=label,
            recommendation=f"Wait {days} days for your salary. Much safer position.",
            reasons=reasons,
            better_moves=better_moves,
            metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
        )

    # Case 4: Need a few weeks
    if days_to_save and days_to_save <= 45:
        label = f"Wait {days_to_save} days"
        reasons.append(f"Can save up in ~{days_to_save} days from disposable income.")
        if emergency_months_after < THIN_BUFFER_MONTHS:
            reasons.append(f"Buffer is thin at {float(emergency_months_after):.1f} months.")
        better_moves.append(f"Save {_fmt_currency(inp.purchase_amount / Decimal('1.5'))} extra over next 6 weeks.")
        return BuyNowWaitResult(
            verdict="CAUTION",
            timing="wait_weeks",
            timing_label=label,
            recommendation=f"Waiting {days_to_save} days makes this much more comfortable.",
            reasons=reasons,
            better_moves=better_moves,
            metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
        )

    # Case 5: Need months
    if days_to_save:
        months = math.ceil(days_to_save / 30)
        label = f"Wait {months} month{'s' if months != 1 else ''}"
        reasons.append(f"Would take ~{months} months to save from current income.")
        if savings_ratio > Decimal("0.50"):
            reasons.append(f"Uses {float(savings_ratio)*100:.0f}% of savings — significant impact.")
        better_moves.append(f"Save {_fmt_currency(disposable)} monthly toward this.")
        if inp.days_to_next_salary:
            better_moves.append("Consider buying after next 2–3 salary deposits.")
        return BuyNowWaitResult(
            verdict="RISKY" if months > 3 else "CAUTION",
            timing="wait_months",
            timing_label=label,
            recommendation=f"Plan for this purchase in {months} month{'s' if months != 1 else ''}.",
            reasons=reasons,
            better_moves=better_moves,
            metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
        )

    # Fallback
    return BuyNowWaitResult(
        verdict="CAUTION",
        timing="wait_salary",
        timing_label="Wait for next salary",
        recommendation="Wait for next salary before committing to this purchase.",
        reasons=["Limited financial buffer currently."],
        better_moves=["Reassess after your next income deposit."],
        metrics=_metrics(inp, disposable, savings_ratio, income_ratio, emergency_months_after, days_to_save),
    )


def _fmt_currency(amount: Decimal) -> str:
    return f"{float(amount):,.0f}"


def _metrics(inp, disposable, savings_ratio, income_ratio, emergency_months, days_to_save):
    return {
        "savings_used_pct": round(float(savings_ratio) * 100, 1),
        "income_ratio_pct": round(float(income_ratio) * 100, 1),
        "emergency_months_after": round(float(emergency_months), 1),
        "days_to_save": days_to_save,
        "monthly_disposable": round(float(disposable), 2),
    }
