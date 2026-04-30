"""
Decision views — V2.2

Engines: affordability, goal_impact, safe_spend, buy_now_wait, dream_planner, emergency_recovery
History: paginated, filterable by engine, searchable by item_name
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.exceptions import ValidationError
from decimal import Decimal

from .models import Decision, EngineType
from .serializers import (
    DecisionSerializer,
    AffordabilityInputSerializer, GoalImpactInputSerializer, SafeSpendInputSerializer,
    BuyNowWaitInputSerializer, DreamPlannerInputSerializer, EmergencyRecoveryInputSerializer,
)
from .engines.affordability       import AffordabilityInput,      run as run_affordability
from .engines.goal_impact         import GoalImpactInput, GoalSnapshot, run as run_goal_impact
from .engines.safe_spend          import SafeSpendInput,          run as run_safe_spend
from .engines.buy_now_wait        import BuyNowWaitInput,         run as run_buy_now_wait
from .engines.dream_planner       import DreamPlannerInput,       run as run_dream_planner
from .engines.emergency_recovery  import EmergencyRecoveryInput,  run as run_emergency
from apps.goals.models  import Goal
from apps.profiles.models import Profile
from apps.common.currency import convert


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_profile(user) -> Profile:
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        raise ValidationError({"profile": "Profile not found. Complete your profile first."})
    if not profile.is_onboarded:
        raise ValidationError({"profile": "Complete your profile (income required) before running decisions."})
    return profile


def _to_profile_currency(amount: Decimal, from_currency: str, profile: Profile) -> Decimal:
    if not from_currency or from_currency.upper() == profile.default_currency.upper():
        return amount
    return convert(amount, from_currency, profile.default_currency)


def _save(user, engine_type, item_name, input_data, result, currency):
    result_dict = {
        "verdict":       result.verdict,
        "recommendation": result.recommendation,
        "reasons":       result.reasons,
        "better_moves":  result.better_moves,
        "metrics":       result.metrics,
    }
    # Engine-specific extra fields
    for key in ["goal_impacts", "recovery_plan", "milestones", "timing", "timing_label"]:
        if hasattr(result, key):
            result_dict[key] = getattr(result, key)
    for key in ["safe_amount", "amount_still_needed", "suggested_monthly_save",
                "savings_after", "recovery_months", "goal_delay_days",
                "months_to_goal", "already_affordable"]:
        if hasattr(result, key):
            val = getattr(result, key)
            result_dict[key] = str(val) if isinstance(val, Decimal) else val

    return Decision.objects.create(
        user=user, engine_type=engine_type, item_name=item_name or "",
        input_data=input_data, result_data=result_dict,
        verdict=result.verdict, currency=currency, version=result.version,
    )


def _resp(decision, result, extra=None):
    data = {
        "decision_id":    str(decision.id),
        "verdict":        result.verdict,
        "recommendation": result.recommendation,
        "reasons":        result.reasons,
        "better_moves":   result.better_moves,
        "metrics":        result.metrics,
        "currency":       decision.currency,
    }
    for key in ["goal_impacts", "recovery_plan", "milestones", "timing", "timing_label",
                "cushion_status", "already_affordable"]:
        if hasattr(result, key):
            data[key] = getattr(result, key)
    for key in ["safe_amount", "amount_still_needed", "suggested_monthly_save",
                "savings_after", "months_to_goal", "recovery_months", "goal_delay_days"]:
        if hasattr(result, key):
            val = getattr(result, key)
            data[key] = str(val) if isinstance(val, Decimal) else val
    if extra:
        data.update(extra)
    return Response(data, status=status.HTTP_200_OK)


# ── V1 Engines ────────────────────────────────────────────────────────────────

class AffordabilityView(APIView):
    """POST /api/v1/decisions/affordability/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = AffordabilityInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        profile = _require_profile(request.user)
        pc = d.get("purchase_currency") or profile.default_currency
        amt = _to_profile_currency(d["purchase_amount"], pc, profile)

        result = run_affordability(AffordabilityInput(
            purchase_amount=amt,
            monthly_income=profile.monthly_income,
            fixed_expenses=profile.fixed_expenses,
            current_savings=profile.current_savings,
            monthly_emi=profile.monthly_emi,
            currency=profile.default_currency,
        ))
        item = d.get("item_name", "")
        decision = _save(request.user, EngineType.AFFORDABILITY, item,
            {"purchase_amount": str(d["purchase_amount"]), "purchase_currency": pc,
             "converted_amount": str(amt), "item_name": item},
            result, profile.default_currency)
        return _resp(decision, result)


