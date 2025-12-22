#include "midi_handler.h"

#if USE_USB_MIDI
#include "usbhhelp.hpp"
#endif

// Global instance
MidiHandler midiHandler;

#if USE_USB_MIDI
// USB Host handles
usb_host_client_handle_t Client_Handle = NULL;
usb_device_handle_t Device_Handle = NULL;

// USB MIDI state
bool isMIDI = false;
bool isMIDIReady = false;
volatile bool midiOutBusy = false;

// USB transfer buffers
usb_transfer_t *MIDIOut = NULL;
usb_transfer_t *MIDIIn[MIDI_IN_BUFFERS] = { NULL };

// FreeRTOS queue for MIDI OUT
QueueHandle_t midiOutQueue = NULL;

// Forward declarations
static void midi_transfer_cb(usb_transfer_t *transfer);
static void check_interface_desc_MIDI(const void *p);
static void prepare_endpoints(const void *p);

/**
 * USB MIDI transfer callback - handles both IN and OUT transfers
 */
static void midi_transfer_cb(usb_transfer_t *transfer) {
    if (Device_Handle != transfer->device_handle) {
        return;
    }

    // Check if it's an IN transfer (MIDI data received from USB device)
    if (transfer->bEndpointAddress & USB_B_ENDPOINT_ADDRESS_EP_DIR_MASK) {
        // IN transfer
        if (transfer->status == USB_TRANSFER_STATUS_COMPLETED) {
            midiHandler.handleMidiIn(transfer->data_buffer, transfer->actual_num_bytes);

            // Re-submit the IN transfer to continue listening
            esp_err_t err = usb_host_transfer_submit(transfer);
            if (err != ESP_OK) {
                DEBUG_PRINTF("USB MIDI IN resubmit failed: 0x%x\n", err);
            }
        } else {
            DEBUG_PRINTF("USB MIDI IN transfer failed, status: %d\n", transfer->status);
            // Try to re-submit after a small delay
            vTaskDelay(pdMS_TO_TICKS(10));
            usb_host_transfer_submit(transfer);
        }
    } else {
        // OUT transfer completed
        if (transfer == MIDIOut) {
            if (transfer->status != USB_TRANSFER_STATUS_COMPLETED) {
                DEBUG_PRINTF("USB MIDI OUT failed, status: %d\n", transfer->status);
            }
            midiHandler.handleMidiOutComplete();
        }
    }
}

/**
 * Check if USB interface is MIDI
 */
static void check_interface_desc_MIDI(const void *p) {
    const usb_intf_desc_t *intf = (const usb_intf_desc_t *)p;

    // USB MIDI: Audio class (0x01), MIDI Streaming subclass (0x03)
    if ((intf->bInterfaceClass == USB_CLASS_AUDIO) &&
        (intf->bInterfaceSubClass == 0x03) &&
        (intf->bInterfaceProtocol == 0x00)) {

        isMIDI = true;
        DEBUG_PRINTLN("USB: MIDI interface found, claiming...");

        esp_err_t err = usb_host_interface_claim(
            Client_Handle, Device_Handle,
            intf->bInterfaceNumber, intf->bAlternateSetting);

        if (err != ESP_OK) {
            DEBUG_PRINTF("USB: interface_claim failed: 0x%x\n", err);
            isMIDI = false;
        } else {
            DEBUG_PRINTLN("USB: MIDI interface claimed OK");
        }
    }
}

/**
 * Setup USB endpoints for MIDI
 */
