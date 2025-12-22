/*
 * USB Host Helper for ESP32-S3
 * Based on PianoLux ESP32 implementation
 * Original: https://github.com/serifpersia/pianolux-esp32
 *
 * MIT License - Copyright (c) 2021 touchgadgetdev@gmail.com
 */

#ifndef USBHHELP_HPP
#define USBHHELP_HPP

#include <Arduino.h>
#include <usb/usb_host.h>
#include "config.h"

#if USE_USB_MIDI

// Timeout values for USB host events
const TickType_t HOST_EVENT_TIMEOUT = 1;
const TickType_t CLIENT_EVENT_TIMEOUT = 1;

// USB Host handles (global)
extern usb_host_client_handle_t Client_Handle;
extern usb_device_handle_t Device_Handle;

// Callback type for USB device enumeration
typedef void (*usb_host_enum_cb_t)(const usb_config_desc_t *config_desc);

// Internal callback storage
static usb_host_enum_cb_t _USB_host_enumerate = nullptr;

/**
 * Client event callback - handles USB device connect/disconnect
 */
void _client_event_callback(const usb_host_client_event_msg_t *event_msg, void *arg) {
    esp_err_t err;

    switch (event_msg->event) {
        case USB_HOST_CLIENT_EVENT_NEW_DEV:
            DEBUG_PRINTLN("USB: New device detected");

            err = usb_host_device_open(Client_Handle, event_msg->new_dev.address, &Device_Handle);
            if (err != ESP_OK) {
                DEBUG_PRINTF("USB: device_open failed: 0x%x\n", err);
                return;
            }

            // Get device info
            usb_device_info_t dev_info;
            err = usb_host_device_info(Device_Handle, &dev_info);
            if (err == ESP_OK) {
                DEBUG_PRINTF("USB: Device speed: %s\n",
                    dev_info.speed == USB_SPEED_LOW ? "LOW" :
                    dev_info.speed == USB_SPEED_FULL ? "FULL" : "HIGH");
            }

            // Get device descriptor
            const usb_device_desc_t *dev_desc;
            err = usb_host_get_device_descriptor(Device_Handle, &dev_desc);
            if (err == ESP_OK) {
                DEBUG_PRINTF("USB: VID=0x%04X PID=0x%04X\n",
                    dev_desc->idVendor, dev_desc->idProduct);
            }

            // Get configuration descriptor and enumerate
            const usb_config_desc_t *config_desc;
            err = usb_host_get_active_config_descriptor(Device_Handle, &config_desc);
            if (err == ESP_OK && _USB_host_enumerate) {
                (*_USB_host_enumerate)(config_desc);
            }
            break;

        case USB_HOST_CLIENT_EVENT_DEV_GONE:
            DEBUG_PRINTLN("USB: Device disconnected");
            // Device handle cleanup should be done in the MIDI handler
            break;

        default:
            DEBUG_PRINTF("USB: Unknown event %d\n", event_msg->event);
            break;
    }
}

/**
 * Initialize USB Host stack
 * @param enumeration_cb Callback for device enumeration
 */
void usbh_setup(usb_host_enum_cb_t enumeration_cb) {
    DEBUG_PRINTLN("USB Host: Initializing...");

    // Install USB Host Library
    const usb_host_config_t config = {
        .skip_phy_setup = false,
        .intr_flags = ESP_INTR_FLAG_LEVEL1,
    };

    esp_err_t err = usb_host_install(&config);
    if (err != ESP_OK) {
        DEBUG_PRINTF("USB Host: install failed: 0x%x\n", err);
        return;
    }

    // Register USB Host Client
    const usb_host_client_config_t client_config = {
        .is_synchronous = false,
        .max_num_event_msg = 5,
        .async = {
            .client_event_callback = _client_event_callback,
            .callback_arg = NULL
        }
    };

    err = usb_host_client_register(&client_config, &Client_Handle);
    if (err != ESP_OK) {
        DEBUG_PRINTF("USB Host: client_register failed: 0x%x\n", err);
        return;
    }

    _USB_host_enumerate = enumeration_cb;
    DEBUG_PRINTLN("USB Host: Initialized OK");
}

/**
 * Process USB Host events - call this in loop()
 */
void usbh_task(void) {
    uint32_t event_flags;

    // Handle library events
    esp_err_t err = usb_host_lib_handle_events(HOST_EVENT_TIMEOUT, &event_flags);
    if (err == ESP_OK) {
        if (event_flags & USB_HOST_LIB_EVENT_FLAGS_NO_CLIENTS) {
            // All clients gone
        }
        if (event_flags & USB_HOST_LIB_EVENT_FLAGS_ALL_FREE) {
            // All devices freed
        }
    }

    // Handle client events
    if (Client_Handle != NULL) {
        err = usb_host_client_handle_events(Client_Handle, CLIENT_EVENT_TIMEOUT);
        // Ignore timeout errors
    }
}

#endif // USE_USB_MIDI
#endif // USBHHELP_HPP
