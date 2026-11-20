import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


reports = module("reports", "check_reports.py")
provision = module("provision", "provision_android.py")


class SmokeGuardTests(unittest.TestCase):
    def report(self, content, kind="android"):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/"results.xml"; path.write_text(content)
            return reports.validate(kind, path)

    def test_both_real_flow_names_are_required(self):
        self.assertEqual(self.report('<testsuite><testcase name="navigation-smoke"/><testcase name="completion-smoke"/></testsuite>'), 2)

    def test_missing_empty_duplicate_or_skipped_native_flows_fail(self):
        for body in ['', '<testcase name="navigation-smoke"/>', '<testcase name="navigation-smoke"/><testcase name="navigation-smoke"/>',
                     '<testcase name="navigation-smoke"/><testcase name="completion-smoke"><skipped/></testcase>',
                     '<testcase name="navigation-smoke"/><testcase name="completion-smoke"><failure/></testcase>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.report('<testsuite>'+body+'</testsuite>')

    def test_both_browser_projects_and_all_scenarios_are_required(self):
        complete = '<testsuites>'+''.join('<testsuite hostname="'+project+'">'+''.join(
            '<testcase name="['+project+'] '+name+'"/>' for name in reports.BROWSER)+'</testsuite>' for project in ['desktop', 'mobile'])+'</testsuites>'
        self.assertEqual(self.report(complete, "browser"), 10)
        with self.assertRaises(ValueError):
            self.report(complete.replace('hostname="mobile"', 'hostname="tablet"'), "browser")

    def test_archive_escape_and_unexpected_roots_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/"tool.zip"
            for name in ["tool/../../escape", "unexpected/binary"]:
                with self.subTest(name=name):
                    with zipfile.ZipFile(path, 'w') as package: package.writestr(name, b'bad')
                    with self.assertRaises(RuntimeError): provision.extract(path, Path(temporary)/"out", "tool/")

    def test_emulator_registration_requires_the_verified_revision(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            properties = root / "source.properties"
            properties.write_text("Pkg.Revision=37.3.10\n")
            provision.register_emulator(root, "37.3.10")
            package = ET.parse(root / "package.xml").getroot().find("localPackage")
            self.assertEqual(package.get("path"), "emulator")
            self.assertEqual([package.find("revision/" + key).text for key in ("major", "minor", "micro")], ["37", "3", "10"])
            (root / "package.xml").unlink()
            properties.write_text("Pkg.Revision=37.4.1\n")
            with self.assertRaises(RuntimeError): provision.register_emulator(root, "37.3.10")
            self.assertFalse((root / "package.xml").exists())

    def test_missing_reports_fail(self):
        with self.assertRaises(FileNotFoundError): reports.validate("android", ROOT/"does-not-exist.xml")
