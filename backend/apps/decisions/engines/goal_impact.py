"""
Goal Impact Engine — "Will this delay my goal?"

Given a purchase, compute how it affects each of a user's active goals.

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

ENGINE_VERSION = 1

# Thresholds: % of goal's remaining amount the purchase represents
SAFE_IMPACT_RATIO = Decimal("0.10")       # ≤10% of remaining: minimal
CAUTION_IMPACT_RATIO = Decimal("0.30")    # ≤30%: moderate


@dataclass
class GoalSnapshot:
    goal_id: str
    name: str
    target_amount: Decimal
    current_amount: Decimal
    monthly_contribution: Decimal
    currency: str


@dataclass
class GoalImpactInput:
    purchase_amount: Decimal
    current_savings: Decimal
    monthly_income: Decimal
    goals: list[GoalSnapshot]
    currency: str = "USD"

    def __post_init__(self):
        for f in ["purchase_amount", "current_savings", "monthly_income"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class GoalImpactDetail:
    goal_id: str
    goal_name: str
    original_months: Optional[float]
    new_months: Optional[float]
    delay_months: Optional[float]
    impact_label: str      # "minimal" | "moderate" | "significant"
    impact_pct: float      # % of goal's remaining that purchase consumes


@dataclass
class GoalImpactResult:
    verdict: str
    recommendation: str
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    goal_impacts: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


def run(inp: GoalImpactInput) -> GoalImpactResult:
    if not inp.goals:
        return GoalImpactResult(
            verdict="SAFE",
            recommendation="No active goals found. Purchase won't delay any goals.",
            reasons=["You have no active savings goals set up."],
            better_moves=["Consider setting up a savings goal to track progress."],
        )

    savings_after = inp.current_savings - inp.purchase_amount
    impacts = []
    reasons = []
    better_moves = []

    for g in inp.goals:
        remaining = Decimal(str(g.target_amount)) - Decimal(str(g.current_amount))
        contribution = Decimal(str(g.monthly_contribution))
        if remaining <= 0:
            continue

        original_months = (
            float(remaining / contribution) if contribution > 0 else None
        )

        # After purchase: savings reduction affects goals funded from savings
        impact_pct = float(inp.purchase_amount / remaining) if remaining > 0 else 0
        remaining_after = max(remaining, Decimal("0"))

        if savings_after < 0:
            # Savings can't fund remaining — contribution must increase or goal delays
            deficit = abs(savings_after)
            extra_months = float(deficit / contribution) if contribution > 0 else None
        else:
            extra_months = 0.0

        new_months = (
            original_months + extra_months
            if (original_months is not None and extra_months is not None)
            else None
        )
        delay = (
            round(new_months - original_months, 1)
            if (new_months is not None and original_months is not None)
            else None
        )

        # Label
        ir = Decimal(str(impact_pct))
        if ir <= SAFE_IMPACT_RATIO:
            label = "minimal"
        elif ir <= CAUTION_IMPACT_RATIO:
            label = "moderate"
        else:
            label = "significant"

        if label == "moderate":
            reasons.append(
                f"Moderate impact on '{g.name}' goal "
                f"({impact_pct*100:.0f}% of remaining)."
            )
        elif label == "significant":
            reasons.append(
                f"High impact on '{g.name}' — uses "
                f"{impact_pct*100:.0f}% of remaining target amount."
            )
            if delay:
                reasons.append(
                    f"'{g.name}' goal may be delayed by ~{delay:.0f} months."
                )
            better_moves.append(
                f"Consider reducing monthly expenses to compensate for '{g.name}' delay."
            )

        impacts.append(
            GoalImpactDetail(
                goal_id=g.goal_id,
                goal_name=g.name,
                original_months=round(original_months, 1) if original_months else None,
                new_months=round(new_months, 1) if new_months else None,
                delay_months=delay,
                impact_label=label,
                impact_pct=round(impact_pct * 100, 1),
            )
        )

    # Verdict from worst impact
    labels = [i.impact_label for i in impacts]
    if "significant" in labels:
        verdict = "RISKY"
        recommendation = (
            "This purchase significantly delays one or more of your goals. "
            "Consider timing or alternatives."
        )
    elif "moderate" in labels:
        verdict = "CAUTION"
        recommendation = (
            "This purchase has a moderate effect on your goals. "
            "Proceed thoughtfully."
        )
    else:
        verdict = "SAFE"
        recommendation = "This purchase has minimal impact on your savings goals."
        better_moves = better_moves or ["Your goals remain on track — good to go."]

    goal_impacts_dicts = [
        {
            "goal_id": i.goal_id,
            "goal_name": i.goal_name,
            "original_months": i.original_months,
            "new_months": i.new_months,
            "delay_months": i.delay_months,
            "impact_label": i.impact_label,
            "impact_pct": i.impact_pct,
        }
        for i in impacts
    ]

    return GoalImpactResult(
        verdict=verdict,
        recommendation=recommendation,
        reasons=reasons or ["No significant goal impact detected."],
        better_moves=better_moves or ["Maintain current contribution rates."],
        goal_impacts=goal_impacts_dicts,
        metrics={"savings_after_purchase": round(float(savings_after), 2)},
    )
