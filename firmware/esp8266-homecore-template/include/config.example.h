#pragma once
#include <Arduino.h>

// ==========================================
// WIFI SETTINGS
// ==========================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ==========================================
// MQTT SETTINGS
// ==========================================
#define MQTT_HOST "192.168.0.103"
#define MQTT_PORT 1883
#define MQTT_USER "mqtt_admin"
#define MQTT_PASS "YOUR_MQTT_PASSWORD"

// ==========================================
// DEVICE IDENTITY (Discovery Payload)
// ==========================================
#define DEVICE_ID "custom_node_01"
#define DEVICE_NAME "Custom Node"
#define DEVICE_TYPE "custom" // Use: relay, pc-control, sensor, button, display, light, fan, custom

// JSON array of strings for capabilities, e.g. "[\"relay\", \"pulse\", \"on\", \"off\"]" or "[\"temperature\", \"humidity\", \"rssi\"]"
#define DEVICE_CAPABILITIES "[]"

// ==========================================
// FEATURES CONFIGURATION
// ==========================================

// --- RELAY FEATURE ---
#define ENABLE_RELAY false
#define RELAY_PIN 5 // D1 on Wemos/NodeMCU
#define RELAY_ACTIVE_LOW true // Set true if relay module turns ON when pin is LOW
#define PULSE_MS 500 // Duration of the pulse command in milliseconds
#define PULSE_COOLDOWN_MS 3000 // Prevent rapid pulsing

// --- SENSOR FEATURE (DHT) ---
#define ENABLE_DHT false
#define DHT_PIN 4 // D2 on Wemos/NodeMCU
#define DHT_TYPE DHT22 // DHT11, DHT22, DHT21

// --- SENSOR FEATURE (BME280) ---
#define ENABLE_BME280 false
// BME280 uses default I2C pins (D2/SDA, D1/SCL on Wemos/NodeMCU)

// --- TELEMETRY ---
#define TELEMETRY_INTERVAL_MS 60000 // How often to publish telemetry (60s)
