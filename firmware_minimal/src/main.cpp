/**
 * Pianora Firmware v0.5.0
 * WiFi Station + AP mode + OTA Updates + BLE MIDI Client
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <DNSServer.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <Update.h>
#include <ElegantOTA.h>
#include <NimBLEDevice.h>

// Constants
#define WIFI_CONNECT_TIMEOUT 15000
#define WIFI_RECONNECT_INTERVAL 30000
#define AP_SSID "Pianora"
#define AP_PASS "pianora123"
#define MDNS_NAME "pianora"
#ifndef FW_VERSION
#define FW_VERSION "0.5.0"
#endif

// BLE MIDI UUIDs
static NimBLEUUID MIDI_SERVICE_UUID("03b80e5a-ede8-4b33-a751-6ce34ec4c700");
static NimBLEUUID MIDI_CHAR_UUID("7772e5db-3868-4112-a1a9-f2669d106bf3");

// Objects
DNSServer dnsServer;
WebServer server(80);
WebSocketsServer webSocket(81);
Preferences preferences;

// WiFi State
enum PianoraWiFiMode { WIFI_MODE_AP_ONLY, WIFI_MODE_STA_ONLY, WIFI_MODE_AP_STA };
PianoraWiFiMode currentWiFiMode = WIFI_MODE_AP_ONLY;
bool staConnected = false;
String staSSID = "";
String staPassword = "";
String staIP = "";
uint32_t lastWiFiCheck = 0;

// BLE MIDI State
NimBLEScan* pBLEScan = nullptr;
NimBLEClient* pBLEClient = nullptr;
NimBLERemoteCharacteristic* pMidiCharacteristic = nullptr;
bool bleScanning = false;
bool bleConnected = false;
String bleMidiDeviceName = "";
NimBLEAddress bleMidiDeviceAddress;
bool bleAutoConnect = false;
std::vector<std::pair<String, NimBLEAddress>> foundBleDevices;

// App State
uint8_t currentMode = 0;
uint8_t brightness = 128;
bool midiConnected = false;

// Forward declarations
void loadWiFiSettings();
void saveWiFiSettings();
void setupWiFi();
void checkWiFiConnection();
void sendStatus(uint8_t clientNum);
void broadcastStatus();
void broadcastMidiNote(uint8_t note, uint8_t velocity, bool on);
void broadcastBleDevices();
void setupBLE();
void startBleScan();
void stopBleScan();
void connectToBleDevice(NimBLEAddress address);
void disconnectBle();

// ============== WiFi Settings ==============

void loadWiFiSettings() {
    preferences.begin("pianora", true); // read-only
    staSSID = preferences.getString("wifi_ssid", "");
    staPassword = preferences.getString("wifi_pass", "");
    preferences.end();

    Serial.printf("[WiFi] Loaded SSID: %s\r\n", staSSID.c_str());
}

void saveWiFiSettings() {
    preferences.begin("pianora", false); // read-write
    preferences.putString("wifi_ssid", staSSID);
    preferences.putString("wifi_pass", staPassword);
    preferences.end();

    Serial.printf("[WiFi] Saved SSID: %s\r\n", staSSID.c_str());
}

void clearWiFiSettings() {
    preferences.begin("pianora", false);
    preferences.remove("wifi_ssid");
    preferences.remove("wifi_pass");
    preferences.end();

    staSSID = "";
    staPassword = "";
    Serial.println("[WiFi] Settings cleared");
}

// ============== WiFi Setup ==============

void setupWiFi() {
    loadWiFiSettings();

    if (staSSID.length() > 0) {
        // Try to connect to saved network
        Serial.printf("[WiFi] Connecting to: %s\r\n", staSSID.c_str());

        WiFi.mode(WIFI_AP_STA);
        WiFi.softAP(AP_SSID, AP_PASS);
        WiFi.begin(staSSID.c_str(), staPassword.c_str());

        uint32_t startTime = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_CONNECT_TIMEOUT) {
            delay(500);
            Serial.print(".");
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            staConnected = true;
            staIP = WiFi.localIP().toString();
            currentWiFiMode = WIFI_MODE_AP_STA;
            Serial.printf("[WiFi] Connected! IP: %s\r\n", staIP.c_str());
        } else {
            staConnected = false;
            Serial.println("[WiFi] Connection failed, AP mode only");
            currentWiFiMode = WIFI_MODE_AP_STA; // Keep both for configuration
        }
    } else {
        // No saved network, AP only
        Serial.println("[WiFi] No saved network, starting AP only");
        WiFi.mode(WIFI_AP);
        WiFi.softAP(AP_SSID, AP_PASS);
        currentWiFiMode = WIFI_MODE_AP_ONLY;
    }

    Serial.printf("[WiFi] AP IP: %s\r\n", WiFi.softAPIP().toString().c_str());

    // mDNS
    if (MDNS.begin(MDNS_NAME)) {
        MDNS.addService("http", "tcp", 80);
        MDNS.addService("ws", "tcp", 81);
        Serial.printf("[mDNS] Started: http://%s.local/\r\n", MDNS_NAME);
    }
}

void checkWiFiConnection() {
    if (staSSID.length() == 0) return;

    if (millis() - lastWiFiCheck < WIFI_RECONNECT_INTERVAL) return;
    lastWiFiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {
        if (staConnected) {
            staConnected = false;
            staIP = "";
            Serial.println("[WiFi] Disconnected from network");
            broadcastStatus();
        }

        // Try to reconnect
        Serial.println("[WiFi] Attempting reconnect...");
        WiFi.disconnect();
        WiFi.begin(staSSID.c_str(), staPassword.c_str());
    } else if (!staConnected) {
        staConnected = true;
        staIP = WiFi.localIP().toString();
        Serial.printf("[WiFi] Reconnected! IP: %s\r\n", staIP.c_str());
        broadcastStatus();
    }
}

// ============== BLE MIDI ==============

// Callback for BLE MIDI notifications
void midiNotifyCallback(NimBLERemoteCharacteristic* pChar, uint8_t* pData, size_t length, bool isNotify) {
    if (length < 3) return;

    // BLE MIDI packet format: [header, timestamp, status, data1, data2, ...]
    // Skip header and timestamp bytes
    size_t i = 2;
    while (i < length) {
        // Check for timestamp byte (high bit set)
        if (pData[i] & 0x80) {
            i++;
            continue;
        }

        uint8_t status = pData[i];
        if (status < 0x80) {
            // Not a status byte, skip
            i++;
            continue;
        }

        uint8_t channel = status & 0x0F;
        uint8_t type = status & 0xF0;

        if (i + 2 >= length) break;

        if (type == 0x90) {
            // Note On
            uint8_t note = pData[i + 1] & 0x7F;
            uint8_t velocity = pData[i + 2] & 0x7F;
            if (velocity > 0) {
                Serial.printf("[BLE MIDI] Note ON: %d vel: %d\r\n", note, velocity);
                broadcastMidiNote(note, velocity, true);
            } else {
                // Velocity 0 = Note Off
                Serial.printf("[BLE MIDI] Note OFF: %d\r\n", note);
                broadcastMidiNote(note, 0, false);
            }
            i += 3;
        } else if (type == 0x80) {
            // Note Off
            uint8_t note = pData[i + 1] & 0x7F;
            Serial.printf("[BLE MIDI] Note OFF: %d\r\n", note);
            broadcastMidiNote(note, 0, false);
            i += 3;
        } else {
            // Other MIDI message, skip
            i++;
        }
    }
}

// Client callbacks
class BleClientCallbacks : public NimBLEClientCallbacks {
    void onConnect(NimBLEClient* pClient) override {
        Serial.printf("[BLE] Connected to %s\r\n", pClient->getPeerAddress().toString().c_str());
    }

    void onDisconnect(NimBLEClient* pClient, int reason) override {
        Serial.printf("[BLE] Disconnected, reason: %d\r\n", reason);
        bleConnected = false;
        midiConnected = false;
        broadcastStatus();
    }
};

static BleClientCallbacks clientCallbacks;

// Scan callbacks
class BleScanCallbacks : public NimBLEScanCallbacks {
    void onResult(const NimBLEAdvertisedDevice* advertisedDevice) override {
        String name = advertisedDevice->getName().c_str();

        // Skip devices without names
        if (name.length() == 0) return;

        // Check if device has MIDI service OR is a known piano brand
        bool isMidiDevice = advertisedDevice->isAdvertisingService(MIDI_SERVICE_UUID);
        bool isKnownBrand = (name.indexOf("Kawai") >= 0 ||
                            name.indexOf("KDP") >= 0 ||
                            name.indexOf("Roland") >= 0 ||
                            name.indexOf("Yamaha") >= 0 ||
                            name.indexOf("Piano") >= 0 ||
                            name.indexOf("MIDI") >= 0 ||
                            name.indexOf("Casio") >= 0 ||
                            name.indexOf("Korg") >= 0 ||
                            name.indexOf("Nord") >= 0 ||
                            name.indexOf("CN") >= 0 ||
                            name.indexOf("CA") >= 0 ||
                            name.indexOf("ES") >= 0);

        if (isMidiDevice || isKnownBrand) {
            Serial.printf("[BLE] Found device: %s (%s) %s\r\n",
                          name.c_str(),
                          advertisedDevice->getAddress().toString().c_str(),
                          isMidiDevice ? "[MIDI]" : "[Brand]");

            // Add to found devices if not already present
            bool exists = false;
            for (auto& dev : foundBleDevices) {
                if (dev.second == advertisedDevice->getAddress()) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                foundBleDevices.push_back({name, advertisedDevice->getAddress()});
            }
        }
    }

    void onScanEnd(const NimBLEScanResults& results, int reason) override {
        Serial.printf("[BLE] Scan complete, found %d MIDI devices\r\n", foundBleDevices.size());
        bleScanning = false;
        broadcastBleDevices();
        broadcastStatus();
    }
};

static BleScanCallbacks scanCallbacks;

void setupBLE() {
    Serial.println("[BLE] Initializing...");
    NimBLEDevice::init("Pianora");
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    pBLEScan = NimBLEDevice::getScan();
    pBLEScan->setScanCallbacks(&scanCallbacks);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    pBLEScan->setActiveScan(true);

    Serial.println("[BLE] Ready");
}

void startBleScan() {
    if (bleScanning) return;

    Serial.println("[BLE] Starting scan for MIDI devices...");
    foundBleDevices.clear();
    bleScanning = true;

    // Scan for 10 seconds
    pBLEScan->start(10, false);
}

void stopBleScan() {
    if (!bleScanning) return;

    Serial.println("[BLE] Stopping scan...");
    pBLEScan->stop();
    bleScanning = false;
}

void connectToBleDevice(NimBLEAddress address) {
    Serial.printf("[BLE] Connecting to %s...\r\n", address.toString().c_str());

    if (pBLEClient != nullptr && pBLEClient->isConnected()) {
        pBLEClient->disconnect();
    }

    pBLEClient = NimBLEDevice::createClient();
    pBLEClient->setClientCallbacks(&clientCallbacks);

    if (!pBLEClient->connect(address)) {
        Serial.println("[BLE] Connection failed");
        bleConnected = false;
        return;
    }

    Serial.println("[BLE] Connected, looking for MIDI service...");

    NimBLERemoteService* pService = pBLEClient->getService(MIDI_SERVICE_UUID);
    if (pService == nullptr) {
        Serial.println("[BLE] MIDI service not found");
        pBLEClient->disconnect();
        bleConnected = false;
        return;
    }

    pMidiCharacteristic = pService->getCharacteristic(MIDI_CHAR_UUID);
    if (pMidiCharacteristic == nullptr) {
        Serial.println("[BLE] MIDI characteristic not found");
        pBLEClient->disconnect();
        bleConnected = false;
        return;
    }

    // Subscribe to notifications
    if (pMidiCharacteristic->canNotify()) {
        pMidiCharacteristic->subscribe(true, midiNotifyCallback);
        Serial.println("[BLE] Subscribed to MIDI notifications");
    }

    bleConnected = true;
    midiConnected = true;
    bleMidiDeviceAddress = address;

    // Find device name
    for (auto& dev : foundBleDevices) {
        if (dev.second == address) {
            bleMidiDeviceName = dev.first;
            break;
        }
    }

    Serial.printf("[BLE] MIDI connected: %s\r\n", bleMidiDeviceName.c_str());
    broadcastStatus();
}

void disconnectBle() {
    if (pBLEClient != nullptr && pBLEClient->isConnected()) {
        Serial.println("[BLE] Disconnecting...");
        pBLEClient->disconnect();
    }
    bleConnected = false;
    midiConnected = false;
    bleMidiDeviceName = "";
    broadcastStatus();
}

// ============== MIME Types ==============

String getContentType(String filename) {
    if (filename.endsWith(".html")) return "text/html";
    if (filename.endsWith(".css")) return "text/css";
    if (filename.endsWith(".js")) return "application/javascript";
    if (filename.endsWith(".json")) return "application/json";
    if (filename.endsWith(".png")) return "image/png";
    if (filename.endsWith(".ico")) return "image/x-icon";
    if (filename.endsWith(".svg")) return "image/svg+xml";
    if (filename.endsWith(".webmanifest")) return "application/manifest+json";
    return "text/plain";
}

// ============== File Server ==============

bool handleFileRead(String path) {
    Serial.printf("[HTTP] Request: %s\r\n", path.c_str());

    if (path.endsWith("/")) path += "index.html";

    String contentType = getContentType(path);

    if (LittleFS.exists(path)) {
        File file = LittleFS.open(path, "r");
        server.streamFile(file, contentType);
        file.close();
        return true;
    }

    // SPA fallback
    if (LittleFS.exists("/index.html")) {
        File file = LittleFS.open("/index.html", "r");
        server.streamFile(file, "text/html");
        file.close();
        return true;
    }

    return false;
}

// ============== WebSocket ==============

void sendStatus(uint8_t clientNum) {
    JsonDocument doc;
    doc["type"] = "status";
    doc["version"] = FW_VERSION;
    doc["midi_connected"] = midiConnected;
    doc["ble_connected"] = bleConnected;
    doc["ble_scanning"] = bleScanning;
    doc["ble_device_name"] = bleMidiDeviceName;
    doc["rtp_connected"] = false;
    doc["mode"] = currentMode;
    doc["brightness"] = brightness;
    doc["calibrated"] = false;
    doc["ws_clients"] = webSocket.connectedClients();
    doc["free_heap"] = ESP.getFreeHeap();

    JsonObject wifi = doc["wifi"].to<JsonObject>();
    wifi["mode"] = currentWiFiMode == WIFI_MODE_AP_ONLY ? "ap" : (currentWiFiMode == WIFI_MODE_STA_ONLY ? "sta" : "ap_sta");
    wifi["apIp"] = WiFi.softAPIP().toString();
    wifi["apSSID"] = AP_SSID;
    wifi["staConnected"] = staConnected;
    wifi["staSSID"] = staSSID;
    wifi["staIP"] = staIP;
    wifi["rssi"] = staConnected ? WiFi.RSSI() : 0;

    JsonObject features = doc["features"].to<JsonObject>();
    features["elegant_ota"] = true;
    features["ble_midi"] = true;
    features["rtp_midi"] = false;
    features["wifi_sta"] = true;

    String json;
    serializeJson(doc, json);
    webSocket.sendTXT(clientNum, json);
}

void broadcastStatus() {
    for (uint8_t i = 0; i < webSocket.connectedClients(); i++) {
        sendStatus(i);
    }
}

void broadcastMidiNote(uint8_t note, uint8_t velocity, bool on) {
    JsonDocument doc;
    doc["type"] = "midi_note";
    doc["note"] = note;
    doc["velocity"] = velocity;
    doc["on"] = on;

    String json;
    serializeJson(doc, json);
    webSocket.broadcastTXT(json);
}

void sendBleDevices(uint8_t clientNum) {
    JsonDocument doc;
    doc["type"] = "ble_devices";

    JsonArray devices = doc["devices"].to<JsonArray>();
    for (auto& dev : foundBleDevices) {
        JsonObject device = devices.add<JsonObject>();
        device["name"] = dev.first;
        device["address"] = dev.second.toString();
    }

    String json;
    serializeJson(doc, json);
    webSocket.sendTXT(clientNum, json);
}

void broadcastBleDevices() {
    JsonDocument doc;
    doc["type"] = "ble_devices";

    JsonArray devices = doc["devices"].to<JsonArray>();
    for (auto& dev : foundBleDevices) {
        JsonObject device = devices.add<JsonObject>();
        device["name"] = dev.first;
        device["address"] = dev.second.toString();
    }

    String json;
    serializeJson(doc, json);
    webSocket.broadcastTXT(json);
}

void sendWiFiNetworks(uint8_t clientNum) {
    JsonDocument doc;
    doc["type"] = "wifi_networks";

    JsonArray networks = doc["payload"].to<JsonArray>();

    int n = WiFi.scanNetworks();
    for (int i = 0; i < n && i < 20; i++) {
        JsonObject net = networks.add<JsonObject>();
        net["ssid"] = WiFi.SSID(i);
        net["rssi"] = WiFi.RSSI(i);
        net["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    }
    WiFi.scanDelete();

    String json;
    serializeJson(doc, json);
    webSocket.sendTXT(clientNum, json);
}

void sendWiFiStatus(uint8_t clientNum, bool success, const char* message) {
    JsonDocument doc;
    doc["type"] = "wifi_status";
    doc["payload"]["success"] = success;
    doc["payload"]["message"] = message;
    doc["payload"]["connected"] = staConnected;
    doc["payload"]["ip"] = staIP;

    String json;
    serializeJson(doc, json);
    webSocket.sendTXT(clientNum, json);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("[WS] Client %u disconnected\r\n", num);
            break;

        case WStype_CONNECTED: {
            IPAddress ip = webSocket.remoteIP(num);
            Serial.printf("[WS] Client %u connected from %s\r\n", num, ip.toString().c_str());
            sendStatus(num);
            break;
        }

        case WStype_TEXT: {
            Serial.printf("[WS] Client %u: %s\r\n", num, payload);

            JsonDocument doc;
            DeserializationError error = deserializeJson(doc, payload, length);
            if (error) {
                Serial.printf("[WS] JSON parse error: %s\r\n", error.c_str());
                return;
            }

            const char* msgType = doc["type"];
            if (!msgType) return;

            if (strcmp(msgType, "get_status") == 0) {
                sendStatus(num);
            }
            else if (strcmp(msgType, "set_mode") == 0) {
                currentMode = doc["payload"]["mode"] | 0;
                Serial.printf("[WS] Mode set to %d\r\n", currentMode);
                broadcastStatus();
            }
            else if (strcmp(msgType, "set_settings") == 0) {
                JsonObject settings = doc["payload"];
                if (settings.containsKey("brightness")) {
                    brightness = settings["brightness"];
                    Serial.printf("[WS] Brightness set to %d\r\n", brightness);
                }
                broadcastStatus();
            }
            // WiFi commands
            else if (strcmp(msgType, "wifi_scan") == 0) {
                Serial.println("[WS] Starting WiFi scan...");
                sendWiFiNetworks(num);
            }
            else if (strcmp(msgType, "wifi_connect") == 0) {
                const char* ssid = doc["payload"]["ssid"];
                const char* password = doc["payload"]["password"];

                if (ssid && strlen(ssid) > 0) {
                    Serial.printf("[WS] Connecting to: %s\r\n", ssid);

                    staSSID = String(ssid);
                    staPassword = String(password ? password : "");
                    saveWiFiSettings();

                    // Try to connect
                    WiFi.disconnect();
                    if (currentWiFiMode == WIFI_MODE_AP_ONLY) {
                        WiFi.mode(WIFI_AP_STA);
                        WiFi.softAP(AP_SSID, AP_PASS);
                        currentWiFiMode = WIFI_MODE_AP_STA;
                    }
                    WiFi.begin(staSSID.c_str(), staPassword.c_str());

                    uint32_t startTime = millis();
                    while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_CONNECT_TIMEOUT) {
                        delay(500);
                    }

                    if (WiFi.status() == WL_CONNECTED) {
                        staConnected = true;
                        staIP = WiFi.localIP().toString();
                        Serial.printf("[WS] Connected! IP: %s\r\n", staIP.c_str());
                        sendWiFiStatus(num, true, "Connected successfully");
                    } else {
                        staConnected = false;
                        staIP = "";
                        Serial.println("[WS] Connection failed");
                        sendWiFiStatus(num, false, "Connection failed");
                    }
                    broadcastStatus();
                }
            }
            else if (strcmp(msgType, "wifi_disconnect") == 0) {
                Serial.println("[WS] Disconnecting from WiFi...");
                clearWiFiSettings();
                WiFi.disconnect();
                staConnected = false;
                staIP = "";
                sendWiFiStatus(num, true, "Disconnected");
                broadcastStatus();
            }
            // BLE MIDI commands
            else if (strcmp(msgType, "scan_ble_midi") == 0) {
                Serial.println("[WS] Starting BLE MIDI scan...");
                startBleScan();
                broadcastStatus();
            }
            else if (strcmp(msgType, "stop_ble_scan") == 0) {
                Serial.println("[WS] Stopping BLE scan...");
                stopBleScan();
                broadcastStatus();
            }
            else if (strcmp(msgType, "get_ble_devices") == 0) {
                sendBleDevices(num);
            }
            else if (strcmp(msgType, "connect_ble_midi") == 0) {
                const char* address = doc["payload"]["address"];
                if (address && strlen(address) > 0) {
                    Serial.printf("[WS] Connecting to BLE device: %s\r\n", address);
                    NimBLEAddress addr(std::string(address), 0); // 0 = public address
                    connectToBleDevice(addr);
                }
            }
            else if (strcmp(msgType, "disconnect_ble_midi") == 0) {
                Serial.println("[WS] Disconnecting BLE MIDI...");
                disconnectBle();
            }
            // System commands
            else if (strcmp(msgType, "restart") == 0) {
                Serial.println("[WS] Restarting...");
                JsonDocument response;
                response["type"] = "restart";
                response["payload"]["success"] = true;
                String json;
                serializeJson(response, json);
                webSocket.sendTXT(num, json);
                delay(500);
                ESP.restart();
            }
            break;
        }

        default:
            break;
    }
}

// ============== Setup ==============

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("\r\n");
    Serial.println("=====================================");
    Serial.printf("   Pianora Firmware v%s\r\n", FW_VERSION);
    Serial.println("   WiFi + BLE MIDI Client");
    Serial.println("=====================================");
    Serial.printf("CPU: %d MHz\r\n", getCpuFrequencyMhz());
    Serial.printf("Heap: %d bytes\r\n", ESP.getFreeHeap());
    Serial.println();

    // LittleFS
    Serial.print("[STEP] LittleFS init... ");
    if (!LittleFS.begin(true)) {
        Serial.println("FAILED!");
    } else {
        Serial.println("OK");
        File root = LittleFS.open("/");
        File file = root.openNextFile();
        Serial.println("[FS] Files:");
        while (file) {
            Serial.printf("  %s (%d bytes)\r\n", file.name(), file.size());
            file = root.openNextFile();
        }
    }

    // WiFi
    Serial.println("[STEP] WiFi init...");
    setupWiFi();

    // BLE
    Serial.println("[STEP] BLE init...");
    setupBLE();

    // DNS (for captive portal in AP mode)
    Serial.print("[STEP] DNS Server init... ");
    dnsServer.start(53, "*", WiFi.softAPIP());
    Serial.println("OK");

    // WebServer
    Serial.print("[STEP] WebServer init... ");

    // Captive portal handlers
    server.on("/generate_204", []() {
        server.sendHeader("Location", "/", true);
        server.send(302, "text/plain", "");
    });
    server.on("/hotspot-detect.html", []() {
        server.sendHeader("Location", "/", true);
        server.send(302, "text/plain", "");
    });
    server.on("/connecttest.txt", []() {
        server.sendHeader("Location", "/", true);
        server.send(302, "text/plain", "");
    });

    // Serve files from LittleFS
    server.onNotFound([]() {
        if (!handleFileRead(server.uri())) {
            server.send(404, "text/plain", "File not found");
        }
    });

    // ElegantOTA
    ElegantOTA.begin(&server);
    ElegantOTA.onStart([]() {
        Serial.println("[OTA] Update started...");
    });
    ElegantOTA.onEnd([](bool success) {
        if (success) {
            Serial.println("[OTA] Update successful! Rebooting...");
        } else {
            Serial.println("[OTA] Update failed!");
        }
    });

    server.begin();
    Serial.println("OK (port 80)");
    Serial.println("[OTA] ElegantOTA ready at /update");

    // WebSocket
    Serial.print("[STEP] WebSocket init... ");
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.println("OK (port 81)");

    Serial.println();
    Serial.println("=====================================");
    Serial.println("   Ready!");
    Serial.printf("   AP: %s / %s\r\n", AP_SSID, AP_PASS);
    Serial.printf("   AP IP: %s\r\n", WiFi.softAPIP().toString().c_str());
    if (staConnected) {
        Serial.printf("   STA IP: %s\r\n", staIP.c_str());
    }
    Serial.printf("   mDNS: http://%s.local/\r\n", MDNS_NAME);
    Serial.println("   OTA:  http://192.168.4.1/update");
    Serial.println("=====================================");
    Serial.println();
}

// ============== Loop ==============

uint32_t lastPrint = 0;
uint32_t lastStatusBroadcast = 0;

void loop() {
    dnsServer.processNextRequest();
    server.handleClient();
    webSocket.loop();
    ElegantOTA.loop();

    // Check WiFi connection
    checkWiFiConnection();

    // Status broadcast every 5 seconds
    if (millis() - lastStatusBroadcast >= 5000) {
        lastStatusBroadcast = millis();
        if (webSocket.connectedClients() > 0) {
            broadcastStatus();
        }
    }

    // Debug output every 30 seconds
    if (millis() - lastPrint >= 30000) {
        lastPrint = millis();
        Serial.printf("[INFO] Uptime: %lu sec, Heap: %d, WS: %d, WiFi: %s\r\n",
                      millis() / 1000, ESP.getFreeHeap(), webSocket.connectedClients(),
                      staConnected ? staIP.c_str() : "AP only");
    }
}
