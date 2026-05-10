#!/bin/bash
set -euo pipefail

# HomeCore Nexus - Production Deployment Script
# Designed for Orange Pi (Debian/Armbian)

echo "================================================="
echo "🚀 Starting HomeCore Nexus Deployment"
echo "================================================="

# 1. Verify Directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the repository root (e.g., ~/homecore/SmartHome_VAK)"
    exit 1
fi

echo "✅ Verified repository root."

# 2. Pull Updates
echo "🔄 Fetching latest code from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✅ Code updated to latest origin/main."

# 3. Build Backend
echo "🏗️ Building Backend..."
cd backend
npm install
npm run build
cd ..
echo "✅ Backend build complete."

# 4. Build Frontend
echo "🏗️ Building Frontend..."
cd frontend
# Using legacy peer deps and dev include to prevent build failures on Orange Pi
npm install --legacy-peer-deps --include=dev
npm run build
cd ..
echo "✅ Frontend build complete."

# 5. Restart Services
echo "🔄 Restarting Systemd Services..."
sudo systemctl restart homecore-backend
sudo systemctl restart homecore-frontend
echo "✅ Services restarted."

# 6. Check Status
echo "📊 Checking Service Status..."
sleep 2 # Give services a moment to spin up

if systemctl is-active --quiet homecore-backend; then
    echo "✅ Backend is RUNNING"
else
    echo "❌ Backend FAILED to start. Check logs: sudo journalctl -u homecore-backend -n 50"
fi

if systemctl is-active --quiet homecore-frontend; then
    echo "✅ Frontend is RUNNING"
else
    echo "❌ Frontend FAILED to start. Check logs: sudo journalctl -u homecore-frontend -n 50"
fi

echo "================================================="
echo "🎉 Deployment Completed Successfully!"
echo "================================================="
echo "🌐 Local LAN:   http://192.168.0.103:3000"
echo "🌐 Tailscale:   http://100.90.90.69:3000"
echo "================================================="
