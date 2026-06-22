#!/bin/bash
# NEXUS SYNC - RESTRUTURADO

FACTORY_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FACTORY_NAME=$(basename "$FACTORY_ROOT")
LOCAL_SYNC_DIR="$FACTORY_ROOT/pipeline/sync_drive"
REMOTE_NAME="gdrive"
REMOTE_PATH="nexus_pipeline"

echo "=== Nexus Sync: Factory ($FACTORY_NAME) ==="

case "$1" in
    up)
        echo "[🚀] Enviando staging para a nuvem..."
        # Sincroniza apenas a pasta desta fábrica no staging
        rclone sync "$LOCAL_SYNC_DIR/staging/$FACTORY_NAME" "$REMOTE_NAME:$REMOTE_PATH/staging/$FACTORY_NAME" -P
        ;;
    down)
        echo "[🛸] Baixando ativos processados..."
        # Sincroniza apenas a pasta desta fábrica no audio_ready
        rclone sync "$REMOTE_NAME:$REMOTE_PATH/audio_ready/$FACTORY_NAME" "$LOCAL_SYNC_DIR/audio_ready/$FACTORY_NAME" -P
        ;;
    *)
        echo "Uso: ./sync.sh [up|down]"
        ;;
esac
