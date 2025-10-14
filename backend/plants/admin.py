# plants/admin.py
from django.contrib import admin
from .models import Plant

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
  list_display = ("name", "latin", "popular", "sun", "water", "difficulty")
  list_filter = ("popular", "sun", "water", "difficulty")
  search_fields = ("name", "latin")
