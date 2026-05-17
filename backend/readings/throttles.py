from rest_framework.throttling import SimpleRateThrottle


class IngestPerDeviceThrottle(SimpleRateThrottle):
    scope = "ingest_per_device"

    def get_cache_key(self, request, view):
        device_id = request.data.get("device_id") or request.query_params.get("device_id")
        device_key = request.data.get("device_key") or request.query_params.get("device_key")
        ident = device_id or device_key
        if not ident:
            return None
        return f"ingest:{ident}"


class FeedPerDeviceThrottle(SimpleRateThrottle):
    scope = "feed_per_device"

    def get_cache_key(self, request, view):
        device_id = request.data.get("device_id") or request.query_params.get("device_id")
        device_key = request.data.get("device_key") or request.query_params.get("device_key")
        ident = device_id or device_key
        if not ident:
            return None
        return f"feed:{ident}"
