#!/bin/bash
set -u

# HomeCore Nexus - System Health Check

echo "================================================="
echo "🏥 HomeCore Nexus Health Check"
echo "================================================="

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo "✅ [Service] $service is RUNNING"
    else
        echo "❌ [Service] $service is OFFLINE"
    fi
}

check_port() {
    local port=$1
    local name=$2
    if ss -tuln | grep -q ":$port "; then
        echo "✅ [Port]    $port ($name) is LISTENING"
    else
        echo "❌ [Port]    $port ($name) is NOT LISTENING"
    fi
}

check_http() {
    local url=$1
    local name=$2
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url")
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 401 ] || [ "$http_code" -eq 404 ]; then
        echo "✅ [HTTP]    $name responded ($http_code)"
    else
        echo "❌ [HTTP]    $name failed (Code: $http_code)"
    fi
}

# 1. Check Systemd Services
echo "--- Services ---"
check_service "mosquitto"
check_service "homecore-backend"
check_service "homecore-frontend"
echo ""

# 2. Check Network Ports
echo "--- Ports ---"
check_port 1883 "MQTT Broker"
check_port 5000 "Backend API"
check_port 3000 "Frontend Web"
echo ""

# 3. Check HTTP Endpoints
echo "--- Web Endpoints ---"
check_http "http://127.0.0.1:3000" "Frontend Local"
check_http "http://127.0.0.1:5000/api/system/health" "Backend API"
echo ""

# 4. Check MQTT Local Connectivity
echo "--- MQTT Connectivity ---"
if command -v mosquitto_pub >/dev/null 2>&1; then
    # We do a fast publish. If mosquitto_pub returns 0, the broker accepted the connection.
    if timeout 3 mosquitto_pub -h 127.0.0.1 -u mqtt_admin -P '120605' -t 'homelab/test/health' -m 'ping' >/dev/null 2>&1; then
        echo "✅ [MQTT]    Local broker accepted publish"
    else
        echo "❌ [MQTT]    Local broker rejected publish (Auth/Network issue)"
    fi
else
    echo "⚠️ [MQTT]    mosquitto_pub not installed, skipping MQTT test."
fi

echo "================================================="
echo "🏁 Health Check Complete."
echo "================================================="
