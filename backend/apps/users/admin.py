from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["email", "is_active", "is_staff", "created_at", "deleted_at"]
    list_filter = ["is_active", "is_staff"]
    search_fields = ["email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]
