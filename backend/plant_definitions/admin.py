from django.contrib import admin
from .models import (
    PlantDefinition,
    PlantDefinitionTranslation,
    PlantTraitDefinition,
    PlantTraitDefinitionTranslation,
    PlantDefinitionTrait,
)


class PlantDefinitionTranslationInline(admin.TabularInline):
    model = PlantDefinitionTranslation
    extra = 1


class PlantDefinitionTraitInline(admin.TabularInline):
    model = PlantDefinitionTrait
    extra = 1
    autocomplete_fields = ("trait",)


@admin.register(PlantDefinition)
class PlantDefinitionAdmin(admin.ModelAdmin):
    list_display = (
        "external_id",
        "name",
        "latin",
        "popular",
        "sun",
        "water",
        "difficulty",
    )
    list_filter = ("popular", "sun", "water", "difficulty")
    search_fields = ("external_id", "name", "latin")
    inlines = [PlantDefinitionTranslationInline, PlantDefinitionTraitInline]


class PlantTraitDefinitionTranslationInline(admin.TabularInline):
    model = PlantTraitDefinitionTranslation
    extra = 1


@admin.register(PlantTraitDefinition)
class PlantTraitDefinitionAdmin(admin.ModelAdmin):
    list_display = ("key", "category")
    search_fields = ("key", "category")
    inlines = [PlantTraitDefinitionTranslationInline]


@admin.register(PlantDefinitionTrait)
class PlantDefinitionTraitAdmin(admin.ModelAdmin):
    list_display = ("plant_definition", "trait", "updated_at")
    search_fields = ("plant_definition__external_id", "trait__key")
    autocomplete_fields = ("plant_definition", "trait")
