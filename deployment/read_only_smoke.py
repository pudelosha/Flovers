"""Explicit-origin, GET-only API smoke. Does not log in, mutate data or follow redirects."""
import argparse
import ipaddress
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

PATHS = ("/locations/", "/plant-instances/", "/readings/devices/", "/journal/entries/?page_size=1")
MAX_RESPONSE = 8 * 1024 * 1024


class SmokeError(RuntimeError):
    pass


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SmokeError("Redirect refused; use the explicit final API origin")


def validate_origin(value, allow_disposable_http=False):
    url = urlsplit(value)
    if (url.scheme not in {"https", "http"} or not url.hostname or url.username or url.password
            or url.path not in {"", "/"} or url.query or url.fragment):
        raise SmokeError("An explicit API origin without credentials, path or query is required")
    if url.scheme != "https":
        try:
            local = ipaddress.ip_address(url.hostname).is_loopback
        except ValueError:
            local = url.hostname in {"web", "localhost"}
        if not allow_disposable_http or not local:
            raise SmokeError("HTTP is allowed only for explicitly selected disposable loopback/Compose services")
    return value.rstrip("/")


def request_json(opener, origin, path, token, timeout, expected=200):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(origin + path, headers=headers, method="GET")
    try:
        response = opener.open(request, timeout=timeout)
    except HTTPError as error:
        response = error
    except (URLError, TimeoutError, OSError) as error:
        raise SmokeError(f"GET {path}: connection failed ({type(error).__name__})") from None
    with response:
        if response.status != expected:
            raise SmokeError(f"GET {path}: expected HTTP {expected}, received {response.status}")
        body = response.read(MAX_RESPONSE + 1)
        if len(body) > MAX_RESPONSE or "application/json" not in response.headers.get("Content-Type", ""):
            raise SmokeError(f"GET {path}: bounded JSON response required")
        try:
            data = json.loads(body)
        except ValueError:
            raise SmokeError(f"GET {path}: invalid JSON") from None
    if not isinstance(data, (dict, list)):
        raise SmokeError(f"GET {path}: expected a JSON collection or object")
    return {"method": "GET", "path": path, "status": expected}, data


def check(origin, token, *, timeout=8, allow_disposable_http=False, staging_readiness=False):
    origin = validate_origin(origin, allow_disposable_http)
    if not token or any(c.isspace() for c in token):
        raise SmokeError("Supply an existing short-lived bearer token through the named environment variable")
    if not 1 <= timeout <= 15:
        raise SmokeError("Request timeout must be between 1 and 15 seconds")
    if staging_readiness and not allow_disposable_http:
        raise SmokeError("The staging readiness endpoint is only for the disposable rehearsal")
    opener = build_opener(ProxyHandler({}), NoRedirects())
    results = []
    if staging_readiness:
        result, data = request_json(opener, origin, "/__staging__/ready/", None, timeout)
        if data != {"status": "ready", "checks": {"database": True, "redis": True}}:
            raise SmokeError("Disposable readiness dependencies did not all pass")
        results.append(result)
    result, _ = request_json(opener, origin, "/locations/", None, timeout, expected=401)
    results.append(result)
    for path in PATHS:
        result, data = request_json(opener, origin, path, token, timeout)
        if not isinstance(data, list) and not isinstance(data.get("results"), list):
            raise SmokeError(f"GET {path}: expected a collection")
        results.append(result)
    return {"read_only": True, "redirects": False, "checks": results}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--token-env", default="FLOVERS_SMOKE_TOKEN")
    parser.add_argument("--timeout", type=int, default=8)
    parser.add_argument("--allow-disposable-http", action="store_true")
    parser.add_argument("--staging-readiness", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = check(args.base_url, os.environ.get(args.token_env, ""), timeout=args.timeout,
                       allow_disposable_http=args.allow_disposable_http,
                       staging_readiness=args.staging_readiness)
    except (SmokeError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
