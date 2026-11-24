#pragma once
// ESP32-C3 / Arduino 3.3.12. Security1 and BLE transport are Espressif's implementation.
#include <ArduinoJson.h>
#include <Ed25519.h>
#include <mbedtls/base64.h>
#include <mbedtls/sha256.h>
#include <esp_wifi.h>
#include <esp_random.h>
#include <network_provisioning/manager.h>
#include <network_provisioning/scheme_ble.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <atomic>
#include "FloversValidation.h"

bool postJson(const char*, const String&, String&, const String&);
bool syncTime();
bool initSensors();

namespace Flovers {
static const unsigned long BLE_WINDOW_MS = 5UL * 60UL * 1000UL;
static const unsigned long CONFIG_POLL_MS = 60UL * 1000UL;
static const size_t COMMAND_LIMIT = 2048;
static String factoryId, factoryPop, factorySeed, firmwareVersion = "flovers-universal-1";
static String networkSsid, networkPassword, configurationDigest;
static std::atomic<const char*> state("factory-identity-required");
static std::atomic<bool> commandInFlight(false);
// Command outcome is independent of background config polling's state text.
static std::atomic<const char*> operationState("none");
static std::atomic<uint32_t> operationId(0);
static uint32_t appliedVersion = 0;
static bool factoryValid = false, bindingValid = false, configurationApplied = false, busy = false, bleStarted = false;
static bool runtimeActivated = false;
static unsigned long bleStartedAt = 0, lastPoll = 0;
struct Command { char data[COMMAND_LIMIT + 1]; };
static QueueHandle_t commands = nullptr;

inline String sha256(const String& value) {
    unsigned char raw[32]; char text[65];
    if (mbedtls_sha256(reinterpret_cast<const unsigned char*>(value.c_str()), value.length(), raw, 0) != 0) return "";
    for (size_t i = 0; i < 32; ++i) snprintf(text + i * 2, 3, "%02x", raw[i]);
    text[64] = 0; return String(text);
}

inline bool hexSeed(const String& text, uint8_t output[32]) {
    if (text.length() != 64) return false;
    for (size_t i = 0; i < 32; ++i) {
        char pair[3] = {text[i * 2], text[i * 2 + 1], 0};
        if (!isxdigit(pair[0]) || !isxdigit(pair[1])) return false;
        output[i] = static_cast<uint8_t>(strtoul(pair, nullptr, 16));
    }
    return true;
}

inline String encode64(const uint8_t* value, size_t length) {
    unsigned char output[2049]; size_t written = 0;
    if (length > 1500 || mbedtls_base64_encode(output, sizeof(output) - 1, &written, value, length) != 0) return "";
    output[written] = 0; return String(reinterpret_cast<char*>(output));
}

inline String loadRecord(const char* name) {
    Preferences storage;
    if (!storage.begin(name, true)) return "";
    String envelope = storage.getString("active", ""); storage.end();
    if (envelope.length() > 8192) return "";
    JsonDocument json;
    if (deserializeJson(json, envelope) || !json["data"].is<const char*>() || !json["sha256"].is<const char*>()) return "";
    String data = json["data"].as<String>();
    return sha256(data) == json["sha256"].as<String>() ? data : String("");
}

inline bool saveRecord(const char* name, const String& data) {
    // One NVS value is the commit boundary. Invalid/missing records always fail closed.
    // The checksum detects corruption; it does not replace flash encryption or secure boot.
    if (data.length() > 6000) return false;
    if (loadRecord(name) == data) return true;  // Do not rewrite unchanged configuration every minute.
    JsonDocument json; json["data"] = data; json["sha256"] = sha256(data);
    String envelope; serializeJson(json, envelope);
    Preferences storage;
    return commitRecord(storage, name, envelope, [&]() { return loadRecord(name) == data; });
}

inline bool loadFactory() {
    // Factory identity is provisioned separately; never erase it during Wi-Fi changes.
    Preferences storage;
    if (!storage.begin("flovers-factory", true)) return false;
    String raw = storage.getString("identity", ""); storage.end();
    JsonDocument json; uint8_t seed[32];
    if (raw.length() > 1024 || deserializeJson(json, raw)) return false;
    factoryId = json["hardware_id"].as<String>(); factoryPop = json["pop"].as<String>(); factorySeed = json["seed"].as<String>();
    if (factoryId.length() < 8 || factoryId.length() > 64 || factoryPop.length() < 32 || factoryPop.length() > 64 || !hexSeed(factorySeed, seed)) return false;
    for (size_t i = 0; i < factoryId.length(); ++i)
        if (!isalnum(factoryId[i]) && factoryId[i] != '_' && factoryId[i] != '-') return false;
    memset(seed, 0, sizeof(seed));
    return json["hardware_profile"] == "esp32-c3-flovers-v1" && json["hardware_revision"] == "1";
}

inline bool applyBinding(const String& raw) {
    JsonDocument json;
    if (deserializeJson(json, raw) || json["hardware_id"] != factoryId || !json["device_id"].is<int>() || json["device_id"].as<int>() <= 0 ||
            !json["device_key"].is<const char*>() || !json["device_token"].is<const char*>()) return false;
    String key = json["device_key"].as<String>(), token = json["device_token"].as<String>();
    if (!key.length() || key.length() > 16 || token.length() != 64) return false;
    for (size_t i = 0; i < key.length(); ++i) if (!isalnum(key[i])) return false;
    for (size_t i = 0; i < token.length(); ++i) if (!isalnum(token[i]) && token[i] != '_' && token[i] != '-') return false;
    DEVICE_ID = json["device_id"].as<int>(); key.toCharArray(logicalDeviceKey, sizeof(logicalDeviceKey));
    deviceToken = token; return true;
}

inline void activateConfiguration(JsonVariantConst config) {
    SEND_INTERVAL_MS = config["reading_interval_minutes"].as<unsigned long>() * 60000UL;
    SENSOR_TEMPERATURE_ENABLED = config["sensors"]["temperature"] | false;
    SENSOR_HUMIDITY_ENABLED = config["sensors"]["humidity"] | false;
    SENSOR_LIGHT_ENABLED = config["sensors"]["light"] | false;
    SENSOR_MOISTURE_ENABLED = config["sensors"]["moisture"] | false;
#ifdef PUMP_PIN
    PUMP_INCLUDED = config["pump_included"] | false;
    PUMP_RUN_MS = config["pump_duration_seconds"].as<unsigned long>() * 1000UL;
    activePumpCooldownMs = config["pump_cooldown_minutes"].as<unsigned long>() * 60000UL;
    FALLBACK_AUTO_PUMP_THRESHOLD_PCT = config["pump_threshold_pct"].isNull() ? 30 : pumpThresholdCeiling(config["pump_threshold_pct"].as<double>());
#endif
    initSensors();
}

inline bool syncConfiguration(bool acknowledge = true) {
    configurationApplied = false;
    String response;
    if (!postJson(configUrl, "{}", response, "configuration")) { state = "backend-unavailable-or-credential-revoked"; return false; }
    JsonDocument json;
    if (response.length() > 6000 || deserializeJson(json, response)) { state = "invalid-configuration"; return false; }
    JsonVariantConst config = json["configuration"];
    String checksum = json["config_digest"].as<String>();
    JsonDocument ack;
    ack["version"] = config["version"]; ack["config_digest"] = checksum;
    ack["firmware_version"] = firmwareVersion;
    bool valid = checksum.length() == 64 && validConfiguration(config, FLOVERS_PUMP_CAPABLE) && config["version"].as<uint32_t>() >= appliedVersion;
    json["binding_digest"] = sha256(deviceToken);
    String snapshot; serializeJson(json, snapshot);
    bool stored = valid && saveRecord("flovers-conf", snapshot);
    ack["applied"] = stored;
    if (!stored) ack["error_code"] = valid ? "storage_failed" : "invalid_config";
    if (stored) {
        if (!runtimeActivated || appliedVersion != config["version"].as<uint32_t>() || configurationDigest != checksum) {
            activateConfiguration(config); runtimeActivated = true;
        }
        appliedVersion = config["version"]; configurationDigest = checksum;
    }
    if (stored && !acknowledge) return true;
    String body, ignored; serializeJson(ack, body);
    if (!postJson(ackUrl, body, ignored, "configuration acknowledgement") || !stored) { state = "configuration-pending"; return false; }
    configurationApplied = config["enabled"] | false;
    state = configurationApplied ? "configured" : "disabled";
    return true;
}

inline bool connectNetwork(const String& ssid, const String& password, unsigned long timeout = 20000) {
    if (!ssid.length() || ssid.length() > 32 || password.length() > 64) return false;
    WiFi.persistent(false); esp_wifi_set_storage(WIFI_STORAGE_RAM);
    WiFi.disconnect(false, false);  // Force authentication; an old WL_CONNECTED is not validation of a candidate.
    WiFi.begin(ssid.c_str(), password.c_str());
    unsigned long start = millis();
    while ((WiFi.status() != WL_CONNECTED || WiFi.SSID() != ssid) && millis() - start < timeout) delay(50);
    return WiFi.status() == WL_CONNECTED && WiFi.SSID() == ssid;
}

inline String signClaim(JsonVariantConst command) {
    String encoded = command["proof_payload"].as<String>();
    uint8_t decoded[1537], seed[32], publicKey[32], signature[64]; size_t size = 0;
    if (encoded.length() > 2048 || mbedtls_base64_decode(decoded, sizeof(decoded) - 1, &size,
            reinterpret_cast<const unsigned char*>(encoded.c_str()), encoded.length()) != 0 || !size) return "";
    decoded[size] = 0;
    JsonDocument proof;
    if (deserializeJson(proof, reinterpret_cast<const char*>(decoded), size) ||
            proof["protocol"] != "flovers-pair-v1" || proof["hardware_id"] != factoryId ||
            proof["session_id"] != command["session_id"] || proof["claim_digest"] != sha256(command["claim"].as<String>()) ||
            !proof["device_id"].is<int>() || proof["device_id"].as<int>() <= 0 ||
            !proof["generation"].is<uint32_t>() || !proof["challenge"].is<const char*>() ||
            proof["challenge"].as<String>().length() != 43 || !hexSeed(factorySeed, seed)) return "";
    Ed25519::derivePublicKey(publicKey, seed);
    Ed25519::sign(signature, seed, publicKey, decoded, size);
    memset(seed, 0, sizeof(seed));
    return encode64(signature, sizeof(signature));
}

inline bool validateNetwork(JsonVariantConst command) {
    if (!command["ssid"].is<const char*>() || !command["password"].is<const char*>()) return false;
    String candidate = command["ssid"].as<String>(), password = command["password"].as<String>();
    if (!candidate.length() || candidate.length() > 32 || password.length() > 64 ||
            !connectNetwork(candidate, password)) return false;
    networkSsid = candidate; networkPassword = password;
    return syncTime();
}

inline void processCommand(const char* raw) {
    busy = true; configurationApplied = false;
    state = "configuring";
#ifdef PUMP_PIN
    digitalWrite(PUMP_PIN, LOW);
#endif
    String oldSsid = networkSsid, oldPassword = networkPassword;
    JsonDocument command;
    if (deserializeJson(command, raw)) { state = "invalid-request"; operationState.store("failed"); busy = false; return; }
    String mode = command["action"].as<String>();
    bool success = false;
    if (mode == "pair" || (mode == "wifi" && bindingValid)) {
        String signature;
        if (mode == "pair") signature = signClaim(command.as<JsonVariantConst>());
        if ((mode == "wifi" || signature.length()) && validateNetwork(command.as<JsonVariantConst>())) {
            if (mode == "pair") {
                JsonDocument body;
                body["session_id"] = command["session_id"]; body["claim"] = command["claim"]; body["signature"] = signature;
                String request, response; serializeJson(body, request);
                // A pairing response contains the one-time device credential; never return it over BLE.
                String previousToken = deviceToken; deviceToken = "";
                bool received = postJson(pairUrl, request, response, "pairing"); deviceToken = previousToken;
                JsonDocument result;
                if (received && response.length() <= 6000 && !deserializeJson(result, response) &&
                        result["configuration"]["automatic_watering"] == false) {
                    JsonDocument identity;
                    identity["hardware_id"] = factoryId;
                    identity["device_id"] = result["device_id"]; identity["device_key"] = result["device_key"];
                    identity["device_token"] = result["device_token"];
                    String binding; serializeJson(identity, binding);
                    // Persist credential before runtime/network records so partial setup stays safely recoverable.
                    if (saveRecord("flovers-bind", binding) && applyBinding(binding)) {
                        bindingValid = true; appliedVersion = 0; success = true;
                    }
                }
            } else success = true;
            if (success && syncConfiguration(false)) {
                JsonDocument net; net["ssid"] = networkSsid; net["password"] = networkPassword;
                String record; serializeJson(net, record);
                success = saveRecord("flovers-net", record) && syncConfiguration();
            } else success = false;
        }
    }
    if (!success) {
        configurationApplied = false; networkSsid = oldSsid; networkPassword = oldPassword;
        if (oldSsid.length()) connectNetwork(oldSsid, oldPassword);
        state = "setup-incomplete-retry-or-owner-revoke-required";
    }
    // Factory identity, binding and pump safety are never erased by a Wi-Fi operation.
    operationState.store(success ? "applied" : "failed");
    busy = false;
}

inline esp_err_t provisionEndpoint(uint32_t, const uint8_t* input, ssize_t length,
        uint8_t** output, ssize_t* outputLength, void*) {
    if (length <= 0 || static_cast<size_t>(length) > COMMAND_LIMIT) return ESP_ERR_INVALID_ARG;
    JsonDocument request;
    if (deserializeJson(request, input, length) || !request["action"].is<const char*>()) return ESP_ERR_INVALID_ARG;
    String action = request["action"].as<String>();
    bool accepted = false;
    if (action == "pair" || action == "wifi") {
        bool expected = false;
        if (commands && commandInFlight.compare_exchange_strong(expected, true)) {
            Command command = {}; memcpy(command.data, input, length);
            state = "queued";
            uint32_t correlation = esp_random();
            operationId.store(correlation ? correlation : 1);
            operationState.store("pending");
            accepted = xQueueSend(commands, &command, 0) == pdTRUE;
            memset(command.data, 0, sizeof(command.data));
            if (!accepted) { state = "queue-unavailable"; commandInFlight.store(false); }
        }
    } else if (action != "status") return ESP_ERR_INVALID_ARG;
    // No backend credentials, Wi-Fi passwords, PoP, seed or claim echoed to the phone.
    JsonDocument response;
    response["accepted"] = accepted; response["state"] = state.load();
    response["in_progress"] = commandInFlight.load();
    response["operation_id"] = operationId.load();
    response["operation_state"] = operationState.load();
    response["hardware_id"] = factoryId;
    String text; serializeJson(response, text);
    *output = reinterpret_cast<uint8_t*>(malloc(text.length() + 1));
    if (!*output) return ESP_ERR_NO_MEM;
    memcpy(*output, text.c_str(), text.length() + 1); *outputLength = text.length(); return ESP_OK;
}

inline bool startBle() {
    network_prov_mgr_config_t config = {};
    config.scheme = network_prov_scheme_ble;
    config.scheme_event_handler = NETWORK_PROV_EVENT_HANDLER_NONE;  // Keep BLE memory for later safe re-entry.
    if (network_prov_mgr_init(config) != ESP_OK) return false;
    if (network_prov_mgr_disable_auto_stop(1000) != ESP_OK ||
            network_prov_mgr_endpoint_create("flovers-config") != ESP_OK) { network_prov_mgr_deinit(); return false; }
    static uint8_t uuid[16] = {0x5b,0xcd,0x03,0x5e,0xfb,0x27,0x4f,0x80,0xbe,0x02,0x3c,0x60,0x82,0x8b,0x74,0x51};
    if (network_prov_scheme_ble_set_service_uuid(uuid) != ESP_OK) { network_prov_mgr_deinit(); return false; }
    String name = "FLOVERS_" + factoryId.substring(factoryId.length() - 8);
    if (network_prov_mgr_start_provisioning(NETWORK_PROV_SECURITY_1, factoryPop.c_str(), name.c_str(), nullptr) != ESP_OK) {
        network_prov_mgr_deinit(); return false;
    }
    // Only the authenticated custom endpoint may change network configuration.
    // Disable stock endpoints that would persist Wi-Fi before validation or reset it.
    network_prov_mgr_endpoint_unregister("prov-config");
    network_prov_mgr_endpoint_unregister("prov-ctrl");
    if (network_prov_mgr_endpoint_register("flovers-config", provisionEndpoint, nullptr) != ESP_OK) {
        network_prov_mgr_stop_provisioning(); network_prov_mgr_deinit(); return false;
    }
    esp_wifi_set_storage(WIFI_STORAGE_RAM);
    bleStartedAt = millis(); bleStarted = true; return true;
}

inline bool ready() { return factoryValid && bindingValid && configurationApplied && !busy && !commandInFlight.load() && WiFi.status() == WL_CONNECTED; }

inline void begin() {
    WiFi.persistent(false); WiFi.setAutoReconnect(false); WiFi.STA.begin(false); esp_wifi_set_storage(WIFI_STORAGE_RAM);
    factoryValid = loadFactory();
    if (!factoryValid) { state = "factory-identity-required"; return; }
    commands = xQueueCreate(1, sizeof(Command));
    if (!commands) { factoryValid = false; state = "storage-or-memory-error"; return; }
    bindingValid = applyBinding(loadRecord("flovers-bind"));
    JsonDocument net;
    if (!deserializeJson(net, loadRecord("flovers-net"))) {
        networkSsid = net["ssid"].as<String>(); networkPassword = net["password"].as<String>();
    }
    JsonDocument cached;
    if (!deserializeJson(cached, loadRecord("flovers-conf")) && cached["binding_digest"] == sha256(deviceToken) && validConfiguration(cached["configuration"], FLOVERS_PUMP_CAPABLE))
        appliedVersion = cached["configuration"]["version"] | 0U;
    if (!startBle()) { state = "ble-unavailable"; return; }
    if (networkSsid.length() && connectNetwork(networkSsid, networkPassword)) syncTime();
    lastPoll = millis() - CONFIG_POLL_MS;
    state = bindingValid ? "configuration-pending" : "waiting-for-pairing";
}

inline void tick() {
    if (!factoryValid) return;
    Command command = {};
    if (commands && xQueueReceive(commands, &command, 0) == pdTRUE) {
        processCommand(command.data); memset(command.data, 0, sizeof(command.data));
        commandInFlight.store(false);
    }
    if (bleStarted && millis() - bleStartedAt >= BLE_WINDOW_MS) {
        network_prov_mgr_stop_provisioning(); network_prov_mgr_deinit(); bleStarted = false;
    }
    if (bindingValid && !busy && millis() - lastPoll >= CONFIG_POLL_MS) {
        lastPoll = millis();
        if (WiFi.status() != WL_CONNECTED && !connectNetwork(networkSsid, networkPassword)) { configurationApplied = false; return; }
        if (time(nullptr) < 1735689600LL && !syncTime()) { configurationApplied = false; return; }
        syncConfiguration();
    }
}
}  // namespace Flovers

inline bool connectWiFi(unsigned long timeoutMs = 20000) {
    return Flovers::connectNetwork(Flovers::networkSsid, Flovers::networkPassword, timeoutMs);
}
