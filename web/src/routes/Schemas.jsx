import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/schemas.css";

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

function InfoRow({ label, value }) {
  return (
    <div className="schema-inforow">
      <div className="schema-inforow-label">{label}</div>
      <div className="schema-inforow-value">
        <code>{value}</code>
      </div>
    </div>
  );
}

function WiringPlaceholder({ ariaLabel, title, sub }) {
  return (
    <div className="schema-wiring" role="img" aria-label={ariaLabel}>
      <div className="schema-wiring-inner">
        <div className="schema-wiring-title">{title}</div>
        <div className="schema-wiring-sub muted">{sub}</div>
      </div>
    </div>
  );
}

export default function Schema() {
  const { t } = useTranslation("schemas");

  const ingestEndpoint = t("endpoints.ingest.value", {
    defaultValue: "https://api.flovers.app/api/readings/ingest/",
  });

  const feedEndpoint = t("endpoints.feed.value", {
    defaultValue: "https://api.flovers.app/api/readings/feed/",
  });

  const powershellSample = useMemo(
    () => `# PowerShell example (POST ingest)
$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
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
  -Uri "${ingestEndpoint}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body
`,
    [ingestEndpoint]
  );

  const ingestJsonSchema = useMemo(
    () => `{
  "secret": "string",
  "device_key": "string",
  "timestamp": "ISO-8601 UTC string",
  "metrics": {
    "temperature": "number (optional)",
    "humidity": "number (optional)",
    "light": "number (optional)",
    "moisture": "number (optional)"
  }
}`,
    []
  );

  const postArduinoSample = useMemo(
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

const char* apiUrl = "${ingestEndpoint}";
const char* secret = "YOUR_SECRET";
const char* deviceKey = "YOUR_DEVICE_KEY";

// -------------------- Pins --------------------

#define SDA_PIN 9
#define SCL_PIN 8
#define SOIL_PIN 3

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

const unsigned long SEND_INTERVAL_MS = 3600000UL;
unsigned long lastSendMs = 0;

// -------------------- NTP --------------------

const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";

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
// JSON PAYLOAD
// ========================================================

String buildPayload(
    bool hasTemperature,
    float temperature,
    bool hasHumidity,
    float humidity,
    bool hasLight,
    float light,
    bool hasMoisture,
    int moisture,
    const String& timestamp)
{
    String json = "{";

    json += "\\"secret\\":\\"" + String(secret) + "\\",";
    json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";
    json += "\\"timestamp\\":\\"" + timestamp + "\\",";
    json += "\\"metrics\\":{";

    bool firstMetric = true;

    if (hasTemperature)
    {
        json += "\\"temperature\\":" + String(temperature, 2);
        firstMetric = false;
    }

    if (hasHumidity)
    {
        if (!firstMetric) json += ",";
        json += "\\"humidity\\":" + String(humidity, 2);
        firstMetric = false;
    }

    if (hasLight)
    {
        if (!firstMetric) json += ",";
        json += "\\"light\\":" + String(light, 0);
        firstMetric = false;
    }

    if (hasMoisture)
    {
        if (!firstMetric) json += ",";
        json += "\\"moisture\\":" + String(moisture);
    }

    json += "}";
    json += "}";

    return json;
}

// ========================================================
// SEND DATA
// ========================================================

bool sendReading()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi not connected, retrying...");
        if (!connectWiFi())
            return false;
    }

    String timestamp = getIsoTimestampUTC();

    if (timestamp.length() == 0)
        return false;

    bool hasTemperature = false;
    bool hasHumidity = false;
    bool hasLight = false;
    bool hasMoisture = false;

    float temperature = 0.0f;
    float humidity = 0.0f;
    float light = 0.0f;
    int moisture = 0;

    if (SENSOR_TEMPERATURE_ENABLED)
    {
        temperature = bme.readTemperature();
        hasTemperature = true;
        Serial.print("Temp: ");
        Serial.println(temperature);
    }

    if (SENSOR_HUMIDITY_ENABLED)
    {
        humidity = bme.readHumidity();
        hasHumidity = true;
        Serial.print("Humidity: ");
        Serial.println(humidity);
    }

    if (SENSOR_LIGHT_ENABLED)
    {
        light = lightMeter.readLightLevel();
        hasLight = true;
        Serial.print("Light: ");
        Serial.println(light);
    }

    if (SENSOR_MOISTURE_ENABLED)
    {
        int raw = readSoilRaw();
        moisture = soilPercent(raw);
        hasMoisture = true;

        Serial.print("Soil raw: ");
        Serial.println(raw);

        Serial.print("Soil %: ");
        Serial.println(moisture);
    }

    String json = buildPayload(
        hasTemperature,
        temperature,
        hasHumidity,
        humidity,
        hasLight,
        light,
        hasMoisture,
        moisture,
        timestamp);

    Serial.println("Sending:");
    Serial.println(json);

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(15000);

    if (!http.begin(client, apiUrl))
        return false;

    http.addHeader("Content-Type", "application/json");

    int code = http.POST((uint8_t*)json.c_str(), json.length());

    Serial.print("HTTP code: ");
    Serial.println(code);

    Serial.println(http.getString());

    http.end();
    client.stop();

    return (code >= 200 && code < 300);
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

    initSensors();

    if (connectWiFi())
        syncTime();

    sendReading();

    lastSendMs = millis();
}

