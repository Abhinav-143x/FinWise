"""
Integration tests for API endpoints.
Uses Django's test client with JWT auth.
"""
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.profiles.models import Profile
from apps.goals.models import Goal


class AuthAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_profile(self):
        res = self.client.post("/api/v1/auth/register/", {
            "email": "test@example.com",
            "password": "StrongPass1",
            "password_confirm": "StrongPass1",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("tokens", res.data)
        self.assertIn("user", res.data)
        self.assertTrue(User.objects.filter(email="test@example.com").exists())
        self.assertTrue(Profile.objects.filter(user__email="test@example.com").exists())

    def test_register_passwords_mismatch_rejected(self):
        res = self.client.post("/api/v1/auth/register/", {
            "email": "x@example.com",
            "password": "StrongPass1",
            "password_confirm": "Different1",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_login_returns_tokens(self):
        User.objects.create_user(email="login@example.com", password="StrongPass1")
        res = self.client.post("/api/v1/auth/login/", {
            "email": "login@example.com",
            "password": "StrongPass1",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_me_requires_auth(self):
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, 401)

    def test_me_returns_user(self):
        user = User.objects.create_user(email="me@example.com", password="StrongPass1")
        self.client.force_authenticate(user=user)
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], "me@example.com")


class ProfileAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="p@example.com", password="StrongPass1")
        self.client.force_authenticate(user=self.user)

    def test_get_profile_auto_creates(self):
        res = self.client.get("/api/v1/profile/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("monthly_income", res.data)

    def test_patch_profile_updates_fields(self):
        res = self.client.patch("/api/v1/profile/", {
            "monthly_income": "5000.00",
            "fixed_expenses": "2000.00",
            "current_savings": "10000.00",
            "default_currency": "USD",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["monthly_income"], "5000.00")
        self.assertTrue(res.data["is_onboarded"])

    def test_patch_profile_computes_disposable(self):
        self.client.patch("/api/v1/profile/", {
            "monthly_income": "5000.00",
            "fixed_expenses": "2000.00",
            "monthly_emi": "500.00",
            "current_savings": "1000.00",
        }, format="json")
        res = self.client.get("/api/v1/profile/")
        self.assertEqual(float(res.data["monthly_disposable"]), 2500.0)


class GoalsAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="g@example.com", password="StrongPass1")
        self.client.force_authenticate(user=self.user)

    def _create_goal(self):
        return self.client.post("/api/v1/goals/", {
            "name": "Emergency Fund",
            "target_amount": "10000.00",
            "current_amount": "2000.00",
            "monthly_contribution": "500.00",
            "currency": "USD",
        }, format="json")

    def test_create_goal(self):
        res = self._create_goal()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["name"], "Emergency Fund")

    def test_list_goals(self):
        self._create_goal()
        res = self.client.get("/api/v1/goals/")
        self.assertEqual(res.status_code, 200)

    def test_delete_goal_soft_deletes(self):
        create_res = self._create_goal()
        goal_id = create_res.data["id"]
        del_res = self.client.delete(f"/api/v1/goals/{goal_id}/")
        self.assertEqual(del_res.status_code, 204)
        # Should not appear in list
        list_res = self.client.get("/api/v1/goals/")
        ids = [g["id"] for g in (list_res.data.get("results") or list_res.data)]
        self.assertNotIn(goal_id, ids)

    def test_goals_isolated_between_users(self):
        other_user = User.objects.create_user(email="other@example.com", password="StrongPass1")
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        self._create_goal()
        res = other_client.get("/api/v1/goals/")
        results = res.data.get("results") or res.data
        self.assertEqual(len(results), 0)


class DecisionAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="d@example.com", password="StrongPass1")
        self.client.force_authenticate(user=self.user)

    def _affordability_payload(self, **overrides):
        base = {
            "purchase_amount": "800.00",
            "monthly_income": "5000.00",
            "fixed_expenses": "2000.00",
            "current_savings": "10000.00",
            "monthly_emi": "0.00",
            "currency": "USD",
        }
        base.update(overrides)
        return base

    def test_affordability_returns_verdict(self):
        res = self.client.post("/api/v1/decisions/affordability/", self._affordability_payload(), format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn(res.data["verdict"], ["SAFE", "CAUTION", "RISKY"])
        self.assertIn("recommendation", res.data)
        self.assertIn("reasons", res.data)
        self.assertIn("better_moves", res.data)
        self.assertIn("decision_id", res.data)

    def test_affordability_saves_to_history(self):
        self.client.post("/api/v1/decisions/affordability/", self._affordability_payload(), format="json")
        res = self.client.get("/api/v1/decisions/history/")
        results = res.data.get("results") or res.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["engine_type"], "affordability")

    def test_affordability_invalid_negative_amount_rejected(self):
        payload = self._affordability_payload(purchase_amount="-100")
        res = self.client.post("/api/v1/decisions/affordability/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_goal_impact_with_no_goals(self):
        res = self.client.post("/api/v1/decisions/goal-impact/", {
            "purchase_amount": "500.00",
            "current_savings": "5000.00",
            "monthly_income": "4000.00",
            "currency": "USD",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["verdict"], "SAFE")
        self.assertEqual(res.data["goal_impacts"], [])

    def test_safe_spend_returns_amount(self):
        res = self.client.post("/api/v1/decisions/safe-spend/", {
            "monthly_income": "5000.00",
            "fixed_expenses": "2000.00",
            "monthly_emi": "200.00",
            "current_savings": "12000.00",
            "total_goal_contributions": "500.00",
            "currency": "USD",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("safe_amount", res.data)
        self.assertIn("verdict", res.data)

    def test_history_filter_by_engine(self):
        self.client.post("/api/v1/decisions/affordability/", self._affordability_payload(), format="json")
        self.client.post("/api/v1/decisions/safe-spend/", {
            "monthly_income": "5000.00",
            "fixed_expenses": "2000.00",
            "monthly_emi": "0",
            "current_savings": "10000.00",
            "total_goal_contributions": "0",
            "currency": "USD",
        }, format="json")
        res = self.client.get("/api/v1/decisions/history/?engine=affordability")
        results = res.data.get("results") or res.data
        self.assertTrue(all(d["engine_type"] == "affordability" for d in results))

    def test_decisions_isolated_between_users(self):
        self.client.post("/api/v1/decisions/affordability/", self._affordability_payload(), format="json")
        other = User.objects.create_user(email="other2@example.com", password="StrongPass1")
        other_client = APIClient()
        other_client.force_authenticate(user=other)
        res = other_client.get("/api/v1/decisions/history/")
        results = res.data.get("results") or res.data
        self.assertEqual(len(results), 0)
