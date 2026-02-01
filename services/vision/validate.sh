#!/usr/bin/env bash
# Validación final del servicio ranitas-vision

set -euo pipefail

echo "==================================="
echo "Validación Final - ranitas-vision"
echo "==================================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}✓${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }
log_info() { echo -e "${YELLOW}ℹ${NC} $*"; }

ERRORS=0

# 1. Verificar que la imagen existe
if docker images -q ranitas-vision:test >/dev/null 2>&1; then
  log_ok "Imagen Docker construida"
else
  log_error "Imagen Docker no encontrada"
  ERRORS=$((ERRORS + 1))
fi

# 2. Verificar estructura de archivos en la imagen
log_info "Verificando archivos en la imagen..."
EXPECTED_FILES=(
  "/app/main.py"
  "/app/entrypoint.sh"
  "/app/state.py"
  "/app/audit.py"
  "/app/routes_crop.py"
  "/app/routes_status.py"
  "/app/routes_analyze.py"
  "/app/requirements.txt"
)

for file in "${EXPECTED_FILES[@]}"; do
  if docker run --rm ranitas-vision:test test -f "$file"; then
    log_ok "$file existe"
  else
    log_error "$file NO ENCONTRADO"
    ERRORS=$((ERRORS + 1))
  fi
done

# 3. Verificar que entrypoint.sh es ejecutable
if docker run --rm ranitas-vision:test test -x /app/entrypoint.sh; then
  log_ok "entrypoint.sh es ejecutable"
else
  log_error "entrypoint.sh NO es ejecutable"
  ERRORS=$((ERRORS + 1))
fi

# 4. Verificar imports de Python
log_info "Verificando imports de Python..."
PYTHON_IMPORTS=(
  "fastapi"
  "uvicorn"
  "ultralytics"
  "cv2"
  "numpy"
  "requests"
  "pynvml"
)

for pkg in "${PYTHON_IMPORTS[@]}"; do
  if docker run --rm ranitas-vision:test python3 -c "import $pkg" 2>/dev/null; then
    log_ok "import $pkg"
  else
    log_error "import $pkg FALLÓ"
    ERRORS=$((ERRORS + 1))
  fi
done

# 5. Verificar que Ollama está instalado
if docker run --rm ranitas-vision:test which ollama >/dev/null 2>&1; then
  log_ok "Ollama binario instalado"
else
  log_error "Ollama NO instalado"
  ERRORS=$((ERRORS + 1))
fi

# 6. Verificar variables de entorno
log_info "Verificando variables de entorno..."
ENV_VARS=(
  "VISION_MODEL=/app/models/yoloe-26x-seg.pt"
  "LLM_MODEL=qwen2.5vl:7b"
  "OLLAMA_HOST=http://127.0.0.1:11434"
)

for var in "${ENV_VARS[@]}"; do
  key="${var%%=*}"
  expected_value="${var#*=}"
  actual_value=$(docker run --rm ranitas-vision:test printenv "$key" 2>/dev/null || echo "")
  if [ "$actual_value" = "$expected_value" ]; then
    log_ok "$key=$actual_value"
  else
    log_error "$key esperado '$expected_value', actual '$actual_value'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Resumen
echo ""
echo "==================================="
if [ $ERRORS -eq 0 ]; then
  log_ok "Todas las validaciones pasaron correctamente!"
  echo "==================================="
  echo ""
  echo "El servicio está listo para usar:"
  echo "  docker-compose up -d vision"
  echo ""
  exit 0
else
  log_error "Se encontraron $ERRORS error(es)"
  echo "==================================="
  exit 1
fi
