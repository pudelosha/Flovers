from textwrap import dedent


def _bool_flag(value) -> str:
    return "true" if bool(value) else "false"


def generate_arduino_code(
    *,
    base_url: str,
    secret: str,
    device_id: int,
    device_key: str,
    sensors: dict | None = None,
    pump_included: bool = False,
    automatic_pump_launch: bool = False,
    pump_threshold_pct: float | int | None = None,
) -> str:
    sensors = sensors or {}

    use_temperature = _bool_flag(sensors.get("temperature", True))
    use_humidity = _bool_flag(sensors.get("humidity", True))
    use_light = _bool_flag(sensors.get("light", True))
    use_moisture = _bool_flag(sensors.get("moisture", True))

    pump_enabled = bool(pump_included)

    # Pump code is generated only when the device is declared as pump-capable.
    # Automatic watering then depends on:
    # - automatic_pump_launch
    # - moisture sensor enabled
    # - current moisture below threshold
    # - local Arduino cooldown
    auto_pump_enabled = bool(
        pump_enabled
        and automatic_pump_launch
        and sensors.get("moisture", True)
    )

    pump_threshold = 30 if pump_threshold_pct is None else int(round(float(pump_threshold_pct)))

    api_url = f"{base_url.rstrip('/')}/api/readings/ingest/"
    pump_complete_url = f"{base_url.rstrip('/')}/api/readings/pump-complete/"

    pump_config = ""
    pump_setup = ""
    pump_after_success = ""
    pump_functions = ""

    if pump_enabled:
        pump_config = dedent(
            f"""
            // -------------------- Pump ---------------------

            const char* pumpCompleteUrl = "{pump_complete_url}";

            #define PUMP_PIN 4

            // Default pump run time. Adjust manually if your pump needs more or less time.
            const unsigned long PUMP_RUN_MS = 30000UL;

            // Safety cooldown for automatic watering only.
            // Manual scheduled watering ignores this cooldown.
            const unsigned long AUTO_PUMP_MIN_INTERVAL_MS = 60UL * 60UL * 1000UL;

            const bool PUMP_INCLUDED = true;
            const bool AUTO_PUMP_ENABLED = {_bool_flag(auto_pump_enabled)};
            const int AUTO_PUMP_THRESHOLD_PCT = {pump_threshold};

            unsigned long lastAutoPumpMs = 0;
            """
        ).strip()

        pump_setup = dedent(
            """
            pinMode(PUMP_PIN, OUTPUT);
            digitalWrite(PUMP_PIN, LOW);
            """
        ).strip()

        pump_after_success = dedent(
            """
            bool manualPumpRan = handleManualPumpInstruction(responseBody);

            // Automatic watering is decided locally by Arduino.
            // It does not ask the backend for permission.
            // Manual scheduled watering has priority in the same cycle to avoid double watering.
            if (!manualPumpRan)
            {
                handleAutomaticPump(
                    hasMoisture,
                    moisture
                );
            }
            """
        ).strip()

        pump_functions = dedent(
            """
            // ========================================================
            // SIMPLE JSON HELPERS
            // ========================================================

            int findJsonValueStart(const String& json, const String& key)
            {
                String quotedKey = "\\\"" + key + "\\\"";
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

            String buildPumpCompletePayload(
                long taskId,
                const String& source,
                bool success,
                const String& errorMessage)
            {
                String json = "{";

                json += "\\"secret\\":\\"" + String(secret) + "\\",";
                json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";

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
                if (WiFi.status() != WL_CONNECTED)
                {
                    Serial.println("WiFi not connected before pump completion report, retrying...");
                    if (!connectWiFi())
                        return false;
                }

                String json = buildPumpCompletePayload(
                    taskId,
                    source,
                    success,
                    errorMessage
                );

                Serial.println("Sending pump completion:");
                Serial.println(json);

                WiFiClientSecure client;
                client.setInsecure();

                HTTPClient http;
                http.setTimeout(15000);

                if (!http.begin(client, pumpCompleteUrl))
                {
                    Serial.println("Failed to start pump completion HTTP request");
                    return false;
                }

                http.addHeader("Content-Type", "application/json");

                int code = http.POST((uint8_t*)json.c_str(), json.length());

                Serial.print("Pump completion HTTP code: ");
                Serial.println(code);

                String responseBody = http.getString();
                Serial.println(responseBody);

                http.end();
                client.stop();

                return (code >= 200 && code < 300);
            }

            bool handleManualPumpInstruction(const String& responseBody)
            {
                bool shouldRunPump = jsonBoolValue(responseBody, "run", false);

                if (!shouldRunPump)
                {
                    Serial.println("No manual pump task returned by backend");
                    return false;
                }

                long taskId = jsonLongValue(responseBody, "task_id", -1);
                String source = jsonStringValue(responseBody, "source", "");
                String reason = jsonStringValue(responseBody, "reason", "");

                Serial.println("Pump task received");
                Serial.print("Task ID: ");
                Serial.println(taskId);
                Serial.print("Source: ");
                Serial.println(source);
                Serial.print("Reason: ");
                Serial.println(reason);

                if (source != "manual")
                {
                    Serial.println("Ignoring non-manual backend pump instruction");
                    return false;
                }

                if (taskId <= 0)
                {
                    Serial.println("Manual pump task missing valid task_id; cannot report completion");
                    return false;
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

                return success;
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
                int moisture)
            {
                if (!AUTO_PUMP_ENABLED)
                {
                    Serial.println("Automatic pump disabled");
                    return;
                }

                if (!SENSOR_MOISTURE_ENABLED || !hasMoisture)
                {
                    Serial.println("Automatic pump skipped: moisture sensor not enabled or no moisture value");
                    return;
                }

                if (moisture >= AUTO_PUMP_THRESHOLD_PCT)
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
                Serial.print("Threshold: ");
                Serial.println(AUTO_PUMP_THRESHOLD_PCT);

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
            """
        ).strip()

    return dedent(
        f"""
        #include <WiFi.h>
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

        const char* apiUrl = "{api_url}";
        const char* secret = "{secret}";
        const char* deviceKey = "{device_key}";

        // -------------------- Device ------------------

        const int DEVICE_ID = {device_id};

        // -------------------- Pins --------------------

        #define SDA_PIN 9
        #define SCL_PIN 8
        #define SOIL_PIN 3

        // -------------------- Calibration --------------------

        #define SOIL_DRY_VALUE 3900
        #define SOIL_WET_VALUE 1300

        // -------------------- Sensors --------------------

        #define BME280_ADDRESS 0x76

        const bool SENSOR_TEMPERATURE_ENABLED = {use_temperature};
        const bool SENSOR_HUMIDITY_ENABLED = {use_humidity};
        const bool SENSOR_LIGHT_ENABLED = {use_light};
        const bool SENSOR_MOISTURE_ENABLED = {use_moisture};

        BH1750 lightMeter(0x23);
        Adafruit_BME280 bme;

        // -------------------- Timing --------------------
        // Backend stores and displays readings hourly.
        // You can adjust this value manually in the sketch if needed.

        const unsigned long SEND_INTERVAL_MS = 60UL * 60UL * 1000UL;
        unsigned long lastSendMs = 0;

        {pump_config}

        // -------------------- NTP --------------------

        const char* ntpServer1 = "pool.ntp.org";
        const char* ntpServer2 = "time.nist.gov";



        // ========================================================
        // TIME
        // ========================================================

        String getIsoTimestampUTC()
        {{
            struct tm timeinfo;

            if (!getLocalTime(&timeinfo, 5000))
                return "";

            char buf[25];
            strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);

            return String(buf);
        }}



        // ========================================================
        // WIFI
        // ========================================================

        bool connectWiFi(unsigned long timeoutMs = 20000)
        {{
            WiFi.mode(WIFI_STA);
            WiFi.begin(ssid, password);

            Serial.print("Connecting to WiFi");

            unsigned long start = millis();

            while (WiFi.status() != WL_CONNECTED &&
                   millis() - start < timeoutMs)
            {{
                delay(500);
                Serial.print(".");
            }}

            Serial.println();

            if (WiFi.status() == WL_CONNECTED)
            {{
                Serial.println("WiFi connected");
                Serial.print("ESP32 IP: ");
                Serial.println(WiFi.localIP());
                return true;
            }}

            Serial.println("WiFi connection failed");
            return false;
        }}



        // ========================================================
        // TIME SYNC
        // ========================================================

        bool syncTime()
        {{
            configTime(0, 0, ntpServer1, ntpServer2);

            Serial.println("Synchronizing time with NTP...");

            struct tm timeinfo;

            if (getLocalTime(&timeinfo, 10000))
            {{
                Serial.println("Time synchronized");
                Serial.println(getIsoTimestampUTC());
                return true;
            }}

            Serial.println("Failed to synchronize time");
            return false;
        }}



        // ========================================================
        // SENSOR INIT
        // ========================================================

        bool initSensors()
        {{
            bool ok = true;

            Wire.begin(SDA_PIN, SCL_PIN);

            if (SENSOR_LIGHT_ENABLED)
            {{
                if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE))
                    Serial.println("BH1750 OK");
                else
                {{
                    Serial.println("BH1750 ERROR");
                    ok = false;
                }}
            }}

            if (SENSOR_TEMPERATURE_ENABLED || SENSOR_HUMIDITY_ENABLED)
            {{
                if (bme.begin(BME280_ADDRESS))
                    Serial.println("BME280 OK");
                else
                {{
                    Serial.println("BME280 ERROR");
                    ok = false;
                }}
            }}

            return ok;
        }}



        // ========================================================
        // SOIL SENSOR
        // ========================================================

        int readSoilRaw()
        {{
            long sum = 0;

            for (int i = 0; i < 20; i++)
            {{
                sum += analogRead(SOIL_PIN);
                delay(5);
            }}

            return sum / 20;
        }}

        int soilPercent(int raw)
        {{
            int percent = map(raw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
            return constrain(percent, 0, 100);
        }}



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
        {{
            String json = "{{";

            json += "\\"secret\\":\\"" + String(secret) + "\\",";
            json += "\\"device_key\\":\\"" + String(deviceKey) + "\\",";
            json += "\\"timestamp\\":\\"" + timestamp + "\\",";

            json += "\\"metrics\\":{{";

            bool firstMetric = true;

            if (hasTemperature)
            {{
                json += "\\"temperature\\":" + String(temperature, 2);
                firstMetric = false;
            }}

            if (hasHumidity)
            {{
                if (!firstMetric) json += ",";
                json += "\\"humidity\\":" + String(humidity, 2);
                firstMetric = false;
            }}

            if (hasLight)
            {{
                if (!firstMetric) json += ",";
                json += "\\"light\\":" + String(light, 0);
                firstMetric = false;
            }}

            if (hasMoisture)
            {{
                if (!firstMetric) json += ",";
                json += "\\"moisture\\":" + String(moisture);
            }}

            json += "}}";
            json += "}}";

            return json;
        }}



        {pump_functions}



        // ========================================================
        // SEND DATA
        // ========================================================

        bool sendReading()
        {{
            if (WiFi.status() != WL_CONNECTED)
            {{
                Serial.println("WiFi not connected, retrying...");
                if (!connectWiFi())
                    return false;
            }}

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
            {{
                temperature = bme.readTemperature();
                hasTemperature = true;
                Serial.print("Temp: ");
                Serial.println(temperature);
            }}

            if (SENSOR_HUMIDITY_ENABLED)
            {{
                humidity = bme.readHumidity();
                hasHumidity = true;
                Serial.print("Humidity: ");
                Serial.println(humidity);
            }}

            if (SENSOR_LIGHT_ENABLED)
            {{
                light = lightMeter.readLightLevel();
                hasLight = true;
                Serial.print("Light: ");
                Serial.println(light);
            }}

            if (SENSOR_MOISTURE_ENABLED)
            {{
                int raw = readSoilRaw();
                moisture = soilPercent(raw);
                hasMoisture = true;

                Serial.print("Soil raw: ");
                Serial.println(raw);

                Serial.print("Soil %: ");
                Serial.println(moisture);
            }}

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

            String responseBody = http.getString();
            Serial.println(responseBody);

            http.end();
            client.stop();

            bool ok = (code >= 200 && code < 300);

            if (ok)
            {{
                {pump_after_success}
            }}

            return ok;
        }}



        // ========================================================
        // SETUP
        // ========================================================

        void setup()
        {{
            Serial.begin(115200);
            delay(1500);

            Serial.println("Starting sensor uploader");

            analogReadResolution(12);
            analogSetPinAttenuation(SOIL_PIN, ADC_11db);

            {pump_setup}

            initSensors();

            if (connectWiFi())
                syncTime();

            sendReading();

            lastSendMs = millis();
        }}



        // ========================================================
        // LOOP
        // ========================================================

        void loop()
        {{
            if (millis() - lastSendMs >= SEND_INTERVAL_MS)
            {{
                Serial.println("Sending periodic update");

                sendReading();

                lastSendMs = millis();
            }}

            delay(1000);
        }}
        """
    ).strip() + "\n"