static void prepare_endpoints(const void *p) {
    const usb_ep_desc_t *endpoint = (const usb_ep_desc_t *)p;
    esp_err_t err;

    // Must be bulk endpoint for MIDI
    if ((endpoint->bmAttributes & USB_BM_ATTRIBUTES_XFERTYPE_MASK) != USB_BM_ATTRIBUTES_XFER_BULK) {
        return;
    }

    // Check endpoint direction
    if (endpoint->bEndpointAddress & USB_B_ENDPOINT_ADDRESS_EP_DIR_MASK) {
        // IN endpoint - allocate multiple buffers for input
        for (int i = 0; i < MIDI_IN_BUFFERS; i++) {
            err = usb_host_transfer_alloc(endpoint->wMaxPacketSize, 0, &MIDIIn[i]);
            if (err != ESP_OK) {
                MIDIIn[i] = NULL;
                DEBUG_PRINTF("USB: transfer_alloc IN[%d] failed: 0x%x\n", i, err);
            } else {
                MIDIIn[i]->device_handle = Device_Handle;
                MIDIIn[i]->bEndpointAddress = endpoint->bEndpointAddress;
                MIDIIn[i]->callback = midi_transfer_cb;
                MIDIIn[i]->context = (void *)i;
                MIDIIn[i]->num_bytes = endpoint->wMaxPacketSize;

                err = usb_host_transfer_submit(MIDIIn[i]);
                if (err != ESP_OK) {
                    DEBUG_PRINTF("USB: transfer_submit IN[%d] failed: 0x%x\n", i, err);
                }
            }
        }
        DEBUG_PRINTF("USB: MIDI IN endpoints ready (max packet: %d)\n", endpoint->wMaxPacketSize);
    } else {
        // OUT endpoint
        err = usb_host_transfer_alloc(endpoint->wMaxPacketSize, 0, &MIDIOut);
        if (err != ESP_OK) {
            MIDIOut = NULL;
            DEBUG_PRINTF("USB: transfer_alloc OUT failed: 0x%x\n", err);
        } else {
            MIDIOut->device_handle = Device_Handle;
            MIDIOut->bEndpointAddress = endpoint->bEndpointAddress;
            MIDIOut->callback = midi_transfer_cb;
            MIDIOut->context = NULL;
            DEBUG_PRINTF("USB: MIDI OUT endpoint ready (max packet: %d)\n", endpoint->wMaxPacketSize);
        }
    }

    // Check if both IN and OUT are ready
    isMIDIReady = (MIDIOut != NULL) && (MIDIIn[0] != NULL);
    if (isMIDIReady) {
        DEBUG_PRINTLN("USB: MIDI device fully ready!");
    }
}

/**
 * Enumerate USB configuration descriptor to find MIDI interface
 */
void show_config_desc_full(const usb_config_desc_t *config_desc) {
    const uint8_t *p = &config_desc->val[0];
    uint8_t bLength;

    for (int i = 0; i < config_desc->wTotalLength; i += bLength, p += bLength) {
        bLength = *p;
        if ((i + bLength) <= config_desc->wTotalLength) {
            const uint8_t bDescriptorType = *(p + 1);

            switch (bDescriptorType) {
                case USB_B_DESCRIPTOR_TYPE_CONFIGURATION:
                    // Configuration descriptor - skip
                    break;
                case USB_B_DESCRIPTOR_TYPE_INTERFACE:
                    if (!isMIDI) {
                        check_interface_desc_MIDI(p);
                    }
                    break;
                case USB_B_DESCRIPTOR_TYPE_ENDPOINT:
                    if (isMIDI && !isMIDIReady) {
                        prepare_endpoints(p);
                    }
                    break;
                default:
                    break;
            }
        } else {
            break;
        }
    }
}
#endif // USE_USB_MIDI

// ============================================================================
// MidiHandler Implementation
// ============================================================================

MidiHandler::MidiHandler()
    : _connected(false)
    , _ready(false)
    , _notesReceived(0)
    , _lastActivity(0)
    , _noteOnCallback(nullptr)
    , _noteOffCallback(nullptr)
    , _controlChangeCallback(nullptr)
    , _hotkeyCallback(nullptr)
    , _hotkeyNote1(0)
    , _hotkeyNote2(0)
    , _pressedNoteCount(0)
{
    memset(_pressedNotes, 0, sizeof(_pressedNotes));
}

