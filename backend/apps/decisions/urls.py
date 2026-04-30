from django.urls import path
from .views import (
    AffordabilityView, GoalImpactView, SafeSpendView,
    BuyNowWaitView, DreamPlannerView, EmergencyRecoveryView,
    DecisionHistoryView, DecisionDetailDeleteView,
)

urlpatterns = [
    path("affordability/",       AffordabilityView.as_view(),      name="decision-affordability"),
    path("goal-impact/",         GoalImpactView.as_view(),          name="decision-goal-impact"),
    path("safe-spend/",          SafeSpendView.as_view(),           name="decision-safe-spend"),
    path("buy-now-wait/",        BuyNowWaitView.as_view(),          name="decision-buy-now-wait"),
    path("dream-planner/",       DreamPlannerView.as_view(),        name="decision-dream-planner"),
    path("emergency-recovery/",  EmergencyRecoveryView.as_view(),   name="decision-emergency-recovery"),
    path("history/",             DecisionHistoryView.as_view(),     name="decision-history"),
    path("<uuid:pk>/",           DecisionDetailDeleteView.as_view(), name="decision-detail"),
]
