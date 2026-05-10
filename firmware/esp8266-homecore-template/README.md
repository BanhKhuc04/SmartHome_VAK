# ESP8266 HomeCore Nexus Template

This is the standard firmware template for integrating ESP8266 devices into HomeCore Nexus. It supports Relays (with pulsing), DHT Temperature/Humidity sensors, and generic telemetry tracking, all via MQTT.

## ⚠️ High Voltage Warning

**DANGER:** If you are using relays to switch mains voltage (110V/220V AC), ensure you know exactly what you are doing. Always disconnect the power before modifying wiring. Exposed mains connections can be lethal. HomeCore Nexus and this firmware are provided without warranty. Use at your own risk.

## 🚀 Quick Start

1. **Install PlatformIO** in VS Code.
2. Open this folder (`firmware/esp8266-homecore-template`) in VS Code.
3. **Copy Configuration:**
   Copy the `include/config.example.h` file and name it `config.h`. 
   > *Note: `config.h` is git-ignored, ensuring you never accidentally commit your Wi-Fi and MQTT passwords to the repository.*
4. **Edit `config.h`:**
   - Set your `WIFI_SSID` and `WIFI_PASSWORD`.
   - Set your `MQTT_HOST`, `MQTT_USER`, and `MQTT_PASS`.
   - Update your `DEVICE_ID`, `DEVICE_NAME`, and `DEVICE_TYPE`.
   - Enable/disable features (e.g., `ENABLE_RELAY`, `ENABLE_DHT`).
5. **Flash the Firmware:**
   Use the PlatformIO "Upload" task to compile and flash the firmware to your ESP8266.

## 🔌 Wiring Notes

### Relay Module
- Connect the relay signal pin to the `RELAY_PIN` defined in your config (default `D1` / GPIO 5).
- Ensure your relay module receives adequate power (some 5V relays struggle if powered directly from the 3.3V ESP pin; use the `VIN` or `5V` pin if USB powered).
- Adjust `RELAY_ACTIVE_LOW` in the config based on whether your relay triggers on a LOW or HIGH signal.

### DHT Sensor (DHT11/DHT22)
- Connect the data pin to the `DHT_PIN` defined in your config (default `D2` / GPIO 4).
- Add a 10K pull-up resistor between the Data pin and 3.3V if your module does not have one built-in.

## 🕵️‍♂️ Monitoring & Testing

### Serial Monitor
You can view the device logs by clicking the "Serial Monitor" (plug icon) in PlatformIO. You should see:
- `WiFi connecting...` / `WiFi connected`
- `MQTT connecting...` / `MQTT connected`
- `Discovery published.`

### Testing MQTT Topics

You can use `mosquitto_sub` and `mosquitto_pub` from your terminal to interact with the device.

**Monitor all device traffic:**
```bash
mosquitto_sub -h 192.168.0.103 -u mqtt_admin -P '120605' -t 'homelab/device/+/#' -v
```

**Send a relay pulse command (Example for pc_relay_01):**
```bash
mosquitto_pub -h 192.168.0.103 -u mqtt_admin -P '120605' -t 'homelab/device/pc_relay_01/cmd' -m 'pulse'
```

**Request a discovery payload:**
```bash
mosquitto_pub -h 192.168.0.103 -u mqtt_admin -P '120605' -t 'homelab/device/pc_relay_01/cmd' -m 'discovery'
```

**Request immediate telemetry:**
```bash
mosquitto_pub -h 192.168.0.103 -u mqtt_admin -P '120605' -t 'homelab/device/temp_room_01/cmd' -m 'telemetry'
```

## 🌐 Approving in HomeCore Nexus

Once the device connects to MQTT, it will automatically publish a payload to `homelab/discovery`.
1. Open the **HomeCore Nexus Command Center**.
2. Go to the **Devices** tab.
3. You should see the device appear under the "Discovered Modules" section.
4. Click **Approve** to officially register the device into the database.

## 🛠 Troubleshooting

**Wi-Fi not connecting:**
- Ensure you are connecting to a 2.4GHz network. ESP8266 does not support 5GHz.
- Double-check your SSID and password in `config.h`.

**MQTT auth failed:**
- Verify the IP address of your broker.
- Ensure the `mqtt_admin` user exists and the password is correct. Check mosquitto logs for authentication errors.

**Device not discovered:**
- Ensure the device successfully connected to MQTT.
- Ensure the discovery topic matches `homelab/discovery`.
- You can manually force a discovery broadcast via the MQTT test command above.

**Telemetry not showing:**
- Telemetry publishes every 60 seconds by default.
- Verify the backend `telemetry` schema matches the JSON payload structure.
- Force a telemetry broadcast via the MQTT test command.

**Relay is inverted (turns ON when it should turn OFF):**
- Toggle the `RELAY_ACTIVE_LOW` setting in your `config.h` from `true` to `false` (or vice-versa), recompile, and flash.
