"""
Profile model — financial baseline for a user.
One-to-one with User. Created empty on register, filled during onboarding.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid


CURRENCY_CHOICES = [(c, c) for c in settings.SUPPORTED_CURRENCIES]

COUNTRY_CHOICES = [
    ("IN", "India"),
    ("US", "United States"),
    ("GB", "United Kingdom"),
    ("DE", "Germany"),
    ("AE", "UAE"),
    ("CA", "Canada"),
    ("AU", "Australia"),
    ("JP", "Japan"),
    ("SG", "Singapore"),
    ("BR", "Brazil"),
    ("OTHER", "Other"),
]


class Profile(models.Model):
    """
    Stores monthly financial snapshot.
    All monetary amounts are stored in user's default currency.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    # ── Financial baseline ────────────────────────────────────────────────────
    monthly_income = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
    )
    fixed_expenses = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        help_text="Monthly fixed costs: rent, bills, subscriptions.",
    )
    current_savings = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
    )
    monthly_emi = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        help_text="Total monthly EMI / loan repayments.",
    )

    # ── Locale ────────────────────────────────────────────────────────────────
    default_currency = models.CharField(
        max_length=3, choices=CURRENCY_CHOICES, default="USD"
    )
    country = models.CharField(
        max_length=10, choices=COUNTRY_CHOICES, default="OTHER"
    )

    # ── Meta ──────────────────────────────────────────────────────────────────
    is_onboarded = models.BooleanField(
        default=False,
        help_text="True once user has completed initial profile setup.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"

    def __str__(self):
        return f"Profile({self.user.email})"

    # ── Computed helpers ──────────────────────────────────────────────────────
    @property
    def monthly_disposable(self):
        """Income after fixed expenses and EMIs."""
        return self.monthly_income - self.fixed_expenses - self.monthly_emi

    @property
    def emergency_fund_months(self):
        """How many months of expenses current savings covers."""
        monthly_costs = self.fixed_expenses + self.monthly_emi
        if monthly_costs <= 0:
            return None
        return round(float(self.current_savings) / float(monthly_costs), 1)
