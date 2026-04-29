import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import sketch1 from "../assets/Sketch_1.jpg";
import "../styles/schemas.css";

const INGEST_ENDPOINT = "https://api.flovers.app/api/readings/ingest/";
const PUMP_NEXT_TASK_ENDPOINT = "https://api.flovers.app/api/readings/pump-next-task/";
const PUMP_COMPLETE_ENDPOINT = "https://api.flovers.app/api/readings/pump-complete/";
const FEED_ENDPOINT = "https://api.flovers.app/api/readings/feed/";

function CodeBlock({ text, label }) {
  const { t } = useTranslation("schemas");
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <section className="schema-block">
      <div className="schema-block-head">
        <div className="schema-block-label">{label}</div>
        <button className="schema-copy" type="button" onClick={onCopy}>
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>

      <pre className="schema-code">
        <code>{text}</code>
      </pre>
    </section>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="schema-inforow">
      <div className="schema-inforow-label">
        {label}
        {sub ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
      </div>
      <div className="schema-inforow-value">
        <code>{value}</code>
      </div>
    </div>
  );
}

function Paragraphs({ value, className = "muted" }) {
  if (Array.isArray(value)) {
    return value.map((p, i) => (
      <p key={i} className={className}>
        {p}
      </p>
    ));
  }

  if (typeof value === "string" && value.trim()) {
    return <p className={className}>{value}</p>;
  }

  return null;
}

function BulletList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <ul className="schema-list">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

