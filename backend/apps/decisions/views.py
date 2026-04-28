"""
Decision views.
Each engine has its own endpoint for clarity.
All results are persisted to the Decision table.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from decimal import Decimal

from .models import Decision, EngineType
from .serializers import (
    DecisionSerializer,
    AffordabilityInputSerializer,
    GoalImpactInputSerializer,
    SafeSpendInputSerializer,
)
from .engines.affordability import AffordabilityInput, run as run_affordability
from .engines.goal_impact import GoalImpactInput, GoalSnapshot, run as run_goal_impact
from .engines.safe_spend import SafeSpendInput, run as run_safe_spend
from .engines import ENGINE_REGISTRY
from apps.goals.models import Goal


def _save_decision(user, engine_type, input_data, result, currency):
    """Persist decision to DB and return the saved object."""
    result_dict = {
        "verdict": result.verdict,
        "recommendation": result.recommendation,
        "reasons": result.reasons,
        "better_moves": result.better_moves,
        "metrics": result.metrics,
    }
    # Some engines add extra fields
    for extra in ["goal_impacts"]:
        if hasattr(result, extra):
            result_dict[extra] = getattr(result, extra)
    if hasattr(result, "safe_amount"):
        result_dict["safe_amount"] = str(result.safe_amount)

    return Decision.objects.create(
        user=user,
        engine_type=engine_type,
        input_data=input_data,
        result_data=result_dict,
        verdict=result.verdict,
        currency=currency,
        version=result.version,
    )


class AffordabilityView(APIView):
    """POST /api/v1/decisions/affordability/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = AffordabilityInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        inp = AffordabilityInput(**d)
        result = run_affordability(inp)

        decision = _save_decision(
            request.user, EngineType.AFFORDABILITY,
            {k: str(v) for k, v in d.items()},
            result, d["currency"],
        )
        return Response(
            {
                "decision_id": str(decision.id),
                "verdict": result.verdict,
                "recommendation": result.recommendation,
                "reasons": result.reasons,
                "better_moves": result.better_moves,
                "metrics": result.metrics,
            },
            status=status.HTTP_200_OK,
        )


class GoalImpactView(APIView):
    """POST /api/v1/decisions/goal-impact/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = GoalImpactInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Load user's goals
        goals_qs = Goal.objects.filter(user=request.user, is_active=True)
        goals = [
            GoalSnapshot(
                goal_id=str(g.id),
                name=g.name,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                monthly_contribution=g.monthly_contribution,
                currency=g.currency,
            )
            for g in goals_qs
        ]

        inp = GoalImpactInput(
            purchase_amount=d["purchase_amount"],
            current_savings=d["current_savings"],
            monthly_income=d["monthly_income"],
            goals=goals,
            currency=d["currency"],
        )
        result = run_goal_impact(inp)

        decision = _save_decision(
            request.user, EngineType.GOAL_IMPACT,
            {k: str(v) for k, v in d.items() if not isinstance(v, list)},
            result, d["currency"],
        )
        return Response(
            {
                "decision_id": str(decision.id),
                "verdict": result.verdict,
                "recommendation": result.recommendation,
                "reasons": result.reasons,
                "better_moves": result.better_moves,
                "goal_impacts": result.goal_impacts,
                "metrics": result.metrics,
            },
            status=status.HTTP_200_OK,
        )


class SafeSpendView(APIView):
    """POST /api/v1/decisions/safe-spend/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = SafeSpendInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        inp = SafeSpendInput(**d)
        result = run_safe_spend(inp)

        decision = _save_decision(
            request.user, EngineType.SAFE_SPEND,
            {k: str(v) for k, v in d.items()},
            result, d["currency"],
        )
        return Response(
            {
                "decision_id": str(decision.id),
                "verdict": result.verdict,
                "recommendation": result.recommendation,
                "safe_amount": str(result.safe_amount),
                "reasons": result.reasons,
                "better_moves": result.better_moves,
                "metrics": result.metrics,
            },
            status=status.HTTP_200_OK,
        )


class DecisionHistoryView(generics.ListAPIView):
    """GET /api/v1/decisions/history/ — paginated history"""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Decision.objects.filter(user=self.request.user)
        engine = self.request.query_params.get("engine")
        if engine:
            qs = qs.filter(engine_type=engine)
        return qs


class DecisionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/decisions/<id>/"""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Decision.objects.filter(user=self.request.user)
