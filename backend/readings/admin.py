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


# Manufacturing administration never handles bootstrap private keys or printable PoPs.
from django import forms
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.urls import path
from . import manufacturing
from .models import ManufacturingBatch, ManufacturingEvent, PhysicalDevice


class ManufacturingAccess:
    def allowed(self, request):
        try:
            manufacturing.authorize(request.user)
            return True
        except PermissionDenied:
            return False

    def has_module_permission(self, request):
        return self.allowed(request)

    def has_view_permission(self, request, obj=None):
        return self.allowed(request)

    def has_change_permission(self, request, obj=None):
        return self.allowed(request)

    def has_delete_permission(self, request, obj=None):
        return False


class PublicManufacturingUpload(forms.Form):
    kind = forms.ChoiceField(choices=[("enroll", "Public batch enrollment"), ("verify", "Signed factory verification receipt")])
    record = forms.FileField(help_text="Public JSON only. Never upload factory-private.json, NVS data or QR payloads.")


@admin.register(ManufacturingBatch)
class ManufacturingBatchAdmin(ManufacturingAccess, admin.ModelAdmin):
    change_list_template = "admin/readings/manufacturing_batches.html"
    list_display = ("code", "hardware_profile", "firmware_variant", "requested_quantity", "registered_count", "created_at")
    search_fields = ("code",)
    list_filter = ("hardware_profile", "firmware_variant")
    actions = ("export_station_manifest",)
    fields = ("code", "operation_id", "hardware_profile", "hardware_revision", "firmware_variant", "requested_quantity", "notes")

    def has_add_permission(self, request):
        return self.allowed(request)

    def has_change_permission(self, request, obj=None):
        return obj is None and self.allowed(request)

    def get_readonly_fields(self, request, obj=None):
        return self.fields if obj else ()

    @admin.display(description="Registered devices")
    def registered_count(self, obj):
        return obj.devices.count()

    def save_model(self, request, obj, form, change):
        if change:
            raise PermissionDenied("Manufacturing batches are immutable; allocate a new batch instead.")
        batch = manufacturing.allocate_batch(code=obj.code, operation_id=obj.operation_id,
            hardware_profile=obj.hardware_profile, hardware_revision=obj.hardware_revision,
            firmware_variant=obj.firmware_variant, count=obj.requested_quantity, notes=obj.notes, actor=request.user)
        obj.__dict__.update(batch.__dict__)

    @admin.action(description="Download public factory-station manifest (one batch)")
    def export_station_manifest(self, request, queryset):
        manufacturing.authorize(request.user)
        if queryset.count() != 1:
            self.message_user(request, "Select exactly one batch.", level="error")
            return None
        import json
        batch = queryset.get()
        ManufacturingEvent.objects.create(batch=batch, actor=request.user, action="manifest_exported")
        response = HttpResponse(json.dumps(manufacturing.batch_manifest(batch), indent=2), content_type="application/json")
        response["Content-Disposition"] = 'attachment; filename="station-manifest.json"'
        response["Cache-Control"] = "no-store"
        return response

    def get_urls(self):
        return [path("import-public/", self.admin_site.admin_view(self.import_public), name="readings_manufacturing_import")] + super().get_urls()

    def import_public(self, request):
        manufacturing.authorize(request.user)
        import json
        form = PublicManufacturingUpload(request.POST or None, request.FILES or None)
        if request.method == "POST" and form.is_valid():
            record = form.cleaned_data["record"]
            try:
                if record.size > 2_000_000:
                    raise ValueError()
                data = json.loads(record.read().decode("utf-8"))
                if form.cleaned_data["kind"] == "enroll":
                    manufacturing.enroll_batch(data, actor=request.user)
                else:
                    manufacturing.record_verification(data, actor=request.user)
                self.message_user(request, "Public manufacturing record accepted.")
                form = PublicManufacturingUpload()
            except (ValueError, TypeError, ValidationError):
                form.add_error("record", "Rejected: check public schema, signature and inventory state. No secrets were stored.")
        return TemplateResponse(request, "admin/readings/manufacturing_upload.html", {
            **self.admin_site.each_context(request), "title": "Import public manufacturing records", "form": form,
        })


@admin.register(PhysicalDevice)
class PhysicalDeviceAdmin(ManufacturingAccess, admin.ModelAdmin):
    list_display = ("serial_number", "hardware_id", "manufacturing_batch", "manufacturing_status", "logical_device", "firmware_version", "last_seen_at")
    list_filter = ("manufacturing_batch", "manufacturing_status", "hardware_profile", "disabled")
    search_fields = ("hardware_id", "serial_number")
    fields = ("hardware_id", "serial_number", "manufacturing_batch", "hardware_profile", "hardware_revision",
        "manufacturing_status", "created_at", "programmed_at", "verified_at", "ready_at", "activated_at",
        "logical_device", "disabled", "firmware_version", "last_seen_at", "factory_receipt")
    readonly_fields = fields
    actions = ("mark_ready", "retire", "export_inventory")

    def has_add_permission(self, request):
        return False

    def transition(self, request, queryset, target):
        try:
            with transaction.atomic():
                for device in queryset.order_by("pk"):
                    manufacturing.set_status(device.hardware_id, target, actor=request.user)
            self.message_user(request, "Manufacturing state updated.")
        except ValidationError:
            self.message_user(request, "Selection rejected: verify devices first; bound devices cannot be retired.", level="error")

    @admin.action(description="Mark verified devices ready for distribution")
    def mark_ready(self, request, queryset):
        return self.transition(request, queryset, "ready")

    @admin.action(description="Retire unbound devices")
    def retire(self, request, queryset):
        return self.transition(request, queryset, "retired")

    @admin.action(description="Export non-sensitive inventory CSV")
    def export_inventory(self, request, queryset):
        manufacturing.authorize(request.user)
        for batch_id in queryset.exclude(manufacturing_batch=None).values_list("manufacturing_batch_id", flat=True).distinct():
            ManufacturingEvent.objects.create(batch_id=batch_id, actor=request.user, action="inventory_exported")
        response = HttpResponse(manufacturing.inventory_csv(queryset), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="flovers-inventory.csv"'
        response["Cache-Control"] = "no-store"
        return response


@admin.register(ManufacturingEvent)
class ManufacturingEventAdmin(ManufacturingAccess, admin.ModelAdmin):
    list_display = ("created_at", "batch", "device", "action", "actor")
    list_filter = ("action", "batch")
    readonly_fields = ("created_at", "batch", "device", "action", "actor", "detail")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
