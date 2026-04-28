from django.contrib import admin
from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "target_amount", "current_amount", "currency", "is_active"]
    list_filter = ["currency", "is_active"]
    search_fields = ["user__email", "name"]
    readonly_fields = ["id", "created_at", "updated_at", "remaining_amount", "progress_percent"]
