#include <cassert>
#include <fstream>
#include <iostream>
#include <string>
#include "FloversValidation.h"

struct Storage {
    bool opens = true, writes = true, corrupt = false;
    int writeCount = 0, closes = 0;
    std::string record = "previous-complete-record";
    bool begin(const char* name, bool readOnly) {
        assert(std::string(name) == "flovers-conf" && !readOnly);
        return opens;
    }
    size_t putString(const char* key, const std::string& value) {
        assert(std::string(key) == "active"); ++writeCount;
        if (!writes) return 0;
        record = corrupt ? "interrupted-or-corrupt-value" : value;
        return value.size();
    }
    void end() { ++closes; }
};

int main(int argc, char** argv) {
    assert(argc == 2);
    for (double threshold : {0.0, 0.1, 25.5, 30.0, 99.9, 100.0})
        for (int moisture = 0; moisture <= 100; ++moisture)
            assert((moisture < Flovers::pumpThresholdCeiling(threshold)) == (moisture < threshold));
    std::ifstream input(argv[1]); JsonDocument vectors;
    assert(!deserializeJson(vectors, input));
    int count = 0;
    for (JsonObject row : vectors.as<JsonArray>()) {
        bool valid = Flovers::validConfiguration(row["configuration"], row["pump_capable"]);
        if (valid != row["expected"].as<bool>()) {
            std::cerr << "Validation failed: " << row["name"].as<const char*>() << '\n'; return 1;
        }
        ++count;
    }
    const std::string next = "complete-new-record";
    Storage initial;
    assert(Flovers::commitRecord(initial, "flovers-conf", next, [&] { return initial.record == next; }));
    assert(initial.record == next && initial.closes == 1);
    Storage unavailable; unavailable.opens = false;
    assert(!Flovers::commitRecord(unavailable, "flovers-conf", next, [] { return true; }));
    assert(unavailable.writeCount == 0 && unavailable.record == "previous-complete-record");
    Storage failed; failed.writes = false;
    assert(!Flovers::commitRecord(failed, "flovers-conf", next, [] { return true; }));
    assert(failed.record == "previous-complete-record" && failed.closes == 1);
    Storage interrupted; interrupted.corrupt = true;
    assert(!Flovers::commitRecord(interrupted, "flovers-conf", next, [&] { return interrupted.record == next; }));
    assert(interrupted.closes == 1);
    // A false readback result must prevent activation even when the provider reported a successful write.
    Storage readback;
    assert(!Flovers::commitRecord(readback, "flovers-conf", next, [] { return false; }));
    std::cout << count << " configuration vectors and 5 NVS failure/success checks passed\n";
}
