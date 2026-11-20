"""Provision the pinned firmware compiler into an isolated directory, never an IDE profile."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import subprocess
import tarfile
import time
import urllib.request
import zipfile

LOCK_PATH = Path(__file__).with_name("toolchain.lock.json")


def read_lock():
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    if lock.get("format") != 1:
        raise ValueError("Unsupported firmware toolchain lock")
    if not lock["board"]["fqbn"].startswith("esp32:esp32:esp32c3:"):
        raise ValueError("Firmware CI must target the Flovers ESP32-C3 board")
    pinned_tools = {(packager, tool["name"], tool["version"]) for packager, tools in lock["tools"].items() for tool in tools}
    if any((item["packager"], item["name"], item["version"]) not in pinned_tools for item in lock["board"]["platform"]["toolsDependencies"]):
        raise ValueError("The ESP32 compiler dependency closure must be pinned")
    names = {item["name"] for item in lock["libraries"]}
    if names != {"BH1750", "Adafruit BME280 Library", "Adafruit BusIO", "Adafruit Unified Sensor"}:
        raise ValueError("The complete sensor dependency closure must be pinned")
    return lock


def verify_download(raw, expected):
    if hashlib.sha256(raw).hexdigest() != expected.removeprefix("SHA-256:"):
        raise ValueError("Toolchain archive checksum mismatch")
    return raw


def fetch(url, checksum):
    if not url.startswith("https://"):
        raise ValueError("Toolchain downloads must use HTTPS")
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Flovers-firmware-CI"})
            with urllib.request.urlopen(request, timeout=120) as response:
                return verify_download(response.read(), checksum)
        except OSError as error:
            last = error
            if attempt < 2:
                time.sleep(2)
    raise RuntimeError(f"Could not download pinned toolchain archive: {url}") from last


def verify_indexes(lock, data):
    """The live vendor indexes may add releases, but may not change our locked artifacts."""
    indexes = {}
    for path in data.glob("package*_index.json"):
        value = json.loads(path.read_text(encoding="utf-8"))
        for package in value.get("packages", []):
            indexes[package["name"]] = package
    # The official Arduino index can also contain Espressif releases. The
    # additional vendor index is authoritative for this explicitly selected core.
    vendor = json.loads((data / "package_esp32_index.json").read_text(encoding="utf-8"))
    indexes["esp32"] = next(package for package in vendor["packages"] if package["name"] == "esp32")
    expected = lock["board"]["platform"]
    actual = next(p for p in indexes["esp32"]["platforms"] if p["version"] == expected["version"])
    for key in ["url", "archiveFileName", "checksum", "size", "toolsDependencies"]:
        if actual[key] != expected[key]:
            raise ValueError(f"Pinned ESP32 platform metadata changed: {key}")
    for packager, tools in lock["tools"].items():
        for tool in tools:
            match = next(t for t in indexes[packager]["tools"] if t["name"] == tool["name"] and t["version"] == tool["version"])
            if match["systems"] != tool["systems"]:
                raise ValueError(f"Pinned compiler dependency metadata changed: {packager}:{tool['name']}")
    library_index = json.loads((data / "library_index.json").read_text(encoding="utf-8"))
    for library in lock["libraries"]:
        match = next(item for item in library_index["libraries"] if item["name"] == library["name"] and item["version"] == library["version"])
        for key in ["url", "archiveFileName", "checksum", "size"]:
            if match[key] != library[key]:
                raise ValueError(f"Pinned library metadata changed: {library['name']}:{key}")


def verify_installed(lock, cores, libraries):
    expected_core = lock["board"]["platform"]["version"]
    if not any(p["id"] == "esp32:esp32" and p.get("installed_version") == expected_core for p in cores.get("platforms", [])):
        raise ValueError("The pinned ESP32 core is not installed")
    actual = {item["library"]["name"]: item["library"]["version"] for item in libraries.get("installed_libraries", [])}
    expected = {item["name"]: item["version"] for item in lock["libraries"]}
    if actual != expected:
        raise ValueError(f"Installed sensor dependencies differ from lock: {actual}")


class Provisioner:
    def __init__(self, root, results):
        self.root = root.resolve()
        self.results = results.resolve()
        marker = self.root / "flovers-firmware-ci.json"
        if self.root.exists() and any(self.root.iterdir()) and not marker.is_file():
            raise ValueError("Refusing to provision into an existing non-CI directory")
        self.root.mkdir(parents=True, exist_ok=True)
        self.results.mkdir(parents=True, exist_ok=True)
        marker.write_text('{"purpose":"isolated Flovers firmware CI"}\n', encoding="utf-8")
        self.config = self.root / "arduino-cli.json"
        self.data = self.root / "data"
        self.user = self.root / "user"
        self.config.write_text(json.dumps({
            "board_manager": {"additional_urls": [read_lock()["board"]["index_url"]]},
            "directories": {"data": str(self.data), "downloads": str(self.root / "downloads"), "user": str(self.user)},
            "build_cache": {"path": str(self.root / "build-cache")},
            "metrics": {"enabled": False},
        }, indent=2), encoding="utf-8")
        self.cli = self.root / "bin" / ("arduino-cli.exe" if os.name == "nt" else "arduino-cli")
        self.environment = {key: value for key, value in os.environ.items() if not key.startswith("ARDUINO_")}
        self.environment.update({"ARDUINO_DIRECTORIES_DATA": str(self.data), "ARDUINO_DIRECTORIES_USER": str(self.user),
                                 "ARDUINO_DIRECTORIES_DOWNLOADS": str(self.root / "downloads")})

    def run(self, name, args, *, json_output=False):
        command = [str(self.cli), "--config-file", str(self.config), *args]
        if json_output:
            command += ["--format", "json"]
        with (self.results / f"{name}.stdout.log").open("wb") as stdout, (self.results / f"{name}.stderr.log").open("wb") as stderr:
            try:
                result = subprocess.run(command, env=self.environment, stdout=stdout, stderr=stderr, timeout=1200, check=False)
            except (OSError, subprocess.TimeoutExpired):
                (self.results / f"{name}.command.json").write_text(json.dumps(command), encoding="utf-8")
                raise
        if result.returncode:
            raise RuntimeError(f"Arduino CLI failed ({result.returncode}): {name}; see compiler diagnostics")
        print(f"Completed {name}", flush=True)
        if json_output:
            return json.loads((self.results / f"{name}.stdout.log").read_text(encoding="utf-8"))

    def install_cli(self, lock):
        host = f"{platform.system()}_{platform.machine()}"
        archive = lock["cli"]["archives"].get(host)
        if archive is None:
            raise ValueError(f"No pinned Arduino CLI archive for {host}")
        raw = fetch(archive["url"], archive["sha256"])
        self.cli.parent.mkdir(parents=True, exist_ok=True)
        if archive["url"].endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(raw)) as container:
                executable = container.read("arduino-cli.exe")
        else:
            with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as container:
                executable = container.extractfile("arduino-cli").read()
        self.cli.write_bytes(executable)
        self.cli.chmod(0o755)
        version = self.run("cli-version", ["version"], json_output=True)
        if version.get("VersionString") != lock["cli"]["version"]:
            raise ValueError(f"Unexpected Arduino CLI version: {version}")

    def install(self):
        lock = read_lock()
        self.install_cli(lock)
        self.run("core-index", ["core", "update-index"])
        self.run("library-index", ["lib", "update-index"])
        verify_indexes(lock, self.data)
        (self.results / "verified-lock.json").write_bytes(LOCK_PATH.read_bytes())
        version = lock["board"]["platform"]["version"]
        self.run("core-install", ["core", "install", f"esp32:esp32@{version}"])
        for index, library in enumerate(lock["libraries"]):
            self.run(f"library-install-{index}", ["lib", "install", "--no-deps", f"{library['name']}@{library['version']}"])
        cores = self.run("installed-cores", ["core", "list"], json_output=True)
        libraries = self.run("installed-libraries", ["lib", "list"], json_output=True)
        verify_installed(lock, cores, libraries)
        board = self.run("board-details", ["board", "details", "--fqbn", lock["board"]["fqbn"]], json_output=True)
        (self.results / "target-board.json").write_text(json.dumps(board, indent=2), encoding="utf-8")
        values = {"FLOVERS_TEST_ARDUINO_CLI": str(self.cli), "FLOVERS_TEST_ARDUINO_CONFIG": str(self.config),
                  "FLOVERS_TEST_ARDUINO_FQBN": lock["board"]["fqbn"], "FLOVERS_TEST_ARDUINO_ARTIFACTS": str(self.results)}
        (self.results / "environment.json").write_text(json.dumps(values, indent=2), encoding="utf-8")
        return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--github-env", type=Path)
    args = parser.parse_args()
    values = Provisioner(args.root, args.results).install()
    if args.github_env:
        with args.github_env.open("a", encoding="utf-8") as output:
            for key, value in values.items():
                if "\n" in value or "\r" in value:
                    raise ValueError("Invalid CI environment path")
                output.write(f"{key}={value}\n")
    print(json.dumps(values, indent=2))


if __name__ == "__main__":
    main()
