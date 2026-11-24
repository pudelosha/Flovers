"""Pump policy and device-first transactions, independent of HTTP transport."""

from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import ReadingDevice, PumpTask
from .notifications import send_watering_completed_notifications

PUMP_TASK_TTL_HOURS = 2
LEGACY_PUMP_RUN_SECONDS = 30


class PumpOperationError(ValueError):
    pass


class ClosedPumpTask(PumpOperationError):
    pass


def expire_old_pump_tasks(device: ReadingDevice):
    now = timezone.now()

    old_tasks = device.pump_tasks.filter(
        status__in=[PumpTask.STATUS_PENDING, PumpTask.STATUS_DELIVERED],
        expires_at__isnull=False,
        expires_at__lt=now,
    )

    old_tasks.update(status=PumpTask.STATUS_EXPIRED, updated_at=now)


def get_open_manual_pump_task(device: ReadingDevice):
    expire_old_pump_tasks(device)

    return (
        device.pump_tasks.filter(
            source=PumpTask.SOURCE_MANUAL,
            status__in=[PumpTask.STATUS_PENDING, PumpTask.STATUS_DELIVERED],
        )
        .order_by("-requested_at")
        .first()
    )


def device_can_run_pump(device: ReadingDevice):
    if not device.pump_included:
        return False, "Pump is not included for this device."

    if not device.is_active:
        return False, "Device is disabled."

    return True, ""


def pump_cooldown_until(device):
    candidates = [device.pump_safety_until]
    if device.last_pump_run_at is not None:
        candidates.append(
            device.last_pump_run_at
            + timedelta(minutes=max(1, device.pump_cooldown_minutes))
        )
    return max((value for value in candidates if value is not None), default=None)


def reserve_pump_cooldown(device, now, duration_seconds=None):
    until = now + timedelta(
        minutes=max(1, device.pump_cooldown_minutes),
        seconds=duration_seconds or LEGACY_PUMP_RUN_SECONDS,
    )
    current = pump_cooldown_until(device)
    device.pump_safety_until = max(current, until) if current else until
    device.save(update_fields=["pump_safety_until", "updated_at"])


def auto_pump_config_for_device(
    device: ReadingDevice, *, supports_auto_claim=False
) -> dict:
    sensors = device.sensors or {}
    moisture_sensor_enabled = bool(sensors.get("moisture", True))

    return {
        "pump_included": bool(device.pump_included),
        "auto_pump_enabled": bool(
            device.pump_included
            and device.automatic_pump_launch
            and moisture_sensor_enabled
            and device.pump_threshold_pct is not None
            and device.is_active
            and supports_auto_claim
            and (
                pump_cooldown_until(device) is None
                or pump_cooldown_until(device) <= timezone.now()
            )
        ),
        "auto_pump_threshold_pct": device.pump_threshold_pct,
        "moisture_sensor_enabled": moisture_sensor_enabled,
        "auto_pump_requires_claim": True,
        "pump_cooldown_minutes": max(1, device.pump_cooldown_minutes),
        "pump_cooldown_until": pump_cooldown_until(device),
    }


def schedule_manual_watering(device, user, duration_seconds=None):
    """Deduplicate schedules under the same device lock used by delivery."""
    ok, reason = device_can_run_pump(device)
    if not ok:
        raise PumpOperationError(reason)
    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk, user=user)
        if duration_seconds is not None and not device.supports_manual_duration:
            raise PumpOperationError(
                "Update the device firmware before choosing a watering duration."
            )
        ok, reason = device_can_run_pump(device)
        if not ok:
            raise PumpOperationError(reason)
        existing = get_open_manual_pump_task(device)
        if existing:
            return existing, False
        now = timezone.now()
        task = PumpTask.objects.create(
            device=device,
            source=PumpTask.SOURCE_MANUAL,
            status=PumpTask.STATUS_PENDING,
            requested_at=now,
            expires_at=now + timedelta(hours=PUMP_TASK_TTL_HOURS),
            created_by_user=user,
            duration_seconds=duration_seconds,
        )
    return task, True


def recall_manual_watering(device, user):
    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk, user=user)
        task = get_open_manual_pump_task(device)
        if not task:
            return False
        task.status = PumpTask.STATUS_CANCELLED
        task.cancelled_at = timezone.now()
        task.save(update_fields=["status", "cancelled_at", "updated_at"])
    return True


