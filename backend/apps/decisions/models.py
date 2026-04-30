"""
Decision model — immutable audit log of every decision made.
"""
from django.db import models
from django.conf import settings
import uuid

CURRENCY_CHOICES = [(c, c) for c in settings.SUPPORTED_CURRENCIES]


class EngineType(models.TextChoices):
    AFFORDABILITY      = "affordability",      "Can I Afford This?"
    GOAL_IMPACT        = "goal_impact",         "Goal Impact"
    SAFE_SPEND         = "safe_spend",          "Safe to Spend"
    BUY_NOW_WAIT       = "buy_now_wait",        "Buy Now vs Wait"
    DREAM_PLANNER      = "dream_planner",       "Dream Purchase Planner"
    EMERGENCY_RECOVERY = "emergency_recovery",  "Emergency Recovery"


class Verdict(models.TextChoices):
    SAFE    = "SAFE",    "Safe"
    CAUTION = "CAUTION", "Caution"
    RISKY   = "RISKY",   "Risky"


class Decision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="decisions",
        null=True, blank=True,
    )
    engine_type = models.CharField(max_length=25, choices=EngineType.choices, db_index=True)
    item_name   = models.CharField(max_length=200, blank=True, default="")
    input_data  = models.JSONField()
    result_data = models.JSONField()
    verdict     = models.CharField(max_length=10, choices=Verdict.choices, db_index=True)
    currency    = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    version     = models.PositiveSmallIntegerField(default=1)
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "decisions"
        ordering = ["-created_at"]

    def __str__(self):
        label = self.item_name or self.engine_type
        return f"{label} | {self.verdict} | {self.created_at:%Y-%m-%d}"
