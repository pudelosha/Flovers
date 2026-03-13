from textwrap import dedent


def _bool_flag(value) -> str:
    return "true" if bool(value) else "false"


def generate_arduino_code(
    *,
    base_url: str,
    secret: str,
    device_id: int,
    device_key: str,
    interval_hours: int,
    sensors: dict | None = None,
) -> str:
    sensors = sensors or {}

    use_temperature = _bool_flag(sensors.get("temperature", True))
    use_humidity = _bool_flag(sensors.get("humidity", True))
    use_light = _bool_flag(sensors.get("light", True))
    use_moisture = _bool_flag(sensors.get("moisture", True))

    send_interval_ms = max(1, int(interval_hours)) * 60 * 60 * 1000
    api_url = f"{base_url.rstrip('/')}/api/readings/ingest/"

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

        const unsigned long SEND_INTERVAL_MS = {send_interval_ms}UL;
        unsigned long lastSendMs = 0;

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

            Serial.println(http.getString());

            http.end();
            client.stop();

            return (code >= 200 && code < 300);
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
    ).strip() + "\\n"