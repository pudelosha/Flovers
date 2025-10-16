# plant_definitions/admin.py
from django.contrib import admin
from .models import PlantDefinition

@admin.register(PlantDefinition)
class PlantDefinitionAdmin(admin.ModelAdmin):
  list_display = ("name", "latin", "popular", "sun", "water", "difficulty")
  list_filter = ("popular", "sun", "water", "difficulty")
  search_fields = ("name", "latin")
