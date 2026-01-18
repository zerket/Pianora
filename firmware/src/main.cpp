/**
 * TEST 8: + USB MIDI note reading
 * Full MIDI input with LED visualization
 */

#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <FastLED.h>
#include <NimBLEDevice.h>
#include <usb/usb_host.h>

#define LED_PIN     18
#define NUM_LEDS    176   // 88 keys * 2 LEDs per key
#define MIDI_IN_BUFFERS 4

// MIDI note range for 88-key piano
#define LOWEST_NOTE  21   // A0
#define HIGHEST_NOTE 108  // C8

CRGB leds[NUM_LEDS];
AsyncWebServer server(80);

// USB Host state
usb_host_client_handle_t usbClientHandle = nullptr;
usb_device_handle_t usbDeviceHandle = nullptr;
usb_transfer_t* midiInTransfer[MIDI_IN_BUFFERS] = {nullptr};
uint8_t midiInterfaceNum = 0;
uint8_t midiInEndpoint = 0;
uint16_t midiInMaxPacket = 64;
bool usbDeviceConnected = false;
bool midiReady = false;

// Note state for visualization
bool noteState[128] = {false};
uint8_t noteVelocity[128] = {0};

// Forward declarations
void onUsbDeviceConnected(uint8_t address);
void onUsbDeviceDisconnected();
void midiTransferCallback(usb_transfer_t* transfer);
void processMidiPacket(uint8_t* data, size_t length);
void noteOn(uint8_t note, uint8_t velocity);
void noteOff(uint8_t note);
int noteToLed(uint8_t note);

// USB client callback
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
    // Re-submit transfer
    if (midiReady) {
        usb_host_transfer_submit(transfer);
    }
}

void processMidiPacket(uint8_t* data, size_t length) {
    // USB MIDI packets are 4 bytes: [CIN+Cable, Status, Data1, Data2]
    for (size_t i = 0; i + 4 <= length; i += 4) {
        uint8_t cin = data[i] & 0x0F;
        uint8_t status = data[i + 1];
        uint8_t note = data[i + 2];
        uint8_t velocity = data[i + 3];

        if (cin == 0 && status == 0) continue;  // Empty packet

        uint8_t msgType = status & 0xF0;

        if (msgType == 0x90 && velocity > 0) {
            // Note On
            noteOn(note, velocity);
            Serial.printf("Note ON:  %3d vel=%3d\n", note, velocity);
        } else if (msgType == 0x80 || (msgType == 0x90 && velocity == 0)) {
            // Note Off
            noteOff(note);
            Serial.printf("Note OFF: %3d\n", note);
        }
    }
}

// Returns LED index for a note (odd indices: 1, 3, 5, 7...)
int noteToLed(uint8_t note) {
    if (note < LOWEST_NOTE || note > HIGHEST_NOTE) return -1;
    int keyIndex = note - LOWEST_NOTE;  // 0-87
    return keyIndex * 2 + 1;  // Odd indices: 1, 3, 5, 7...
}

void noteOn(uint8_t note, uint8_t velocity) {
    noteState[note] = true;
    noteVelocity[note] = velocity;

    int led = noteToLed(note);
    if (led >= 0 && led < NUM_LEDS) {
        // Color based on velocity
        uint8_t hue = map(velocity, 1, 127, 160, 0);  // Blue to Red
        leds[led] = CHSV(hue, 255, 255);
        FastLED.show();
    }
}

void noteOff(uint8_t note) {
    noteState[note] = false;
    noteVelocity[note] = 0;

    int led = noteToLed(note);
    if (led >= 0 && led < NUM_LEDS) {
        leds[led] = CRGB::Black;
        FastLED.show();
    }
}

void onUsbDeviceConnected(uint8_t address) {
    Serial.print("USB: Opening device... ");
    esp_err_t err = usb_host_device_open(usbClientHandle, address, &usbDeviceHandle);
    if (err != ESP_OK) {
        Serial.printf("FAIL (%d)\n", err);
        return;
    }
    Serial.println("OK");

    // Get device descriptor
    const usb_device_desc_t* devDesc;
    usb_host_get_device_descriptor(usbDeviceHandle, &devDesc);
    Serial.printf("USB: VID=0x%04X PID=0x%04X\n", devDesc->idVendor, devDesc->idProduct);

    // Get config descriptor and find MIDI interface + endpoints
    const usb_config_desc_t* configDesc;
    err = usb_host_get_active_config_descriptor(usbDeviceHandle, &configDesc);
    if (err != ESP_OK) {
        Serial.println("USB: Failed to get config descriptor");
        return;
    }

    // Parse descriptors
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

                // Claim interface
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

            // Bulk IN endpoint
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
        return;
    }

    // Allocate and submit IN transfers
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

    midiReady = true;
    usbDeviceConnected = true;
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
    Serial.println("USB: MIDI ready! Play some notes!");
}

