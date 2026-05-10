# HomeCore Nexus - Operations Guide

This guide contains the essential commands and workflows for managing the HomeCore Nexus production environment on your Orange Pi (Debian/Armbian).

---

## 🌐 URLs & Endpoints

| Service | Address |
|---|---|
| **LAN Frontend** | `http://192.168.0.103:3000` |
| **Tailscale Frontend** | `http://100.90.90.69:3000` |
| **LAN Backend API** | `http://192.168.0.103:5000` |
| **Pi-hole Admin** | `http://192.168.0.103/admin` |

---

## ⚙️ Core Services Management

The system relies on three primary `systemd` services:
- `homecore-backend` (Node.js API & WebSockets)
- `homecore-frontend` (Vite/React web server)
- `mosquitto` (MQTT Broker)

**Check Status:**
```bash
sudo systemctl status homecore-backend
sudo systemctl status homecore-frontend
sudo systemctl status mosquitto
```

**Restart Services:**
```bash
sudo systemctl restart homecore-backend
sudo systemctl restart homecore-frontend
sudo systemctl restart mosquitto
```

**View Live Logs:**
```bash
# Backend logs (API, WebSocket, DB queries)
sudo journalctl -fu homecore-backend

# Frontend logs (HTTP traffic)
sudo journalctl -fu homecore-frontend

# Mosquitto MQTT logs
sudo journalctl -fu mosquitto
```

---

## 🚀 Deployment Workflow

To pull the latest code from GitHub and re-build the production environment, run the automated deployment script from the repository root:

```bash
cd ~/homecore/SmartHome_VAK
./scripts/deploy-orange-pi.sh
```

> **Note:** This script performs a `git reset --hard origin/main`, builds both backend and frontend, and restarts the services.

---

## 💾 Database Backup & Restore

### Backup
Run the backup script to safely copy the SQLite database with a timestamp.
```bash
./scripts/backup-db.sh
```
*Backups are saved to `~/homecore/backups/`.*

### Manual Restore
If you need to roll back to a previous database state:
1. Stop the backend: `sudo systemctl stop homecore-backend`
2. Overwrite the live DB: `cp ~/homecore/backups/homecore-nexus-YYYYMMDD-HHMMSS.db backend/data/homecore-nexus.db`
3. Start the backend: `sudo systemctl start homecore-backend`

---

## 📡 MQTT Testing

*Note: Replace `<password>` with your actual MQTT password.*

### 1. Test Broker Connectivity
Run the test script to publish a safe ping message:
```bash
./scripts/test-mqtt.sh
```

### 2. Test PC Relay Module (`pc_relay_01`)
```bash
mosquitto_pub -h 127.0.0.1 -u mqtt_admin -P '<password>' -t 'homelab/device/pc_relay_01/cmd' -m 'pulse'
```

### 3. Test Room Sensor Telemetry (`temp_room_01`)
```bash
mosquitto_pub -h 127.0.0.1 -u mqtt_admin -P '<password>' -t 'homelab/device/temp_room_01/telemetry' -m '{"temperature":25.5,"humidity":60,"rssi":-55}'
```

### 4. Force Discovery
```bash
mosquitto_pub -h 127.0.0.1 -u mqtt_admin -P '<password>' -t 'homelab/device/pc_relay_01/cmd' -m 'discovery'
```

---

## 🩺 Health Check

Run the health check script to quickly verify that all ports, services, and local APIs are responding:
```bash
./scripts/health-check.sh
```

---

## 🛠 Troubleshooting Common Issues

### 1. Frontend is up, but Login fails (Network/CORS)
- **Cause:** The frontend is trying to reach the backend, but the API URL is resolving incorrectly over LAN/Tailscale, or the backend is down.
- **Fix:** Check backend status (`sudo systemctl status homecore-backend`). Verify that the client device has network access to port 5000.

### 2. Backend cannot connect to MQTT
- **Cause:** Mosquitto is down or the password in `backend/.env` is incorrect.
- **Fix:** Check mosquitto status (`sudo systemctl status mosquitto`). Look at the backend logs (`journalctl -u homecore-backend -n 50`) for `MQTT connection refused` errors. Verify credentials.

### 3. GitHub cannot resolve (Deploy script fails)
- **Cause:** DNS failure on the Orange Pi, often caused by Tailscale overwriting `/etc/resolv.conf`.
- **Fix:** Restart the systemd-resolved service or temporarily add `nameserver 8.8.8.8` to `/etc/resolv.conf`.

### 4. Ports 3000 or 5000 are already in use
- **Cause:** An old node process crashed and didn't release the port.
- **Fix:** Find the zombie process using `sudo netstat -tulpn | grep :3000` or `grep :5000`, and kill it (`sudo kill -9 <PID>`). Then restart the service.

### 5. Frontend Build Fails (NPM Peer Dependencies)
- **Cause:** React dependency conflicts during `npm install`.
- **Fix:** The `deploy-orange-pi.sh` script automatically handles this by appending `--legacy-peer-deps --include=dev`. If running manually, ensure you use those flags.

### 6. Orange Pi Freezes/Crashes during Build (Out of RAM)
- **Cause:** Compiling Vite/TypeScript can exhaust the 1GB RAM on smaller SBCs.
- **Fix:** Ensure a swap file is active.
  ```bash
  free -h  # Check swap space
  ```
  If no swap exists, create a 2GB swapfile:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```
