"""
Dream Purchase Planner — "When can I safely buy this?"

Given a target item and price, tells the user:
- How many months until they can afford it safely
- How much more they need to save
- What monthly saving rate gets them there faster

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import math

ENGINE_VERSION = 1

# Safety thresholds
SAFE_SAVINGS_USAGE = Decimal("0.40")       # Don't spend more than 40% of savings
MIN_EMERGENCY_MONTHS = Decimal("2")        # Keep 2 months emergency fund


@dataclass
class DreamPlannerInput:
    item_name: str
    target_price: Decimal
    monthly_income: Decimal
    fixed_expenses: Decimal
    current_savings: Decimal
    monthly_emi: Decimal = Decimal("0")
    extra_monthly_save: Decimal = Decimal("0")  # Additional saving user can commit
    currency: str = "USD"

    def __post_init__(self):
        for f in ["target_price", "monthly_income", "fixed_expenses",
                  "current_savings", "monthly_emi", "extra_monthly_save"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class DreamPlannerResult:
    verdict: str
    recommendation: str
    months_to_goal: Optional[int]
    already_affordable: bool
    amount_still_needed: Decimal
    suggested_monthly_save: Decimal
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    milestones: list[dict] = field(default_factory=list)   # month checkpoints
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


from typing import Optional

def run(inp: DreamPlannerInput) -> DreamPlannerResult:
    """Pure function. Returns dream planner result."""
    disposable = inp.monthly_income - inp.fixed_expenses - inp.monthly_emi
    monthly_costs = inp.fixed_expenses + inp.monthly_emi

    # Safe savings available (keep 40% rule + emergency fund)
    emergency_target = monthly_costs * MIN_EMERGENCY_MONTHS
    safe_savings_to_use = max(
        inp.current_savings - emergency_target,
        Decimal("0")
    ) * SAFE_SAVINGS_USAGE

    # Total effective saving rate
    effective_monthly = disposable * Decimal("0.30") + inp.extra_monthly_save

    # How much more is needed after using safe savings portion
    amount_needed = max(inp.target_price - safe_savings_to_use, Decimal("0"))
    amount_needed = amount_needed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    reasons = []
    better_moves = []

    # Already affordable now
    if inp.target_price <= safe_savings_to_use and disposable > 0:
        months = 0
        reasons.append(f"Your savings already cover this safely.")
        reasons.append(f"Buying now leaves your emergency fund intact.")
        better_moves.append("Proceed when ready.")
        return DreamPlannerResult(
            verdict="SAFE",
            recommendation=f"{inp.item_name} is within reach right now.",
            months_to_goal=0,
            already_affordable=True,
            amount_still_needed=Decimal("0"),
            suggested_monthly_save=Decimal("0"),
            reasons=reasons,
            better_moves=better_moves,
            milestones=[],
            metrics=_metrics(inp, disposable, effective_monthly, 0, amount_needed),
        )

    # Calculate months needed
    if effective_monthly <= 0:
        return DreamPlannerResult(
            verdict="RISKY",
            recommendation=f"Increase disposable income to plan for {inp.item_name}.",
            months_to_goal=None,
            already_affordable=False,
            amount_still_needed=inp.target_price,
            suggested_monthly_save=Decimal("0"),
            reasons=["No disposable income available for saving."],
            better_moves=["Reduce fixed expenses to create saving room."],
            milestones=[],
            metrics=_metrics(inp, disposable, effective_monthly, None, amount_needed),
        )

    months_needed = math.ceil(float(amount_needed / effective_monthly))
    months_needed = max(1, months_needed)

    # Suggest a saving rate to hit it in target timeframe
    # Default target: < 6 months
    target_months = 6
    suggested_save = (
        (amount_needed / Decimal(target_months)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if amount_needed > 0 else Decimal("0")
    )

    # Build milestone checkpoints
    milestones = []
    accumulated = safe_savings_to_use
    for m in range(1, min(months_needed + 1, 13)):
        accumulated += effective_monthly
        pct = min(float(accumulated / inp.target_price) * 100, 100)
        if m in [1, 3, 6, 12] or m == months_needed:
            milestones.append({
                "month": m,
                "saved": round(float(min(accumulated, inp.target_price)), 2),
                "pct": round(pct, 1),
                "reached": accumulated >= inp.target_price,
            })

    # Verdict
    if months_needed <= 2:
        verdict = "SAFE"
        recommendation = f"{inp.item_name} reachable in {months_needed} month{'s' if months_needed != 1 else ''}."
    elif months_needed <= 5:
        verdict = "CAUTION"
        recommendation = f"{inp.item_name} safely reachable in {months_needed} months."
    else:
        verdict = "RISKY"
        recommendation = f"{inp.item_name} needs {months_needed} months. A longer plan is needed."

    reasons.append(f"Need {_fmt(amount_needed, inp.currency)} more saved safely.")
    reasons.append(f"Current saving rate: ~{_fmt(effective_monthly, inp.currency)}/month.")

    if suggested_save > effective_monthly:
        diff = suggested_save - effective_monthly
        better_moves.append(
            f"Save {_fmt(diff, inp.currency)} extra/month to reach it in {target_months} months."
        )
    better_moves.append(f"Set a dedicated goal for {inp.item_name} in your Goals tab.")

    return DreamPlannerResult(
        verdict=verdict,
        recommendation=recommendation,
        months_to_goal=months_needed,
        already_affordable=False,
        amount_still_needed=amount_needed,
        suggested_monthly_save=suggested_save,
        reasons=reasons,
        better_moves=better_moves,
        milestones=milestones,
        metrics=_metrics(inp, disposable, effective_monthly, months_needed, amount_needed),
    )


def _fmt(amount: Decimal, currency: str = "") -> str:
    return f"{float(amount):,.0f}"


def _metrics(inp, disposable, monthly_save, months, amount_needed):
    return {
        "monthly_disposable": round(float(disposable), 2),
        "effective_monthly_save": round(float(monthly_save), 2),
        "months_to_goal": months,
        "amount_still_needed": round(float(amount_needed), 2),
        "target_price": round(float(inp.target_price), 2),
    }
