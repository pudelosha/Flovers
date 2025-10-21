from django.contrib import admin
from .models import ProfileSettings, ProfileNotifications

@admin.register(ProfileSettings)
class ProfileSettingsAdmin(admin.ModelAdmin):
    list_display = ("user", "language", "date_format", "temperature_unit", "measure_unit", "tile_transparency", "background", "fab_position", "updated_at")
    list_select_related = ("user",)
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at")

@admin.register(ProfileNotifications)
class ProfileNotificationsAdmin(admin.ModelAdmin):
    list_display = ("user", "email_daily", "email_hour", "email_24h", "push_daily", "push_hour", "push_24h", "updated_at")
    list_select_related = ("user",)
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at")
