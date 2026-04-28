from django.urls import path
from .views import (
    AffordabilityView,
    GoalImpactView,
    SafeSpendView,
    DecisionHistoryView,
    DecisionDetailView,
)

urlpatterns = [
    # Engine endpoints
    path("affordability/", AffordabilityView.as_view(), name="decision-affordability"),
    path("goal-impact/", GoalImpactView.as_view(), name="decision-goal-impact"),
    path("safe-spend/", SafeSpendView.as_view(), name="decision-safe-spend"),

    # History & detail
    path("history/", DecisionHistoryView.as_view(), name="decision-history"),
    path("<uuid:pk>/", DecisionDetailView.as_view(), name="decision-detail"),
]
