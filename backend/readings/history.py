"""Reading history queries and updates, independent of HTTP request handling."""

import math
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Avg, Min, Max
from django.db.models.functions import Coalesce
from django.utils import timezone
from sharing.permissions import plant_access
from .models import ReadingDevice


class HistoryValidationError(ValueError):
    pass


HISTORY_UNITS = {
    "temperature": "°C",
    "humidity": "%",
    "light": "lx",
    "moisture": "%",
}
VALID_METRICS = set(HISTORY_UNITS.keys())
VALID_RANGES = {"day", "week", "month"}
VALID_HISTORY_STATS = {"avg", "max", "min"}
VALID_READING_DELETE_MODES = {"day", "week", "month", "types", "olderThan"}


def _start_of_week_mon(dt: timezone.datetime) -> timezone.datetime:
    """
    Monday as the first day of the week.
    dt is assumed to be timezone-aware (local time).
    """
    day = dt.weekday()  # Monday=0..Sunday=6
    start = (dt - timedelta(days=day)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return start


def _end_of_week_sun(dt: timezone.datetime) -> timezone.datetime:
    start = _start_of_week_mon(dt)
    end = start + timedelta(
        days=6, hours=23, minutes=59, seconds=59, microseconds=999999
    )
    return end


def _first_of_month(dt: timezone.datetime) -> timezone.datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _month_day_count(dt: timezone.datetime) -> int:
    first = _first_of_month(dt)
    if first.month == 12:
        next_month = first.replace(year=first.year + 1, month=1)
    else:
        next_month = first.replace(month=first.month + 1)
    return (next_month.date() - first.date()).days


def _last_of_month(dt: timezone.datetime) -> timezone.datetime:
    first = _first_of_month(dt)
    if first.month == 12:
        next_month = first.replace(year=first.year + 1, month=1)
    else:
        next_month = first.replace(month=first.month + 1)
    last = next_month - timedelta(microseconds=1)
    return last


def _span_for(range_str: str, anchor_dt: timezone.datetime):
    """
    Returns (from, to) as timezone-aware datetimes in the current timezone.
    """
    if range_str == "day":
        s = anchor_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        e = anchor_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return s, e
    if range_str == "week":
        s = _start_of_week_mon(anchor_dt)
        e = _end_of_week_sun(anchor_dt)
        return s, e
    s = _first_of_month(anchor_dt)
    e = _last_of_month(anchor_dt)
    return s, e


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _parse_month(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(f"{str(value)}-01")
    except (TypeError, ValueError):
        return None


def _aware_start_of_day(day: date) -> timezone.datetime:
    return timezone.make_aware(
        datetime.combine(day, time.min), timezone.get_current_timezone()
    )


def _aware_end_of_day(day: date) -> timezone.datetime:
    return timezone.make_aware(
        datetime.combine(day, time.max), timezone.get_current_timezone()
    )


def _refresh_device_latest(device: ReadingDevice) -> None:
    latest = device.readings.order_by("-timestamp").first()
    if latest:
        device.last_read_at = latest.observed_at or latest.timestamp
        device.latest_snapshot = {
            "temperature": latest.temperature,
            "humidity": latest.humidity,
            "light": latest.light,
            "moisture": latest.moisture,
        }
    else:
        device.last_read_at = None
        device.latest_snapshot = None

    device.save(update_fields=["last_read_at", "latest_snapshot", "updated_at"])


def build_history_series(device, *, range_str, metric, requested_stat, anchor, user):
    anchor_local = timezone.localtime(anchor)

    span_from, span_to = _span_for(range_str, anchor_local)

    qs = device.readings.filter(
        timestamp__gte=span_from,
        timestamp__lte=span_to,
    ).order_by("timestamp")

    if range_str == "day":
        bin_count = 24
    elif range_str == "week":
        bin_count = 7
    else:
        bin_count = _month_day_count(anchor_local)

    bins = [{"sum": 0.0, "cnt": 0, "min": None, "max": None} for _ in range(bin_count)]

    for rec in qs:
        ts_local = timezone.localtime(rec.timestamp)

        if range_str == "day":
            idx = ts_local.hour  # 0..23
        elif range_str == "week":
            idx = (ts_local.date() - span_from.date()).days  # 0..6 ideally
            if idx < 0 or idx >= bin_count:
                continue
        else:  # month
            idx = ts_local.day - 1  # 0..(days-1)
            if idx < 0 or idx >= bin_count:
                continue

        val = getattr(rec, metric, None)
        if val is None:
            continue

        try:
            val_f = float(val)
        except (TypeError, ValueError):
            continue

        if not math.isfinite(val_f):
            continue

        bins[idx]["sum"] += val_f
        bins[idx]["cnt"] += 1
        bins[idx]["min"] = (
            val_f if bins[idx]["min"] is None else min(bins[idx]["min"], val_f)
        )
        bins[idx]["max"] = (
            val_f if bins[idx]["max"] is None else max(bins[idx]["max"], val_f)
        )

    values = []
    effective_stat = "avg" if range_str == "day" else requested_stat
    for b in bins:
        if not b["cnt"]:
            values.append(None)
        elif effective_stat == "max":
            values.append(round(b["max"], 2))
        elif effective_stat == "min":
            values.append(round(b["min"], 2))
        else:
            values.append(round(b["sum"] / b["cnt"], 2))

    if range_str == "day":
        bucket_starts = [span_from + timedelta(hours=i) for i in range(bin_count)]
    else:
        bucket_starts = [span_from + timedelta(days=i) for i in range(bin_count)]

    points = [
        {
            "at": bucket_starts[i].isoformat(),
            "value": values[i],
            "sample_count": bins[i]["cnt"],
        }
        for i in range(bin_count)
    ]

    return {
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "plant_name": device.plant_name,
            "interval_hours": device.interval_hours,
            "interval_minutes": device.effective_interval_minutes,
            "access": plant_access(user, device.plant),
        },
        "range": range_str,
        "metric": metric,
        "stat": effective_stat,
        "unit": HISTORY_UNITS[metric],
        "span": {
            "from": span_from.isoformat(),
            "to": span_to.isoformat(),
        },
        "points": points,
    }


def get_deletion_options(device):
    readings = device.readings.order_by("-timestamp")
    local_days = sorted(
        {timezone.localtime(reading.timestamp).date() for reading in readings},
        reverse=True,
    )

    week_starts = sorted(
        {day - timedelta(days=day.weekday()) for day in local_days},
        reverse=True,
    )

    month_starts = sorted(
        {day.replace(day=1) for day in local_days},
        reverse=True,
    )

    available_types = [
        metric
        for metric in ["temperature", "humidity", "light", "moisture"]
        if readings.filter(**{f"{metric}__isnull": False}).exists()
    ]

    return {
        "days": [
            {"key": day.isoformat(), "label": day.isoformat()} for day in local_days
        ],
        "weeks": [
            {
                "key": start.isoformat(),
                "label": f"{start.isoformat()} - {(start + timedelta(days=6)).isoformat()}",
                "start": start.isoformat(),
                "end": (start + timedelta(days=6)).isoformat(),
            }
            for start in week_starts
        ],
        "months": [
            {
                "key": month.isoformat()[:7],
                "label": month.isoformat()[:7],
                "start": month.isoformat(),
            }
            for month in month_starts
        ],
        "types": available_types,
    }


def delete_history(device, user, data):
    mode = data.get("mode")
    if mode not in VALID_READING_DELETE_MODES:
        raise HistoryValidationError(
            "mode must be one of: day, week, month, types, olderThan"
        )

    deleted_count = 0
    updated_count = 0

    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(
            pk=device.pk, user=user, plant__user=user
        )
        qs = device.readings.all()

        if mode == "day":
            day = _parse_date(data.get("day"))
            if not day:
                raise HistoryValidationError("day must be a valid ISO date")
            deleted_count, _ = qs.filter(
                timestamp__gte=_aware_start_of_day(day),
                timestamp__lte=_aware_end_of_day(day),
            ).delete()

        elif mode == "week":
            week_start = _parse_date(data.get("weekStart"))
            if not week_start:
                raise HistoryValidationError("weekStart must be a valid ISO date")
            week_end = week_start + timedelta(days=6)
            deleted_count, _ = qs.filter(
                timestamp__gte=_aware_start_of_day(week_start),
                timestamp__lte=_aware_end_of_day(week_end),
            ).delete()

        elif mode == "month":
            month_start = _parse_month(data.get("month"))
            if not month_start:
                raise HistoryValidationError("month must be a valid YYYY-MM value")
            if month_start.month == 12:
                next_month = month_start.replace(year=month_start.year + 1, month=1)
            else:
                next_month = month_start.replace(month=month_start.month + 1)
            month_end = next_month - timedelta(days=1)
            deleted_count, _ = qs.filter(
                timestamp__gte=_aware_start_of_day(month_start),
                timestamp__lte=_aware_end_of_day(month_end),
            ).delete()

        elif mode == "olderThan":
            try:
                days = int(data.get("days"))
            except (TypeError, ValueError):
                raise HistoryValidationError("days must be a positive integer")
            if days <= 0:
                raise HistoryValidationError("days must be a positive integer")
            cutoff = timezone.now() - timedelta(days=days)
            deleted_count, _ = qs.filter(timestamp__lt=cutoff).delete()

        else:
            metric_types = data.get("types") or []
            if not isinstance(metric_types, list):
                raise HistoryValidationError("types must be a list")
            metric_types = [
                metric for metric in metric_types if metric in VALID_METRICS
            ]
            if not metric_types:
                raise HistoryValidationError(
                    "types must include at least one valid reading type"
                )

            update_payload = {metric: None for metric in metric_types}
            updated_count = qs.update(**update_payload)
            empty_count, _ = qs.filter(
                temperature__isnull=True,
                humidity__isnull=True,
                light__isnull=True,
                moisture__isnull=True,
            ).delete()
            deleted_count = empty_count

        _refresh_device_latest(device)

    return {
        "deleted": deleted_count,
        "updated": updated_count,
    }


def last_24_hours(device):
    end = timezone.now()
    start = end - timedelta(hours=24)
    metrics = ("temperature", "humidity", "light", "moisture")
    values = (
        device.readings.annotate(recorded_at=Coalesce("observed_at", "timestamp"))
        .filter(
            recorded_at__gte=start,
            recorded_at__lte=end,
        )
        .aggregate(
            **{
                f"{metric}_{stat}": aggregate(metric)
                for metric in metrics
                for stat, aggregate in (("avg", Avg), ("min", Min), ("max", Max))
            }
        )
    )
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "metrics": {
            metric: {stat: values[f"{metric}_{stat}"] for stat in ("avg", "min", "max")}
            for metric in metrics
        },
    }
