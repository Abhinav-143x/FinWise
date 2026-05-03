"""
Insights — V2.5

Computes simple aggregate stats from a user's decision history.
Returned by GET /api/v1/decisions/insights/
Shown as a smart card on the dashboard after 3+ decisions.
"""
from django.db.models import Count
from .models import Decision


def compute_insights(user) -> dict:
    qs = Decision.objects.filter(user=user)
    total = qs.count()

    if total < 3:
        return {"enough_data": False, "total_decisions": total}

    # Most used engine
    top_engine = (
        qs.values("engine_type")
          .annotate(c=Count("id"))
          .order_by("-c")
          .first()
    )

    # Verdict breakdown
    verdicts = {
        v["verdict"]: v["c"]
        for v in qs.values("verdict").annotate(c=Count("id"))
    }
    safe_count    = verdicts.get("SAFE",    0)
    caution_count = verdicts.get("CAUTION", 0)
    risky_count   = verdicts.get("RISKY",   0)
    safe_pct = round(safe_count / total * 100) if total else 0

    # Most checked item (non-empty item_name)
    top_item = (
        qs.exclude(item_name="")
          .values("item_name")
          .annotate(c=Count("id"))
          .order_by("-c")
          .first()
    )

    ENGINE_LABELS = {
        "affordability":      "Can I Afford?",
        "goal_impact":        "Goal Impact",
        "safe_spend":         "Safe to Spend",
        "buy_now_wait":       "Buy Now or Wait",
        "dream_planner":      "Dream Planner",
        "emergency_recovery": "Emergency Recovery",
    }

    # Streak: consecutive days with at least 1 decision
    from django.utils import timezone
    from datetime import timedelta
    streak = 0
    today = timezone.now().date()
    for i in range(30):
        day = today - timedelta(days=i)
        if qs.filter(created_at__date=day).exists():
            streak += 1
        elif i > 0:
            break

    # Build insight message
    if safe_pct >= 70:
        insight_msg = f"Your finances are in solid shape — {safe_pct}% of decisions came back Safe."
    elif risky_count > caution_count:
        insight_msg = f"You've had {risky_count} Risky decisions. Consider reviewing your budget."
    else:
        insight_msg = f"Most decisions are cautious — good awareness of your finances."

    return {
        "enough_data":      True,
        "total_decisions":  total,
        "safe_pct":         safe_pct,
        "safe_count":       safe_count,
        "caution_count":    caution_count,
        "risky_count":      risky_count,
        "top_engine":       ENGINE_LABELS.get(top_engine["engine_type"], "") if top_engine else None,
        "top_item":         top_item["item_name"] if top_item else None,
        "active_streak":    streak,
        "insight_msg":      insight_msg,
    }
