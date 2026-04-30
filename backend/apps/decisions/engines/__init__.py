"""
Engine registry — add new engines here only, nothing else needed.
"""
from .affordability   import run as run_affordability,   AffordabilityInput,   ENGINE_VERSION as V_AFFORD
from .goal_impact     import run as run_goal_impact,     GoalImpactInput,      ENGINE_VERSION as V_GOAL
from .safe_spend      import run as run_safe_spend,      SafeSpendInput,       ENGINE_VERSION as V_SAFE
from .buy_now_wait    import run as run_buy_now_wait,    BuyNowWaitInput,      ENGINE_VERSION as V_BUY
from .dream_planner   import run as run_dream_planner,   DreamPlannerInput,    ENGINE_VERSION as V_DREAM
from .emergency_recovery import run as run_emergency,   EmergencyRecoveryInput, ENGINE_VERSION as V_EMERGENCY

ENGINE_REGISTRY = {
    "affordability":        {"run": run_affordability, "version": V_AFFORD},
    "goal_impact":          {"run": run_goal_impact,   "version": V_GOAL},
    "safe_spend":           {"run": run_safe_spend,    "version": V_SAFE},
    "buy_now_wait":         {"run": run_buy_now_wait,  "version": V_BUY},
    "dream_planner":        {"run": run_dream_planner, "version": V_DREAM},
    "emergency_recovery":   {"run": run_emergency,     "version": V_EMERGENCY},
}

__all__ = ["ENGINE_REGISTRY"]
