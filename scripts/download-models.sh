#!/bin/bash
# Script para descargar/copiar los modelos necesarios
# YOLOv11 y DocRes (opcional)

set -e

MODELS_DIR="./services/yolo/models"
YOLO_MODEL="$MODELS_DIR/yoloe-26n-seg.pt"
DOCRES_MODEL="$MODELS_DIR/docres.pt"

echo "📥 Descargando modelos de visión..."

# Crear directorio
mkdir -p "$MODELS_DIR"

# Descargar YOLOv11 usando Python
if [ ! -f "$YOLO_MODEL" ]; then
    echo "⏬ Descargando YOLOv11 segmentation model..."
    python3 << EOF
from ultralytics import YOLO
import shutil
from pathlib import Path

# Esto descarga automáticamente el modelo
model = YOLO('yolov26l-seg.pt')

# Encontrar donde se descargó
home = Path.home()
downloaded = list(home.glob('**/yolov26l-seg.pt'))
if downloaded:
    # Copiar al directorio de modelos
    shutil.copy(downloaded[0], '$YOLO_MODEL')
    print('✅ YOLOv11 descargado y copiado')
else:
    print('⚠️  No se encontró el archivo descargado')
    print('   Descárgalo manualmente de: https://github.com/ultralytics/assets/releases')
EOF
else
    echo "✅ YOLOv11 ya existe"
fi

# DocRes is deprecated and optional; the system works without it using OpenCV fallbacks
echo ""
echo "⚠️ DocRes support is deprecated and not required. If you still need it, place docres.pt at $DOCRES_MODEL (unsupported)."

echo ""
echo "📊 Modelos en $MODELS_DIR:"
ls -lh "$MODELS_DIR" || true
