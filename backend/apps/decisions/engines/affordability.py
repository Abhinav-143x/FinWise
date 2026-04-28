"""
Affordability Engine — "Can I Afford This?"

Algorithm:
1. Calculate financial health ratios
2. Score the purchase against thresholds
3. Return SAFE / CAUTION / RISKY with transparent reasoning

VERSION: 1
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional


ENGINE_VERSION = 1

# ── Thresholds ────────────────────────────────────────────────────────────────
# % of savings that a purchase can consume
SAVINGS_SAFE_RATIO = Decimal("0.30")       # ≤30%: SAFE
SAVINGS_CAUTION_RATIO = Decimal("0.55")    # ≤55%: CAUTION, else RISKY

# % of monthly disposable income
INCOME_SAFE_RATIO = Decimal("0.30")        # ≤30%: SAFE
INCOME_CAUTION_RATIO = Decimal("0.60")     # ≤60%: CAUTION, else RISKY

# Minimum emergency fund months after purchase
EMERGENCY_MONTHS_SAFE = Decimal("3")
EMERGENCY_MONTHS_CAUTION = Decimal("1")


@dataclass
class AffordabilityInput:
    purchase_amount: Decimal
    monthly_income: Decimal
    fixed_expenses: Decimal
    current_savings: Decimal
    monthly_emi: Decimal = Decimal("0")
    currency: str = "USD"

    def __post_init__(self):
        # Coerce all to Decimal for precision
        for f in ["purchase_amount", "monthly_income", "fixed_expenses",
                   "current_savings", "monthly_emi"]:
            setattr(self, f, Decimal(str(getattr(self, f))))


@dataclass
class AffordabilityResult:
    verdict: str
    recommendation: str
    reasons: list[str] = field(default_factory=list)
    better_moves: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    version: int = ENGINE_VERSION


def run(inp: AffordabilityInput) -> AffordabilityResult:
    """
    Main entry point. Returns AffordabilityResult.
    Pure function — no DB, no side effects.
    """
    disposable = inp.monthly_income - inp.fixed_expenses - inp.monthly_emi
    savings_after = inp.current_savings - inp.purchase_amount

    # ── Compute ratios ────────────────────────────────────────────────────────
    savings_ratio = (
        inp.purchase_amount / inp.current_savings
        if inp.current_savings > 0
        else Decimal("999")
    )
    income_ratio = (
        inp.purchase_amount / inp.monthly_income
        if inp.monthly_income > 0
        else Decimal("999")
    )
    months_of_expenses = inp.fixed_expenses + inp.monthly_emi
    emergency_months_after = (
        savings_after / months_of_expenses
        if months_of_expenses > 0 else None
    )
    months_to_save = (
        inp.purchase_amount / disposable
        if disposable > 0
        else None
    )

    reasons = []
    better_moves = []

    # ── Negative income guard ─────────────────────────────────────────────────
    if disposable <= 0:
        return AffordabilityResult(
            verdict="RISKY",
            recommendation=(
                "Your fixed expenses exceed your income. "
                "This purchase is not advisable right now."
            ),
            reasons=[
                "Monthly expenses and EMIs exceed your income.",
                "No disposable income available.",
            ],
            better_moves=[
                "Review and reduce fixed monthly costs.",
                "Explore ways to increase income before major purchases.",
            ],
            metrics=_build_metrics(
                savings_ratio, income_ratio,
                emergency_months_after, months_to_save, disposable
            ),
        )

    # ── Score signals ─────────────────────────────────────────────────────────
    scores = []

    if savings_ratio <= SAVINGS_SAFE_RATIO:
        scores.append("safe")
    elif savings_ratio <= SAVINGS_CAUTION_RATIO:
        scores.append("caution")
        reasons.append(
            f"Uses {float(savings_ratio)*100:.0f}% of your savings."
        )
    else:
        scores.append("risky")
        reasons.append(
            f"Uses {float(savings_ratio)*100:.0f}% of your savings — very high."
        )

    if income_ratio <= INCOME_SAFE_RATIO:
        scores.append("safe")
    elif income_ratio <= INCOME_CAUTION_RATIO:
        scores.append("caution")
        reasons.append(
            f"Costs {float(income_ratio)*100:.0f}% of your monthly income."
        )
    else:
        scores.append("risky")
        reasons.append(
            f"Costs {float(income_ratio)*100:.0f}% of monthly income — significant."
        )

    if emergency_months_after is not None:
        if emergency_months_after >= EMERGENCY_MONTHS_SAFE:
            scores.append("safe")
        elif emergency_months_after >= EMERGENCY_MONTHS_CAUTION:
            scores.append("caution")
            reasons.append(
                f"Leaves only {float(emergency_months_after):.1f} months of "
                "emergency funds."
            )
            better_moves.append("Try to maintain at least 3 months emergency fund.")
        else:
            scores.append("risky")
            reasons.append(
                f"Leaves only {float(emergency_months_after):.1f} months of "
                "emergency funds — dangerously low."
            )
            better_moves.append(
                "Build emergency fund to 3 months before large purchases."
            )

    # ── Aggregate verdict ─────────────────────────────────────────────────────
    risky_count = scores.count("risky")
    caution_count = scores.count("caution")

    if risky_count >= 1:
        verdict = "RISKY"
    elif caution_count >= 1:
        verdict = "CAUTION"
    else:
        verdict = "SAFE"

    # ── Recommendation text ───────────────────────────────────────────────────
    recommendation = _build_recommendation(
        verdict, inp, disposable, months_to_save, reasons
    )

    # ── Better moves ─────────────────────────────────────────────────────────
    if verdict in ("RISKY", "CAUTION") and months_to_save:
        months_int = max(1, round(float(months_to_save)))
        better_moves.append(
            f"Wait {months_int} month{'s' if months_int > 1 else ''} to save up "
            "from disposable income."
        )
    if not better_moves and verdict == "SAFE":
        better_moves.append("Proceed — your finances support this purchase.")

    metrics = _build_metrics(
        savings_ratio, income_ratio,
        emergency_months_after, months_to_save, disposable
    )

    return AffordabilityResult(
        verdict=verdict,
        recommendation=recommendation,
        reasons=reasons or ["No significant concerns identified."],
        better_moves=better_moves,
        metrics=metrics,
    )


def _build_recommendation(verdict, inp, disposable, months_to_save, reasons):
    if verdict == "SAFE":
        return (
            "You can comfortably afford this purchase. "
            "Your savings and income ratios look healthy."
        )
    elif verdict == "CAUTION":
        if months_to_save and months_to_save <= 3:
            m = max(1, round(float(months_to_save)))
            return (
                f"Buying now is possible, but waiting {m} "
                f"month{'s' if m > 1 else ''} is safer."
            )
        return (
            "Proceed with caution. Consider waiting or reducing "
            "the purchase amount."
        )
    else:  # RISKY
        return (
            "This purchase puts your financial health at significant risk. "
            "We recommend waiting or finding a lower-cost alternative."
        )


def _build_metrics(savings_ratio, income_ratio, emergency_months, months_to_save, disposable):
    return {
        "savings_used_pct": round(float(savings_ratio) * 100, 1),
        "income_ratio_pct": round(float(income_ratio) * 100, 1),
        "emergency_months_after": (
            round(float(emergency_months), 1) if emergency_months is not None else None
        ),
        "months_to_save": (
            round(float(months_to_save), 1) if months_to_save is not None else None
        ),
        "monthly_disposable": round(float(disposable), 2),
    }
