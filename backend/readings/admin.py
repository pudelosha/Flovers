from django.contrib import admin
from .models import ReadingDevice, Reading, AccountSecret

@admin.register(ReadingDevice)
class ReadingDeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "device_name", "plant_name", "is_active", "interval_hours", "last_read_at")
    list_filter = ("is_active",)
    search_fields = ("device_name", "plant_name", "plant_location", "device_key")

@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "timestamp", "temperature", "humidity", "light", "moisture")
    list_filter = ("device",)
    search_fields = ("device__device_name",)

@admin.register(AccountSecret)
class AccountSecretAdmin(admin.ModelAdmin):
    list_display = ("user", "rotated_at")
    search_fields = ("user__email",)
