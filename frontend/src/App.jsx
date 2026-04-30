import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

import LandingPage         from "@/pages/LandingPage";
import LoginPage           from "@/pages/LoginPage";
import RegisterPage        from "@/pages/RegisterPage";
import DashboardPage       from "@/pages/DashboardPage";
import ProfilePage         from "@/pages/ProfilePage";
import GoalsPage           from "@/pages/GoalsPage";
import HistoryPage         from "@/pages/HistoryPage";
import AffordabilityPage   from "@/pages/decisions/AffordabilityPage";
import GoalImpactPage      from "@/pages/decisions/GoalImpactPage";
import SafeSpendPage       from "@/pages/decisions/SafeSpendPage";
import BuyNowWaitPage      from "@/pages/decisions/BuyNowWaitPage";
import DreamPlannerPage    from "@/pages/decisions/DreamPlannerPage";
import EmergencyRecoveryPage from "@/pages/decisions/EmergencyRecoveryPage";

import AppLayout  from "@/components/layout/AppLayout";
import AuthGuard  from "@/components/layout/AuthGuard";

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <Routes>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"              element={<DashboardPage />} />
          <Route path="/profile"                element={<ProfilePage />} />
          <Route path="/goals"                  element={<GoalsPage />} />
          <Route path="/history"                element={<HistoryPage />} />
          <Route path="/decide/afford"          element={<AffordabilityPage />} />
          <Route path="/decide/goal-impact"     element={<GoalImpactPage />} />
          <Route path="/decide/safe-spend"      element={<SafeSpendPage />} />
          <Route path="/decide/buy-now-wait"    element={<BuyNowWaitPage />} />
          <Route path="/decide/dream-planner"   element={<DreamPlannerPage />} />
          <Route path="/decide/emergency"       element={<EmergencyRecoveryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
