"""
Decision serializers — V1.5

Engine input serializers now only require the decision-specific fields.
Profile data is loaded server-side by views.
"""
from decimal import Decimal
from rest_framework import serializers
from .models import Decision
from django.conf import settings

CURRENCY_CODES = settings.SUPPORTED_CURRENCIES


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = [
            "id", "engine_type", "input_data", "result_data",
            "verdict", "currency", "version", "created_at",
        ]
        read_only_fields = fields


class AffordabilityInputSerializer(serializers.Serializer):
    purchase_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2,
        min_value=Decimal("0.01"),
        error_messages={"min_value": "Purchase amount must be greater than 0."},
    )
    purchase_currency = serializers.ChoiceField(
        choices=[(c, c) for c in CURRENCY_CODES],
        default=None,
        allow_null=True,
        required=False,
        help_text="Currency of the purchase. Defaults to profile currency.",
    )

    def validate_purchase_currency(self, value):
        return (value or "").upper() or None


class GoalImpactInputSerializer(serializers.Serializer):
    purchase_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2,
        min_value=Decimal("0.01"),
        error_messages={"min_value": "Purchase amount must be greater than 0."},
    )
    purchase_currency = serializers.ChoiceField(
        choices=[(c, c) for c in CURRENCY_CODES],
        default=None,
        allow_null=True,
        required=False,
    )

    def validate_purchase_currency(self, value):
        return (value or "").upper() or None


class SafeSpendInputSerializer(serializers.Serializer):
    """Safe to Spend takes no input — everything from profile + goals."""
    pass