// ========================================================
// LOOP
// ========================================================

void loop()
{
    if (millis() - lastSendMs >= SEND_INTERVAL_MS)
    {
        Serial.println("Sending periodic update");

        sendReading();

        lastSendMs = millis();
    }

    delay(1000);
}`,
    [ingestEndpoint]
  );

  const feedRequestExample = useMemo(
    () => `# Example (GET)
# ${feedEndpoint}?device_key=YOUR_DEVICE_KEY&secret=YOUR_SECRET`,
    [feedEndpoint]
  );

  const feedResponseExample = useMemo(
    () => `{
  "device_key": "YOUR_DEVICE_KEY",
  "timestamp": "2026-01-06T10:12:00Z",
  "actions": {
    "pump": true
  },
  "metrics": {
    "moisture": 22
  }
}`,
    []
  );

  const getPumpControlSample = useMemo(
    () => `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ========================================================
// WIFI
// ========================================================

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ========================================================
// API
// ========================================================

const char* feedUrl =
  "${feedEndpoint}?device_key=YOUR_DEVICE_KEY&secret=YOUR_SECRET";

// ========================================================
// PINS
// ========================================================

// Relay input pin connected to ESP32
#define RELAY_PIN 7

// Many relay boards are active LOW.
// Change these if your relay is active HIGH.
#define RELAY_ON LOW
#define RELAY_OFF HIGH

// ========================================================
// WATERING SETTINGS
// ========================================================

// Water only if moisture is below this threshold.
const int MOISTURE_THRESHOLD = 25;

// Pump runtime in milliseconds.
// Example: 15000 = 15 seconds.
unsigned long pumpRunMs = 15000UL;

// Delay before next check.
// Example: 900000 = 15 minutes.
unsigned long pollIntervalMs = 900000UL;

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
// RELAY / PUMP
// ========================================================

void pumpOff()
{
    digitalWrite(RELAY_PIN, RELAY_OFF);
    Serial.println("Pump OFF");
}

void pumpOn()
{
    digitalWrite(RELAY_PIN, RELAY_ON);
    Serial.println("Pump ON");
}

void runPump(unsigned long durationMs)
{
    pumpOn();
    delay(durationMs);
    pumpOff();
}

// ========================================================
// SIMPLE JSON HELPERS
// ========================================================

// This example performs simple string-based parsing and looks for:
//   "pump": true
//   "moisture": 22
//
// For a stricter implementation you can later switch to ArduinoJson.

bool extractPumpAction(const String& json)
{
    int actionIndex = json.indexOf("\\"pump\\":");
    if (actionIndex < 0) return false;

    String tail = json.substring(actionIndex);
    return tail.indexOf("true") >= 0;
}

bool extractMoistureValue(const String& json, int& moistureOut)
{
    int keyIndex = json.indexOf("\\"moisture\\":");
    if (keyIndex < 0) return false;

    int colonIndex = json.indexOf(':', keyIndex);
    if (colonIndex < 0) return false;

    int start = colonIndex + 1;
    while (start < json.length() && (json[start] == ' ' || json[start] == '\\t'))
        start++;

    int end = start;
    while (end < json.length() && isDigit(json[end]))
        end++;

    if (end <= start) return false;

    moistureOut = json.substring(start, end).toInt();
    return true;
}

// ========================================================
// FEED REQUEST
// ========================================================

bool readFeedAndMaybeWater()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi not connected, retrying...");
        if (!connectWiFi())
            return false;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(15000);

    if (!http.begin(client, feedUrl))
    {
        Serial.println("Failed to start HTTP client");
        return false;
    }

    int code = http.GET();

    Serial.print("HTTP code: ");
    Serial.println(code);

    if (code <= 0)
    {
        Serial.println("GET request failed");
        http.end();
        client.stop();
        return false;
    }

    String response = http.getString();

    Serial.println("Feed response:");
    Serial.println(response);

    http.end();
    client.stop();

    if (code < 200 || code >= 300)
        return false;

    bool shouldPump = extractPumpAction(response);
    int moisture = -1;
    bool hasMoisture = extractMoistureValue(response, moisture);

    Serial.print("Pump action from backend: ");
    Serial.println(shouldPump ? "true" : "false");

    if (hasMoisture)
    {
        Serial.print("Moisture from payload: ");
        Serial.println(moisture);
    }
    else
    {
        Serial.println("No moisture value found in payload");
    }

    if (shouldPump && hasMoisture && moisture < MOISTURE_THRESHOLD)
    {
        Serial.println("Conditions met -> watering now");
        runPump(pumpRunMs);
    }
    else
    {
        Serial.println("Conditions not met -> pump remains off");
    }

    return true;
}

// ========================================================
// SETUP
// ========================================================

void setup()
{
    Serial.begin(115200);
    delay(1500);

    pinMode(RELAY_PIN, OUTPUT);
    pumpOff();

    Serial.println("Starting feed-based pump controller");

    connectWiFi();
    readFeedAndMaybeWater();
}

// ========================================================
// LOOP
// ========================================================

void loop()
{
    Serial.println("Waiting until next poll...");
    delay(pollIntervalMs);

    readFeedAndMaybeWater();
}`,
    [feedEndpoint]
  );

  return (
    <article className="card prose schema-page">
      <h1 className="h1 h1-auth">{t("title")}</h1>
      <p className="muted schema-lead">{t("lead")}</p>

      <div className="schema-grid">
        <div className="schema-col">
          <section className="schema-section">
            <h2 className="h2">{t("endpoints.title")}</h2>

            <div className="schema-endpoints">
              <InfoRow label={t("endpoints.ingest.label")} value={ingestEndpoint} />
              <InfoRow label={t("endpoints.feed.label")} value={feedEndpoint} />
            </div>

            <div className="schema-note muted">{t("endpoints.note")}</div>
          </section>

          <section className="schema-section">
            <h2 className="h2">{t("ingest.title")}</h2>
            <p className="muted">{t("ingest.desc")}</p>

            <CodeBlock label={t("ingest.schemaLabel")} text={ingestJsonSchema} />
            <CodeBlock label={t("ingest.psLabel")} text={powershellSample} />
          </section>

          <section className="schema-section">
            <h2 className="h2">{t("ingest.arduinoTitle")}</h2>
            <p className="muted">{t("ingest.arduinoDesc")}</p>

            <ul className="schema-list">
              <li>{t("ingest.sensors.bh1750")}</li>
              <li>{t("ingest.sensors.moisture")}</li>
              <li>{t("ingest.sensors.bme280")}</li>
            </ul>

            <CodeBlock
              label={t("ingest.arduinoCodeLabel")}
              text={postArduinoSample}
            />

            <div className="schema-footnote muted">{t("ingest.arduinoNote")}</div>
          </section>

          <section className="schema-section">
            <h2 className="h2">{t("feed.title")}</h2>
            <p className="muted">{t("feed.desc")}</p>

            <CodeBlock label={t("feed.exampleLabel")} text={feedRequestExample} />
            <CodeBlock label={t("feed.responseLabel")} text={feedResponseExample} />
          </section>

          <section className="schema-section">
            <h2 className="h2">{t("feed.controlTitle")}</h2>
            <p className="muted">{t("feed.controlDesc")}</p>

            <CodeBlock
              label={t("feed.controlCodeLabel")}
              text={getPumpControlSample}
            />

            <div className="schema-footnote muted">{t("feed.controlNote")}</div>
          </section>
        </div>

        <aside className="schema-aside">
          <section className="schema-section">
            <h2 className="h2">{t("wiring.title")}</h2>
            <p className="muted">{t("wiring.desc")}</p>

            <div className="schema-wiring-stack">
              <WiringPlaceholder
                ariaLabel={t("wiring.ariaPrimary")}
                title={t("wiring.placeholderTitlePrimary")}
                sub={t("wiring.placeholderSubPrimary")}
              />

              <WiringPlaceholder
                ariaLabel={t("wiring.ariaPump")}
                title={t("wiring.placeholderTitlePump")}
                sub={t("wiring.placeholderSubPump")}
              />
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}