from django.utils.dateparse import parse_datetime
from django.utils import timezone

def parse_ts_or_now(value):
    if not value:
        return timezone.now()
    dt = parse_datetime(value)
    return dt if dt is not None else timezone.now()
