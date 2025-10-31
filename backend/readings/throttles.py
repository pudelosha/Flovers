from rest_framework.throttling import SimpleRateThrottle

class IngestPerDeviceThrottle(SimpleRateThrottle):
    scope = "ingest_per_device"

    def get_cache_key(self, request, view):
        device_id = request.data.get("device_id") or request.query_params.get("device_id")
        if not device_id:
            return None
        return f"ingest:{device_id}"

class FeedPerDeviceThrottle(SimpleRateThrottle):
    scope = "feed_per_device"

    def get_cache_key(self, request, view):
        device_id = request.query_params.get("device_id")
        if not device_id:
            return None
        return f"feed:{device_id}"
