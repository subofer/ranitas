#!/bin/bash
# Script de inicialización para el contenedor de visión
# Descarga automáticamente los modelos necesarios si no existen

set -e

MODELS_DIR="/app/models"
YOLO_MODEL="${MODELS_DIR}/yolo11n-seg.pt"
DOCRES_MODEL="${MODELS_DIR}/docres.pt"

echo "🚀 Iniciando servicio de visión..."

# Crear directorio de modelos si no existe
mkdir -p "${MODELS_DIR}"

# Descargar YOLOv11 si no existe
if [ ! -f "${YOLO_MODEL}" ]; then
    echo "📥 Descargando modelo YOLOv11..."
    python -c "
from ultralytics import YOLO
import shutil
model = YOLO('yolo11n-seg.pt')  # Esto descarga automáticamente
# Mover al directorio correcto
import os
from pathlib import Path
home = Path.home()
downloaded = list(home.glob('**/yolo11n-seg.pt'))
if downloaded:
    shutil.copy(downloaded[0], '${YOLO_MODEL}')
    print('✅ YOLOv11 descargado')
"
else
    echo "✅ YOLOv11 ya existe"
fi

# Verificar DocRes (opcional)
if [ ! -f "${DOCRES_MODEL}" ]; then
    echo "⚠️  Modelo DocRes no encontrado en ${DOCRES_MODEL}"
    echo "   El servicio funcionará sin restauración avanzada de documentos."
    echo "   Para habilitarla, coloca el archivo docres.pt en ./services/yolo/models/"
else
    echo "✅ DocRes disponible"
fi

echo "🔍 Verificando GPU..."
python -c "
import torch
if torch.cuda.is_available():
    print(f'✅ GPU detectada: {torch.cuda.get_device_name(0)}')
    print(f'   Memoria total: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB')
else:
    print('⚠️  GPU no detectada, usando CPU')
"

# If DocRes model exists, attempt a direct pre-warm of the model inside the container
if [ -f "${DOCRES_MODEL}" ]; then
  echo "⏱ Pre-warming DocRes model (if available)"
  python - <<PY || true
try:
    import time
    from detect_corners import get_docres_model
    t0 = time.time()
    m = get_docres_model()
    t1 = time.time()
    print('DocRes pre-warm: loaded=', bool(m), 'took_ms=', int((t1-t0)*1000))
except Exception as e:
    print('DocRes pre-warm failed:', e)
PY
else
  echo "⚠️  DocRes model not found, skipping pre-warm"
fi

echo "🎯 Iniciando servidor FastAPI..."
exec uvicorn detect_corners:app --host 0.0.0.0 --port 8000 --workers 1
