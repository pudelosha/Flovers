#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <cstring>
#include <cstdint>
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <time.h>

// -------------------- WiFi --------------------
// Fill in your WiFi credentials before uploading.

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Trusted TLS roots; see readings/TLS.md.
static const char TLS_ROOT_CA[] = R"FLOVERS_CA(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----
)FLOVERS_CA";

// -------------------- API ---------------------

const char* apiUrl = "https://api.flovers.app/readings/ingest/";
const char* secret = "YOUR_SECRET";
const char* deviceKey = "YOUR_DEVICE_KEY";
const char* pumpNextTaskUrl = "https://api.flovers.app/readings/pump-next-task/";
const char* pumpCompleteUrl = "https://api.flovers.app/readings/pump-complete/";
const char* pumpAutoClaimUrl = "https://api.flovers.app/readings/pump-auto-claim/";

// -------------------- Device ------------------

const int DEVICE_ID = 123;

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
// Sampling interval selected in Flovers when generating this sketch.
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

const unsigned long SEND_INTERVAL_MS = 1UL * 60UL * 60UL * 1000UL;
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
unsigned long activePumpCooldownMs = AUTO_PUMP_MIN_INTERVAL_MS;

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

    json += "\"secret\":\"" + String(secret) + "\",";
    json += "\"device_key\":\"" + String(deviceKey) + "\",";
    json += "\"device_id\":" + String(DEVICE_ID) + ",";
    json += "\"timestamp\":\"" + timestamp + "\",";

    json += "\"metrics\":{";

    bool firstMetric = true;

    if (readings.hasTemperature)
    {
        json += "\"temperature\":" + String(readings.temperature, 2);
        firstMetric = false;
    }

    if (readings.hasHumidity)
    {
        if (!firstMetric) json += ",";
        json += "\"humidity\":" + String(readings.humidity, 2);
        firstMetric = false;
    }

    if (readings.hasLight)
    {
        if (!firstMetric) json += ",";
        json += "\"light\":" + String(readings.light, 0);
        firstMetric = false;
    }

    if (readings.hasMoisture)
    {
        if (!firstMetric) json += ",";
        json += "\"moisture\":" + String(readings.moisture);
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
    // Request bodies contain device credentials; keep them out of logs.

    WiFiClientSecure client;
    if (time(nullptr) < 1735689600LL)
    {
        Serial.println("HTTPS skipped: synchronize the clock before sending credentials");
        return false;
    }
    client.setCACert(TLS_ROOT_CA);

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
    String quotedKey = "\"" + key + "\"";
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
            json[valueIndex] == '\n' ||
            json[valueIndex] == '\r' ||
            json[valueIndex] == '\t'
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

struct PumpSafetyRecord
{
    int64_t notBefore;
    char deviceKey[17];
    unsigned char version;
};

bool readPumpSafety(PumpSafetyRecord& record)
{
    Preferences storage;
    // Read/write mode also creates the namespace on a fresh device.
    // Missing storage or a malformed existing record still fails closed.
    if (!storage.begin("flovers-pump", false))
        return false;
    size_t size = storage.isKey("cooldown") ? storage.getBytesLength("cooldown") : 0;
    bool valid = size == 0 ||
        (size == sizeof(record) &&
         storage.getBytes("cooldown", &record, sizeof(record)) == sizeof(record) &&
         record.version == 1 && record.deviceKey[16] == '\0' && record.notBefore >= 0);
    storage.end();
    return valid;
}

bool reservePumpSafety()
{
    int64_t now = static_cast<int64_t>(time(nullptr));
    if (now < 1735689600LL)
        return false;
    PumpSafetyRecord record = {};
    if (!readPumpSafety(record))
        return false;
    int64_t until = now + (activePumpCooldownMs + PUMP_RUN_MS + 999UL) / 1000UL;
    if (String(record.deviceKey) != String(deviceKey) || record.notBefore < until)
        record.notBefore = until;
    std::strncpy(record.deviceKey, deviceKey, sizeof(record.deviceKey) - 1);
    record.deviceKey[sizeof(record.deviceKey) - 1] = '\0';
    record.version = 1;
    Preferences storage;
    if (!storage.begin("flovers-pump", false))
        return false;
    bool persisted = storage.putBytes("cooldown", &record, sizeof(record)) == sizeof(record);
    storage.end();
    return persisted;
}

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

    json += "\"secret\":\"" + String(secret) + "\",";
    json += "\"device_key\":\"" + String(deviceKey) + "\",";
    json += "\"device_id\":" + String(DEVICE_ID) + ",";
    json += "\"supports_task_retry\":true,";
    json += "\"supports_auto_claim\":true";

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

    json += "\"secret\":\"" + String(secret) + "\",";
    json += "\"device_key\":\"" + String(deviceKey) + "\",";
    json += "\"device_id\":" + String(DEVICE_ID) + ",";

    if (taskId > 0)
    {
        json += "\"task_id\":" + String(taskId) + ",";
    }

    json += "\"source\":\"" + source + "\",";
    json += "\"success\":" + String(success ? "true" : "false");

    if (errorMessage.length() > 0)
    {
        json += ",\"error_message\":\"" + errorMessage + "\"";
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
    long cooldownMinutes = jsonLongValue(responseBody, "pump_cooldown_minutes", 60);
    if (cooldownMinutes < 1 || cooldownMinutes > 32767)
    {
        result.autoPumpEnabled = false;
        cooldownMinutes = 60;
    }
    activePumpCooldownMs = static_cast<unsigned long>(cooldownMinutes) * 60UL * 1000UL;

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

    // Persist the execution receipt BEFORE pumping. Replayed deliveries
    // acknowledge the same task without watering again, even after reboot.
    struct PumpReceipt
    {
        long taskId;
        char deviceKey[17];
        unsigned char state; // 1: started, 2: succeeded, 3: failed
    };
    PumpReceipt receipt = {};
    Preferences receipts;
    if (!receipts.begin("flovers-pump", false))
    {
        sendPumpComplete(taskId, "manual", false, "Could not open pump receipt storage");
        return result;
    }

    size_t storedSize = receipts.isKey("receipt") ? receipts.getBytesLength("receipt") : 0;
    if (storedSize != 0 &&
        (storedSize != sizeof(receipt) ||
         receipts.getBytes("receipt", &receipt, sizeof(receipt)) != sizeof(receipt)))
    {
        receipts.end();
        sendPumpComplete(taskId, "manual", false, "Could not read pump receipt");
        return result;
    }
    receipt.deviceKey[sizeof(receipt.deviceKey) - 1] = '\0';

    if (String(receipt.deviceKey) == String(deviceKey) && receipt.taskId >= taskId)
    {
        bool succeeded = receipt.taskId == taskId && receipt.state == 2;
        receipts.end();
        sendPumpComplete(
            taskId, "manual", succeeded,
            succeeded ? "" : "Previous pump execution was interrupted or superseded"
        );
        // An interrupted run may already have delivered water. Apply
        // cooldown and skip automatic watering during this cycle too.
        result.manualPumpRan = true;
        return result;
    }

    receipt.taskId = taskId;
    std::strncpy(receipt.deviceKey, deviceKey, sizeof(receipt.deviceKey) - 1);
    receipt.deviceKey[sizeof(receipt.deviceKey) - 1] = '\0';
    receipt.state = 1;
    if (receipts.putBytes("receipt", &receipt, sizeof(receipt)) != sizeof(receipt))
    {
        receipts.end();
        sendPumpComplete(taskId, "manual", false, "Could not persist pump receipt");
        return result;
    }

    // A manual run may override the cooldown, but must persist a new
    // safety boundary before delivering water. Reboots retain it.
    if (!reservePumpSafety())
    {
        receipt.state = 3;
        receipts.putBytes("receipt", &receipt, sizeof(receipt));
        receipts.end();
        sendPumpComplete(taskId, "manual", false, "Could not persist watering cooldown");
        return result;
    }
    bool success = runPumpForMs(PUMP_RUN_MS);
    receipt.state = success ? 2 : 3;
    bool recorded = receipts.putBytes("receipt", &receipt, sizeof(receipt)) == sizeof(receipt);
    receipts.end();

    if (!recorded)
    {
        sendPumpComplete(taskId, "manual", false, "Pump ran but its result could not be persisted");
        result.manualPumpRan = success;
        return result;
    }

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
    int64_t now = static_cast<int64_t>(time(nullptr));
    if (now < 1735689600LL)
        return true;
    PumpSafetyRecord record = {};
    if (!readPumpSafety(record))
        return true;
    if (String(record.deviceKey) == String(deviceKey) && record.notBefore > now)
        return true;
    return lastAutoPumpMs != 0 && (millis() - lastAutoPumpMs) < activePumpCooldownMs;
}

long claimAutomaticPump(int moisture)
{
    String json = "{";
    json += "\"secret\":\"" + String(secret) + "\",";
    json += "\"device_key\":\"" + String(deviceKey) + "\",";
    json += "\"device_id\":" + String(DEVICE_ID) + ",";
    json += "\"moisture\":" + String(moisture) + "}";
    String response = "";
    if (!postJson(pumpAutoClaimUrl, json, response, "automatic watering claim") ||
        !jsonBoolValue(response, "run", false))
        return -1;
    return jsonLongValue(response, "task_id", -1);
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

    long taskId = claimAutomaticPump(moisture);
    if (taskId <= 0)
    {
        Serial.println("Automatic watering was not reserved by backend");
        return;
    }
    if (!reservePumpSafety())
    {
        sendPumpComplete(taskId, "automatic", false, "Could not persist watering cooldown");
        return;
    }
    bool success = runPumpForMs(PUMP_RUN_MS);

    if (success)
    {
        lastAutoPumpMs = millis();
    }

    sendPumpComplete(
        taskId,
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
}
