"""Universal ESP32-C3 bundles reuse the existing sensor and pump implementation."""
import json
from pathlib import Path
from urllib.parse import urlsplit

from . import codegen as core


def generate_universal_firmware(*, base_url: str, pump_included: bool = False) -> dict[str, str]:
    base = base_url.rstrip("/")
    parsed = urlsplit(base)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in {"", "/"}):
        raise ValueError("Universal firmware requires a fixed HTTPS backend origin.")
    pump = bool(pump_included)
    urls = {
        "apiUrl": "/readings/ingest/", "pairUrl": "/readings/pairing/complete/",
        "configUrl": "/readings/configuration/", "ackUrl": "/readings/configuration/ack/",
    }
    if pump:
        urls.update(pumpNextTaskUrl="/readings/pump-next-task/", pumpCompleteUrl="/readings/pump-complete/", pumpAutoClaimUrl="/readings/pump-auto-claim/")
    globals_ = "\n".join(f"const char* {name} = {json.dumps(base + path)};" for name, path in urls.items())
    globals_ += "\n" + r'''
// Customer-specific data comes from NVS, never from this universal binary.
const char* secret = "";  // Unused legacy payload field; token authentication never falls back.
String deviceToken;
char logicalDeviceKey[17] = {};
const char* deviceKey = logicalDeviceKey;
int DEVICE_ID = 0;
bool SENSOR_TEMPERATURE_ENABLED = false;
bool SENSOR_HUMIDITY_ENABLED = false;
bool SENSOR_LIGHT_ENABLED = false;
bool SENSOR_MOISTURE_ENABLED = false;
BH1750 lightMeter(0x23);
Adafruit_BME280 bme;
#define BME280_ADDRESS 0x76
unsigned long SEND_INTERVAL_MS = 60UL * 60UL * 1000UL;
unsigned long lastSendMs = 0;
const bool FLOVERS_PUMP_CAPABLE = ''' + ("true;" if pump else "false;")
    if pump:
        globals_ += r'''
const unsigned long MANUAL_PUMP_CHECK_INTERVAL_MS = 60UL * 1000UL;
unsigned long lastManualPumpCheckMs = 0;
unsigned long PUMP_RUN_MS = 20000UL;
const unsigned long AUTO_PUMP_MIN_INTERVAL_MS = 60UL * 60UL * 1000UL;
bool PUMP_INCLUDED = false;
int FALLBACK_AUTO_PUMP_THRESHOLD_PCT = 30;
unsigned long lastAutoPumpMs = 0;
unsigned long activePumpCooldownMs = AUTO_PUMP_MIN_INTERVAL_MS;
'''
    sections = [
        core._section_includes(), core._section_tls_config(), core._section_pins(pump_enabled=pump),
        core._section_calibration(), globals_, core._section_ntp(), core._section_types(pump_enabled=pump),
        '#include "FloversUniversal.h"',
        core._section_time_helpers(), core._section_time_sync(), core._section_sensor_init(),
        core._section_soil_sensor(), core._section_read_sensors(), core._section_reading_payload(),
        core._section_http_helpers(device_scoped=True),
    ]
    if pump:
        sections += [core._section_json_helpers(), core._section_pump_helpers(hardware_cooldown=True)]
    sections += [core._section_send_reading(), core._section_cycle(pump_enabled=pump)]
    relay = "pinMode(PUMP_PIN, OUTPUT); digitalWrite(PUMP_PIN, LOW);" if pump else ""
    manual = r'''
    else if (millis() - lastManualPumpCheckMs >= MANUAL_PUMP_CHECK_INTERVAL_MS) {
        runManualPumpCheckOnly(); lastManualPumpCheckMs = millis();
    }
''' if pump else ""
    pump_clock = "lastManualPumpCheckMs = millis();" if pump else ""
    sections.append(f'''
void setup() {{
    {relay}
    Serial.begin(115200);
    analogReadResolution(12);
    analogSetPinAttenuation(SOIL_PIN, ADC_11db);
    Flovers::begin();
}}

void loop() {{
    Flovers::tick();
    static bool first = true;
    if (!Flovers::ready()) {{ delay(20); return; }}
    if (first || millis() - lastSendMs >= SEND_INTERVAL_MS) {{
        first = false; runCycle(); lastSendMs = millis(); {pump_clock}
    }} {manual}
    delay(20);
}}
''')
    return {
        "flovers_universal.ino": core._join_sections(*sections),
        "FloversUniversal.h": Path(__file__).with_name("firmware").joinpath("FloversUniversal.h").read_text(encoding="utf-8"),
        "FloversValidation.h": Path(__file__).with_name("firmware").joinpath("FloversValidation.h").read_text(encoding="utf-8"),
    }
