#include <cassert>
#include <cstring>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>
#include <cstdint>
#include <ctime>
#include <set>
#include <cctype>
#include <cstdlib>

// Host substitutes for ESP32 I/O. The pump implementation below is generated
// from production code, so retries execute that implementation directly.
class String {
public:
    std::string value;
    String() = default;
    String(const char* text) : value(text) {}
    String(const std::string& text) : value(text) {}
    String(int number) : value(std::to_string(number)) {}
    String(long number) : value(std::to_string(number)) {}
    size_t length() const { return value.size(); }
    char operator[](size_t index) const { return value[index]; }
    String substring(size_t start, size_t end) const { return value.substr(start, end - start); }
    String& operator+=(const String& other) { value += other.value; return *this; }
    friend String operator+(const String& a, const String& b) { return a.value + b.value; }
    friend bool operator==(const String& a, const String& b) { return a.value == b.value; }
    friend bool operator!=(const String& a, const String& b) { return !(a == b); }
};

struct SerialStub {
    template<class T> void print(const T&) {}
    template<class T> void println(const T&) {}
    void println() {}
} Serial;

// GENERATED_TYPES

const char* secret = "test-secret";
const char* deviceKey = "DEVICE";
const char* pumpNextTaskUrl = "next";
const char* pumpCompleteUrl = "complete";
const char* pumpAutoClaimUrl = "claim";
const int DEVICE_ID = 1, PUMP_PIN = 4, HIGH = 1, LOW = 0;
const int FALLBACK_AUTO_PUMP_THRESHOLD_PCT = 30;
const bool SENSOR_MOISTURE_ENABLED = true;
const unsigned long PUMP_RUN_MS = 30000, AUTO_PUMP_MIN_INTERVAL_MS = 3600000;
unsigned long lastAutoPumpMs = 0, clockMs = 1000;
unsigned long activePumpCooldownMs = AUTO_PUMP_MIN_INTERVAL_MS;
int64_t wallEpoch = 1760000000;
std::time_t fakeTime(std::time_t* output) {
    std::time_t now = static_cast<std::time_t>(wallEpoch + clockMs / 1000);
    if (output) *output = now;
    return now;
}
#define time fakeTime
int pumpRuns = 0, storageWrites = 0, failStorageWrite = 0;
bool storageUnavailable = false, interruptPump = false, completionReplyLost = false;
bool claimAllowed = true, claimReplyLost = false;
int autoClaims = 0;
unsigned long lastDuration = 0;
std::string durationReply;
long cooldownMinutesReply = 60;
long nextTask = 42;
std::vector<bool> completions;
std::map<std::string, std::vector<unsigned char>> flash;
std::set<std::string> namespaces;

unsigned long millis() { return clockMs; }
void digitalWrite(int, int level) { if (level == HIGH) ++pumpRuns; }
void delay(unsigned long duration) {
    lastDuration = duration;
    if (interruptPump) throw std::runtime_error("simulated power loss");
    clockMs += duration;
}

class Preferences {
    std::string scope;
public:
    bool begin(const char* name, bool readOnly) {
        scope = name;
        if (storageUnavailable || (readOnly && !namespaces.count(scope))) return false;
        if (!readOnly) namespaces.insert(scope);
        return true;
    }
    void end() {}
    bool isKey(const char* key) { return flash.count(scope + ":" + key) != 0; }
    size_t getBytesLength(const char* key) { return flash.at(scope + ":" + key).size(); }
    size_t getBytes(const char* key, void* output, size_t capacity) {
        const auto& bytes = flash.at(scope + ":" + key);
        if (bytes.size() > capacity) return 0;
        std::memcpy(output, bytes.data(), bytes.size());
        return bytes.size();
    }
    size_t putBytes(const char* key, const void* input, size_t length) {
        if (++storageWrites == failStorageWrite) return 0;
        const auto* bytes = static_cast<const unsigned char*>(input);
        flash[scope + ":" + key] = {bytes, bytes + length};
        return length;
    }
};

bool postJson(const char* url, const String& body, String& response, const char*) {
    response = "{}";
    if (std::string(url) == "next") {
        response = durationReply.empty() ? "{}" : "{\"duration_seconds\":" + durationReply + "}";
        assert(body.value.find("\"supports_task_retry\":true") != std::string::npos);
        assert(body.value.find("\"supports_auto_claim\":true") != std::string::npos);
        return true;
    }
    if (std::string(url) == "claim") {
        ++autoClaims;
        response = claimAllowed ? "claim-allowed" : "claim-denied";
        return !claimReplyLost;
    }
    assert(std::string(url) == "complete");
    completions.push_back(body.value.find("\"success\":true") != std::string::npos);
    return !completionReplyLost;
}
bool jsonBoolValue(const String& text, const String&, bool = false) { return text.value != "claim-denied"; }
int jsonIntValue(const String&, const String& key, int) { return key == "pump_cooldown_minutes" ? 60 : 30; }
int findJsonValueStart(const String& text, const String& key) {
    auto index = text.value.find("\"" + key.value + "\":");
    return index == std::string::npos ? -1 : int(index + key.length() + 3);
}
long jsonLongValue(const String&, const String& key, long = -1) {
    if (key == "duration_seconds") return std::strtol(durationReply.c_str(), nullptr, 10);
    return key == "pump_cooldown_minutes" ? cooldownMinutesReply : nextTask;
}
String jsonStringValue(const String&, const String& key, const String& = "") {
    return key == "source" ? "manual" : "manual_scheduled";
}

// GENERATED_PUMP_HELPERS

