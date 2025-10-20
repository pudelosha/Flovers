from django.contrib import admin
from .models import PlantInstance

@admin.register(PlantInstance)
class PlantInstanceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "display_name", "location", "plant_definition", "qr_code", "created_at")
    list_filter = ("light_level", "orientation", "create_auto_tasks")
    search_fields = ("display_name", "notes", "qr_code")
    readonly_fields = ("qr_code",)
