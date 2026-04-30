from decimal import Decimal
from rest_framework import serializers
from .models import Decision
from django.conf import settings

CC = [(c, c) for c in settings.SUPPORTED_CURRENCIES]


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Decision
        fields = ["id", "engine_type", "item_name", "input_data", "result_data",
                  "verdict", "currency", "version", "created_at"]
        read_only_fields = fields


class _PurchaseBase(serializers.Serializer):
    """Shared purchase fields."""
    purchase_amount   = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    purchase_currency = serializers.ChoiceField(choices=CC, default=None, allow_null=True, required=False)
    item_name         = serializers.CharField(max_length=200, default="", allow_blank=True, required=False)

    def validate_purchase_currency(self, v):
        return (v or "").upper() or None


class AffordabilityInputSerializer(_PurchaseBase):
    pass


class GoalImpactInputSerializer(_PurchaseBase):
    pass


class SafeSpendInputSerializer(serializers.Serializer):
    pass   # everything from profile


class BuyNowWaitInputSerializer(_PurchaseBase):
    pass


class DreamPlannerInputSerializer(serializers.Serializer):
    item_name          = serializers.CharField(max_length=200, min_length=1)
    target_price       = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    purchase_currency  = serializers.ChoiceField(choices=CC, default=None, allow_null=True, required=False)
    extra_monthly_save = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), default=Decimal("0"), required=False)

    def validate_purchase_currency(self, v):
        return (v or "").upper() or None


class EmergencyRecoveryInputSerializer(serializers.Serializer):
    expense_amount   = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    expense_label    = serializers.CharField(max_length=200, default="unexpected expense", allow_blank=True, required=False)
    expense_currency = serializers.ChoiceField(choices=CC, default=None, allow_null=True, required=False)

    def validate_expense_currency(self, v):
        return (v or "").upper() or None
