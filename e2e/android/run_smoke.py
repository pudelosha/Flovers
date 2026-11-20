"""Boot one KVM emulator and run the actual installed app, with bounded readiness."""
import json
import os
from pathlib import Path
import subprocess
import time

RESULTS = Path("e2e-results/android")


def command(*args, **kwargs):
    return subprocess.run(list(args), check=True, text=True, **kwargs)


def adb(*args, **kwargs):
    return command("adb", "-s", "emulator-5554", *args, **kwargs)


def diagnostic(*args, **kwargs):
    try:
        subprocess.run(list(args), timeout=15, **kwargs)
    except (OSError, subprocess.TimeoutExpired) as error:
        with (RESULTS/"diagnostic-errors.log").open("a") as output:
            output.write(type(error).__name__ + ": " + str(error) + "\n")


def main():
    if not Path("/dev/kvm").exists():
        raise RuntimeError("KVM is required: do not substitute mocked or software-only Android tests")
    RESULTS.mkdir(parents=True, exist_ok=True)
    command("avdmanager", "create", "avd", "--force", "--name", "flovers-e2e", "--package",
            "system-images;android-35;google_apis;x86_64", "--device", "pixel_2", input="no\n")
    apk = Path("e2e-results/apk/app-e2e.apk")
    if not apk.is_file():
        raise RuntimeError("The real E2E APK artifact is required")
    emulator_log = (RESULTS/"emulator.log").open("w")
    emulator = subprocess.Popen(["emulator", "-avd", "flovers-e2e", "-port", "5554", "-no-window", "-no-audio",
        "-no-boot-anim", "-no-snapshot", "-wipe-data", "-gpu", "swiftshader", "-accel", "on", "-memory", "2048", "-cores", "2"],
        stdout=emulator_log, stderr=subprocess.STDOUT)
    logcat = None
    logcat_file = None
    started = time.monotonic()
    try:
        adb("wait-for-device", timeout=240)
        deadline = time.monotonic() + 240
        while time.monotonic() < deadline:
            if emulator.poll() is not None:
                raise RuntimeError("Android emulator exited before boot")
            if adb("shell", "getprop", "sys.boot_completed", capture_output=True, timeout=15).stdout.strip() == "1":
                break
            time.sleep(2)
        else:
            raise RuntimeError("Android did not finish booting within 240 seconds")
        # Cold-boot background setup can briefly reconnect ADB after boot_completed.
        # Require a continuous ready window before installing drivers/running tests.
        stable_since = None
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            probe = subprocess.run(["adb", "-s", "emulator-5554", "get-state"],
                                   capture_output=True, text=True, timeout=10)
            if probe.returncode == 0 and probe.stdout.strip() == "device":
                stable_since = stable_since or time.monotonic()
                if time.monotonic() - stable_since >= 10:
                    break
            else:
                stable_since = None
            time.sleep(1)
        else:
            raise RuntimeError("ADB did not remain ready for ten seconds within the 60-second deadline")
        adb("shell", "input", "keyevent", "82")
        adb("install", "-r", str(apk), timeout=120)
        with (RESULTS/"android-properties.txt").open("w") as output:
            adb("shell", "getprop", stdout=output)
        with (RESULTS/"installed-package.txt").open("w") as output:
            adb("shell", "dumpsys", "package", "com.flovers.mobile.e2e", stdout=output)
        logcat_file = (RESULTS/"logcat.log").open("w")
        logcat = subprocess.Popen(["adb", "-s", "emulator-5554", "logcat", "-v", "threadtime"], stdout=logcat_file, stderr=subprocess.STDOUT)
        flows = sorted(Path("e2e/android/flows").glob("*.yaml"))
        if [p.stem for p in flows] != ["completion-smoke", "navigation-smoke"]:
            raise RuntimeError("Both required native smoke flows must be present")
        command("maestro", "--device", "emulator-5554", "test", "--format", "JUNIT", "--output",
                str(RESULTS/"results.xml"), "--test-output-dir", str(RESULTS/"maestro"), "e2e/android/flows", timeout=600)
        command("python", "e2e/android/seed.py", "verify")
        log = (RESULTS/"logcat.log").read_text(errors="replace")
        if "Isolation verified: emulator host API; external request blocked before DNS" not in log:
            raise RuntimeError("The installed APK did not prove its loopback endpoint and network isolation")
        if "Disposable backend verified: HTTP 200" not in log:
            raise RuntimeError("The installed APK did not verify HTTP connectivity to disposable Django")
        if "E2E network policy denied" in log or "Isolation verification failed" in log or "Backend verification failed" in log:
            raise RuntimeError("The smoke app attempted an unexpected external request or failed isolation; see logcat")
        (RESULTS/"network-isolation.json").write_text(json.dumps({
            "api_base": "http://10.0.2.2:8000", "redirects_enabled": False,
            "runtime_external_request_rejected_before_dns": True,
            "runtime_disposable_backend_http_status": 200,
        }, indent=2))
    finally:
        # Diagnostics are attempted once; missing/failed tests still fail the job.
        with (RESULTS/"adb-state.txt").open("w") as output:
            diagnostic("adb", "devices", "-l", stdout=output)
            diagnostic("adb", "server-status", stdout=output)
            diagnostic("adb", "-s", "emulator-5554", "reverse", "--list", stdout=output)
        with (RESULTS/"last-screen.png").open("wb") as output:
            diagnostic("adb", "-s", "emulator-5554", "exec-out", "screencap", "-p", stdout=output)
        diagnostic("adb", "-s", "emulator-5554", "shell", "uiautomator", "dump", "/sdcard/window.xml")
        diagnostic("adb", "-s", "emulator-5554", "pull", "/sdcard/window.xml", str(RESULTS/"window.xml"))
        if logcat is not None:
            logcat.terminate()
            try: logcat.wait(timeout=15)
            except subprocess.TimeoutExpired: logcat.kill(); logcat.wait()
        if logcat_file is not None: logcat_file.close()
        emulator.terminate()
        try: emulator.wait(timeout=30)
        except subprocess.TimeoutExpired: emulator.kill(); emulator.wait()
        emulator_log.close()
        (RESULTS/"timing.json").write_text(json.dumps({"boot_install_and_smoke_seconds": round(time.monotonic()-started, 2)}))


if __name__ == "__main__":
    main()