void reset() {
    durationReply.clear();
    lastDuration = 0;
    flash.clear();
    namespaces.clear();
    completions.clear();
    pumpRuns = storageWrites = failStorageWrite = 0;
    storageUnavailable = interruptPump = completionReplyLost = false;
    nextTask = 42;
    deviceKey = "DEVICE";
    lastAutoPumpMs = 0;
    activePumpCooldownMs = AUTO_PUMP_MIN_INTERVAL_MS;
    clockMs = 1000;
    wallEpoch = 1760000000;
    claimAllowed = true;
    claimReplyLost = false;
    autoClaims = 0;
    cooldownMinutesReply = 60;
}

int main() {
    reset();
    durationReply = "20";
    assert(checkAndRunManualPumpTask().manualPumpRan);
    assert(pumpRuns == 1 && lastDuration == 20000);
    checkAndRunManualPumpTask();
    assert(pumpRuns == 1); // a replay does not repeat custom-duration watering

    reset();
    durationReply = "300";
    checkAndRunManualPumpTask();
    assert(lastDuration == 300000);
    wallEpoch += 3601;
    clockMs = 1000;
    lastAutoPumpMs = 0;
    assert(automaticPumpCooldownActive()); // runtime is included after reboot

    for (const auto& invalid : {"0", "-1", "301", "20.5", "\"20\"", "true"}) {
        reset();
        durationReply = invalid;
        checkAndRunManualPumpTask();
        assert(pumpRuns == 0 && !completions.back());
    }

    reset();
    durationReply = "null";
    checkAndRunManualPumpTask();
    assert(lastDuration == PUMP_RUN_MS);

    reset();
    durationReply = "20";
    checkAndRunManualPumpTask();
    wallEpoch += 4000;
    handleAutomaticPump(true, 10, PumpTaskCheck{true, false, true, true, true, 30});
    assert(pumpRuns == 2 && lastDuration == PUMP_RUN_MS);

    reset();
    completionReplyLost = true;
    assert(checkAndRunManualPumpTask().manualPumpRan);
    assert(pumpRuns == 1 && completions.back());
    completionReplyLost = false;
    clockMs = 1000; // reboot preserves flash, not RAM
    assert(checkAndRunManualPumpTask().manualPumpRan);
    assert(pumpRuns == 1 && completions.size() == 2 && completions.back());
    nextTask = 43;
    checkAndRunManualPumpTask();
    assert(pumpRuns == 2);
    nextTask = 42; // delayed older delivery must not water again
    checkAndRunManualPumpTask();
    assert(pumpRuns == 2 && !completions.back());

    reset();
    interruptPump = true;
    try { checkAndRunManualPumpTask(); assert(false); }
    catch (const std::runtime_error&) {}
    assert(pumpRuns == 1);
    interruptPump = false;
    assert(checkAndRunManualPumpTask().manualPumpRan);
    assert(pumpRuns == 1 && !completions.back());

    reset();
    failStorageWrite = 1; // no persistent intent means no pump execution
    checkAndRunManualPumpTask();
    assert(pumpRuns == 0 && !completions.back());

    reset();
    failStorageWrite = 2; // cooldown must be persisted before physical execution
    checkAndRunManualPumpTask();
    assert(pumpRuns == 0 && !completions.back());

    reset();
    failStorageWrite = 3; // pump ran, but its success receipt could not be stored
    checkAndRunManualPumpTask();
    assert(pumpRuns == 1 && !completions.back());
    failStorageWrite = 0;
    checkAndRunManualPumpTask();
    assert(pumpRuns == 1 && !completions.back());

    reset();
    storageUnavailable = true;
    checkAndRunManualPumpTask();
    assert(pumpRuns == 0 && !completions.back());

    reset();
    checkAndRunManualPumpTask();
    deviceKey = "ANOTHER";
    checkAndRunManualPumpTask();
    assert(pumpRuns == 2); // separate device identities have separate receipts

    reset();
    PumpTaskCheck automatic{true, false, true, true, true, 30};
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 1 && autoClaims == 1);
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 1 && autoClaims == 1);
    // Reboot loses RAM counters, but the persisted boundary blocks watering.
    lastAutoPumpMs = 0; clockMs = 1000;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 1 && autoClaims == 1);
    wallEpoch += 3700;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 2 && autoClaims == 2);

    reset();
    interruptPump = true;
    try { handleAutomaticPump(true, 10, automatic); assert(false); }
    catch (const std::runtime_error&) {}
    interruptPump = false; lastAutoPumpMs = 0; clockMs = 1000;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 1); // interruption never removes the durable boundary

    reset();
    claimAllowed = false;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0);
    claimAllowed = true; claimReplyLost = true;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0);

    reset();
    storageUnavailable = true;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0 && autoClaims == 0);
    storageUnavailable = false; wallEpoch = 0;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0 && autoClaims == 0);

    reset();
    wallEpoch = 0;
    checkAndRunManualPumpTask();
    assert(pumpRuns == 0 && !completions.back());

    reset();
    cooldownMinutesReply = 240;
    checkAndRunManualPumpTask();
    assert(pumpRuns == 1 && activePumpCooldownMs == 14400000UL);
    lastAutoPumpMs = 0; clockMs = 1000; wallEpoch += 7200;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 1 && autoClaims == 0); // retain a four-hour boundary after reboot

    reset();
    failStorageWrite = 1;
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0 && autoClaims == 1 && !completions.back());

    reset();
    flash["flovers-pump:cooldown"] = {1, 2, 3};
    handleAutomaticPump(true, 10, automatic);
    assert(pumpRuns == 0);
    std::cout << "Firmware pump retry, reboot, interruption and storage checks passed\n";
}
