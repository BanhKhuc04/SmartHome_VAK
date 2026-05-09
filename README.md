# HomeCore Nexus Control Center

HomeCore Nexus là control center module-based chạy trên Orange Pi One để quản lý ESP8266 modules qua MQTT. Repo này giữ UI dark/glassmorphism hiện đại, nhưng domain đã được thu gọn về mô hình `device_id` thay vì smart-home nhiều phòng.

## Mục tiêu triển khai

- Orange Pi One chạy backend Express + SQLite + WebSocket 24/7
- Mosquitto chạy native tại `mqtt://127.0.0.1:1883`
- Pi-hole chạy native tại `http://192.168.0.103/admin`
- ESP8266 firmware giữ nguyên contract hiện tại
  - command topic: `homelab/device/pc_relay_01/cmd`
  - payload command: `pulse`, `on`, `off`

## Kiến trúc

```text
Frontend static build  ->  Nginx / file server
                               |
Browser  <->  Express API + WS + SQLite  <->  Mosquitto native  <->  ESP8266 modules
                               |
                           Pi-hole native (linked from UI)
```

## MQTT contract

### Command

- Topic: `homelab/device/<device_id>/cmd`
- Payload raw string:
  - `pulse`
  - `on`
  - `off`

### Backend subscriptions

- `homelab/device/+/status`
- `homelab/device/+/state`
- `homelab/device/+/telemetry`

## API chính

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Modules

- `GET /api/devices`
- `POST /api/devices`
- `GET /api/devices/:id`
- `PATCH /api/devices/:id`
- `DELETE /api/devices/:id`
- `POST /api/devices/:id/command`

### Runtime

- `GET /api/logs`
- `GET /api/system/health`
- `GET /api/automations`
- `POST /api/automations`
- `PATCH /api/automations/:id`
- `DELETE /api/automations/:id`

## Module seed mặc định

Backend tự seed một module:

- `device_id`: `pc_relay_01`
- `name`: `PC Server Power Relay`
- `type`: `pc-control`
- `cmd_topic`: `homelab/device/pc_relay_01/cmd`
- `state_topic`: `homelab/device/pc_relay_01/state`
- `status_topic`: `homelab/device/pc_relay_01/status`
- `telemetry_topic`: `homelab/device/pc_relay_01/telemetry`

Tài khoản seed mặc định:

- `admin / admin123`

## Development

### Backend

```bash
cd backend
npm install
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

Nếu cần dev server cục bộ:

```bash
cd frontend
npm run dev
```

## Deploy trên Orange Pi One

### 1. Chuẩn bị hệ thống

- Cài Node.js LTS
- Đảm bảo Mosquitto native đang chạy trên `127.0.0.1:1883`
- Đảm bảo Pi-hole native đang chạy trên `http://192.168.0.103/admin`

### 2. Clone và cài dependencies

```bash
git clone <repo-url> homecore-nexus
cd homecore-nexus

cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build
```

### 3. Cấu hình backend

Tạo hoặc chỉnh `backend/.env`:

```env
PORT=5000
NODE_ENV=production
CORS_ORIGIN=http://<orange-pi-ip>
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MQTT_TOPIC_ROOT=homelab/device
WS_PATH=/ws
JWT_SECRET=<strong-random-secret>
PIHOLE_URL=http://192.168.0.103/admin
```

Nếu muốn đổi đường dẫn DB:

```env
DB_PATH=/opt/homecore-nexus/data/homecore-nexus.db
```

### 4. Chạy backend bằng systemd

Tạo file `/etc/systemd/system/homecore-nexus-backend.service`:

```ini
[Unit]
Description=HomeCore Nexus Backend
After=network.target mosquitto.service
Wants=mosquitto.service

[Service]
Type=simple
User=orangepi
WorkingDirectory=/opt/homecore-nexus/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/homecore-nexus/backend/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Reload và bật service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable homecore-nexus-backend
sudo systemctl start homecore-nexus-backend
sudo systemctl status homecore-nexus-backend
```

### 5. Serve frontend static

Frontend build output nằm tại `frontend/dist`.

Có thể dùng Nginx:

```nginx
server {
    listen 80;
    server_name _;

    root /opt/homecore-nexus/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

Nếu frontend và backend khác origin, nhớ đặt `CORS_ORIGIN` đúng với URL frontend.

## Notes vận hành

- Không dùng Docker Compose để chạy Mosquitto trong target Orange Pi này.
- Backend production dùng `node dist/index.js`, không dùng `tsx`, `ts-node`, hay Vite dev server.
- Frontend command UI luôn yêu cầu confirm trước khi publish `pulse/on/off`.
- UI realtime qua WebSocket, nhưng source of truth vẫn là event từ backend/MQTT.

## Build gate

Sau mỗi phase refactor cần pass:

```bash
cd backend && npm run build
cd frontend && npm run build
```
