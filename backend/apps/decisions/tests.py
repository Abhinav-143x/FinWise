"""
Unit tests for all decision engines.
Pure logic tests — no DB, no HTTP.
Run: python manage.py test apps.decisions.tests
"""
from decimal import Decimal
from django.test import TestCase

from apps.decisions.engines.affordability import AffordabilityInput, run as run_afford
from apps.decisions.engines.goal_impact import GoalImpactInput, GoalSnapshot, run as run_goal
from apps.decisions.engines.safe_spend import SafeSpendInput, run as run_safe


# ─── Affordability Engine ─────────────────────────────────────────────────────

class AffordabilityEngineTests(TestCase):

    def _base(self, **overrides):
        defaults = dict(
            purchase_amount=Decimal("500"),
            monthly_income=Decimal("5000"),
            fixed_expenses=Decimal("2000"),
            current_savings=Decimal("10000"),
            monthly_emi=Decimal("0"),
            currency="USD",
        )
        defaults.update(overrides)
        return AffordabilityInput(**defaults)

    def test_safe_verdict_for_small_purchase(self):
        inp = self._base(purchase_amount=Decimal("200"))
        result = run_afford(inp)
        self.assertEqual(result.verdict, "SAFE")

    def test_caution_when_uses_half_savings(self):
        inp = self._base(purchase_amount=Decimal("5000"), current_savings=Decimal("10000"))
        result = run_afford(inp)
        self.assertIn(result.verdict, ("CAUTION", "RISKY"))

    def test_risky_when_depletes_savings(self):
        inp = self._base(
            purchase_amount=Decimal("9500"),
            current_savings=Decimal("10000"),
            fixed_expenses=Decimal("3000"),
        )
        result = run_afford(inp)
        self.assertEqual(result.verdict, "RISKY")

    def test_risky_when_expenses_exceed_income(self):
        inp = self._base(
            monthly_income=Decimal("2000"),
            fixed_expenses=Decimal("2500"),
        )
        result = run_afford(inp)
        self.assertEqual(result.verdict, "RISKY")
        self.assertIn("exceed", result.recommendation.lower())

    def test_result_has_required_fields(self):
        result = run_afford(self._base())
        self.assertIn(result.verdict, ("SAFE", "CAUTION", "RISKY"))
        self.assertIsInstance(result.recommendation, str)
        self.assertIsInstance(result.reasons, list)
        self.assertIsInstance(result.better_moves, list)
        self.assertIsInstance(result.metrics, dict)

    def test_metrics_contain_key_fields(self):
        result = run_afford(self._base())
        self.assertIn("savings_used_pct", result.metrics)
        self.assertIn("monthly_disposable", result.metrics)
        self.assertIn("months_to_save", result.metrics)

    def test_caution_suggests_wait_period(self):
        inp = self._base(purchase_amount=Decimal("4000"), current_savings=Decimal("8000"))
        result = run_afford(inp)
        if result.verdict == "CAUTION":
            moves_text = " ".join(result.better_moves).lower()
            self.assertTrue("wait" in moves_text or "month" in moves_text)

    def test_zero_savings_triggers_risky(self):
        inp = self._base(purchase_amount=Decimal("100"), current_savings=Decimal("0"))
        result = run_afford(inp)
        self.assertEqual(result.verdict, "RISKY")


# ─── Goal Impact Engine ───────────────────────────────────────────────────────

