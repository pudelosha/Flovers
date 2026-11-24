"""Provisioning failure paths: no downloads, devices, Django or external services."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("firmware_provision", Path(__file__).parents[1] / "provision.py")
provision = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(provision)


class ToolchainSafetyTests(unittest.TestCase):
    def setUp(self):
        self.lock = provision.read_lock()

    def write_indexes(self, data):
        for packager, tools in self.lock["tools"].items():
            package = {"name":packager,"tools":tools,"platforms":[self.lock["board"]["platform"]] if packager=="esp32" else []}
            (data / f"package_{packager}_index.json").write_text(json.dumps({"packages":[package]}), encoding="utf-8")
        (data / "library_index.json").write_text(json.dumps({"libraries":self.lock["libraries"]}), encoding="utf-8")

    def installed(self):
        cores = {"platforms":[{"id":"esp32:esp32","installed_version":self.lock["board"]["platform"]["version"]}]}
        libraries = {"installed_libraries":[{"library":{"name":item["name"],"version":item["version"]}} for item in self.lock["libraries"]]}
        return cores,libraries

    def test_complete_explicit_board_and_sensor_pins(self):
        self.assertEqual(self.lock["cli"]["version"],"1.6.0")
        self.assertEqual(self.lock["board"]["platform"]["version"],"3.3.12")
        self.assertIn("FlashSize=4M",self.lock["board"]["fqbn"])
        self.assertIn("CDCOnBoot=cdc",self.lock["board"]["fqbn"])
        self.assertEqual(len(self.lock["libraries"]),6)
        self.assertEqual({item["name"]: item["version"] for item in self.lock["libraries"] if item["name"] in {"ArduinoJson", "Crypto"}},
                         {"ArduinoJson": "7.4.2", "Crypto": "0.4.0"})

    def test_archive_checksum_mismatch_fails_closed(self):
        raw=b"pinned executable"
        self.assertEqual(provision.verify_download(raw,hashlib.sha256(raw).hexdigest()),raw)
        with self.assertRaisesRegex(ValueError,"checksum"):
            provision.verify_download(raw,b"wrong checksum".hex())

    def test_plaintext_download_is_never_attempted(self):
        with patch.object(provision.urllib.request,"urlopen") as network:
            with self.assertRaisesRegex(ValueError,"HTTPS"):
                provision.fetch("http://downloads.invalid/tool.zip","0"*64)
            network.assert_not_called()

    def test_vendor_index_changes_to_unrelated_versions_are_harmless(self):
        with tempfile.TemporaryDirectory() as folder:
            data=Path(folder);self.write_indexes(data)
            path=data/"package_esp32_index.json";value=json.loads(path.read_text())
            value["packages"][0]["platforms"].append({"version":"unrelated"})
            path.write_text(json.dumps(value))
            provision.verify_indexes(self.lock,data)

    def test_changed_pinned_archive_or_compiler_metadata_is_rejected(self):
        for location in ["platform","tool","library"]:
            with self.subTest(location=location), tempfile.TemporaryDirectory() as folder:
                data=Path(folder);self.write_indexes(data)
                path=data/("library_index.json" if location=="library" else "package_esp32_index.json")
                value=json.loads(path.read_text())
                if location=="platform":value["packages"][0]["platforms"][0]["checksum"]="SHA-256:"+"0"*64
                elif location=="tool":value["packages"][0]["tools"][0]["systems"][0]["checksum"]="SHA-256:"+"0"*64
                else:value["libraries"][0]["checksum"]="SHA-256:"+"0"*64
                path.write_text(json.dumps(value))
                with self.assertRaisesRegex(ValueError,"metadata changed"):
                    provision.verify_indexes(self.lock,data)

    def test_missing_or_wrong_core_is_rejected(self):
        cores,libraries=self.installed()
        provision.verify_installed(self.lock,cores,libraries)
        for bad in [{}, {"platforms":[{"id":"esp32:esp32","installed_version":"wrong"}]}]:
            with self.assertRaisesRegex(ValueError,"core"):
                provision.verify_installed(self.lock,bad,libraries)

    def test_missing_wrong_or_additional_libraries_are_rejected(self):
        cores,libraries=self.installed()
        for kind in ["missing","wrong","extra"]:
            bad=copy.deepcopy(libraries)
            if kind=="missing":bad["installed_libraries"].pop()
            elif kind=="wrong":bad["installed_libraries"][0]["library"]["version"]="wrong"
            else:bad["installed_libraries"].append({"library":{"name":"unlocked","version":"1.0"}})
            with self.subTest(kind=kind),self.assertRaisesRegex(ValueError,"dependencies differ"):
                provision.verify_installed(self.lock,cores,bad)

    def test_existing_non_ci_directory_is_not_modified(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);existing=root/"personal-file";existing.write_text("keep")
            with self.assertRaisesRegex(ValueError,"non-CI"):
                provision.Provisioner(root,root/"results")
            self.assertEqual(existing.read_text(),"keep")
            self.assertFalse((root/"arduino-cli.json").exists())
            self.assertEqual({p.name for p in root.iterdir()},{"personal-file"})

    def test_personal_arduino_environment_cannot_override_isolation(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ,{"ARDUINO_DIRECTORIES_DATA":"personal-profile"}):
            root=Path(folder)
            p=provision.Provisioner(root/"isolated",root/"logs")
            self.assertEqual(p.environment["ARDUINO_DIRECTORIES_DATA"],str(p.data))
            config=json.loads(p.config.read_text())
            self.assertEqual(config["directories"]["user"],str(p.user))

    def test_missing_cli_executable_fails_instead_of_skipping(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);p=provision.Provisioner(root/"isolated",root/"logs")
            with self.assertRaises(OSError):p.run("missing",["version"])
            self.assertTrue((root/"logs/missing.command.json").exists())


if __name__=="__main__":unittest.main()
