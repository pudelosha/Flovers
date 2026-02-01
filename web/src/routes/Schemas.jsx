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

export default function Schema() {
  const { t } = useTranslation("schemas");

  // You can wire these later (env/config). Keeping defaults copy-paste friendly.
  const ingestEndpoint = t("endpoints.ingest.value", {
    defaultValue: "http://127.0.0.1:8000/api/readings/ingest/",
  });

  const readEndpoint = t("endpoints.read.value", {
    defaultValue: "http://127.0.0.1:8000/api/readings/",
  });

  const powershellSample = useMemo(
    () => `# PowerShell example (POST ingest)
$body = @'
{
  "secret":   "YOUR_SECRET",
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
    "temperature": "number (°C)",
    "humidity": "number (%)",
    "light": "number (lux or raw)",
    "moisture": "number (0-100 or raw)"
  }
}`,
    []
  );

  const readRequestExample = useMemo(
    () => `# Example (GET)
# ${readEndpoint}?device_key=YOUR_DEVICE_KEY&from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z

# Example (POST body style, if you support it)
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-01-02T00:00:00Z"
}`,
    [readEndpoint]
  );

  const arduinoSample = useMemo(
    () => `/*
  ESP32/ESP8266 sample: Wi-Fi + HTTPS/HTTP POST to Flovers backend

  Sensors mentioned:
  - BH1750 (GY-302) over I2C
  - BME280 over I2C (temperature/humidity/pressure)
  - Capacitive soil moisture sensor (analog)

  Notes:
  - On ESP32, choose a valid ADC pin for moisture (example uses GPIO34).
  - On ESP8266, use A0 for analog moisture (scale may differ).
  - If your backend is HTTPS, consider WiFiClientSecure + certificate pinning.
*/

#include <Arduino.h>

#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
#endif

#include <Wire.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>

static const char* WIFI_SSID = "YOUR_WIFI_SSID";
static const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

static const char* INGEST_URL  = "${ingestEndpoint}";
static const char* DEVICE_KEY  = "YOUR_DEVICE_KEY";
static const char* SECRET      = "YOUR_SECRET";

// --- I2C sensors ---
Adafruit_BME280 bme;
BH1750 lightMeter;

// --- Soil moisture (capacitive) ---
#if defined(ESP32)
  const int MOISTURE_PIN = 34;  // ADC pin (input only)
#elif defined(ESP8266)
  const int MOISTURE_PIN = A0;
#endif

// Map raw analog to 0..100 (calibrate!)
int moisturePercentFromRaw(int raw) {
  // Example calibration (adjust to your sensor):
  // "wet"  -> lower raw
  // "dry"  -> higher raw
  const int wetRaw = 1400;   // TODO: measure in water
  const int dryRaw = 3200;   // TODO: measure in air
  int clamped = raw;
  if (clamped < wetRaw) clamped = wetRaw;
  if (clamped > dryRaw) clamped = dryRaw;

  float pct = 100.0f * (1.0f - (float)(clamped - wetRaw) / (float)(dryRaw - wetRaw));
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return (int)(pct + 0.5f);
}

String isoTimestampUtc() {
  // Minimal placeholder. Prefer real NTP time:
  // - ESP32: configTime + getLocalTime
  // - ESP8266: configTime + time(nullptr)
  return "2026-01-06T10:11:00Z";
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  connectWiFi();

  Wire.begin();

  // BME280 (I2C address usually 0x76 or 0x77)
  bool bmeOk = bme.begin(0x76);
  if (!bmeOk) {
    Serial.println("BME280 not found at 0x76; try 0x77");
    bmeOk = bme.begin(0x77);
  }

  // BH1750
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  Serial.println("Ready.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Read sensors
  float temperature = bme.readTemperature();     // °C
  float humidity    = bme.readHumidity();        // %
  float lux         = lightMeter.readLightLevel();

  int rawMoist = analogRead(MOISTURE_PIN);
  int moisture = moisturePercentFromRaw(rawMoist);

  // Build JSON (match your backend format)
  String json =
    String("{") +
      "\\"secret\\":\\"" + SECRET + "\\"," +
      "\\"device_key\\":\\"" + DEVICE_KEY + "\\"," +
      "\\"timestamp\\":\\"" + isoTimestampUtc() + "\\"," +
      "\\"metrics\\":{" +
        "\\"temperature\\":" + String(temperature, 2) + "," +
        "\\"humidity\\":" + String(humidity, 2) + "," +
        "\\"light\\":" + String(lux, 0) + "," +
        "\\"moisture\\":" + String(moisture) +
      "}" +
    "}";

#if defined(ESP32)
  HTTPClient http;
  http.begin(INGEST_URL);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST((uint8_t*)json.c_str(), json.length());
  String resp = http.getString();
  http.end();
#elif defined(ESP8266)
  WiFiClient client;
  HTTPClient http;
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(json);
  String resp = http.getString();
  http.end();
#endif

  Serial.print("POST code: ");
  Serial.println(code);
  // Serial.println(resp);

  // Send every 10 minutes (adjust)
  delay(10 * 60 * 1000);
}
`,
    [ingestEndpoint]
  );

  return (
    <article className="card prose schema-page">
      <h1 className="h1 h1-auth">{t("title")}</h1>
      <p className="muted schema-lead">{t("lead")}</p>

      <div className="schema-grid">
        {/* LEFT: API + code */}
        <div className="schema-col">
          <section className="schema-section">
            <h2 className="h2">{t("endpoints.title")}</h2>

            <div className="schema-endpoints">
              <InfoRow label={t("endpoints.ingest.label")} value={ingestEndpoint} />
              <InfoRow label={t("endpoints.read.label")} value={readEndpoint} />
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
            <h2 className="h2">{t("read.title")}</h2>
            <p className="muted">{t("read.desc")}</p>

            <CodeBlock label={t("read.exampleLabel")} text={readRequestExample} />
          </section>

          <section className="schema-section">
            <h2 className="h2">{t("arduino.title")}</h2>
            <p className="muted">{t("arduino.desc")}</p>

            <ul className="schema-list">
              <li>{t("arduino.sensors.bh1750")}</li>
              <li>{t("arduino.sensors.moisture")}</li>
              <li>{t("arduino.sensors.bme280")}</li>
            </ul>

            <CodeBlock label={t("arduino.codeLabel")} text={arduinoSample} />

            <div className="schema-footnote muted">{t("arduino.note")}</div>
          </section>
        </div>

        {/* RIGHT: wiring placeholder */}
        <aside className="schema-aside">
          <section className="schema-section">
            <h2 className="h2">{t("wiring.title")}</h2>
            <p className="muted">{t("wiring.desc")}</p>

            <div className="schema-wiring" role="img" aria-label={t("wiring.aria")}>
              <div className="schema-wiring-inner">
                <div className="schema-wiring-title">{t("wiring.placeholderTitle")}</div>
                <div className="schema-wiring-sub muted">{t("wiring.placeholderSub")}</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
