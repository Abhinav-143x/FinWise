"""
Decision views — V1.5

Key changes:
- All engines auto-load profile. User only provides the decision-specific input.
- Currency conversion: if purchase currency differs from profile currency, we convert.
- DELETE /decisions/<id>/ added.
- Profile not set → 400 with clear message (redirect handled on frontend).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.exceptions import ValidationError
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
from apps.goals.models import Goal
from apps.profiles.models import Profile
from apps.common.currency import convert


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_profile(user) -> Profile:
    """
    Load user profile. Raises ValidationError if not onboarded.
    All engine views call this first.
    """
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        raise ValidationError(
            {"profile": "Profile not found. Please complete your profile first."},
            code="profile_required",
        )
    if not profile.is_onboarded:
        raise ValidationError(
            {"profile": "Please complete your profile (income required) before running decisions."},
            code="profile_incomplete",
        )
    return profile


def _to_profile_currency(amount: Decimal, from_currency: str, profile: Profile) -> Decimal:
    if from_currency.upper() == profile.default_currency.upper():
        return amount
    return convert(amount, from_currency, profile.default_currency)


def _save_decision(user, engine_type, input_data, result, currency):
    result_dict = {
        "verdict": result.verdict,
        "recommendation": result.recommendation,
        "reasons": result.reasons,
        "better_moves": result.better_moves,
        "metrics": result.metrics,
    }
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


def _result_response(decision, result, extra=None):
    data = {
        "decision_id": str(decision.id),
        "verdict": result.verdict,
        "recommendation": result.recommendation,
        "reasons": result.reasons,
        "better_moves": result.better_moves,
        "metrics": result.metrics,
        "currency": decision.currency,
    }
    if extra:
        data.update(extra)
    return Response(data, status=status.HTTP_200_OK)


# ── Engine Views ──────────────────────────────────────────────────────────────

class AffordabilityView(APIView):
    """POST /api/v1/decisions/affordability/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = AffordabilityInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        profile = _require_profile(request.user)

        purchase_currency = d.get("purchase_currency", profile.default_currency)
        purchase_amount = _to_profile_currency(d["purchase_amount"], purchase_currency, profile)

        inp = AffordabilityInput(
            purchase_amount=purchase_amount,
            monthly_income=profile.monthly_income,
            fixed_expenses=profile.fixed_expenses,
            current_savings=profile.current_savings,
            monthly_emi=profile.monthly_emi,
            currency=profile.default_currency,
        )
        result = run_affordability(inp)
        decision = _save_decision(
            request.user, EngineType.AFFORDABILITY,
            {
                "purchase_amount": str(d["purchase_amount"]),
                "purchase_currency": purchase_currency,
                "converted_amount": str(purchase_amount),
                "profile_currency": profile.default_currency,
            },
            result, profile.default_currency,
        )
        return _result_response(decision, result)


class GoalImpactView(APIView):
    """POST /api/v1/decisions/goal-impact/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = GoalImpactInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        profile = _require_profile(request.user)

        purchase_currency = d.get("purchase_currency", profile.default_currency)
        purchase_amount = _to_profile_currency(d["purchase_amount"], purchase_currency, profile)

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
            purchase_amount=purchase_amount,
            current_savings=profile.current_savings,
            monthly_income=profile.monthly_income,
            goals=goals,
            currency=profile.default_currency,
        )
        result = run_goal_impact(inp)
        decision = _save_decision(
            request.user, EngineType.GOAL_IMPACT,
            {
                "purchase_amount": str(d["purchase_amount"]),
                "purchase_currency": purchase_currency,
                "converted_amount": str(purchase_amount),
            },
            result, profile.default_currency,
        )
        return _result_response(decision, result, extra={"goal_impacts": result.goal_impacts})


class SafeSpendView(APIView):
    """POST /api/v1/decisions/safe-spend/ — zero inputs needed, all from profile"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _require_profile(request.user)

        goals_qs = Goal.objects.filter(user=request.user, is_active=True)
        total_contributions = sum(g.monthly_contribution for g in goals_qs) or Decimal("0")

        inp = SafeSpendInput(
            monthly_income=profile.monthly_income,
            fixed_expenses=profile.fixed_expenses,
            monthly_emi=profile.monthly_emi,
            current_savings=profile.current_savings,
            total_goal_contributions=total_contributions,
            currency=profile.default_currency,
        )
        result = run_safe_spend(inp)
        decision = _save_decision(
            request.user, EngineType.SAFE_SPEND,
            {
                "monthly_income": str(profile.monthly_income),
                "fixed_expenses": str(profile.fixed_expenses),
                "monthly_emi": str(profile.monthly_emi),
                "total_goal_contributions": str(total_contributions),
            },
            result, profile.default_currency,
        )
        return _result_response(decision, result, extra={"safe_amount": str(result.safe_amount)})


# ── History Views ─────────────────────────────────────────────────────────────

class DecisionHistoryView(generics.ListAPIView):
    """GET /api/v1/decisions/history/"""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Decision.objects.filter(user=self.request.user)
        engine = self.request.query_params.get("engine")
        if engine:
            qs = qs.filter(engine_type=engine)
        return qs


class DecisionDetailDeleteView(generics.RetrieveDestroyAPIView):
    """GET /DELETE /api/v1/decisions/<id>/"""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Decision.objects.filter(user=self.request.user)
