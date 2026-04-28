"""Profile serializers."""
from rest_framework import serializers
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

    def update(self, instance, validated_data):
        # Mark onboarded once income is provided
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if instance.monthly_income > 0:
            instance.is_onboarded = True
        instance.save()
        return instance
