from django.urls import path
from .views import (
    AffordabilityView,
    GoalImpactView,
    SafeSpendView,
    DecisionHistoryView,
    DecisionDetailDeleteView,
)

urlpatterns = [
    path("affordability/", AffordabilityView.as_view(), name="decision-affordability"),
    path("goal-impact/", GoalImpactView.as_view(), name="decision-goal-impact"),
    path("safe-spend/", SafeSpendView.as_view(), name="decision-safe-spend"),
    path("history/", DecisionHistoryView.as_view(), name="decision-history"),
    path("<uuid:pk>/", DecisionDetailDeleteView.as_view(), name="decision-detail"),
]
