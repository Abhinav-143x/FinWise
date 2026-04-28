"""
Decision model — immutable audit log of every decision made.
Each engine run creates a new Decision record.
"""
from django.db import models
from django.conf import settings
import uuid

CURRENCY_CHOICES = [(c, c) for c in settings.SUPPORTED_CURRENCIES]


class EngineType(models.TextChoices):
    AFFORDABILITY = "affordability", "Can I Afford This?"
    GOAL_IMPACT = "goal_impact", "Goal Impact"
    SAFE_SPEND = "safe_spend", "Safe to Spend"
    EMI_VS_CASH = "emi_vs_cash", "EMI vs Cash"          # Phase 2
    RENT_VS_BUY = "rent_vs_buy", "Rent vs Buy"          # Phase 2


class Verdict(models.TextChoices):
    SAFE = "SAFE", "Safe"
    CAUTION = "CAUTION", "Caution"
    RISKY = "RISKY", "Risky"


class Decision(models.Model):
    """
    Stores each decision as JSON blobs.
    input_data: raw user inputs
    result_data: engine output (verdict, recommendation, reasons, better_moves)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="decisions",
        null=True,  # Allow guest decisions in future
        blank=True,
    )
    engine_type = models.CharField(
        max_length=20, choices=EngineType.choices, db_index=True
    )
    input_data = models.JSONField()
    result_data = models.JSONField()
    verdict = models.CharField(
        max_length=10, choices=Verdict.choices, db_index=True
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    version = models.PositiveSmallIntegerField(
        default=1,
        help_text="Engine algorithm version — allows A/B testing and result migration.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "decisions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.engine_type} | {self.verdict} | {self.created_at:%Y-%m-%d}"