class GoalImpactEngineTests(TestCase):

    def _goal(self, **kw):
        defaults = dict(
            goal_id="g1",
            name="Emergency Fund",
            target_amount=Decimal("10000"),
            current_amount=Decimal("3000"),
            monthly_contribution=Decimal("500"),
            currency="USD",
        )
        defaults.update(kw)
        return GoalSnapshot(**defaults)

    def _base(self, goals=None, **overrides):
        defaults = dict(
            purchase_amount=Decimal("1000"),
            current_savings=Decimal("8000"),
            monthly_income=Decimal("5000"),
            goals=goals if goals is not None else [self._goal()],
            currency="USD",
        )
        defaults.update(overrides)
        return GoalImpactInput(**defaults)

    def test_safe_when_small_purchase_vs_goals(self):
        inp = self._base(purchase_amount=Decimal("100"))
        result = run_goal(inp)
        self.assertEqual(result.verdict, "SAFE")

    def test_risky_when_purchase_large_vs_remaining(self):
        g = self._goal(target_amount=Decimal("5000"), current_amount=Decimal("0"))
        inp = self._base(purchase_amount=Decimal("4000"), goals=[g])
        result = run_goal(inp)
        self.assertIn(result.verdict, ("RISKY", "CAUTION"))

    def test_no_goals_returns_safe(self):
        inp = self._base(goals=[])
        result = run_goal(inp)
        self.assertEqual(result.verdict, "SAFE")
        self.assertIn("no active goals", result.recommendation.lower())

    def test_goal_impacts_list_populated(self):
        inp = self._base()
        result = run_goal(inp)
        self.assertIsInstance(result.goal_impacts, list)
        if result.goal_impacts:
            impact = result.goal_impacts[0]
            self.assertIn("goal_name", impact)
            self.assertIn("impact_label", impact)
            self.assertIn("impact_pct", impact)

    def test_multiple_goals_all_assessed(self):
        goals = [
            self._goal(goal_id="g1", name="Emergency"),
            self._goal(goal_id="g2", name="Vacation", target_amount=Decimal("3000")),
        ]
        inp = self._base(goals=goals)
        result = run_goal(inp)
        self.assertEqual(len(result.goal_impacts), 2)

    def test_completed_goals_skipped(self):
        g = self._goal(target_amount=Decimal("5000"), current_amount=Decimal("5000"))
        inp = self._base(goals=[g])
        result = run_goal(inp)
        # Completed goal (remaining=0) should be skipped
        self.assertEqual(len(result.goal_impacts), 0)


# ─── Safe Spend Engine ────────────────────────────────────────────────────────

class SafeSpendEngineTests(TestCase):

    def _base(self, **overrides):
        defaults = dict(
            monthly_income=Decimal("5000"),
            fixed_expenses=Decimal("2000"),
            monthly_emi=Decimal("200"),
            current_savings=Decimal("12000"),
            total_goal_contributions=Decimal("500"),
            currency="USD",
        )
        defaults.update(overrides)
        return SafeSpendInput(**defaults)

    def test_safe_amount_is_positive_for_healthy_finances(self):
        result = run_safe(self._base())
        self.assertGreater(result.safe_amount, Decimal("0"))
        self.assertEqual(result.verdict, "SAFE")

    def test_safe_amount_zero_when_expenses_exceed_income(self):
        inp = self._base(monthly_income=Decimal("1000"), fixed_expenses=Decimal("1500"))
        result = run_safe(inp)
        self.assertEqual(result.safe_amount, Decimal("0"))
        self.assertEqual(result.verdict, "RISKY")

    def test_caution_when_goals_consume_all_disposable(self):
        inp = self._base(
            monthly_income=Decimal("3000"),
            fixed_expenses=Decimal("1500"),
            monthly_emi=Decimal("500"),
            total_goal_contributions=Decimal("900"),
        )
        result = run_safe(inp)
        self.assertIn(result.verdict, ("CAUTION", "RISKY"))

    def test_result_has_required_fields(self):
        result = run_safe(self._base())
        self.assertIn(result.verdict, ("SAFE", "CAUTION", "RISKY"))
        self.assertIsNotNone(result.safe_amount)
        self.assertIsInstance(result.recommendation, str)
        self.assertIsInstance(result.metrics, dict)

    def test_emergency_fund_gap_reduces_safe_amount(self):
        # Low savings → emergency top-up reduces safe spend
        low_savings = self._base(current_savings=Decimal("1000"))
        good_savings = self._base(current_savings=Decimal("20000"))
        result_low = run_safe(low_savings)
        result_good = run_safe(good_savings)
        self.assertLessEqual(result_low.safe_amount, result_good.safe_amount)

    def test_metrics_contain_safe_amount(self):
        result = run_safe(self._base())
        self.assertIn("safe_spend_amount", result.metrics)
        self.assertIn("monthly_disposable", result.metrics)

    def test_safe_amount_capped_at_40pct_income(self):
        # Even with very low expenses, safe amount never exceeds 40% of income
        inp = self._base(
            monthly_income=Decimal("10000"),
            fixed_expenses=Decimal("100"),
            monthly_emi=Decimal("0"),
            total_goal_contributions=Decimal("0"),
            current_savings=Decimal("100000"),
        )
        result = run_safe(inp)
        cap = Decimal("10000") * Decimal("0.40")
        self.assertLessEqual(result.safe_amount, cap)
