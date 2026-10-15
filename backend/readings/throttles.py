from rest_framework.throttling import SimpleRateThrottle
from .device_auth import resolve_device


class AuthenticatedDeviceThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        device = resolve_device(request)
        return self.cache_format % {"scope": self.scope, "ident": device.pk}


class IngestPerDeviceThrottle(AuthenticatedDeviceThrottle):
    scope = "ingest_per_device"


class FeedPerDeviceThrottle(AuthenticatedDeviceThrottle):
    scope = "feed_per_device"


class PumpPollPerDeviceThrottle(AuthenticatedDeviceThrottle):
    scope = "pump_poll_per_device"


class PumpCompletePerDeviceThrottle(AuthenticatedDeviceThrottle):
    scope = "pump_complete_per_device"
