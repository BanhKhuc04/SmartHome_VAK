# 🏠 Home Smart - IoT Dashboard

Hệ thống web dashboard IoT chuyên nghiệp để điều khiển và quản lý các thiết bị ESP8266.

## ✨ Tính năng

- **Dashboard** hiển thị tổng quan hệ thống
- **Điều khiển relay** bật/tắt từ xa qua MQTT
- **Biểu đồ cảm biến** real-time (nhiệt độ, độ ẩm, ánh sáng, khí gas)
- **WebSocket** cập nhật dữ liệu theo thời gian thực
- **Responsive** hoạt động tốt trên mobile và desktop
- **Dark theme** với glassmorphism UI

## 🏗️ Kiến trúc

```
Frontend (React + Vite)  ←→  Backend (Express + WS)  ←→  MQTT Broker  ←→  ESP8266
```

## 🚀 Chạy Development

### Cài đặt dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Chạy MQTT Broker (cần Docker)

```bash
docker run -d --name mosquitto -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2
```

### Chạy Backend

```bash
cd backend
cp .env.example .env    # Chỉnh sửa nếu cần
npm run dev
```

### Chạy Frontend

```bash
cd frontend
cp .env.example .env    # Chỉnh sửa nếu cần
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

## 🐳 Deploy Production (Docker)

### Sử dụng Docker Compose

```bash
# Build và chạy tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

**Truy cập:** http://localhost:3000

## 📦 Deploy trên CasaOS

### Bước 1: Upload project

```bash
# SSH vào server CasaOS
scp -r "Home Smart" user@casaos-ip:/DATA/AppData/home-smart
```

### Bước 2: Cài đặt qua CasaOS App Store

1. Mở CasaOS dashboard
2. Vào **App Store** → **Custom Install**
3. Chọn **Docker Compose** và paste nội dung `docker-compose.yml`
4. Hoặc SSH vào server và chạy:

```bash
cd /DATA/AppData/home-smart
docker-compose up -d --build
```

### Bước 3: Cấu hình

Chỉnh sửa file `.env` để thay đổi port hoặc cấu hình MQTT:

```env
FRONTEND_PORT=3000
BACKEND_PORT=4000
MQTT_PORT=1883
```

### Bước 4: Truy cập

Mở trình duyệt: `http://<casaos-ip>:3000`

## 📁 Cấu trúc thư mục

```
Home Smart/
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── app/            # App entry, providers
│   │   ├── features/       # Feature modules
│   │   │   ├── dashboard/  # Dashboard page
│   │   │   ├── devices/    # Device card, relay control
│   │   │   └── sensors/    # Sensor charts
│   │   ├── shared/         # Shared components, hooks, services
│   │   └── styles/         # Design system
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/         # Environment config
│   │   ├── features/       # Device & sensor modules
│   │   ├── services/       # MQTT & WebSocket
│   │   └── middleware/     # Express middleware
│   └── Dockerfile
├── mosquitto/              # MQTT broker config
├── docker-compose.yml
└── .env
```

## 🔮 Mở rộng trong tương lai

- 🔐 Authentication (JWT)
- 📱 Multi-device management
- 📅 Scheduling & automation rules
- 📊 Data logging (SQLite/PostgreSQL)
- 🔄 OTA firmware updates
- 📧 Alert notifications (Email/Telegram)

## 📜 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/devices` | Lấy danh sách thiết bị |
| GET | `/api/devices/:id` | Lấy thông tin thiết bị |
| POST | `/api/devices/:id/relay` | Bật/tắt relay |
| GET | `/api/sensors/:deviceId/data` | Lấy dữ liệu cảm biến |
| GET | `/api/health` | Health check |

## 📡 MQTT Topics

| Topic | Hướng | Mô tả |
|-------|-------|--------|
| `home-smart/{deviceId}/sensors/{sensorId}` | ESP → Server | Dữ liệu cảm biến |
| `home-smart/{deviceId}/relay/command` | Server → ESP | Lệnh điều khiển relay |
| `home-smart/{deviceId}/relay/state` | ESP → Server | Trạng thái relay |
| `home-smart/{deviceId}/status` | ESP → Server | Online/Offline |