void MidiHandler::begin() {
#if USE_USB_MIDI
    DEBUG_PRINTLN("MIDI: Initializing USB Host...");

    // Create MIDI OUT queue
    midiOutQueue = xQueueCreate(MIDI_OUT_QUEUE_SIZE, sizeof(MidiMessage));
    if (midiOutQueue == NULL) {
        DEBUG_PRINTLN("MIDI: Failed to create OUT queue!");
        return;
    }

    // Initialize USB Host
    usbh_setup(show_config_desc_full);

    midiOutBusy = false;
    _ready = true;
    DEBUG_PRINTLN("MIDI: USB Host initialized");
#else
    DEBUG_PRINTLN("MIDI: USB MIDI disabled");
    _ready = false;
#endif
}

void MidiHandler::update() {
#if USE_USB_MIDI
    // Process USB Host events
    usbh_task();

    // Process MIDI OUT queue
    processUsbMidiOut();

    // Update connection status based on activity
    unsigned long now = millis();
    if (_lastActivity > 0 && now - _lastActivity > 5000) {
        if (_connected) {
            _connected = false;
            DEBUG_PRINTLN("MIDI: Disconnected (timeout)");
        }
    }
#endif
}

void MidiHandler::stop() {
#if USE_USB_MIDI
    // Free transfers
    for (int i = 0; i < MIDI_IN_BUFFERS; i++) {
        if (MIDIIn[i] != NULL) {
            usb_host_transfer_free(MIDIIn[i]);
            MIDIIn[i] = NULL;
        }
    }
    if (MIDIOut != NULL) {
        usb_host_transfer_free(MIDIOut);
        MIDIOut = NULL;
    }

    // Delete queue
    if (midiOutQueue != NULL) {
        vQueueDelete(midiOutQueue);
        midiOutQueue = NULL;
    }

    isMIDI = false;
    isMIDIReady = false;
    _connected = false;
    _ready = false;
#endif
}

void MidiHandler::setHotkeyCallback(void (*callback)(uint8_t, uint8_t)) {
    _hotkeyCallback = callback;
}

void MidiHandler::setHotkeyNotes(uint8_t note1, uint8_t note2) {
    _hotkeyNote1 = note1;
    _hotkeyNote2 = note2;
}

#if USE_USB_MIDI
void MidiHandler::handleMidiIn(uint8_t *data, size_t length) {
    // Process USB MIDI packets (4 bytes each)
    for (size_t i = 0; i < length; i += 4) {
        // Skip padding zeros
        if (data[i] == 0 && data[i+1] == 0 && data[i+2] == 0 && data[i+3] == 0) {
            if (i > 0) break;
            continue;
        }

        // CIN 0 is reserved/invalid
        if ((data[i] & 0x0F) == 0) {
            continue;
        }

        // Mark as connected
        if (!_connected) {
            _connected = true;
            DEBUG_PRINTLN("MIDI: Device connected");
        }
        _lastActivity = millis();

        // Parse USB MIDI packet
        uint8_t status = data[i + 1];
        uint8_t data1 = data[i + 2];
        uint8_t data2 = data[i + 3];

        handleMidiMessage(status, data1, data2);
    }
}

void MidiHandler::handleMidiOutComplete() {
    midiOutBusy = false;
}

void MidiHandler::processUsbMidiOut() {
    if (!isMIDIReady || midiOutBusy || midiOutQueue == NULL) {
        return;
    }

    if (uxQueueMessagesWaiting(midiOutQueue) == 0) {
        return;
    }

    MidiMessage msg;
    if (xQueueReceive(midiOutQueue, &msg, 0) != pdPASS) {
        return;
    }

    // Determine Code Index Number (CIN)
    uint8_t cin = 0;
    switch (msg.status & 0xF0) {
        case 0x80: cin = 0x08; break; // Note Off
        case 0x90: cin = 0x09; break; // Note On
        case 0xA0: cin = 0x0A; break; // Poly Key Pressure
        case 0xB0: cin = 0x0B; break; // Control Change
        case 0xC0: cin = 0x0C; break; // Program Change
        case 0xD0: cin = 0x0D; break; // Channel Pressure
        case 0xE0: cin = 0x0E; break; // Pitch Bend
        default:
            DEBUG_PRINTF("MIDI OUT: Unsupported status 0x%02X\n", msg.status);
            return;
    }

    if (MIDIOut == NULL) {
        DEBUG_PRINTLN("MIDI OUT: Buffer is NULL!");
        return;
    }

    // Build USB MIDI packet
    MIDIOut->data_buffer[0] = cin;  // Cable 0, CIN
    MIDIOut->data_buffer[1] = msg.status | (msg.channel & 0x0F);
    MIDIOut->data_buffer[2] = msg.data1 & 0x7F;
    MIDIOut->data_buffer[3] = msg.data2 & 0x7F;
    MIDIOut->num_bytes = 4;

    midiOutBusy = true;

    esp_err_t err = usb_host_transfer_submit(MIDIOut);
    if (err != ESP_OK) {
        DEBUG_PRINTF("MIDI OUT: Submit failed: 0x%x\n", err);
        midiOutBusy = false;
    }
}

