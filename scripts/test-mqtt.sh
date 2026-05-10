#!/bin/bash
set -euo pipefail

# HomeCore Nexus - MQTT Test Script
# Safely tests MQTT connectivity without triggering production relays.

TOPIC="homelab/test/ping"
MESSAGE="HomeCore MQTT test: $(date)"

echo "================================================="
echo "📡 MQTT Publish Test"
echo "================================================="
echo "Topic:   $TOPIC"
echo "Message: $MESSAGE"
echo "-------------------------------------------------"

# Check if mosquitto_pub is installed
if ! command -v mosquitto_pub >/dev/null 2>&1; then
    echo "❌ Error: mosquitto-clients package is not installed."
    echo "Run: sudo apt install mosquitto-clients"
    exit 1
fi

# Publish the message
mosquitto_pub -h 127.0.0.1 -u mqtt_admin -P '120605' -t "$TOPIC" -m "$MESSAGE"

echo "✅ Message published successfully."
echo ""
echo "-------------------------------------------------"
echo "🎧 HOW TO LISTEN (Run in a separate terminal):"
echo "mosquitto_sub -h 127.0.0.1 -u mqtt_admin -P '120605' -t '$TOPIC' -v"
echo "-------------------------------------------------"
