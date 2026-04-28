from django.contrib import admin
from .models import Decision


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ["engine_type", "verdict", "currency", "user", "version", "created_at"]
    list_filter = ["engine_type", "verdict", "currency"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "input_data", "result_data"]
    ordering = ["-created_at"]
