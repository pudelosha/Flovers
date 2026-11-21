from email.message import Message
from io import BytesIO
import json
import unittest
from unittest.mock import patch
from deployment.read_only_smoke import check, NoRedirects, request_json, SmokeError, validate_origin


class Response(BytesIO):
    def __init__(self, data, status=200, content_type="application/json"):
        super().__init__(json.dumps(data).encode())
        self.status = status
        self.headers = Message()
        self.headers["Content-Type"] = content_type


class ReadOnlySmoke(unittest.TestCase):
    def test_all_requests_are_get_and_existing_token_is_used_without_login(self):
        requests = []

        class Opener:
            def open(self, request, **kwargs):
                requests.append(request)
                if "Authorization" not in request.headers:
                    return Response({"detail": "Not authenticated"}, 401)
                return Response({"results": []} if "journal" in request.full_url else [])

        with patch("deployment.read_only_smoke.build_opener", return_value=Opener()):
            result = check("https://api.example.test", "existing-synthetic-token")
        self.assertEqual(len(requests), 5)
        self.assertTrue(all(request.get_method() == "GET" for request in requests))
        self.assertTrue(all(request.data is None for request in requests))
        self.assertFalse(any("login" in request.full_url for request in requests))
        self.assertEqual(requests[-1].headers["Authorization"], "Bearer existing-synthetic-token")
        self.assertNotIn("existing-synthetic-token", json.dumps(result))

    def test_unapproved_http_and_credential_bearing_urls_are_refused(self):
        for url in ["http://api.example.test", "https://name:password@api.example.test", "https://api.example.test/path",
                    "https://api.example.test?url=elsewhere", "ftp://api.example.test"]:
            with self.subTest(url=url), self.assertRaises(SmokeError):
                validate_origin(url, allow_disposable_http=True)
        self.assertEqual(validate_origin("http://web:8000", True), "http://web:8000")

    def test_redirect_does_not_forward_the_bearer_token(self):
        with self.assertRaisesRegex(SmokeError, "Redirect refused"):
            NoRedirects().redirect_request(None, None, 302, "redirect", {}, "https://unapproved.example.test")

    def test_missing_token_cannot_trigger_login_or_any_request(self):
        with patch("deployment.read_only_smoke.build_opener") as build, self.assertRaises(SmokeError):
            check("https://api.example.test", "")
        build.assert_not_called()

    def test_errors_and_html_success_pages_do_not_pass_health(self):
        for response in [Response({"detail": "error"}, 503), Response([], content_type="text/html")]:
            with patch("deployment.read_only_smoke.build_opener") as build:
                build.return_value.open.return_value = response
                with self.assertRaises(SmokeError):
                    check("https://api.example.test", "synthetic-token")

    def test_unexpected_authorization_success_is_not_accepted(self):
        with patch("deployment.read_only_smoke.build_opener") as build:
            build.return_value.open.return_value = Response([])
            with self.assertRaisesRegex(SmokeError, "expected HTTP 401"):
                check("https://api.example.test", "synthetic-token")