void onUsbDeviceDisconnected() {
    midiReady = false;

    // Free transfers
    for (int i = 0; i < MIDI_IN_BUFFERS; i++) {
        if (midiInTransfer[i] != nullptr) {
            usb_host_transfer_free(midiInTransfer[i]);
            midiInTransfer[i] = nullptr;
        }
    }

    // Release interface and close device
    if (usbDeviceHandle != nullptr) {
        usb_host_interface_release(usbClientHandle, usbDeviceHandle, midiInterfaceNum);
        usb_host_device_close(usbClientHandle, usbDeviceHandle);
        usbDeviceHandle = nullptr;
    }

    usbDeviceConnected = false;
    midiInEndpoint = 0;
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
}

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("\n\n========================================");
    Serial.println("  TEST 8: + USB MIDI note reading");
    Serial.println("========================================\n");

    // 1. FastLED
    Serial.print("1. FastLED... ");
    Serial.flush();
    FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
    FastLED.setBrightness(50);
    fill_solid(leds, NUM_LEDS, CRGB::Yellow);
    FastLED.show();
    Serial.println("OK");

    // 2. NimBLE
    Serial.print("2. NimBLE... ");
    Serial.flush();
    NimBLEDevice::init("Pianora-Test");
    fill_solid(leds, NUM_LEDS, CRGB::Orange);
    FastLED.show();
    Serial.println("OK");

    // 3. LittleFS
    Serial.print("3. LittleFS... ");
    Serial.flush();
    LittleFS.begin(true);
    Serial.println("OK");

    // 4. WiFi AP
    Serial.print("4. WiFi AP... ");
    Serial.flush();
    WiFi.mode(WIFI_AP);
    WiFi.softAP("Pianora-Test", "12345678");
    fill_solid(leds, NUM_LEDS, CRGB::Purple);
    FastLED.show();
    Serial.print("OK - IP: ");
    Serial.println(WiFi.softAPIP());

    // 5. WebServer
    Serial.print("5. WebServer... ");
    Serial.flush();
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        String html = "<h1>TEST 8 - USB MIDI</h1>";
        html += "<p>USB: " + String(usbDeviceConnected ? "Connected" : "Not connected") + "</p>";
        html += "<p>MIDI Ready: " + String(midiReady ? "Yes" : "No") + "</p>";
        html += "<p>Heap: " + String(ESP.getFreeHeap()) + "</p>";
        request->send(200, "text/html", html);
    });
    server.begin();
    Serial.println("OK");

    // 6. USB Host
    Serial.print("6. USB Host install... ");
    Serial.flush();

    const usb_host_config_t hostConfig = {
        .skip_phy_setup = false,
        .intr_flags = ESP_INTR_FLAG_LEVEL1,
    };

    esp_err_t err = usb_host_install(&hostConfig);
    if (err != ESP_OK) {
        Serial.printf("FAIL (%d)\n", err);
    } else {
        Serial.println("OK");

        // Register client
        Serial.print("7. USB Host client... ");
        Serial.flush();

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
            Serial.printf("FAIL (%d)\n", err);
        } else {
            Serial.println("OK");
        }
    }

    // Done
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();

    Serial.println("\n========================================");
    Serial.println("  ALL SYSTEMS GO!");
    Serial.println("  Connect your piano via USB!");
    Serial.print("  Free Heap: ");
    Serial.println(ESP.getFreeHeap());
    Serial.println("========================================\n");
}

void loop() {
    static uint32_t lastPrint = 0;
    static uint8_t hue = 0;

    // USB Host task - must be called frequently
    if (usbClientHandle != nullptr) {
        uint32_t eventFlags;
        usb_host_lib_handle_events(0, &eventFlags);
        usb_host_client_handle_events(usbClientHandle, 0);
    }

    // Rainbow only when waiting for device
    if (!midiReady) {
        fill_rainbow(leds, NUM_LEDS, hue++, 2);
        FastLED.show();
    }

    if (millis() - lastPrint >= 5000) {
        lastPrint = millis();
        Serial.printf("Uptime: %lus | Heap: %u | MIDI: %s\n",
            millis() / 1000,
            ESP.getFreeHeap(),
            midiReady ? "Ready" : "Waiting...");
    }
    delay(10);
}
