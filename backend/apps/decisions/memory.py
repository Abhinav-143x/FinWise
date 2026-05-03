"""
Decision Memory — V2.5

Finds the last time a user checked a similar item and computes:
- How many days ago
- Whether their financial position has improved/worsened
- A plain-language summary for the UI

Used by all purchase-related engines (affordability, buy_now_wait, goal_impact, dream_planner).
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta


def get_memory(user, engine_type: str, item_name: str, current_metrics: dict) -> dict | None:
    """
    Returns a memory object if this user checked a similar item before.
    Returns None if no prior check found.

    Memory object:
    {
        "days_ago": int,
        "previous_verdict": str,
        "current_verdict": str (passed in),
        "change_pct": float | None,   # savings_used_pct change
        "change_label": str,          # "better", "worse", "same"
        "summary": str,               # human-readable 1 line
    }
    """
    from .models import Decision

    if not item_name or not item_name.strip():
        return None

    # Find prior decision with same engine + similar item name (case-insensitive)
    prior = (
        Decision.objects
        .filter(
            user=user,
            engine_type=engine_type,
            item_name__iexact=item_name.strip(),
        )
        .exclude(result_data={})
        .order_by("-created_at")
        .first()
    )

    if not prior:
        return None

    days_ago = (timezone.now() - prior.created_at).days
    if days_ago == 0:
        return None  # Same day — not useful

    prior_verdict = prior.verdict
    prior_metrics = prior.result_data.get("metrics", {})

    # Compare savings_used_pct if available
    change_pct = None
    change_label = "same"
    if "savings_used_pct" in current_metrics and "savings_used_pct" in prior_metrics:
        prev = float(prior_metrics["savings_used_pct"])
        curr = float(current_metrics.get("savings_used_pct", prev))
        change_pct = round(curr - prev, 1)
        if change_pct <= -3:
            change_label = "better"
        elif change_pct >= 3:
            change_label = "worse"

    # Build human summary
    day_label = f"{days_ago} day{'s' if days_ago != 1 else ''} ago"
    if change_label == "better":
        summary = f"You checked this {day_label}. Position improved by {abs(change_pct):.0f}%."
    elif change_label == "worse":
        summary = f"You checked this {day_label}. Position tighter by {abs(change_pct):.0f}% since then."
    else:
        summary = f"You checked this {day_label}. Position is similar."

    return {
        "days_ago":        days_ago,
        "previous_verdict": prior_verdict,
        "change_pct":       change_pct,
        "change_label":     change_label,
        "summary":          summary,
        "prior_decision_id": str(prior.id),
    }