def configure_automatic_watering(device, enabled, threshold=None):
    """Update an authorized device already row-locked by the caller transaction."""
    previous = (device.automatic_pump_launch, device.pump_threshold_pct)
    moisture_sensor_enabled = bool((device.sensors or {}).get("moisture", True))
    if enabled:
        if not device.pump_included:
            raise PumpOperationError(
                "Pump must be included to enable automatic pump launch."
            )
        if not moisture_sensor_enabled:
            raise PumpOperationError(
                "Moisture sensor must be enabled to use automatic pump launch."
            )
        if threshold is not None:
            if threshold < 0 or threshold > 100:
                raise PumpOperationError("Pump threshold must be between 0 and 100.")
            device.pump_threshold_pct = threshold
        if device.pump_threshold_pct is None:
            raise PumpOperationError(
                "Pump threshold must be configured before enabling automatic pump launch."
            )
    device.automatic_pump_launch = enabled
    if previous != (device.automatic_pump_launch, device.pump_threshold_pct):
        device.desired_config_version += 1
    device.save(
        update_fields=["automatic_pump_launch", "pump_threshold_pct", "desired_config_version", "updated_at"]
    )


def next_manual_task(
    device,
    *,
    supports_auto_claim=False,
    supports_task_retry=False,
    supports_manual_duration=False,
):
    """Deliver once to legacy firmware; retry only when firmware persists execution receipts."""
    auto_config = auto_pump_config_for_device(
        device, supports_auto_claim=supports_auto_claim
    )
    if not device.pump_included:
        return {
            "run": False,
            "task_id": None,
            "source": None,
            "reason": "pump_not_included",
            **auto_config,
        }
    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk)
        if device.supports_manual_duration != supports_manual_duration:
            device.supports_manual_duration = supports_manual_duration
            device.save(update_fields=["supports_manual_duration", "updated_at"])
        expire_old_pump_tasks(device)
        auto_config = auto_pump_config_for_device(
            device, supports_auto_claim=supports_auto_claim
        )
        ready, reason = device_can_run_pump(device)
        if not ready:
            return {
                "run": False,
                "task_id": None,
                "source": None,
                "reason": reason,
                **auto_config,
            }
        eligible = Q(status=PumpTask.STATUS_PENDING)
        if supports_task_retry:
            eligible |= Q(status=PumpTask.STATUS_DELIVERED, delivery_retry_safe=True)
        task = (
            device.pump_tasks.select_for_update()
            .filter(eligible, source=PumpTask.SOURCE_MANUAL)
            .order_by("requested_at")
            .first()
        )
        if not task:
            return {
                "run": False,
                "task_id": None,
                "source": None,
                "reason": None,
                **auto_config,
            }
        if task.duration_seconds is not None and (not supports_manual_duration):
            return {
                "run": False,
                "task_id": None,
                "source": None,
                "reason": "firmware_duration_update_required",
                **auto_config,
            }
        if task.status == PumpTask.STATUS_PENDING:
            task.status = PumpTask.STATUS_DELIVERED
            task.delivered_at = timezone.now()
            task.delivery_retry_safe = supports_task_retry
            task.save(
                update_fields=[
                    "status",
                    "delivered_at",
                    "delivery_retry_safe",
                    "updated_at",
                ]
            )
            reserve_pump_cooldown(device, timezone.now(), task.duration_seconds)
    return {
        "run": True,
        "task_id": task.id,
        "source": PumpTask.SOURCE_MANUAL,
        "reason": "manual_scheduled",
        "duration_seconds": task.duration_seconds,
        **auto_config,
    }


