"""Install checked Android/Maestro archives into disposable CI storage only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
import re
import xml.etree.ElementTree as ET

LOCK = json.loads((Path(__file__).parent / "toolchain.lock.json").read_text())


def require_revision(path, expected):
    values = {key.strip(): value.strip() for line in Path(path).read_text().splitlines()
              if "=" in line and not line.startswith("#") for key, value in [line.split("=", 1)]}
    actual = values.get("Pkg.Revision", "").strip()
    # Compare numeric components rather than accepting a newer installed release.
    def components(value):
        parts = [int(part) for part in value.split('.')]
        while len(parts) > 1 and parts[-1] == 0: parts.pop()
        return parts
    if not actual or components(actual) != components(expected):
        raise RuntimeError(f"Unexpected installed revision in {path}: {actual}, required {expected}")
    return actual


def extract(archive, destination, prefix):
    destination = Path(destination).resolve()
    with zipfile.ZipFile(archive) as package:
        for entry in package.infolist():
            if not entry.filename.startswith(prefix):
                raise RuntimeError(f"Unexpected archive member: {entry.filename}")
            relative = entry.filename[len(prefix):]
            if not relative:
                continue
            target = (destination / relative).resolve()
            if not target.is_relative_to(destination):
                raise RuntimeError("Archive path escaped destination")
            mode = entry.external_attr >> 16
            if mode & 0o170000 == 0o120000:
                raise RuntimeError("Archive symlinks are not accepted")
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with package.open(entry) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            if mode & 0o111:
                target.chmod(0o755)


def install_archive(spec, destination, prefix, cache):
    algorithm = "sha256" if "sha256" in spec else "sha1"
    checksum = spec[algorithm]
    path = cache / (checksum + ".zip")
    if not path.exists():
        print("Downloading " + spec["url"], flush=True)
        with urllib.request.urlopen(spec["url"], timeout=120) as source, path.open("wb") as output:
            shutil.copyfileobj(source, output, 1024 * 1024)
    with path.open("rb") as raw:
        actual = hashlib.file_digest(raw, algorithm).hexdigest()
    if actual != checksum:
        raise RuntimeError("Tool archive checksum mismatch: " + spec["url"])
    extract(path, destination, prefix)



def register_emulator(root, version):
    """Register the checksum-verified archive just as sdkmanager does.

    Unlike legacy system images, avdmanager requires emulator/package.xml;
    source.properties alone does not register this generic SDK package.
    """
    require_revision(root / "source.properties", version)
    common = "http://schemas.android.com/repository/android/common/02"
    generic = "http://schemas.android.com/repository/android/generic/02"
    xsi = "http://www.w3.org/2001/XMLSchema-instance"
    ET.register_namespace("common", common)
    ET.register_namespace("xsi", xsi)
    repository = ET.Element("{" + common + "}repository", {"xmlns:generic": generic})
    package = ET.SubElement(repository, "localPackage", {"path": "emulator", "obsolete": "false"})
    ET.SubElement(package, "type-details", {"{" + xsi + "}type": "generic:genericDetailsType"})
    revision = ET.SubElement(package, "revision")
    for name, value in zip(("major", "minor", "micro"), version.split("."), strict=True):
        ET.SubElement(revision, name).text = value
    ET.SubElement(package, "display-name").text = "Android Emulator"
    ET.SubElement(package, "uses-license", {"ref": "android-sdk-license"})
    ET.ElementTree(repository).write(root / "package.xml", encoding="utf-8", xml_declaration=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["build", "emulator"])
    args = parser.parse_args()
    root = Path(os.environ["ANDROID_HOME"]).resolve()
    temporary = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())).resolve()
    if not root.is_relative_to(temporary) or root == temporary:
        raise RuntimeError("Provisioning is restricted to a child of disposable runner storage")
    cache = temporary / "flovers-e2e-downloads"; cache.mkdir(exist_ok=True)
    android = LOCK["android"]
    install_archive(android["command_line_tools"], root / "cmdline-tools/19.0", "cmdline-tools/", cache)
    install_archive(android["platform_tools"], root / "platform-tools", "platform-tools/", cache)
    require_revision(root/"cmdline-tools/19.0/source.properties", "19.0")
    require_revision(root/"platform-tools/source.properties", android["platform_tools"]["version"])
    sdk = root / "cmdline-tools/19.0/bin/sdkmanager"
    sdk.chmod(0o755); (root / "cmdline-tools/19.0/bin/avdmanager").chmod(0o755)
    env = dict(os.environ, ANDROID_SDK_ROOT=str(root))
    subprocess.run([str(sdk), "--sdk_root="+str(root), "--licenses"], input="y\n" * 100, text=True, env=env, check=True)
    if args.mode == "build":
        subprocess.run([str(sdk), "--sdk_root="+str(root), "platforms;android-36", "build-tools;36.0.0",
                        "ndk;27.1.12297006", "cmake;3.22.1"], env=env, check=True)
        for package, revision in [("platforms/android-36", "2"), ("build-tools/36.0.0", "36.0.0"),
                                  ("ndk/27.1.12297006", "27.1.12297006"), ("cmake/3.22.1", "3.22.1")]:
            require_revision(root/package/"source.properties", revision)
    else:
        install_archive(android["emulator"], root / "emulator", "emulator/", cache)
        install_archive(android["system_image"], root / "system-images/android-35/google_apis/x86_64", "x86_64/", cache)
        install_archive(LOCK["maestro"], temporary / "maestro", "maestro/", cache)
        register_emulator(root/"emulator", android["emulator"]["version"])
        require_revision(root/"system-images/android-35/google_apis/x86_64/source.properties", "9")
        installed = subprocess.check_output([str(sdk), "--sdk_root="+str(root), "--list_installed"], text=True, env=env)
        result = Path("e2e-results/android"); result.mkdir(parents=True, exist_ok=True)
        (result / "installed-sdk-packages.txt").write_text(installed)
        if not re.search(r"(?m)^\s*emulator\s*\|\s*" + re.escape(android["emulator"]["version"]) + r"\s*\|", installed):
            raise RuntimeError("SDK manager did not register the pinned emulator")
        (temporary / "maestro/bin/maestro").chmod(0o755)
        version = subprocess.check_output([str(temporary / "maestro/bin/maestro"), "--version"], text=True, env=env)
        print(version, flush=True)
        if not re.search(r"(?m)^" + re.escape(LOCK["maestro"]["version"]) + r"\s*$", version):
            raise RuntimeError("Installed Maestro version differs from the lock: " + version)
    result = Path("e2e-results/android"); result.mkdir(parents=True, exist_ok=True)
    (result / (args.mode + "-toolchain.json")).write_text(json.dumps(LOCK, indent=2))
    with Path(os.environ["GITHUB_PATH"]).open("a") as output:
        for path in [root/"platform-tools", root/"emulator", root/"cmdline-tools/19.0/bin", temporary/"maestro/bin"]:
            output.write(str(path) + "\n")


if __name__ == "__main__":
    main()
