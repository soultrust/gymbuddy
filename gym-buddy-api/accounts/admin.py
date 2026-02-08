from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserIdentity


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "is_staff", "date_joined"]
    ordering = ["-date_joined"]
    search_fields = ["email", "username"]


@admin.register(UserIdentity)
class UserIdentityAdmin(admin.ModelAdmin):
    list_display = ["user", "provider", "provider_uid"]
