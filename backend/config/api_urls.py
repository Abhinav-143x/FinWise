"""
API v1 URL configuration.
Each app registers its own router/urls and is included here.
"""
from django.urls import path, include

urlpatterns = [
    # Auth & Users
    path("auth/", include("apps.users.urls")),

    # Profile
    path("profile/", include("apps.profiles.urls")),

    # Goals
    path("goals/", include("apps.goals.urls")),

    # Decisions (all engines)
    path("decisions/", include("apps.decisions.urls")),

    # Currency rates + conversion
    path("currency/", include("apps.common.urls")),
]
