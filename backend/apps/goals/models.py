"""
Goals model — savings targets a user is working towards.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid

CURRENCY_CHOICES = [(c, c) for c in settings.SUPPORTED_CURRENCIES]


class Goal(models.Model):
    """A financial goal with a target, current amount, and monthly contribution."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    name = models.CharField(max_length=200)
    target_amount = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(1)],
    )
    current_amount = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
    )
    monthly_contribution = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "goals"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.user.email})"

    @property
    def remaining_amount(self):
        return max(self.target_amount - self.current_amount, 0)

    @property
    def progress_percent(self):
        if self.target_amount <= 0:
            return 0
        return round(float(self.current_amount) / float(self.target_amount) * 100, 1)

    @property
    def months_to_complete(self):
        """Estimated months at current contribution rate."""
        if self.monthly_contribution <= 0:
            return None
        remaining = self.remaining_amount
        return round(float(remaining) / float(self.monthly_contribution), 1)
