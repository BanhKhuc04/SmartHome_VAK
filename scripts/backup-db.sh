#!/bin/bash
set -euo pipefail

# HomeCore Nexus - SQLite Database Backup Script
# Creates a timestamped copy of the database.

BACKUP_DIR="$HOME/homecore/backups"
DB_SOURCE="backend/data/homecore-nexus.db"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="$BACKUP_DIR/homecore-nexus-$TIMESTAMP.db"

echo "================================================="
echo "💾 HomeCore Nexus DB Backup"
echo "================================================="

# 1. Verify source database exists
if [ ! -f "$DB_SOURCE" ]; then
    echo "❌ Error: Source database not found at $DB_SOURCE"
    echo "Make sure you are running this script from the repository root."
    exit 1
fi

# 2. Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# 3. Perform backup
echo "🔄 Copying database..."
cp "$DB_SOURCE" "$BACKUP_FILE"

# 4. Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "📁 Location: $BACKUP_FILE"
    echo "📏 Size:     $SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "-------------------------------------------------"
echo "🔄 HOW TO RESTORE (Manual step):"
echo "1. Stop the backend:  sudo systemctl stop homecore-backend"
echo "2. Copy the backup:   cp $BACKUP_FILE $DB_SOURCE"
echo "3. Start the backend: sudo systemctl start homecore-backend"
echo "-------------------------------------------------"
