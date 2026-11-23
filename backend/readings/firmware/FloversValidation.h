#pragma once
#include <ArduinoJson.h>
#include <cmath>
namespace Flovers {
inline int pumpThresholdCeiling(double percent) {
    // Soil ADC percentages are integers: < ceil(threshold) preserves fractional backend thresholds exactly.
    return static_cast<int>(std::ceil(percent));
}
inline bool validConfiguration(JsonVariantConst config, bool pumpCapable) {
    if (!config.is<JsonObjectConst>() || !config["version"].is<uint32_t>() || config["version"].as<uint32_t>() == 0 ||
            !config["reading_interval_minutes"].is<int>() || !config["pump_duration_seconds"].is<int>() ||
            !config["pump_cooldown_minutes"].is<int>() || !config["enabled"].is<bool>() ||
            !config["pump_included"].is<bool>() || !config["automatic_watering"].is<bool>() ||
            !config["backend_pump_authorization_required"].is<bool>() || !config["backend_pump_authorization_required"].as<bool>() ||
            !config["offline_automatic_watering_allowed"].is<bool>() || config["offline_automatic_watering_allowed"].as<bool>() ||
            !config["sensors"].is<JsonObjectConst>()) return false;
    int interval = config["reading_interval_minutes"], duration = config["pump_duration_seconds"], cooldown = config["pump_cooldown_minutes"];
    if (interval < 1 || interval > 1440 || duration < 1 || duration > 300 || cooldown < 1 || cooldown > 32767) return false;
    if (config["pump_included"].as<bool>() && !pumpCapable) return false;
    if (!config["pump_threshold_pct"].isNull()) {
        if (!config["pump_threshold_pct"].is<double>()) return false;
        double value = config["pump_threshold_pct"];
        if (!std::isfinite(value) || value < 0 || value > 100) return false;
    }
    for (const char* name : {"temperature", "humidity", "light", "moisture"}) {
        JsonVariantConst value = config["sensors"][name];
        if (!value.isNull() && !value.is<bool>()) return false;
    }
    return !config["automatic_watering"].as<bool>() ||
        (config["pump_included"].as<bool>() && !config["pump_threshold_pct"].isNull() && config["sensors"]["moisture"] == true);
}

template<class Store, class Text, class Verifier>
inline bool commitRecord(Store& storage, const char* name, const Text& envelope, Verifier verify) {
    if (!storage.begin(name, false)) return false;
    bool written = storage.putString("active", envelope) > 0;
    storage.end();
    return written && verify();
}
} // namespace Flovers
