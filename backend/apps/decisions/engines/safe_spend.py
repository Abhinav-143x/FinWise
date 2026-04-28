"""
Safe to Spend Engine — "How much can I safely spend this month?"

Computes discretionary budget after:
- Fixed expenses
- EMIs
- Goal contributions
- Emergency fund buffer

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal

ENGINE_VERSION = 1

# Keep at least this many months of expenses as emergency fund
EMERGENCY_FUND_TARGET_MONTHS = Decimal("3")
# Never recommend spending more than this % of monthly income
MAX_SPEND_PCT = Decimal("0.40")


@dataclass
class SafeSpendInput:
    monthly_income: Decimal
    fixed_expenses: Decimal
    monthly_emi: Decimal
    current_savings: Decimal
    total_goal_contributions: Decimal  # sum of all active goal monthly contributions
    currency: str = "USD"

    def __post_init__(self):
        for f in ["monthly_income", "fixed_expenses", "monthly_emi",
                   "current_savings", "total_goal_contributions"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class SafeSpendResult:
    verdict: str
    recommendation: str
    safe_amount: Decimal
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


def run(inp: SafeSpendInput) -> SafeSpendResult:
    monthly_costs = inp.fixed_expenses + inp.monthly_emi
    disposable = inp.monthly_income - monthly_costs
    after_goals = disposable - inp.total_goal_contributions

    # Emergency fund gap
    target_emergency = monthly_costs * EMERGENCY_FUND_TARGET_MONTHS
    emergency_gap = max(target_emergency - inp.current_savings, Decimal("0"))
    monthly_emergency_top_up = (
        min(emergency_gap / Decimal("6"), after_goals * Decimal("0.20"))
        if emergency_gap > 0
        else Decimal("0")
    )

    raw_safe = after_goals - monthly_emergency_top_up
    capped_safe = min(raw_safe, inp.monthly_income * MAX_SPEND_PCT)
    safe_amount = max(capped_safe, Decimal("0"))

    reasons = []
    better_moves = []

    if disposable <= 0:
        return SafeSpendResult(
            verdict="RISKY",
            recommendation="Your expenses exceed your income. No safe spend amount.",
            safe_amount=Decimal("0"),
            reasons=["Total monthly costs exceed income."],
            better_moves=[
                "Reduce fixed expenses or find additional income sources."
            ],
            metrics=_metrics(inp, disposable, after_goals, safe_amount, emergency_gap),
        )

    if emergency_gap > 0:
        reasons.append(
            f"Emergency fund is below target ({EMERGENCY_FUND_TARGET_MONTHS} months). "
            f"Setting aside some for buffer."
        )
        better_moves.append("Continue building emergency fund before discretionary spending.")

    if after_goals <= 0:
        return SafeSpendResult(
            verdict="CAUTION",
            recommendation=(
                "After goals and expenses, very little is left for discretionary spend."
            ),
            safe_amount=Decimal("0"),
            reasons=[
                "Goal contributions plus expenses leave nothing discretionary.",
            ],
            better_moves=[
                "Review if goal contributions can be reduced temporarily.",
                "Look for ways to increase income.",
            ],
            metrics=_metrics(inp, disposable, after_goals, safe_amount, emergency_gap),
        )

    # Verdict
    safe_pct = float(safe_amount / inp.monthly_income) if inp.monthly_income > 0 else 0
    if safe_pct >= 0.20:
        verdict = "SAFE"
        recommendation = (
            f"You have a healthy discretionary budget this month."
        )
    elif safe_pct >= 0.05:
        verdict = "CAUTION"
        recommendation = "You have some spending room, but keep it lean this month."
        reasons.append("Discretionary margin is moderate — budget carefully.")
    else:
        verdict = "RISKY"
        recommendation = "Very little room to spend. Focus on essentials this month."
        reasons.append("Discretionary margin is very thin.")
        better_moves.append("Consider postponing non-essential purchases.")

    return SafeSpendResult(
        verdict=verdict,
        recommendation=recommendation,
        safe_amount=safe_amount.quantize(Decimal("0.01")),
        reasons=reasons or ["Finances are well-balanced."],
        better_moves=better_moves or [
            "Stick within your safe spend limit for healthy finances."
        ],
        metrics=_metrics(inp, disposable, after_goals, safe_amount, emergency_gap),
    )


def _metrics(inp, disposable, after_goals, safe_amount, emergency_gap):
    return {
        "monthly_disposable": round(float(disposable), 2),
        "after_goal_contributions": round(float(after_goals), 2),
        "emergency_fund_gap": round(float(emergency_gap), 2),
        "safe_spend_amount": round(float(safe_amount), 2),
        "safe_spend_pct_of_income": round(
            float(safe_amount / inp.monthly_income * 100)
            if inp.monthly_income > 0 else 0,
            1
        ),
    }
