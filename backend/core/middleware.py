"""Resolve forwarded identities only through explicitly trusted reverse proxies."""
from ipaddress import ip_address, ip_network

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class TrustedProxyHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        try:
            self.networks = tuple(ip_network(value, strict=False) for value in settings.TRUSTED_PROXY_CIDRS)
        except ValueError as exc:
            raise ImproperlyConfigured("TRUSTED_PROXY_CIDRS must contain valid proxy IP addresses or CIDRs.") from exc

    def trusted(self, address):
        return any(address in network for network in self.networks)

    def __call__(self, request):
        forwarded = request.META.pop("HTTP_X_FORWARDED_FOR", "")
        proto = request.META.pop("HTTP_X_FORWARDED_PROTO", "")
        request.META.pop("HTTP_X_REAL_IP", None)
        request.META.pop("HTTP_FORWARDED", None)
        try:
            peer = ip_address(request.META.get("REMOTE_ADDR", ""))
        except ValueError:
            return self.get_response(request)
        if self.trusted(peer):
            if forwarded:
                try:
                    chain = [ip_address(value.strip()) for value in forwarded.split(",")]
                except ValueError:
                    chain = []
                # Walk from the socket peer toward the client, stopping before
                # any attacker-supplied prefix beyond the first untrusted hop.
                for address in reversed(chain):
                    request.META["REMOTE_ADDR"] = str(address)
                    if not self.trusted(address):
                        break
            if proto == "https":
                request.META["HTTP_X_FORWARDED_PROTO"] = "https"
        return self.get_response(request)
