#include <cmath>
#include <cstdio>
#include <iostream>
#include <limits>
#include <string>
#include <utility>

// Host substitutes only Arduino's String operations; the reading structure and
// payload builder below are inserted directly from the production generator.
class String {
public:
    std::string value;
    String() = default;
    String(const char* text) : value(text) {}
    String(const std::string& text) : value(text) {}
    String(int number) : value(std::to_string(number)) {}
    String(double number, int decimals) {
        char buffer[128];
        std::snprintf(buffer, sizeof(buffer), "%.*f", decimals, number);
        value = buffer;
    }
    String& operator+=(const String& other) {
        value += other.value;
        return *this;
    }
    friend String operator+(const String& left, const String& right) {
        return left.value + right.value;
    }
};

const char* secret = "test-secret";
const char* deviceKey = "DEVICE";
const int DEVICE_ID = 7;

// GENERATED_SENSOR_TYPES

// GENERATED_READING_PAYLOAD

void emit(const char* name, const SensorReadings& readings) {
    std::cout << name << '\t'
              << buildReadingPayload(readings, "2026-05-05T10:15:00Z").value
              << '\n';
}

int main() {
    const SensorReadings normal{true, true, true, true, 22.5f, 41.0f, 600.0f, 35};
    const float nan = std::numeric_limits<float>::quiet_NaN();
    const float infinity = std::numeric_limits<float>::infinity();
    emit("valid", normal);

    for (const auto& sample : {
             std::pair<const char*, float>{"temperature_nan", nan},
             {"temperature_infinity", infinity},
             {"temperature_negative_infinity", -infinity},
             {"temperature_below_zero", -5.5f},
         }) {
        auto readings = normal;
        readings.temperature = sample.second;
        emit(sample.first, readings);
    }

    for (const auto& sample : {
             std::pair<const char*, float>{"humidity_nan", nan},
             {"humidity_infinity", infinity},
             {"humidity_negative_infinity", -infinity},
             {"humidity_below_zero", -1.0f},
             {"humidity_above_hundred", 101.0f},
             {"humidity_zero", 0.0f},
             {"humidity_hundred", 100.0f},
         }) {
        auto readings = normal;
        readings.humidity = sample.second;
        emit(sample.first, readings);
    }

    for (const auto& sample : {
             std::pair<const char*, float>{"light_no_data", -1.0f},
             {"light_unconfigured", -2.0f},
             {"light_nan", nan},
             {"light_infinity", infinity},
             {"light_negative_infinity", -infinity},
             {"light_zero", 0.0f},
         }) {
        auto readings = normal;
        readings.light = sample.second;
        emit(sample.first, readings);
    }

    auto readings = normal;
    readings.temperature = nan;
    readings.humidity = infinity;
    readings.light = -1.0f;
    emit("failed_float_sensors", readings);

    readings.hasTemperature = false;
    readings.hasHumidity = false;
    readings.hasLight = false;
    emit("disabled_float_sensors", readings);
}
