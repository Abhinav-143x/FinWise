from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    monthly_disposable  = serializers.ReadOnlyField()
    emergency_fund_months = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = [
            "id", "monthly_income", "fixed_expenses", "current_savings",
            "monthly_emi", "default_currency", "country", "salary_day",
            "is_onboarded", "monthly_disposable", "emergency_fund_months", "updated_at",
        ]
        read_only_fields = ["id", "is_onboarded", "updated_at"]

    def validate_monthly_income(self, v):
        if v < 0: raise serializers.ValidationError("Income cannot be negative.")
        return v

    def validate_fixed_expenses(self, v):
        if v < 0: raise serializers.ValidationError("Cannot be negative.")
        return v

    def validate_current_savings(self, v):
        if v < 0: raise serializers.ValidationError("Cannot be negative.")
        return v

    def validate_monthly_emi(self, v):
        if v < 0: raise serializers.ValidationError("Cannot be negative.")
        return v

    def validate_salary_day(self, v):
        if v is not None and not (1 <= v <= 31):
            raise serializers.ValidationError("Salary day must be 1–31.")
        return v

    def validate_default_currency(self, v):
        if v.upper() not in settings.SUPPORTED_CURRENCIES:
            raise serializers.ValidationError(f"Currency '{v}' not supported.")
        return v.upper()

    def validate(self, attrs):
        income   = attrs.get("monthly_income",  getattr(self.instance, "monthly_income",  Decimal("0")))
        expenses = attrs.get("fixed_expenses",  getattr(self.instance, "fixed_expenses",  Decimal("0")))
        emi      = attrs.get("monthly_emi",     getattr(self.instance, "monthly_emi",     Decimal("0")))
        if income > 0 and (expenses + emi) >= income:
            raise serializers.ValidationError(
                {"fixed_expenses": "Expenses + EMIs must be less than income."}
            )
        return attrs

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if instance.monthly_income > 0:
            instance.is_onboarded = True
        instance.save()
        return instance
