"""
Emergency Recovery Planner — "Unexpected expense. What now?"

Given an unexpected expense, computes:
- Impact on savings/emergency fund
- Goal delays in days (not months — more human)
- A concrete recovery path

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
import math

ENGINE_VERSION = 1

EMERGENCY_TARGET_MONTHS = Decimal("3")


@dataclass
class EmergencyRecoveryInput:
    expense_amount: Decimal
    expense_label: str           # "hospital bill", "car repair", etc.
    monthly_income: Decimal
    fixed_expenses: Decimal
    current_savings: Decimal
    monthly_emi: Decimal = Decimal("0")
    currency: str = "USD"

    def __post_init__(self):
        for f in ["expense_amount", "monthly_income", "fixed_expenses",
                  "current_savings", "monthly_emi"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class EmergencyRecoveryResult:
    verdict: str
    recommendation: str
    savings_after: Decimal
    recovery_months: int             # months to rebuild emergency fund
    goal_delay_days: int             # average delay across active goals
    cushion_status: str              # "healthy" | "thin" | "depleted"
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    recovery_plan: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


def run(
    inp: EmergencyRecoveryInput,
    goal_monthly_contributions: Decimal = Decimal("0"),
    goals_remaining_amounts: list[Decimal] = None,
) -> EmergencyRecoveryResult:
    """Pure function. goals_remaining_amounts: list of remaining amounts per active goal."""
    if goals_remaining_amounts is None:
        goals_remaining_amounts = []

    monthly_costs = inp.fixed_expenses + inp.monthly_emi
    disposable = inp.monthly_income - monthly_costs
    savings_after = inp.current_savings - inp.expense_amount

    # Emergency fund analysis
    emergency_target = monthly_costs * EMERGENCY_TARGET_MONTHS
    emergency_before = inp.current_savings / monthly_costs if monthly_costs > 0 else Decimal("99")
    emergency_after = max(savings_after, Decimal("0")) / monthly_costs if monthly_costs > 0 else Decimal("99")

    # Cushion status
    if emergency_after >= 3:
        cushion = "healthy"
    elif emergency_after >= 1:
        cushion = "thin"
    else:
        cushion = "depleted"

    # Recovery time: rebuild to 3 months
    recovery_deficit = max(emergency_target - max(savings_after, Decimal("0")), Decimal("0"))
    safe_monthly_recovery = disposable * Decimal("0.30")
    recovery_months = (
        math.ceil(float(recovery_deficit / safe_monthly_recovery))
        if safe_monthly_recovery > 0 and recovery_deficit > 0
        else 0
    )
    recovery_months = min(recovery_months, 24)  # cap display at 24 months

    # Goal delay estimate (days)
    goal_delay_days = 0
    if goals_remaining_amounts and goal_monthly_contributions > 0:
        # Expense delays goals by ~expense/monthly_contribution days
        delay_per_goal_months = float(
            inp.expense_amount / (goal_monthly_contributions * Decimal(len(goals_remaining_amounts)))
        )
        goal_delay_days = max(0, math.ceil(delay_per_goal_months * 30))

    reasons = []
    better_moves = []
    recovery_plan = []

    # Emergency expense label
    label = inp.expense_label or "unexpected expense"

    reasons.append(
        f"{label.capitalize()} of {_fmt(inp.expense_amount)} logged."
    )
    if savings_after < 0:
        reasons.append("Expense exceeds available savings — requires immediate attention.")
        verdict = "RISKY"
        recommendation = f"Savings depleted. Focus on rebuilding cushion over {recovery_months} months."
    elif cushion == "depleted":
        reasons.append(f"Emergency buffer now below 1 month — very thin.")
        verdict = "RISKY"
        recommendation = f"Emergency cushion is now critically low. Recovery in ~{recovery_months} months."
    elif cushion == "thin":
        reasons.append(f"Emergency buffer reduced to {float(emergency_after):.1f} months.")
        verdict = "CAUTION"
        recommendation = f"Plan adjusted. Recovery path is {recovery_months} month{'s' if recovery_months != 1 else ''}."
    else:
        verdict = "SAFE"
        recommendation = f"Covered from savings. Buffer remains healthy at {float(emergency_after):.1f} months."

    if goal_delay_days > 0:
        reasons.append(
            f"Active goals may be delayed by ~{goal_delay_days} day{'s' if goal_delay_days != 1 else ''}."
        )

    # Recovery plan — practical steps
    if recovery_months > 0:
        monthly_rec = recovery_deficit / Decimal(max(recovery_months, 1))
        recovery_plan.append(
            f"Set aside {_fmt(monthly_rec)}/month for {recovery_months} months to rebuild buffer."
        )
    if goal_delay_days > 0:
        recovery_plan.append(
            f"Goals back on track after recovery — only {goal_delay_days} day delay."
        )
    if disposable > 0:
        recovery_plan.append(
            f"Reduce leisure spending by {_fmt(disposable * Decimal('0.15'))}/month during recovery."
        )
    recovery_plan.append("Review fixed expenses for any temporary reductions.")

    better_moves.append("Prioritise emergency fund rebuild before new large purchases.")
    if goal_delay_days > 30:
        better_moves.append("Temporarily increase goal contributions by 10% once recovered.")

    return EmergencyRecoveryResult(
        verdict=verdict,
        recommendation=recommendation,
        savings_after=max(savings_after, Decimal("0")),
        recovery_months=recovery_months,
        goal_delay_days=goal_delay_days,
        cushion_status=cushion,
        reasons=reasons,
        better_moves=better_moves,
        recovery_plan=recovery_plan,
        metrics={
            "savings_before": round(float(inp.current_savings), 2),
            "savings_after": round(float(max(savings_after, Decimal("0"))), 2),
            "emergency_months_before": round(float(emergency_before), 1),
            "emergency_months_after": round(float(emergency_after), 1),
            "recovery_months": recovery_months,
            "goal_delay_days": goal_delay_days,
            "monthly_disposable": round(float(disposable), 2),
        },
    )


def _fmt(amount: Decimal) -> str:
    return f"{float(amount):,.0f}"
