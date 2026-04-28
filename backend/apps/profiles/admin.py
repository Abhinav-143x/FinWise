from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "monthly_income", "default_currency", "country", "is_onboarded"]
    list_filter = ["default_currency", "country", "is_onboarded"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "updated_at", "monthly_disposable", "emergency_fund_months"]