function WiringPlaceholder({ ariaLabel, title, sub, imageSrc, imageAlt, onClick }) {
  return (
    <button
      type="button"
      className="schema-wiring"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 0,
        margin: 0,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: imageSrc ? "zoom-in" : "default",
        display: "block",
        alignSelf: "stretch",
      }}
    >
      <div
        className="schema-wiring-inner"
        style={{
          width: "100%",
          maxWidth: "100%",
          minHeight: 260,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {imageSrc ? (
          <>
            <div
              style={{
                width: "100%",
                height: 220,
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={imageSrc}
                alt={imageAlt || title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div
              style={{
                padding: "14px 16px 16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div className="schema-wiring-title">{title}</div>
              <div className="schema-wiring-sub muted">{sub}</div>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
            <div className="schema-wiring-title">{title}</div>
            <div className="schema-wiring-sub muted">{sub}</div>
          </div>
        )}
      </div>
    </button>
  );
}

function ImageModal({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label="Close image preview"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          borderRadius: 10,
          padding: "10px 14px",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "96vw",
          maxHeight: "96vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "96vw",
            maxHeight: "96vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
            borderRadius: 12,
          }}
        />
      </div>
    </div>
  );
}

export default function Schema() {
  const { t } = useTranslation("schemas");
  const [modalImage, setModalImage] = useState(null);

  const trArray = (key) => {
    const value = t(key, { returnObjects: true, defaultValue: [] });
    return Array.isArray(value) ? value : [];
  };

  const ingestJsonSchema = useMemo(
    () => `{
  "secret": "string",
  "device_key": "string",
  "device_id": "number optional",
  "timestamp": "ISO-8601 UTC string",
  "metrics": {
    "temperature": "number optional",
    "humidity": "number optional",
    "light": "number optional",
    "moisture": "number optional"
  }
}`,
    []
  );

  const ingestExamplePayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "timestamp": "2026-01-06T10:11:00Z",
  "metrics": {
    "temperature": 20.5,
    "humidity": 40.0,
    "light": 520,
    "moisture": 40
  }
}`,
    []
  );

  const ingestPowershellSample = useMemo(
    () => `# PowerShell example: send one reading

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "timestamp": "2026-01-06T10:11:00Z",
  "metrics": {
    "temperature": 20.5,
    "humidity": 40.0,
    "light": 520,
    "moisture": 40
  }
}
'@

Invoke-RestMethod \`
  -Uri "${INGEST_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const pumpNextTaskSchema = useMemo(
    () => `{
  "secret": "string",
  "device_key": "string",
  "device_id": "number optional"
}`,
    []
  );

  const pumpNextTaskExamplePayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12
}`,
    []
  );

  const pumpNextTaskNoJobResponse = useMemo(
    () => `{
  "run": false,
  "task_id": null,
  "source": null,
  "reason": null,
  "pump_included": true,
  "auto_pump_enabled": true,
  "auto_pump_threshold_pct": 30,
  "moisture_sensor_enabled": true
}`,
    []
  );

  const pumpNextTaskWithJobResponse = useMemo(
    () => `{
  "run": true,
  "task_id": 123,
  "source": "manual",
  "reason": "manual_scheduled",
  "pump_included": true,
  "auto_pump_enabled": true,
  "auto_pump_threshold_pct": 30,
  "moisture_sensor_enabled": true
}`,
    []
  );

  const pumpNextTaskPowershellSample = useMemo(
    () => `# PowerShell example: check for pending manual watering task

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12
}
'@

Invoke-RestMethod \`
  -Uri "${PUMP_NEXT_TASK_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const pumpCompleteManualPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": true
}`,
    []
  );

  const pumpCompleteAutomaticPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "source": "automatic",
  "success": true
}`,
    []
  );

  const pumpCompleteFailedPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": false,
  "error_message": "Pump execution failed"
}`,
    []
  );

  const pumpCompletePowershellSample = useMemo(
    () => `# PowerShell example: report manual watering completion

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": true
}
'@

Invoke-RestMethod \`
  -Uri "${PUMP_COMPLETE_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const feedRequestExample = useMemo(
    () => `${FEED_ENDPOINT}?device_key=YOUR_DEVICE_KEY&secret=YOUR_SECRET`,
    []
  );

  const feedResponseExample = useMemo(
    () => `{
  "device": {
    "id": 12,
    "device_name": "Plant sensor",
    "plant_name": "Monstera",
    "interval_hours": 1
  },
  "readings": [
    {
      "id": 456,
      "timestamp": "2026-01-06T10:00:00Z",
      "temperature": 20.5,
      "humidity": 40.0,
      "light": 520,
      "moisture": 40
    }
  ]
}`,
    []
  );

  const relayOutputExample = useMemo(
    () => `digitalWrite(PUMP_PIN, HIGH);
delay(PUMP_RUN_MS);
digitalWrite(PUMP_PIN, LOW);`,
    []
  );

  const calibrationExample = useMemo(
    () => `#define SOIL_DRY_VALUE 3900
#define SOIL_WET_VALUE 1300`,
    []
  );

  const generatedFirmwareSample = useMemo(
    () => `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <time.h>

// -------------------- WiFi --------------------
// Fill in your WiFi credentials before uploading.

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// -------------------- API ---------------------

const char* apiUrl = "${INGEST_ENDPOINT}";
const char* secret = "YOUR_SECRET";
const char* deviceKey = "YOUR_DEVICE_KEY";
const char* pumpNextTaskUrl = "${PUMP_NEXT_TASK_ENDPOINT}";
const char* pumpCompleteUrl = "${PUMP_COMPLETE_ENDPOINT}";

// -------------------- Device ------------------

const int DEVICE_ID = 12;

// -------------------- Pins --------------------

#define SDA_PIN 9
#define SCL_PIN 8
#define SOIL_PIN 3
#define PUMP_PIN 4

// -------------------- Calibration --------------------

#define SOIL_DRY_VALUE 3900
#define SOIL_WET_VALUE 1300

// -------------------- Sensors --------------------

#define BME280_ADDRESS 0x76

const bool SENSOR_TEMPERATURE_ENABLED = true;
const bool SENSOR_HUMIDITY_ENABLED = true;
const bool SENSOR_LIGHT_ENABLED = true;
const bool SENSOR_MOISTURE_ENABLED = true;

BH1750 lightMeter(0x23);
Adafruit_BME280 bme;

// -------------------- Timing --------------------
// Backend stores and displays readings hourly.
// You can adjust these values manually in the sketch if needed.
//
// SEND_INTERVAL_MS:
// - sends sensor readings
// - checks manual watering
// - checks automatic watering
//
// MANUAL_PUMP_CHECK_INTERVAL_MS:
// - checks only scheduled manual watering jobs
// - does not send readings
// - does not run automatic watering

const unsigned long SEND_INTERVAL_MS = 60UL * 60UL * 1000UL;
const unsigned long MANUAL_PUMP_CHECK_INTERVAL_MS = 60UL * 1000UL;

unsigned long lastSendMs = 0;
unsigned long lastManualPumpCheckMs = 0;

// -------------------- Pump ---------------------

// Default pump run time. Adjust manually if your pump needs more or less time.
const unsigned long PUMP_RUN_MS = 30000UL;

// Safety cooldown for automatic watering.
// This applies after automatic watering and after manual watering.
const unsigned long AUTO_PUMP_MIN_INTERVAL_MS = 60UL * 60UL * 1000UL;

const bool PUMP_INCLUDED = true;

// Used only as a fallback if backend does not return a valid threshold.
const int FALLBACK_AUTO_PUMP_THRESHOLD_PCT = 30;

unsigned long lastAutoPumpMs = 0;

// -------------------- NTP --------------------

const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";

// ========================================================
// TYPES
// ========================================================

struct SensorReadings
{
    bool hasTemperature;
    bool hasHumidity;
    bool hasLight;
    bool hasMoisture;

    float temperature;
    float humidity;
    float light;
    int moisture;
};

struct PumpTaskCheck
{
    bool requestOk;
    bool manualPumpRan;

    bool backendPumpIncluded;
    bool autoPumpEnabled;
    bool moistureSensorEnabled;
    int autoPumpThresholdPct;
};

// ========================================================
// TIME
// ========================================================

String getIsoTimestampUTC()
{
    struct tm timeinfo;

    if (!getLocalTime(&timeinfo, 5000))
        return "";

    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);

    return String(buf);
}

// ========================================================
// WIFI
// ========================================================

bool connectWiFi(unsigned long timeoutMs = 20000)
{
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    Serial.print("Connecting to WiFi");

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < timeoutMs)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("WiFi connected");
        Serial.print("ESP32 IP: ");
        Serial.println(WiFi.localIP());
        return true;
    }

    Serial.println("WiFi connection failed");
    return false;
}

// ========================================================
// TIME SYNC
// ========================================================

bool syncTime()
{
    configTime(0, 0, ntpServer1, ntpServer2);

    Serial.println("Synchronizing time with NTP...");

    struct tm timeinfo;

    if (getLocalTime(&timeinfo, 10000))
    {
        Serial.println("Time synchronized");
        Serial.println(getIsoTimestampUTC());
        return true;
    }

    Serial.println("Failed to synchronize time");
    return false;
}

// ========================================================
// SENSOR INIT
// ========================================================

bool initSensors()
{
    bool ok = true;

    Wire.begin(SDA_PIN, SCL_PIN);

    if (SENSOR_LIGHT_ENABLED)
    {
        if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE))
            Serial.println("BH1750 OK");
        else
        {
            Serial.println("BH1750 ERROR");
            ok = false;
        }
    }

    if (SENSOR_TEMPERATURE_ENABLED || SENSOR_HUMIDITY_ENABLED)
    {
        if (bme.begin(BME280_ADDRESS))
            Serial.println("BME280 OK");
        else
        {
            Serial.println("BME280 ERROR");
            ok = false;
        }
    }

    return ok;
}

// ========================================================
// SOIL SENSOR
// ========================================================

int readSoilRaw()
{
    long sum = 0;

    for (int i = 0; i < 20; i++)
    {
        sum += analogRead(SOIL_PIN);
        delay(5);
    }

    return sum / 20;
}

int soilPercent(int raw)
{
    int percent = map(raw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
    return constrain(percent, 0, 100);
}

// ========================================================
// READ SENSORS
// ========================================================

SensorReadings readSensors()
{
    SensorReadings readings;

    readings.hasTemperature = false;
    readings.hasHumidity = false;
    readings.hasLight = false;
    readings.hasMoisture = false;

    readings.temperature = 0.0f;
    readings.humidity = 0.0f;
    readings.light = 0.0f;
    readings.moisture = 0;

    if (SENSOR_TEMPERATURE_ENABLED)
    {
        readings.temperature = bme.readTemperature();
        readings.hasTemperature = true;

        Serial.print("Temp: ");
        Serial.println(readings.temperature);
    }

    if (SENSOR_HUMIDITY_ENABLED)
    {
        readings.humidity = bme.readHumidity();
        readings.hasHumidity = true;

        Serial.print("Humidity: ");
        Serial.println(readings.humidity);
    }

    if (SENSOR_LIGHT_ENABLED)
    {
        readings.light = lightMeter.readLightLevel();
        readings.hasLight = true;

        Serial.print("Light: ");
        Serial.println(readings.light);
    }

    if (SENSOR_MOISTURE_ENABLED)
    {
        int raw = readSoilRaw();
        readings.moisture = soilPercent(raw);
        readings.hasMoisture = true;

        Serial.print("Soil raw: ");
        Serial.println(raw);

        Serial.print("Soil %: ");
        Serial.println(readings.moisture);
    }

    return readings;
}

// ========================================================
// READING JSON PAYLOAD
// ========================================================

String buildReadingPayload(const SensorReadings& readings, const String& timestamp)
{
    String json = "{";

    json += "\\"secret\\":\\"" + String(secret) + "\\",";
    json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";
    json += "\\"device_id\\":" + String(DEVICE_ID) + ",";
    json += "\\"timestamp\\":\\"" + timestamp + "\\",";

    json += "\\"metrics\\":{";

    bool firstMetric = true;

    if (readings.hasTemperature)
    {
        json += "\\"temperature\\":" + String(readings.temperature, 2);
        firstMetric = false;
    }

    if (readings.hasHumidity)
    {
        if (!firstMetric) json += ",";
        json += "\\"humidity\\":" + String(readings.humidity, 2);
        firstMetric = false;
    }

    if (readings.hasLight)
    {
        if (!firstMetric) json += ",";
        json += "\\"light\\":" + String(readings.light, 0);
        firstMetric = false;
    }

    if (readings.hasMoisture)
    {
        if (!firstMetric) json += ",";
        json += "\\"moisture\\":" + String(readings.moisture);
    }

    json += "}";
    json += "}";

    return json;
}

// ========================================================
// HTTP
// ========================================================

bool postJson(
    const char* url,
    const String& json,
    String& responseBody,
    const String& label)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.print("WiFi not connected before ");
        Serial.print(label);
        Serial.println(", retrying...");

        if (!connectWiFi())
            return false;
    }

    Serial.print("Sending ");
    Serial.print(label);
    Serial.println(":");
    Serial.println(json);

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(15000);

    if (!http.begin(client, url))
    {
        Serial.print("Failed to start HTTP request for ");
        Serial.println(label);
        return false;
    }

    http.addHeader("Content-Type", "application/json");

    int code = http.POST((uint8_t*)json.c_str(), json.length());

    Serial.print(label);
    Serial.print(" HTTP code: ");
    Serial.println(code);

    responseBody = http.getString();
    Serial.println(responseBody);

    http.end();
    client.stop();

    return (code >= 200 && code < 300);
}

// ========================================================
// SIMPLE JSON HELPERS
// ========================================================

int findJsonValueStart(const String& json, const String& key)
{
    String quotedKey = "\\"" + key + "\\"";
    int keyIndex = json.indexOf(quotedKey);

    if (keyIndex < 0)
        return -1;

    int colonIndex = json.indexOf(":", keyIndex + quotedKey.length());

    if (colonIndex < 0)
        return -1;

    int valueIndex = colonIndex + 1;

    while (
        valueIndex < json.length() &&
        (
            json[valueIndex] == ' ' ||
            json[valueIndex] == '\\n' ||
            json[valueIndex] == '\\r' ||
            json[valueIndex] == '\\t'
        )
    )
    {
        valueIndex++;
    }

    return valueIndex;
}

bool jsonBoolValue(const String& json, const String& key, bool fallbackValue = false)
{
    int valueIndex = findJsonValueStart(json, key);

    if (valueIndex < 0)
        return fallbackValue;

    if (json.substring(valueIndex, valueIndex + 4) == "true")
        return true;

    if (json.substring(valueIndex, valueIndex + 5) == "false")
        return false;

    return fallbackValue;
}

long jsonLongValue(const String& json, const String& key, long fallbackValue = -1)
{
    int valueIndex = findJsonValueStart(json, key);

    if (valueIndex < 0)
        return fallbackValue;

    String number = "";

    while (valueIndex < json.length())
    {
        char c = json[valueIndex];

        if ((c >= '0' && c <= '9') || c == '-')
        {
            number += c;
            valueIndex++;
        }
        else
        {
            break;
        }
    }

    if (number.length() == 0)
        return fallbackValue;

    return number.toInt();
}

int jsonIntValue(const String& json, const String& key, int fallbackValue)
{
    long value = jsonLongValue(json, key, fallbackValue);

    if (value < 0)
        return 0;

    if (value > 100)
        return 100;

    return (int)value;
}

String jsonStringValue(const String& json, const String& key, const String& fallbackValue = "")
{
    int valueIndex = findJsonValueStart(json, key);

    if (valueIndex < 0)
        return fallbackValue;

    if (json[valueIndex] != '"')
        return fallbackValue;

    valueIndex++;

    String value = "";

    while (valueIndex < json.length())
    {
        char c = json[valueIndex];

        if (c == '"')
            break;

        value += c;
        valueIndex++;
    }

    return value;
}

// ========================================================
// PUMP
// ========================================================

bool runPumpForMs(unsigned long durationMs)
{
    Serial.print("Running pump for ");
    Serial.print(durationMs);
    Serial.println(" ms");

    digitalWrite(PUMP_PIN, HIGH);
    delay(durationMs);
    digitalWrite(PUMP_PIN, LOW);

    Serial.println("Pump run completed");

    return true;
}

String buildPumpNextTaskPayload()
{
    String json = "{";

    json += "\\"secret\\":\\"" + String(secret) + "\\",";
    json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";
    json += "\\"device_id\\":" + String(DEVICE_ID);

    json += "}";

    return json;
}

String buildPumpCompletePayload(
    long taskId,
    const String& source,
    bool success,
    const String& errorMessage)
{
    String json = "{";

    json += "\\"secret\\":\\"" + String(secret) + "\\",";
    json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";
    json += "\\"device_id\\":" + String(DEVICE_ID) + ",";

    if (taskId > 0)
    {
        json += "\\"task_id\\":" + String(taskId) + ",";
    }

    json += "\\"source\\":\\"" + source + "\\",";
    json += "\\"success\\":" + String(success ? "true" : "false");

    if (errorMessage.length() > 0)
    {
        json += ",\\"error_message\\":\\"" + errorMessage + "\\"";
    }

    json += "}";

    return json;
}

bool sendPumpComplete(
    long taskId,
    const String& source,
    bool success,
    const String& errorMessage = "")
{
    String responseBody = "";
    String json = buildPumpCompletePayload(
        taskId,
        source,
        success,
        errorMessage
    );

    return postJson(
        pumpCompleteUrl,
        json,
        responseBody,
        "pump completion"
    );
}

PumpTaskCheck checkAndRunManualPumpTask()
{
    PumpTaskCheck result;

    result.requestOk = false;
    result.manualPumpRan = false;

    result.backendPumpIncluded = false;
    result.autoPumpEnabled = false;
    result.moistureSensorEnabled = false;
    result.autoPumpThresholdPct = FALLBACK_AUTO_PUMP_THRESHOLD_PCT;

    String responseBody = "";
    String json = buildPumpNextTaskPayload();

    bool ok = postJson(
        pumpNextTaskUrl,
        json,
        responseBody,
        "manual pump task and auto config check"
    );

    if (!ok)
    {
        Serial.println("Pump task/config check failed. Automatic pump will not run without backend confirmation.");
        return result;
    }

    result.requestOk = true;
    result.backendPumpIncluded = jsonBoolValue(responseBody, "pump_included", false);
    result.autoPumpEnabled = jsonBoolValue(responseBody, "auto_pump_enabled", false);
    result.moistureSensorEnabled = jsonBoolValue(responseBody, "moisture_sensor_enabled", false);
    result.autoPumpThresholdPct = jsonIntValue(
        responseBody,
        "auto_pump_threshold_pct",
        FALLBACK_AUTO_PUMP_THRESHOLD_PCT
    );

    bool shouldRunPump = jsonBoolValue(responseBody, "run", false);

    if (!shouldRunPump)
    {
        Serial.println("No manual pump task scheduled");
        return result;
    }

    long taskId = jsonLongValue(responseBody, "task_id", -1);
    String source = jsonStringValue(responseBody, "source", "");
    String reason = jsonStringValue(responseBody, "reason", "");

    Serial.println("Manual pump task received");
    Serial.print("Task ID: ");
    Serial.println(taskId);
    Serial.print("Source: ");
    Serial.println(source);
    Serial.print("Reason: ");
    Serial.println(reason);

    if (source != "manual")
    {
        Serial.println("Ignoring non-manual pump task");
        return result;
    }

    if (taskId <= 0)
    {
        Serial.println("Manual pump task missing valid task_id; cannot report completion");
        return result;
    }

    // Manual scheduled watering intentionally ignores:
    // - soil moisture
    // - automatic watering threshold
    // - automatic watering cooldown
    bool success = runPumpForMs(PUMP_RUN_MS);

    sendPumpComplete(
        taskId,
        "manual",
        success,
        success ? "" : "Manual pump run failed"
    );

    result.manualPumpRan = success;
    return result;
}

bool automaticPumpCooldownActive()
{
    if (lastAutoPumpMs == 0)
        return false;

    unsigned long elapsed = millis() - lastAutoPumpMs;

    return elapsed < AUTO_PUMP_MIN_INTERVAL_MS;
}

void handleAutomaticPump(
    bool hasMoisture,
    int moisture,
    const PumpTaskCheck& pumpCheck)
{
    if (!pumpCheck.requestOk)
    {
        Serial.println("Automatic pump skipped: backend pump config was not confirmed");
        return;
    }

    if (!pumpCheck.backendPumpIncluded)
    {
        Serial.println("Automatic pump skipped: backend says pump is not included");
        return;
    }

    if (!pumpCheck.autoPumpEnabled)
    {
        Serial.println("Automatic pump disabled by backend");
        return;
    }

    if (!pumpCheck.moistureSensorEnabled || !SENSOR_MOISTURE_ENABLED || !hasMoisture)
    {
        Serial.println("Automatic pump skipped: moisture sensor not enabled or no moisture value");
        return;
    }

    if (moisture >= pumpCheck.autoPumpThresholdPct)
    {
        Serial.println("Automatic pump skipped: moisture is above threshold");
        return;
    }

    if (automaticPumpCooldownActive())
    {
        Serial.println("Automatic pump skipped: cooldown active");
        return;
    }

    Serial.println("Automatic pump condition met");
    Serial.print("Moisture: ");
    Serial.println(moisture);
    Serial.print("Backend threshold: ");
    Serial.println(pumpCheck.autoPumpThresholdPct);

    bool success = runPumpForMs(PUMP_RUN_MS);

    if (success)
    {
        lastAutoPumpMs = millis();
    }

    sendPumpComplete(
        -1,
        "automatic",
        success,
        success ? "" : "Automatic pump run failed"
    );
}

// ========================================================
// SEND READING
// ========================================================

bool sendReading(const SensorReadings& readings)
{
    String timestamp = getIsoTimestampUTC();

    if (timestamp.length() == 0)
        return false;

    String responseBody = "";
    String json = buildReadingPayload(readings, timestamp);

    return postJson(
        apiUrl,
        json,
        responseBody,
        "reading"
    );
}

// ========================================================
// CYCLE
// ========================================================

void runCycle()
{
    SensorReadings readings = readSensors();

    // Reading upload is independent from watering.
    // If this request fails, pump task/config check can still run.
    sendReading(readings);

    PumpTaskCheck pumpCheck = checkAndRunManualPumpTask();

    // Manual scheduled watering has priority in the same cycle to avoid double watering.
    // If manual watering runs, it also starts the automatic watering cooldown.
    if (pumpCheck.manualPumpRan)
    {
        lastAutoPumpMs = millis();
    }
    else
    {
        // Automatic watering is decided by Arduino using current backend config.
        handleAutomaticPump(
            readings.hasMoisture,
            readings.moisture,
            pumpCheck
        );
    }
}

void runManualPumpCheckOnly()
{
    // This check runs more often than the full reading cycle.
    // It only handles scheduled manual watering.
    // It does not send sensor readings and does not run automatic watering.
    PumpTaskCheck pumpCheck = checkAndRunManualPumpTask();

    // If manual watering ran between hourly reading cycles,
    // block automatic watering for AUTO_PUMP_MIN_INTERVAL_MS.
    if (pumpCheck.manualPumpRan)
    {
        lastAutoPumpMs = millis();
    }
}

// ========================================================
// SETUP
// ========================================================

void setup()
{
    Serial.begin(115200);
    delay(1500);

    Serial.println("Starting sensor uploader");

    analogReadResolution(12);
    analogSetPinAttenuation(SOIL_PIN, ADC_11db);

    pinMode(PUMP_PIN, OUTPUT);
    digitalWrite(PUMP_PIN, LOW);

    initSensors();

    if (connectWiFi())
        syncTime();

    runCycle();

    lastSendMs = millis();
    lastManualPumpCheckMs = millis();
}

// ========================================================
// LOOP
// ========================================================

void loop()
{
    unsigned long nowMs = millis();

    if (nowMs - lastSendMs >= SEND_INTERVAL_MS)
    {
        Serial.println("Starting full periodic cycle");

        // Full cycle:
        // 1. read sensors
        // 2. send reading
        // 3. check/run scheduled manual watering
        // 4. check/run automatic watering if manual watering did not run
        runCycle();

        lastSendMs = millis();
        lastManualPumpCheckMs = millis();
    }
    else if (nowMs - lastManualPumpCheckMs >= MANUAL_PUMP_CHECK_INTERVAL_MS)
    {
        Serial.println("Checking scheduled manual watering only");

        // Manual-only cycle:
        // 1. check/run scheduled manual watering
        // 2. do not send readings
        // 3. do not run automatic watering
        runManualPumpCheckOnly();

        lastManualPumpCheckMs = millis();
    }

    delay(1000);
}`,
    []
  );

  return (
    <>
      <article className="card prose schema-page">
        <h1 className="h1 h1-auth">{t("title")}</h1>

        <Paragraphs value={trArray("lead")} className="muted schema-lead" />

        <div className="schema-grid">
          <div className="schema-col">
            <section className="schema-section">
              <h2 className="h2">{t("firmwareIntro.title")}</h2>
              <p className="muted">{t("firmwareIntro.lead")}</p>
              <BulletList items={trArray("firmwareIntro.items")} />
              <p className="muted">{t("firmwareIntro.defaultTiming")}</p>
              <p className="muted">{t("firmwareIntro.adjustmentNote")}</p>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("endpoints.title")}</h2>

              <div className="schema-endpoints">
                <InfoRow
                  label={t("endpoints.ingest.title")}
                  sub={t("endpoints.ingest.direction")}
                  value={INGEST_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.pumpNextTask.title")}
                  sub={t("endpoints.pumpNextTask.direction")}
                  value={PUMP_NEXT_TASK_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.pumpComplete.title")}
                  sub={t("endpoints.pumpComplete.direction")}
                  value={PUMP_COMPLETE_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.feed.title")}
                  sub={t("endpoints.feed.direction")}
                  value={FEED_ENDPOINT}
                />
              </div>

              <div className="schema-note muted">
                <Paragraphs value={trArray("endpoints.ingest.desc")} />
                <BulletList items={trArray("endpoints.ingest.authItems")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.pumpNextTask.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.pumpNextTask.desc")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.pumpComplete.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.pumpComplete.desc")} />
                <BulletList items={trArray("endpoints.pumpComplete.items")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.feed.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.feed.desc")} />
              </div>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("ingest.title")}</h2>
              <p className="muted">{t("ingest.desc")}</p>

              <CodeBlock label={t("ingest.payloadShape")} text={ingestJsonSchema} />
              <CodeBlock label={t("ingest.examplePayload")} text={ingestExamplePayload} />
              <CodeBlock label={t("ingest.powershellExample")} text={ingestPowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("pumpNextTask.title")}</h2>
              <Paragraphs value={trArray("pumpNextTask.desc")} />
              <BulletList items={trArray("pumpNextTask.items")} />

              <CodeBlock label={t("pumpNextTask.payloadShape")} text={pumpNextTaskSchema} />
              <CodeBlock label={t("pumpNextTask.examplePayload")} text={pumpNextTaskExamplePayload} />
              <CodeBlock label={t("pumpNextTask.responseNoTask")} text={pumpNextTaskNoJobResponse} />
              <CodeBlock label={t("pumpNextTask.responseWithTask")} text={pumpNextTaskWithJobResponse} />
              <CodeBlock label={t("pumpNextTask.powershellExample")} text={pumpNextTaskPowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("pumpComplete.title")}</h2>
              <Paragraphs value={trArray("pumpComplete.desc")} />

              <CodeBlock label={t("pumpComplete.manualPayload")} text={pumpCompleteManualPayload} />
              <CodeBlock label={t("pumpComplete.automaticPayload")} text={pumpCompleteAutomaticPayload} />
              <CodeBlock label={t("pumpComplete.failedPayload")} text={pumpCompleteFailedPayload} />
              <CodeBlock label={t("pumpComplete.powershellExample")} text={pumpCompletePowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("feed.title")}</h2>
              <Paragraphs value={trArray("feed.desc")} />

              <CodeBlock label={t("feed.exampleRequest")} text={feedRequestExample} />
              <CodeBlock label={t("feed.exampleResponse")} text={feedResponseExample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("generatedFirmware.title")}</h2>
              <Paragraphs value={trArray("generatedFirmware.desc")} />

              <p className="muted">{t("generatedFirmware.adjustIntro")}</p>
              <BulletList items={trArray("generatedFirmware.adjustItems")} />

              <CodeBlock
                label={t("generatedFirmware.codeLabel")}
                text={generatedFirmwareSample}
              />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("behavior.title")}</h2>

              <h3 className="h2">{t("behavior.fullCycle.title")}</h3>
              <p className="muted">{t("behavior.fullCycle.desc")}</p>
              <BulletList items={trArray("behavior.fullCycle.items")} />

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.manualCheck.title")}
              </h3>
              <Paragraphs value={trArray("behavior.manualCheck.desc")} />
              <BulletList items={trArray("behavior.manualCheck.items")} />

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.automatic.title")}
              </h3>
              <Paragraphs value={trArray("behavior.automatic.desc")} />
              <BulletList items={trArray("behavior.automatic.items")} />
              <p className="muted">{t("behavior.automatic.cooldown")}</p>

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.manual.title")}
              </h3>
              <Paragraphs value={trArray("behavior.manual.desc")} />
              <BulletList items={trArray("behavior.manual.items")} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("hardware.title")}</h2>
              <p className="muted">{t("hardware.desc")}</p>
              <BulletList items={trArray("hardware.items")} />
              <p className="muted">{t("hardware.verify")}</p>
              <p className="muted">{t("hardware.relayNote")}</p>
              <CodeBlock label={t("hardware.relayCodeLabel")} text={relayOutputExample} />
              <p className="muted">{t("hardware.relayReverse")}</p>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("calibration.title")}</h2>
              <Paragraphs value={trArray("calibration.desc")} />
              <CodeBlock label={t("calibration.codeLabel")} text={calibrationExample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("safety.title")}</h2>
              <p className="muted">{trArray("safety.desc")[0]}</p>
              <BulletList items={trArray("safety.items")} />
              <p className="muted">{trArray("safety.desc")[1]}</p>
            </section>
          </div>

          <aside
            className="schema-aside"
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              alignSelf: "start",
            }}
          >
            <section
              className="schema-section"
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                margin: 0,
              }}
            >
              <h2 className="h2">{t("wiring.title")}</h2>
              <p className="muted">{t("wiring.desc")}</p>

              <div
                className="schema-wiring-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <WiringPlaceholder
                  ariaLabel={t("wiring.ariaPrimary")}
                  title={t("wiring.placeholderTitlePrimary")}
                  sub={t("wiring.placeholderSubPrimary")}
                  imageSrc={sketch1}
                  imageAlt={t("wiring.ariaPrimary")}
                  onClick={() =>
                    setModalImage({
                      src: sketch1,
                      alt: t("wiring.ariaPrimary"),
                    })
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      </article>

      <ImageModal
        open={Boolean(modalImage)}
        src={modalImage?.src}
        alt={modalImage?.alt || ""}
        onClose={() => setModalImage(null)}
      />
    </>
  );
}