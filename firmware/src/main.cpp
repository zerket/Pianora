/**
 * Pianora Firmware v0.7.0 - TEST 11
 * USB MIDI + WebSocket + LittleFS + LED Controller + Hotkeys
 */

#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>
#include <NimBLEDevice.h>
#include <usb/usb_host.h>

#include "led_controller.h"
#include "../include/hotkey_handler.h"

#define MIDI_IN_BUFFERS 4

// WiFi Configuration
#define WIFI_STA_SSID     "RT-GPON-F060_EXT"
#define WIFI_STA_PASSWORD "Q579EY7q"
#define WIFI_AP_SSID      "Pianora"
#define WIFI_AP_PASSWORD  "12345678"
#define WIFI_CONNECT_ATTEMPTS 3
#define WIFI_CONNECT_TIMEOUT_MS 10000

bool wifiIsAP = false;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// USB Host state
usb_host_client_handle_t usbClientHandle = nullptr;
usb_device_handle_t usbDeviceHandle = nullptr;
usb_transfer_t* midiInTransfer[MIDI_IN_BUFFERS] = {nullptr};
uint8_t midiInterfaceNum = 0;
uint8_t midiInEndpoint = 0;
uint16_t midiInMaxPacket = 64;
bool usbDeviceConnected = false;
bool usbMidiReady = false;

// Forward declarations
void onUsbDeviceConnected(uint8_t address);
void onUsbDeviceDisconnected();
void midiTransferCallback(usb_transfer_t* transfer);
void processMidiPacket(uint8_t* data, size_t length);

// Hotkey callback
void onHotkeyPlayPause() {
    // Send play/pause command to connected clients
    JsonDocument doc;
    doc["type"] = "hotkey";
    doc["payload"]["action"] = "play_pause";

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
    Serial.println("Hotkey: Play/Pause");
}

// ============== WebSocket ==============

