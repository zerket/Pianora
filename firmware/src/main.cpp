/**
 * Pianora Firmware v0.6.0 - TEST 9
 * USB MIDI + WebSocket (no BLE callbacks)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>
#include <NimBLEDevice.h>
#include <usb/usb_host.h>

#define LED_PIN     18
#define NUM_LEDS    176
#define MIDI_IN_BUFFERS 4

#define LOWEST_NOTE  21
#define HIGHEST_NOTE 108

// LED index lookup table for 88 keys (A0-C8, notes 21-108)
// Index in array = note - 21 (keyIndex)
// Value = LED index (0-175)
// Pre-filled as keyIndex * 2, adjust manually as needed
const uint8_t NOTE_TO_LED[88] = {
    // Octave 0: A0, A#0, B0
    0,    2,    4,
    // Octave 1: C1, C#1, D1, D#1, E1, F1, F#1, G1, G#1, A1, A#1, B1
    6,    8,   10,   12,   14,   16,   18,   20,   22,   24,   26,   28,
    // Octave 2: C2, C#2, D2, D#2, E2, F2, F#2, G2, G#2, A2, A#2, B2
    30,   32,   34,   36,   38,   40,   42,   44,   46,   48,   50,   52,
    // Octave 3: C3, C#3, D3, D#3, E3, F3, F#3, G3, G#3, A3, A#3, B3
    54,   56,   58,   60,   62,   64,   66,   68,   70,   72,   74,   76,
    // Octave 4: C4, C#4, D4, D#4, E4, F4, F#4, G4, G#4, A4, A#4, B4
    78,   80,   82,   84,   86,   88,   90,   92,   94,   96,   98,  99,
    // Octave 5: C5, C#5, D5, D#5, E5, F5, F#5, G5, G#5, A5, A#5, B5
    101,  103,  105,  107,  109,  111,  113,  115,  117,  119,  121,  123,
    // Octave 6: C6, C#6, D6, D#6, E6, F6, F#6, G6, G#6, A6, A#6, B6
    125,  127,  129,  131,  133,  135,  137,  139,  141,  143,  145,  147,
    // Octave 7: C7, C#7, D7, D#7, E7, F7, F#7, G7, G#7, A7, A#7, B7
    149,  151,  153,  155,  157,  159,  161,  163,  165,  167,  169,  171,
    // Octave 8: C8
    174
};

CRGB leds[NUM_LEDS];
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

// Note state
bool noteState[128] = {false};
uint8_t noteVelocity[128] = {0};

// LED settings
uint8_t ledBrightness = 50;

// Forward declarations
void onUsbDeviceConnected(uint8_t address);
void onUsbDeviceDisconnected();
void midiTransferCallback(usb_transfer_t* transfer);
void processMidiPacket(uint8_t* data, size_t length);
void noteOn(uint8_t note, uint8_t velocity);
void noteOff(uint8_t note);
int noteToLed(uint8_t note);

// ============== WebSocket ==============

void sendStatusToClients() {
    JsonDocument doc;
    doc["type"] = "status";
    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["usb_connected"] = usbDeviceConnected;
    payload["usb_midi_ready"] = usbMidiReady;
    payload["brightness"] = ledBrightness;
    payload["heap"] = ESP.getFreeHeap();
    payload["version"] = FW_VERSION;

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
                        ledBrightness = doc["payload"]["value"] | 50;
                        FastLED.setBrightness(ledBrightness);
                        FastLED.show();
                        sendStatusToClients();
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
            noteOn(note, velocity);
        } else if (msgType == 0x80 || (msgType == 0x90 && velocity == 0)) {
            noteOff(note);
        }
    }
}

// ============== LED Control ==============

int noteToLed(uint8_t note) {
    if (note < LOWEST_NOTE || note > HIGHEST_NOTE) return -1;
    int keyIndex = note - LOWEST_NOTE;  // 0-87
    return NOTE_TO_LED[keyIndex];
}

void noteOn(uint8_t note, uint8_t velocity) {
    noteState[note] = true;
    noteVelocity[note] = velocity;

    int led = noteToLed(note);
    if (led >= 0 && led < NUM_LEDS) {
        uint8_t hue = map(velocity, 1, 127, 160, 0);
        leds[led] = CHSV(hue, 255, 255);
        FastLED.show();
    }

    sendNoteToClients(note, velocity, true);
    Serial.printf("Note ON:  %3d vel=%3d\n", note, velocity);
}

void noteOff(uint8_t note) {
    noteState[note] = false;
    noteVelocity[note] = 0;

    int led = noteToLed(note);
    if (led >= 0 && led < NUM_LEDS) {
        leds[led] = CRGB::Black;
        FastLED.show();
    }

    sendNoteToClients(note, 0, false);
    Serial.printf("Note OFF: %3d\n", note);
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

    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
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

    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
    sendStatusToClients();
}

// ============== Setup ==============

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("\n\n========================================");
    Serial.printf("  Pianora TEST 9 - USB MIDI + WebSocket\n");
    Serial.println("========================================\n");

    // 1. FastLED
    Serial.print("1. FastLED... ");
    FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
    FastLED.setBrightness(ledBrightness);
    fill_solid(leds, NUM_LEDS, CRGB::Yellow);
    FastLED.show();
    Serial.println("OK");

    // 2. NimBLE (init only, no scanning)
    Serial.print("2. NimBLE... ");
    NimBLEDevice::init("Pianora");
    fill_solid(leds, NUM_LEDS, CRGB::Orange);
    FastLED.show();
    Serial.println("OK");

    // 3. LittleFS
    Serial.print("3. LittleFS... ");
    if (!LittleFS.begin(true)) {
        Serial.println("FAIL");
    } else {
        Serial.printf("OK (Total: %u, Used: %u)\n", LittleFS.totalBytes(), LittleFS.usedBytes());
    }

    // 4. WiFi AP
    Serial.print("4. WiFi AP... ");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("Pianora", "12345678");
    fill_solid(leds, NUM_LEDS, CRGB::Purple);
    FastLED.show();
    Serial.printf("OK - IP: %s\n", WiFi.softAPIP().toString().c_str());

    // 5. WebSocket + WebServer
    Serial.print("5. WebSocket... ");
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);

    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest* request) {
        JsonDocument doc;
        doc["usb_connected"] = usbDeviceConnected;
        doc["usb_midi_ready"] = usbMidiReady;
        doc["brightness"] = ledBrightness;
        doc["heap"] = ESP.getFreeHeap();
        doc["version"] = FW_VERSION;

        String json;
        serializeJson(doc, json);
        request->send(200, "application/json", json);
    });

    server.onNotFound([](AsyncWebServerRequest* request) {
        String html = "<html><head><title>Pianora</title></head><body>";
        html += "<h1>Pianora TEST 9</h1>";
        html += "<p>USB: " + String(usbDeviceConnected ? "Connected" : "Not connected") + "</p>";
        html += "<p>USB MIDI: " + String(usbMidiReady ? "Ready" : "Not ready") + "</p>";
        html += "<p>Heap: " + String(ESP.getFreeHeap()) + "</p>";
        html += "<p><a href='/api/status'>API Status</a></p>";
        html += "</body></html>";
        request->send(200, "text/html", html);
    });

    server.begin();
    Serial.println("OK");

    // 6. USB Host
    Serial.print("6. USB Host... ");
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

    // Done
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();

    Serial.println("\n========================================");
    Serial.println("  READY!");
    Serial.printf("  WiFi: Pianora / 12345678\n");
    Serial.printf("  Web: http://%s\n", WiFi.softAPIP().toString().c_str());
    Serial.printf("  Free Heap: %u\n", ESP.getFreeHeap());
    Serial.println("========================================\n");
}

// ============== Loop ==============

void loop() {
    static uint32_t lastPrint = 0;
    static uint8_t hue = 0;

    // USB Host task
    if (usbClientHandle != nullptr) {
        uint32_t eventFlags;
        usb_host_lib_handle_events(0, &eventFlags);
        usb_host_client_handle_events(usbClientHandle, 0);
    }

    // WebSocket cleanup
    ws.cleanupClients();

    // Rainbow when waiting
    if (!usbMidiReady) {
        fill_rainbow(leds, NUM_LEDS, hue++, 2);
        FastLED.show();
    }

    // Status print
    if (millis() - lastPrint >= 10000) {
        lastPrint = millis();
        Serial.printf("Uptime: %lus | Heap: %u | USB: %s\n",
            millis() / 1000,
            ESP.getFreeHeap(),
            usbMidiReady ? "Ready" : "No");
    }

    delay(10);
}
