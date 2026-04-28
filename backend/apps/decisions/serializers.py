"""Decision serializers."""
from rest_framework import serializers
from .models import Decision


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = [
            "id", "engine_type", "input_data", "result_data",
            "verdict", "currency", "version", "created_at",
        ]
        read_only_fields = fields


class AffordabilityInputSerializer(serializers.Serializer):
    purchase_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    monthly_income = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    fixed_expenses = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    current_savings = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    monthly_emi = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, default=0)
    currency = serializers.CharField(max_length=3, default="USD")


class GoalImpactInputSerializer(serializers.Serializer):
    purchase_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    current_savings = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    monthly_income = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    use_profile_goals = serializers.BooleanField(default=True)
    currency = serializers.CharField(max_length=3, default="USD")


class SafeSpendInputSerializer(serializers.Serializer):
    monthly_income = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    fixed_expenses = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    monthly_emi = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, default=0)
    current_savings = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    total_goal_contributions = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, default=0)
    currency = serializers.CharField(max_length=3, default="USD")
