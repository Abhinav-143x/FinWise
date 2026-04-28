"""
Engine registry.
Adding a new engine: create engines/<name>.py, register it here.
"""
from .affordability import run as run_affordability, AffordabilityInput, ENGINE_VERSION as AFFORDABILITY_VERSION
from .goal_impact import run as run_goal_impact, GoalImpactInput, ENGINE_VERSION as GOAL_IMPACT_VERSION
from .safe_spend import run as run_safe_spend, SafeSpendInput, ENGINE_VERSION as SAFE_SPEND_VERSION

ENGINE_REGISTRY = {
    "affordability": {
        "run": run_affordability,
        "input_class": AffordabilityInput,
        "version": AFFORDABILITY_VERSION,
    },
    "goal_impact": {
        "run": run_goal_impact,
        "input_class": GoalImpactInput,
        "version": GOAL_IMPACT_VERSION,
    },
    "safe_spend": {
        "run": run_safe_spend,
        "input_class": SafeSpendInput,
        "version": SAFE_SPEND_VERSION,
    },
}

__all__ = ["ENGINE_REGISTRY"]
