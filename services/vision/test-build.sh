#!/usr/bin/env bash
# Script de prueba para validar el build y funcionalidad del servicio ranitas-vision

set -euo pipefail

echo "======================================"
echo "Test de Build - ranitas-vision"
echo "======================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Paso 1: Verificar requisitos locales
log_info "Verificando requisitos locales..."

if [ ! -f "models/yoloe-26x-seg.pt" ]; then
  log_error "Modelo YOLO no encontrado: models/yoloe-26x-seg.pt"
  log_warn "Debes descargar el modelo antes de continuar"
  exit 1
fi

if [ ! -f "models/mobileclip2_b.ts" ]; then
  log_warn "mobileclip2_b.ts no encontrado - se descargará automáticamente en el primer uso"
fi

# Verificar directorio de ollama
mkdir -p models/ollama
log_info "✓ Directorios de modelos verificados"

# Paso 2: Build del contenedor
log_info "Iniciando build del contenedor..."
cd "$(dirname "$0")"

BUILD_START=$(date +%s)
docker build -t ranitas-vision:test . || {
  log_error "Build falló"
  exit 1
}
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

log_info "✓ Build completado en ${BUILD_TIME}s"

# Paso 3: Verificar layers de Docker
log_info "Verificando layers del contenedor..."
docker history ranitas-vision:test --no-trunc | head -20

# Paso 4: Ejecutar diagnósticos dentro del contenedor
log_info "Ejecutando diagnósticos (entrypoint.sh info)..."
docker run --rm ranitas-vision:test /app/entrypoint.sh info || {
  log_warn "Diagnósticos completados con advertencias"
}

# Paso 5: Verificar que Python y paquetes estén instalados
log_info "Verificando instalación de Python y paquetes..."
docker run --rm ranitas-vision:test python3 -c "
import sys
print(f'Python {sys.version}')
packages = ['fastapi', 'uvicorn', 'ultralytics', 'cv2', 'numpy', 'requests']
for pkg in packages:
    try:
        __import__(pkg)
        print(f'✓ {pkg}')
    except ImportError:
        print(f'✗ {pkg} - FALTA')
        sys.exit(1)
" || {
  log_error "Faltan paquetes de Python"
  exit 1
}

# Paso 6: Verificar tamaño de la imagen
log_info "Tamaño de la imagen:"
docker images ranitas-vision:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Paso 7: Verificar que los archivos estén en su lugar
log_info "Verificando archivos del servicio..."
docker run --rm ranitas-vision:test ls -lh /app/ | grep -E "\.py$|entrypoint\.sh"

log_info "✓ Archivos del servicio verificados"

# Resumen final
echo ""
echo "======================================"
log_info "Build test completado exitosamente!"
echo "======================================"
echo ""
echo "Siguiente paso:"
echo "  docker-compose up -d vision"
echo ""
echo "O para test interactivo:"
echo "  docker run --rm -it --runtime nvidia -p 8000:8000 \\"
echo "    -v \$(pwd)/models:/app/models \\"
echo "    -v \$(pwd)/models/ollama:/root/.ollama \\"
echo "    ranitas-vision:test"
echo ""