void sendStatusToClients() {
    JsonDocument doc;
    doc["type"] = "status";
    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["usb_connected"] = usbDeviceConnected;
    payload["usb_midi_ready"] = usbMidiReady;
    payload["brightness"] = ledController ? ledController->getBrightness() : 128;
    payload["mode"] = ledController ? (int)ledController->getMode() : 0;
    payload["hue"] = ledController ? ledController->getHue() : 0;
    payload["heap"] = ESP.getFreeHeap();
    payload["version"] = FW_VERSION;
    payload["wifi_mode"] = wifiIsAP ? "AP" : "STA";
    payload["ip"] = wifiIsAP ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
    payload["led_count"] = NUM_LEDS;

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void sendNoteToClients(uint8_t note, uint8_t velocity, bool isOn) {
    JsonDocument doc;
    doc["type"] = "midi_note";
    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["note"] = note;
    payload["velocity"] = velocity;
    payload["on"] = isOn;

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len) {
    switch (type) {
        case WS_EVT_CONNECT:
            Serial.printf("WS: Client #%u connected\n", client->id());
            sendStatusToClients();
            break;
        case WS_EVT_DISCONNECT:
            Serial.printf("WS: Client #%u disconnected\n", client->id());
            break;
        case WS_EVT_DATA: {
            AwsFrameInfo* info = (AwsFrameInfo*)arg;
            if (info->opcode == WS_TEXT) {
                data[len] = 0;
                JsonDocument doc;
                if (!deserializeJson(doc, (char*)data)) {
                    const char* msgType = doc["type"];

                    if (msgType && strcmp(msgType, "get_status") == 0) {
                        sendStatusToClients();
                    }
                    else if (msgType && strcmp(msgType, "set_brightness") == 0) {
                        uint8_t brightness = doc["payload"]["value"] | 128;
                        if (ledController) ledController->setBrightness(brightness);
                        sendStatusToClients();
                    }
                    else if (msgType && strcmp(msgType, "set_mode") == 0) {
                        uint8_t mode = doc["payload"]["value"] | 0;
                        if (ledController) ledController->setMode((LEDMode)mode);
                        sendStatusToClients();
                    }
                    else if (msgType && strcmp(msgType, "set_hue") == 0) {
                        uint8_t hue = doc["payload"]["value"] | 0;
                        if (ledController) ledController->setHue(hue);
                        sendStatusToClients();
                    }
                    else if (msgType && strcmp(msgType, "set_saturation") == 0) {
                        uint8_t sat = doc["payload"]["value"] | 255;
                        if (ledController) ledController->setSaturation(sat);
                    }
                    else if (msgType && strcmp(msgType, "set_fade_rate") == 0) {
                        uint8_t rate = doc["payload"]["value"] | 15;
                        if (ledController) ledController->setFadeRate(rate);
                    }
                    else if (msgType && strcmp(msgType, "set_splash") == 0) {
                        bool enabled = doc["payload"]["enabled"] | false;
                        if (ledController) ledController->setSplashEnabled(enabled);
                    }
                    else if (msgType && strcmp(msgType, "set_expected_notes") == 0) {
                        // Learning mode - set expected notes
                        JsonArray notes = doc["payload"]["notes"];
                        if (ledController && notes) {
                            uint8_t noteArray[10];
                            uint8_t count = 0;
                            for (JsonVariant v : notes) {
                                if (count < 10) {
                                    noteArray[count++] = v.as<uint8_t>();
                                }
                            }
                            ledController->setExpectedNotes(noteArray, count);
                        }
                    }
                    else if (msgType && strcmp(msgType, "clear_expected_notes") == 0) {
                        if (ledController) ledController->clearExpectedNotes();
                    }
                    else if (msgType && strcmp(msgType, "set_split") == 0) {
                        uint8_t pos = doc["payload"]["position"] | 44;
                        if (ledController) ledController->setSplitPosition(pos);

                        if (doc["payload"].containsKey("left_hue")) {
                            uint8_t h = doc["payload"]["left_hue"];
                            uint8_t s = doc["payload"]["left_sat"] | 255;
                            uint8_t v = doc["payload"]["left_val"] | 255;
                            ledController->setLeftColor(h, s, v);
                        }
                        if (doc["payload"].containsKey("right_hue")) {
                            uint8_t h = doc["payload"]["right_hue"];
                            uint8_t s = doc["payload"]["right_sat"] | 255;
                            uint8_t v = doc["payload"]["right_val"] | 255;
                            ledController->setRightColor(h, s, v);
                        }
                    }
                    else if (msgType && strcmp(msgType, "set_background") == 0) {
                        bool enabled = doc["payload"]["enabled"] | false;
                        if (ledController) {
                            ledController->setBackgroundEnabled(enabled);
                            if (doc["payload"].containsKey("hue")) {
                                uint8_t h = doc["payload"]["hue"];
                                uint8_t s = doc["payload"]["sat"] | 255;
                                uint8_t v = doc["payload"]["val"] | 32;
                                ledController->setBackgroundColor(h, s, v);
                            }
                            if (doc["payload"].containsKey("brightness")) {
                                ledController->setBackgroundBrightness(doc["payload"]["brightness"]);
                            }
                        }
                    }
                    else if (msgType && strcmp(msgType, "set_hue_shift") == 0) {
                        bool enabled = doc["payload"]["enabled"] | false;
                        if (ledController) {
                            ledController->setHueShiftEnabled(enabled);
                            if (doc["payload"].containsKey("amount")) {
                                ledController->setHueShiftAmount(doc["payload"]["amount"]);
                            }
                            if (doc["payload"].containsKey("window_ms")) {
                                ledController->setChordWindowMs(doc["payload"]["window_ms"]);
                            }
                        }
                    }
                    else if (msgType && strcmp(msgType, "set_ambient") == 0) {
                        uint8_t anim = doc["payload"]["animation"] | 0;
                        uint8_t speed = doc["payload"]["speed"] | 50;
                        if (ledController) {
                            ledController->setAmbientAnimation(anim);
                            ledController->setAnimationSpeed(speed);
                        }
                    }
                }
            }
            break;
        }
        default:
            break;
    }
}

// ============== USB MIDI ==============

void usbClientCallback(const usb_host_client_event_msg_t* msg, void* arg) {
    switch (msg->event) {
        case USB_HOST_CLIENT_EVENT_NEW_DEV:
            Serial.printf("USB: New device at address %d\n", msg->new_dev.address);
            onUsbDeviceConnected(msg->new_dev.address);
            break;
        case USB_HOST_CLIENT_EVENT_DEV_GONE:
            Serial.println("USB: Device disconnected");
            onUsbDeviceDisconnected();
            break;
    }
}

void midiTransferCallback(usb_transfer_t* transfer) {
    if (transfer->status == USB_TRANSFER_STATUS_COMPLETED && transfer->actual_num_bytes > 0) {
        processMidiPacket(transfer->data_buffer, transfer->actual_num_bytes);
    }
    if (usbMidiReady) {
        usb_host_transfer_submit(transfer);
    }
}

void processMidiPacket(uint8_t* data, size_t length) {
    for (size_t i = 0; i + 4 <= length; i += 4) {
        uint8_t cin = data[i] & 0x0F;
        uint8_t status = data[i + 1];
        uint8_t note = data[i + 2];
        uint8_t velocity = data[i + 3];

        if (cin == 0 && status == 0) continue;

        uint8_t msgType = status & 0xF0;

        if (msgType == 0x90 && velocity > 0) {
            // Note On
            if (hotkeyHandler) {
                hotkeyHandler->noteOn(note, velocity);
                if (hotkeyHandler->checkHotkey()) {
                    // Hotkey activated, don't process as normal note
                    continue;
                }
            }

            if (ledController) {
                ledController->noteOn(note, velocity);
            }
            sendNoteToClients(note, velocity, true);
            Serial.printf("Note ON:  %3d vel=%3d\n", note, velocity);

        } else if (msgType == 0x80 || (msgType == 0x90 && velocity == 0)) {
            // Note Off
            if (hotkeyHandler) {
                hotkeyHandler->noteOff(note);
            }

            if (ledController) {
                ledController->noteOff(note);
            }
            sendNoteToClients(note, 0, false);
            Serial.printf("Note OFF: %3d\n", note);
        }
    }
}

// ============== USB Device Handling ==============

void onUsbDeviceConnected(uint8_t address) {
    Serial.print("USB: Opening device... ");
    esp_err_t err = usb_host_device_open(usbClientHandle, address, &usbDeviceHandle);
    if (err != ESP_OK) {
        Serial.printf("FAIL (%d)\n", err);
        return;
    }
    Serial.println("OK");

    const usb_device_desc_t* devDesc;
    usb_host_get_device_descriptor(usbDeviceHandle, &devDesc);
    Serial.printf("USB: VID=0x%04X PID=0x%04X\n", devDesc->idVendor, devDesc->idProduct);

    const usb_config_desc_t* configDesc;
    err = usb_host_get_active_config_descriptor(usbDeviceHandle, &configDesc);
    if (err != ESP_OK) {
        Serial.println("USB: Failed to get config descriptor");
        return;
    }

    const uint8_t* p = &configDesc->val[0];
    int offset = 0;
    bool foundMidi = false;

    while (offset < configDesc->wTotalLength) {
        uint8_t bLength = p[0];
        uint8_t bDescType = p[1];
        if (bLength == 0) break;

        if (bDescType == USB_B_DESCRIPTOR_TYPE_INTERFACE) {
            uint8_t bInterfaceNum = p[2];
            uint8_t bInterfaceClass = p[5];
            uint8_t bInterfaceSubClass = p[6];

            if (bInterfaceClass == 0x01 && bInterfaceSubClass == 0x03) {
                Serial.printf("USB: MIDI interface #%d\n", bInterfaceNum);
                midiInterfaceNum = bInterfaceNum;
                foundMidi = true;

                err = usb_host_interface_claim(usbClientHandle, usbDeviceHandle, bInterfaceNum, 0);
                if (err != ESP_OK) {
                    Serial.printf("USB: Claim interface FAIL (%d)\n", err);
                } else {
                    Serial.println("USB: Interface claimed OK");
                }
            }
        }
        else if (bDescType == USB_B_DESCRIPTOR_TYPE_ENDPOINT && foundMidi) {
            uint8_t bEndpointAddr = p[2];
            uint8_t bmAttributes = p[3];
            uint16_t wMaxPacket = p[4] | (p[5] << 8);

            if ((bmAttributes & 0x03) == 0x02 && (bEndpointAddr & 0x80)) {
                midiInEndpoint = bEndpointAddr;
                midiInMaxPacket = wMaxPacket;
                Serial.printf("USB: MIDI IN endpoint 0x%02X, maxPacket=%d\n", bEndpointAddr, wMaxPacket);
            }
        }

        offset += bLength;
        p += bLength;
    }

    if (!foundMidi || midiInEndpoint == 0) {
        Serial.println("USB: No MIDI endpoint found");
        usbDeviceConnected = true;
        sendStatusToClients();
        return;
    }

    Serial.print("USB: Setting up transfers... ");
    for (int i = 0; i < MIDI_IN_BUFFERS; i++) {
        err = usb_host_transfer_alloc(midiInMaxPacket, 0, &midiInTransfer[i]);
        if (err != ESP_OK) {
            Serial.printf("FAIL alloc %d (%d)\n", i, err);
            continue;
        }
        midiInTransfer[i]->device_handle = usbDeviceHandle;
        midiInTransfer[i]->bEndpointAddress = midiInEndpoint;
        midiInTransfer[i]->callback = midiTransferCallback;
        midiInTransfer[i]->context = nullptr;
        midiInTransfer[i]->num_bytes = midiInMaxPacket;

        err = usb_host_transfer_submit(midiInTransfer[i]);
        if (err != ESP_OK) {
            Serial.printf("FAIL submit %d (%d)\n", i, err);
        }
    }
    Serial.println("OK");

    usbMidiReady = true;
    usbDeviceConnected = true;

    if (ledController) ledController->blackout();
    Serial.println("USB: MIDI ready!");
    sendStatusToClients();
}

void onUsbDeviceDisconnected() {
    usbMidiReady = false;

    for (int i = 0; i < MIDI_IN_BUFFERS; i++) {
        if (midiInTransfer[i] != nullptr) {
            usb_host_transfer_free(midiInTransfer[i]);
            midiInTransfer[i] = nullptr;
        }
    }

    if (usbDeviceHandle != nullptr) {
        usb_host_interface_release(usbClientHandle, usbDeviceHandle, midiInterfaceNum);
        usb_host_device_close(usbClientHandle, usbDeviceHandle);
        usbDeviceHandle = nullptr;
    }

    usbDeviceConnected = false;
    midiInEndpoint = 0;

    if (ledController) ledController->showColor(CRGB::Green);
    sendStatusToClients();
}

// ============== Setup ==============

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("\n\n========================================");
    Serial.printf("  Pianora TEST 11 - Full Features\n");
    Serial.println("========================================\n");

    // 1. LED Controller
    Serial.print("1. LED Controller... ");
    ledController = new LEDController();
    ledController->begin();
    Serial.println("OK");

    // 2. Hotkey Handler
    Serial.print("2. Hotkey Handler... ");
    hotkeyHandler = new HotkeyHandler();
    Serial.println("OK");

    // 3. NimBLE (init only)
    Serial.print("3. NimBLE... ");
    NimBLEDevice::init("Pianora");
    Serial.println("OK");

    // 4. LittleFS
    Serial.print("4. LittleFS... ");
    if (!LittleFS.begin(false)) {
        Serial.println("Mount failed, formatting...");
        if (!LittleFS.begin(true)) {
            Serial.println("FAIL even after format!");
        }
    }
    Serial.printf("OK (Total: %u, Used: %u)\n", LittleFS.totalBytes(), LittleFS.usedBytes());

    // 5. WiFi - try Station first, fallback to AP
    Serial.println("5. WiFi Setup...");
    WiFi.mode(WIFI_STA);

    bool connected = false;
    for (int attempt = 1; attempt <= WIFI_CONNECT_ATTEMPTS; attempt++) {
        Serial.printf("   Connecting to '%s' (attempt %d/%d)...\n",
                      WIFI_STA_SSID, attempt, WIFI_CONNECT_ATTEMPTS);

        WiFi.begin(WIFI_STA_SSID, WIFI_STA_PASSWORD);

        uint32_t startTime = millis();
        while (WiFi.status() != WL_CONNECTED &&
               (millis() - startTime) < WIFI_CONNECT_TIMEOUT_MS) {
            delay(500);
            Serial.print(".");
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            connected = true;
            break;
        }

        Serial.println("   Failed!");
        WiFi.disconnect();
    }

    if (connected) {
        wifiIsAP = false;
        Serial.printf("   Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("   Starting AP mode...");
        WiFi.mode(WIFI_AP);
        WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);
        wifiIsAP = true;
        Serial.printf("   AP started: %s / %s\n", WIFI_AP_SSID, WIFI_AP_PASSWORD);
        Serial.printf("   IP: %s\n", WiFi.softAPIP().toString().c_str());
    }

    // 6. WebSocket + WebServer
    Serial.print("6. WebSocket + WebServer... ");
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);

    // API endpoints
    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest* request) {
        JsonDocument doc;
        doc["usb_connected"] = usbDeviceConnected;
        doc["usb_midi_ready"] = usbMidiReady;
        doc["brightness"] = ledController ? ledController->getBrightness() : 128;
        doc["mode"] = ledController ? (int)ledController->getMode() : 0;
        doc["heap"] = ESP.getFreeHeap();
        doc["version"] = FW_VERSION;
        doc["wifi_mode"] = wifiIsAP ? "AP" : "STA";
        doc["ip"] = wifiIsAP ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
        doc["led_count"] = NUM_LEDS;

        String json;
        serializeJson(doc, json);
        request->send(200, "application/json", json);
    });

    // Serve static files from LittleFS
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // SPA fallback
    server.onNotFound([](AsyncWebServerRequest* request) {
        if (request->url().startsWith("/api/")) {
            request->send(404, "application/json", "{\"error\":\"Not found\"}");
            return;
        }

        if (LittleFS.exists("/index.html")) {
            request->send(LittleFS, "/index.html", "text/html");
        } else {
            String html = "<html><head><title>Pianora</title></head><body>";
            html += "<h1>Pianora TEST 11</h1>";
            html += "<p>LittleFS: index.html not found</p>";
            html += "</body></html>";
            request->send(200, "text/html", html);
        }
    });

    server.begin();
    Serial.println("OK");

    // 7. USB Host
    Serial.print("7. USB Host... ");
    const usb_host_config_t hostConfig = {
        .skip_phy_setup = false,
        .intr_flags = ESP_INTR_FLAG_LEVEL1,
    };

    esp_err_t err = usb_host_install(&hostConfig);
    if (err != ESP_OK) {
        Serial.printf("FAIL (%d)\n", err);
    } else {
        const usb_host_client_config_t clientConfig = {
            .is_synchronous = false,
            .max_num_event_msg = 5,
            .async = {
                .client_event_callback = usbClientCallback,
                .callback_arg = nullptr
            }
        };

        err = usb_host_client_register(&clientConfig, &usbClientHandle);
        if (err != ESP_OK) {
            Serial.printf("FAIL client (%d)\n", err);
        } else {
            Serial.println("OK");
        }
    }

    // Startup animation (ends with blackout)
    ledController->playStartupAnimation();

    Serial.println("\n========================================");
    Serial.println("  READY!");
    if (wifiIsAP) {
        Serial.printf("  WiFi AP: %s / %s\n", WIFI_AP_SSID, WIFI_AP_PASSWORD);
        Serial.printf("  Web: http://%s\n", WiFi.softAPIP().toString().c_str());
    } else {
        Serial.printf("  WiFi: Connected to %s\n", WIFI_STA_SSID);
        Serial.printf("  Web: http://%s\n", WiFi.localIP().toString().c_str());
    }
    Serial.printf("  LEDs: %d\n", NUM_LEDS);
    Serial.printf("  Free Heap: %u\n", ESP.getFreeHeap());
    Serial.println("========================================\n");
}

// ============== Loop ==============

void loop() {
    static uint32_t lastPrint = 0;

    // USB Host task
    if (usbClientHandle != nullptr) {
        uint32_t eventFlags;
        usb_host_lib_handle_events(0, &eventFlags);
        usb_host_client_handle_events(usbClientHandle, 0);
    }

    // LED Controller update (for fading, animations, etc.)
    if (ledController) {
        ledController->update();
    }

    // WebSocket cleanup
    ws.cleanupClients();

    // Status print
    if (millis() - lastPrint >= 10000) {
        lastPrint = millis();
        Serial.printf("Uptime: %lus | Heap: %u | USB: %s\n",
            millis() / 1000,
            ESP.getFreeHeap(),
            usbMidiReady ? "Ready" : "No");
    }

    delay(5);
}
