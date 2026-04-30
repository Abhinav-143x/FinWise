"""
Profile model — financial baseline. One-to-one with User.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid

CURRENCY_CHOICES = [(c, c) for c in settings.SUPPORTED_CURRENCIES]

COUNTRY_CHOICES = [
    ("IN", "India"), ("US", "United States"), ("GB", "United Kingdom"),
    ("DE", "Germany"), ("AE", "UAE"), ("CA", "Canada"),
    ("AU", "Australia"), ("JP", "Japan"), ("SG", "Singapore"),
    ("BR", "Brazil"), ("OTHER", "Other"),
]


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    monthly_income   = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    fixed_expenses   = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0, help_text="Rent, bills, subscriptions")
    current_savings  = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    monthly_emi      = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    default_currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    country          = models.CharField(max_length=10, choices=COUNTRY_CHOICES, default="OTHER")

    # Salary date: day of month (1–31). Used by Buy Now vs Wait engine.
    salary_day = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Day of month salary arrives (1–31). Optional."
    )

    is_onboarded = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"

    def __str__(self):
        return f"Profile({self.user.email})"

    @property
    def monthly_disposable(self):
        return self.monthly_income - self.fixed_expenses - self.monthly_emi

    @property
    def emergency_fund_months(self):
        monthly_costs = self.fixed_expenses + self.monthly_emi
        if monthly_costs <= 0:
            return None
        return round(float(self.current_savings) / float(monthly_costs), 1)

    def days_to_next_salary(self):
        """Returns days until next salary deposit, or None if salary_day not set."""
        if not self.salary_day:
            return None
        from datetime import date
        import calendar
        today = date.today()
        day = min(self.salary_day, calendar.monthrange(today.year, today.month)[1])
        if today.day <= day:
            return (today.replace(day=day) - today).days
        # Next month
        if today.month == 12:
            next_date = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_date = today.replace(month=today.month + 1, day=1)
        day = min(self.salary_day, calendar.monthrange(next_date.year, next_date.month)[1])
        return (next_date.replace(day=day) - today).days
