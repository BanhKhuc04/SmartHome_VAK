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
#define DEVICE_ID "temp_room_01"
#define DEVICE_NAME "Room Temperature Sensor"
#define DEVICE_TYPE "sensor" 

// JSON array of strings for capabilities
#define DEVICE_CAPABILITIES "[\"temperature\", \"humidity\", \"rssi\"]"

// ==========================================
// FEATURES CONFIGURATION
// ==========================================

// --- RELAY FEATURE ---
#define ENABLE_RELAY false
#define RELAY_PIN 5
#define RELAY_ACTIVE_LOW true
#define PULSE_MS 500
#define PULSE_COOLDOWN_MS 3000

// --- SENSOR FEATURE (DHT) ---
#define ENABLE_DHT true
#define DHT_PIN 4 // D2 on Wemos/NodeMCU
#define DHT_TYPE DHT22 // DHT11, DHT22, DHT21

// --- SENSOR FEATURE (BME280) ---
#define ENABLE_BME280 false

// --- TELEMETRY ---
#define TELEMETRY_INTERVAL_MS 60000 // Publish every 60s
