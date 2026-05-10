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
#define DEVICE_ID "pc_relay_01"
#define DEVICE_NAME "PC Server Power Relay"
#define DEVICE_TYPE "pc-control" 

// JSON array of strings for capabilities
#define DEVICE_CAPABILITIES "[\"relay\", \"pulse\", \"on\", \"off\"]"

// ==========================================
// FEATURES CONFIGURATION
// ==========================================

// --- RELAY FEATURE ---
#define ENABLE_RELAY true
#define RELAY_PIN 5 // D1 on Wemos/NodeMCU
#define RELAY_ACTIVE_LOW true // Set true if relay module turns ON when pin is LOW
#define PULSE_MS 500 // Duration of the pulse command in milliseconds
#define PULSE_COOLDOWN_MS 3000 // Prevent rapid pulsing

// --- SENSOR FEATURE (DHT) ---
#define ENABLE_DHT false
#define DHT_PIN 4 
#define DHT_TYPE DHT22 

// --- SENSOR FEATURE (BME280) ---
#define ENABLE_BME280 false

// --- TELEMETRY ---
#define TELEMETRY_INTERVAL_MS 60000 // How often to publish telemetry (60s)
