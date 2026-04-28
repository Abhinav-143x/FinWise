"""Profile serializers — V1.5 with cross-field validation."""
from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    monthly_disposable = serializers.ReadOnlyField()
    emergency_fund_months = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "monthly_income",
            "fixed_expenses",
            "current_savings",
            "monthly_emi",
            "default_currency",
            "country",
            "is_onboarded",
            "monthly_disposable",
            "emergency_fund_months",
            "updated_at",
        ]
        read_only_fields = ["id", "is_onboarded", "updated_at"]

    def validate_monthly_income(self, value):
        if value < 0:
            raise serializers.ValidationError("Income cannot be negative.")
        return value

    def validate_fixed_expenses(self, value):
        if value < 0:
            raise serializers.ValidationError("Expenses cannot be negative.")
        return value

    def validate_current_savings(self, value):
        if value < 0:
            raise serializers.ValidationError("Savings cannot be negative.")
        return value

    def validate_monthly_emi(self, value):
        if value < 0:
            raise serializers.ValidationError("EMI cannot be negative.")
        return value

    def validate_default_currency(self, value):
        supported = settings.SUPPORTED_CURRENCIES
        if value.upper() not in supported:
            raise serializers.ValidationError(
                f"Currency '{value}' not supported. Choose from: {', '.join(supported)}"
            )
        return value.upper()

    def validate(self, attrs):
        # Cross-field: warn if expenses exceed income (allow but flag)
        income = attrs.get("monthly_income", getattr(self.instance, "monthly_income", Decimal("0")))
        expenses = attrs.get("fixed_expenses", getattr(self.instance, "fixed_expenses", Decimal("0")))
        emi = attrs.get("monthly_emi", getattr(self.instance, "monthly_emi", Decimal("0")))

        total_outgoing = expenses + emi
        if income > 0 and total_outgoing > income:
            raise serializers.ValidationError(
                {
                    "fixed_expenses": (
                        f"Total outgoings ({total_outgoing}) exceed income ({income}). "
                        "Please review your numbers."
                    )
                }
            )
        return attrs

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # Mark onboarded once income is set > 0
        if instance.monthly_income > 0:
            instance.is_onboarded = True
        instance.save()
        return instance
