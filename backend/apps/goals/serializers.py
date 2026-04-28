"""Goals serializers."""
from rest_framework import serializers
from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    remaining_amount = serializers.ReadOnlyField()
    progress_percent = serializers.ReadOnlyField()
    months_to_complete = serializers.ReadOnlyField()

    class Meta:
        model = Goal
        fields = [
            "id", "name", "target_amount", "current_amount",
            "monthly_contribution", "currency", "is_active",
            "remaining_amount", "progress_percent", "months_to_complete",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