bool MidiHandler::queueMidiMessage(uint8_t status, uint8_t channel, uint8_t data1, uint8_t data2) {
    if (!isMIDIReady || midiOutQueue == NULL) {
        return false;
    }

    MidiMessage msg = { status, channel, data1, data2 };

    if (xQueueSend(midiOutQueue, &msg, pdMS_TO_TICKS(10)) != pdPASS) {
        DEBUG_PRINTLN("MIDI OUT: Queue full!");
        return false;
    }
    return true;
}

void MidiHandler::sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    queueMidiMessage(MIDI_NOTE_ON, channel, note, velocity);
}

void MidiHandler::sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    queueMidiMessage(MIDI_NOTE_OFF, channel, note, velocity);
}

void MidiHandler::sendControlChange(uint8_t channel, uint8_t control, uint8_t value) {
    queueMidiMessage(MIDI_CONTROL_CHANGE, channel, control, value);
}
#endif // USE_USB_MIDI

void MidiHandler::handleMidiMessage(uint8_t status, uint8_t data1, uint8_t data2) {
    uint8_t messageType = status & 0xF0;
    uint8_t channel = status & 0x0F;

    switch (messageType) {
        case MIDI_NOTE_ON:
            if (data2 > 0) {
                // Note On
                _notesReceived++;
                checkHotkeys(data1, true);
                if (_noteOnCallback) {
                    _noteOnCallback(channel, data1, data2);
                }
            } else {
                // Note On with velocity 0 = Note Off
                checkHotkeys(data1, false);
                if (_noteOffCallback) {
                    _noteOffCallback(channel, data1, data2);
                }
            }
            break;

        case MIDI_NOTE_OFF:
            checkHotkeys(data1, false);
            if (_noteOffCallback) {
                _noteOffCallback(channel, data1, data2);
            }
            break;

        case MIDI_CONTROL_CHANGE:
            if (_controlChangeCallback) {
                _controlChangeCallback(channel, data1, data2);
            }
            break;

        default:
            break;
    }
}

void MidiHandler::checkHotkeys(uint8_t note, bool pressed) {
    if (!_hotkeyCallback || _hotkeyNote1 == 0 || _hotkeyNote2 == 0) {
        return;
    }

    if (pressed) {
        // Add note to pressed list
        if (_pressedNoteCount < 10) {
            _pressedNotes[_pressedNoteCount++] = note;
        }

        // Check if hotkey combination is pressed
        bool hasNote1 = false;
        bool hasNote2 = false;

        for (uint8_t i = 0; i < _pressedNoteCount; i++) {
            if (_pressedNotes[i] == _hotkeyNote1) hasNote1 = true;
            if (_pressedNotes[i] == _hotkeyNote2) hasNote2 = true;
        }

        if (hasNote1 && hasNote2) {
            _hotkeyCallback(_hotkeyNote1, _hotkeyNote2);
        }
    } else {
        // Remove note from pressed list
        for (uint8_t i = 0; i < _pressedNoteCount; i++) {
            if (_pressedNotes[i] == note) {
                // Shift remaining notes
                for (uint8_t j = i; j < _pressedNoteCount - 1; j++) {
                    _pressedNotes[j] = _pressedNotes[j + 1];
                }
                _pressedNoteCount--;
                break;
            }
        }
    }
}