def claim_automatic_watering(device, moisture, duration_seconds=None):
    """Reserve the cooldown and execution claim before allowing automatic watering."""
    now = timezone.now()
    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk)
        config = auto_pump_config_for_device(device, supports_auto_claim=True)
        if not config["auto_pump_enabled"]:
            return {
                "run": False,
                "task_id": None,
                "reason": "automatic_disabled_or_cooldown",
                **config,
            }
        if moisture >= device.pump_threshold_pct:
            return {
                "run": False,
                "task_id": None,
                "reason": "moisture_above_threshold",
                **config,
            }
        if get_open_manual_pump_task(device) is not None:
            return {
                "run": False,
                "task_id": None,
                "reason": "manual_task_has_priority",
                **config,
            }
        run_seconds = (
            duration_seconds
            if duration_seconds is not None
            else LEGACY_PUMP_RUN_SECONDS
        )
        reserve_pump_cooldown(device, now, run_seconds)
        task = PumpTask.objects.create(
            device=device,
            source=PumpTask.SOURCE_AUTOMATIC,
            status=PumpTask.STATUS_DELIVERED,
            requested_at=now,
            delivered_at=now,
            expires_at=now + timedelta(minutes=2, seconds=run_seconds),
            moisture_at_request=moisture,
            threshold_at_request=device.pump_threshold_pct,
        )
        return {
            "run": True,
            "task_id": task.pk,
            "reason": "automatic_claimed",
            "pump_cooldown_until": device.pump_safety_until,
        }


def complete_watering(
    device,
    *,
    task_id=None,
    success=True,
    error_message=None,
    source=PumpTask.SOURCE_MANUAL,
):
    """Lock the device before its task; notify only after a committed first completion."""
    if source not in {PumpTask.SOURCE_MANUAL, PumpTask.SOURCE_AUTOMATIC}:
        source = PumpTask.SOURCE_MANUAL
    if not device.pump_included:
        raise PumpOperationError("Pump is not included for this device.")
    now = timezone.now()
    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk)
        if task_id:
            task = PumpTask.objects.select_for_update().get(id=task_id, device=device)
            if task.status == PumpTask.STATUS_EXECUTED:
                return {
                    "detail": "Pump execution was already recorded.",
                    "last_pump_run_at": device.last_pump_run_at,
                    "last_pump_run_source": device.last_pump_run_source,
                }
            if task.status == PumpTask.STATUS_FAILED:
                return {
                    "detail": "Pump failure was already recorded.",
                    "last_pump_run_at": device.last_pump_run_at,
                    "last_pump_run_source": device.last_pump_run_source,
                }
            if task.status in [PumpTask.STATUS_CANCELLED, PumpTask.STATUS_EXPIRED]:
                raise ClosedPumpTask(f"Task is already {task.status}.")
            if success:
                task.status = PumpTask.STATUS_EXECUTED
                task.executed_at = now
                task.error_message = None
                device.last_pump_run_at = now
                device.last_pump_run_source = task.source
                device.save(
                    update_fields=[
                        "last_pump_run_at",
                        "last_pump_run_source",
                        "updated_at",
                    ]
                )
                task.save(
                    update_fields=[
                        "status",
                        "executed_at",
                        "error_message",
                        "updated_at",
                    ]
                )
                transaction.on_commit(
                    lambda device_id=device.id, task_source=task.source: send_watering_completed_notifications(
                        device_id=device_id, source=task_source
                    )
                )
            else:
                task.status = PumpTask.STATUS_FAILED
                task.error_message = error_message or "Pump execution failed."
                task.save(update_fields=["status", "error_message", "updated_at"])
            return {
                "detail": (
                    "Pump execution recorded." if success else "Pump failure recorded."
                ),
                "last_pump_run_at": device.last_pump_run_at,
                "last_pump_run_source": device.last_pump_run_source,
            }
        task = PumpTask.objects.create(
            device=device,
            source=source,
            status=PumpTask.STATUS_EXECUTED if success else PumpTask.STATUS_FAILED,
            requested_at=now,
            delivered_at=now,
            executed_at=now if success else None,
            error_message=(
                None if success else error_message or "Pump execution failed."
            ),
        )
        if success:
            device.last_pump_run_at = now
            device.last_pump_run_source = task.source
            device.save(
                update_fields=["last_pump_run_at", "last_pump_run_source", "updated_at"]
            )
            transaction.on_commit(
                lambda device_id=device.id, task_source=task.source: send_watering_completed_notifications(
                    device_id=device_id, source=task_source
                )
            )
    return {
        "detail": "Pump execution recorded." if success else "Pump failure recorded.",
        "last_pump_run_at": device.last_pump_run_at,
        "last_pump_run_source": device.last_pump_run_source,
    }