class GoalImpactView(APIView):
    """POST /api/v1/decisions/goal-impact/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = GoalImpactInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        profile = _require_profile(request.user)
        pc = d.get("purchase_currency") or profile.default_currency
        amt = _to_profile_currency(d["purchase_amount"], pc, profile)

        goals = [
            GoalSnapshot(goal_id=str(g.id), name=g.name, target_amount=g.target_amount,
                         current_amount=g.current_amount, monthly_contribution=g.monthly_contribution,
                         currency=g.currency)
            for g in Goal.objects.filter(user=request.user, is_active=True)
        ]
        result = run_goal_impact(GoalImpactInput(
            purchase_amount=amt, current_savings=profile.current_savings,
            monthly_income=profile.monthly_income, goals=goals, currency=profile.default_currency,
        ))
        item = d.get("item_name", "")
        decision = _save(request.user, EngineType.GOAL_IMPACT, item,
            {"purchase_amount": str(d["purchase_amount"]), "purchase_currency": pc, "item_name": item},
            result, profile.default_currency)
        return _resp(decision, result)


class SafeSpendView(APIView):
    """POST /api/v1/decisions/safe-spend/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _require_profile(request.user)
        total_contributions = sum(
            g.monthly_contribution for g in Goal.objects.filter(user=request.user, is_active=True)
        ) or Decimal("0")

        result = run_safe_spend(SafeSpendInput(
            monthly_income=profile.monthly_income, fixed_expenses=profile.fixed_expenses,
            monthly_emi=profile.monthly_emi, current_savings=profile.current_savings,
            total_goal_contributions=total_contributions, currency=profile.default_currency,
        ))
        decision = _save(request.user, EngineType.SAFE_SPEND, "",
            {"monthly_income": str(profile.monthly_income), "fixed_expenses": str(profile.fixed_expenses),
             "monthly_emi": str(profile.monthly_emi), "total_goal_contributions": str(total_contributions)},
            result, profile.default_currency)
        return _resp(decision, result)


# ── V2 Engines ────────────────────────────────────────────────────────────────

class BuyNowWaitView(APIView):
    """POST /api/v1/decisions/buy-now-wait/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = BuyNowWaitInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        profile = _require_profile(request.user)
        pc = d.get("purchase_currency") or profile.default_currency
        amt = _to_profile_currency(d["purchase_amount"], pc, profile)

        result = run_buy_now_wait(BuyNowWaitInput(
            purchase_amount=amt,
            monthly_income=profile.monthly_income,
            fixed_expenses=profile.fixed_expenses,
            current_savings=profile.current_savings,
            monthly_emi=profile.monthly_emi,
            days_to_next_salary=profile.days_to_next_salary(),
            currency=profile.default_currency,
        ))
        item = d.get("item_name", "")
        decision = _save(request.user, EngineType.BUY_NOW_WAIT, item,
            {"purchase_amount": str(d["purchase_amount"]), "purchase_currency": pc, "item_name": item},
            result, profile.default_currency)
        return _resp(decision, result)


class DreamPlannerView(APIView):
    """POST /api/v1/decisions/dream-planner/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = DreamPlannerInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        profile = _require_profile(request.user)
        pc = d.get("purchase_currency") or profile.default_currency
        price = _to_profile_currency(d["target_price"], pc, profile)

        result = run_dream_planner(DreamPlannerInput(
            item_name=d["item_name"],
            target_price=price,
            monthly_income=profile.monthly_income,
            fixed_expenses=profile.fixed_expenses,
            current_savings=profile.current_savings,
            monthly_emi=profile.monthly_emi,
            extra_monthly_save=d.get("extra_monthly_save", Decimal("0")),
            currency=profile.default_currency,
        ))
        decision = _save(request.user, EngineType.DREAM_PLANNER, d["item_name"],
            {"item_name": d["item_name"], "target_price": str(d["target_price"]),
             "purchase_currency": pc, "extra_monthly_save": str(d.get("extra_monthly_save", 0))},
            result, profile.default_currency)
        return _resp(decision, result)


class EmergencyRecoveryView(APIView):
    """POST /api/v1/decisions/emergency-recovery/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = EmergencyRecoveryInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        profile = _require_profile(request.user)
        pc = d.get("expense_currency") or profile.default_currency
        amt = _to_profile_currency(d["expense_amount"], pc, profile)

        goals_qs = Goal.objects.filter(user=request.user, is_active=True)
        total_contributions = sum(g.monthly_contribution for g in goals_qs) or Decimal("0")
        remaining_amounts   = [g.target_amount - g.current_amount for g in goals_qs]

        result = run_emergency(
            EmergencyRecoveryInput(
                expense_amount=amt,
                expense_label=d.get("expense_label", "unexpected expense"),
                monthly_income=profile.monthly_income,
                fixed_expenses=profile.fixed_expenses,
                current_savings=profile.current_savings,
                monthly_emi=profile.monthly_emi,
                currency=profile.default_currency,
            ),
            goal_monthly_contributions=total_contributions,
            goals_remaining_amounts=remaining_amounts,
        )
        decision = _save(request.user, EngineType.EMERGENCY_RECOVERY,
            d.get("expense_label", "Emergency"),
            {"expense_amount": str(d["expense_amount"]), "expense_label": d.get("expense_label"),
             "expense_currency": pc},
            result, profile.default_currency)
        return _resp(decision, result)


# ── History ───────────────────────────────────────────────────────────────────

class DecisionHistoryView(generics.ListAPIView):
    """GET /api/v1/decisions/history/?engine=&search="""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Decision.objects.filter(user=self.request.user)
        engine = self.request.query_params.get("engine")
        search = self.request.query_params.get("search", "").strip()
        if engine:
            qs = qs.filter(engine_type=engine)
        if search:
            qs = qs.filter(item_name__icontains=search)
        return qs


class DecisionDetailDeleteView(generics.RetrieveDestroyAPIView):
    """GET / DELETE /api/v1/decisions/<id>/"""
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Decision.objects.filter(user=self.request.user)
