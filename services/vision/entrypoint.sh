#!/usr/bin/env bash
set -euo pipefail

# Color codes for beautiful logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "${CYAN}[%s]${NC} %s\n" "$(timestamp)" "$*"; }
log_success() { printf "${GREEN}✓ [%s]${NC} ${BOLD}%s${NC}\n" "$(timestamp)" "$*"; }
log_info() { printf "${BLUE}ℹ [%s]${NC} %s\n" "$(timestamp)" "$*"; }
log_warn() { printf "${YELLOW}⚠ [%s]${NC} %s\n" "$(timestamp)" "$*"; }
log_error() { printf "${RED}✗ [%s]${NC} %s\n" "$(timestamp)" "$*"; }

print_usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 [command]

${BOLD}Commands:${NC}
  ${GREEN}info${NC}       Print runtime diagnostics and exit ✅
  ${GREEN}help${NC}       Show this help text
  ${GREEN}shell${NC}      Drop into a shell (exec /bin/bash)
  ${GREEN}(no args)${NC}  Start the service (Ollama if available + uvicorn)

At runtime you can check the service at: ${CYAN}http://<host>:8000/status${NC}
EOF
}

print_info() {
  printf "${BOLD}Diagnóstico:${NC}\n"
  printf "  ${BOLD}ENV:${NC}\n"
  printf "    VISION_MODEL=${VISION_MODEL:-/app/models/yoloe-26x-seg.pt}\n"
  printf "    LLM_MODEL=${LLM_MODEL:-qwen2.5vl:7b}\n"
  printf "    OLLAMA_HOST=${OLLAMA_HOST:-http://127.0.0.1:11434}\n"
  printf "  ${BOLD}Python:${NC} $(python3 -V 2>&1 | tr -d '\n')\n"
  echo
  
  printf "${BOLD}Paquetes:${NC}\n"
  for pkg in ultralytics torch pynvml requests fastapi uvicorn; do
    status=$(python3 -c "import importlib.util; m=importlib.util.find_spec('$pkg'); print('ok' if m else 'missing')" 2>/dev/null || echo "error")
    if [ "$status" = "ok" ]; then
      printf "  ${GREEN}✓${NC} %-15s\n" "$pkg"
    else
      printf "  ${RED}✗${NC} %-15s ${RED}($status)${NC}\n" "$pkg"
    fi
  done
  echo
  
  printf "${BOLD}Modelos:${NC}\n"
  total_size=0
  total_file=$(mktemp)
  echo "$total_size" > "$total_file"
  if [ -d /app/models ]; then
    models_output=$(ls -lah /app/models | tail -n +4 | head -n 20 | awk '
    BEGIN { total = 0; models = "" }
    {
      name = $9
      size_str = $5
      if (size_str ~ /M$/) {
        sub(/M$/, "", size_str)
        size_mb = size_str + 0
      } else if (size_str ~ /K$/) {
        sub(/K$/, "", size_str)
        size_mb = size_str / 1024
      } else {
        size_mb = 0
      }
      total += size_mb
      models = models "MODEL: " name " " size_mb "\n"
    }
    END {
      print models "TOTAL_VISION: " total
    }
    ')
    total_vision=$(echo "$models_output" | grep "TOTAL_VISION:" | cut -d':' -f2 | tr -d '\n')
    printf "  ${GREEN}✓${NC} VISION_MODEL OK (%.1fMB)\n" "$total_vision"
    echo "$total_vision" > "$total_file"
    echo "$models_output" | grep "MODEL:" | sed 's/MODEL: //' | while read name size; do
      printf "  ${GREEN}✓${NC} %-25s %8.1fMB\n" "$name" "$size"
    done
  else
    printf "  ${RED}✗${NC} /app/models no encontrado\n"
    total_vision=0
  fi
  
  # Ollama binary
  if command -v ollama >/dev/null 2>&1; then
    ollama_size=$(du -b /usr/local/bin/ollama 2>/dev/null | awk '{print $1 / 1024 / 1024}' 2>/dev/null || echo "0.0")
    printf "  ${GREEN}✓${NC} %-25s %8.1fMB\n" "ollama" "$ollama_size"
    total_size=$(cat "$total_file")
    new_total=$(python3 -c "print($total_size + $ollama_size)" 2>/dev/null || echo $total_size)
    echo "$new_total" > "$total_file"
  fi
  
  # Ollama models
  if command -v ollama >/dev/null 2>&1; then
    models_info=$(curl -s --max-time 2 ${OLLAMA_HOST:-http://127.0.0.1:11434}/api/tags 2>/dev/null | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  for m in data.get('models', []):
    size_mb = m.get('size', 0) / (1024**2)
    print(f'{m[\"name\"]} {size_mb:.1f}')
except:
  pass
" 2>/dev/null || echo "")
    if [ -n "$models_info" ]; then
      echo "$models_info" | while read line; do
        model_name=$(echo "$line" | awk '{print $1}')
        model_size=$(echo "$line" | awk '{print $2}')
        total_size=$(cat "$total_file")
        new_total=$(python3 -c "print($total_size + $model_size)" 2>/dev/null || echo $total_size)
        echo "$new_total" > "$total_file"
        printf "  ${GREEN}✓${NC} %-25s %8sMB\n" "$model_name" "$model_size"
      done
    fi
  fi
  
  total_size=$(cat "$total_file")
  rm "$total_file"
  printf "  ${GREEN}✓${NC} Total modelos: %.1fMB\n" "$total_size"
  echo
  
  # GPU check
  printf "${BOLD}Hardware:${NC}\n"
  if command -v nvidia-smi >/dev/null 2>&1; then
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits | head -n 5 | while read gpu_info; do
      name=$(echo "$gpu_info" | cut -d',' -f1)
      mem_mb=$(echo "$gpu_info" | cut -d',' -f2)
      mem_gb=$(echo "scale=1; $mem_mb / 1024" | bc 2>/dev/null || echo $mem_mb)
      printf "  ${GREEN}✓${NC} GPU: %s, VRAM: %sGB\n" "$name" "$mem_gb"
    done
  else
    python3 - <<'PY' 2>/dev/null || printf "  ${YELLOW}⚠${NC} GPU no detectada\n"
try:
  import pynvml
  pynvml.nvmlInit()
  h=pynvml.nvmlDeviceGetHandleByIndex(0)
  m=pynvml.nvmlDeviceGetMemoryInfo(h)
  print(f'  GPU: {m.total/(1024**3):.1f} GB VRAM')
except:
  print('  GPU no detectada')
PY
  fi
  
  # Ollama check
  if command -v ollama >/dev/null 2>&1; then
    printf "  ${GREEN}✓${NC} Ollama binario instalado\n"
    set +e
    curl -fsS --max-time 3 ${OLLAMA_HOST:-http://127.0.0.1:11434}/api/tags >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      printf "  ${GREEN}✓${NC} Ollama HTTP respondiendo\n"
    else
      printf "  ${YELLOW}⚠${NC} Ollama iniciando...\n"
    fi
    set -e
  else
    printf "  ${YELLOW}⚠${NC} Ollama no encontrado\n"
  fi
}

# Simple arg parsing
case "${1:-}" in
  info)
    print_info
    exit 0
    ;;
  help|-h|--help)
    print_usage
    exit 0
    ;;
  shell)
    exec /bin/bash
    ;;
  '')
    # proceed to normal start
    ;;
  *)
    # If user wants to run something else, exec it
    exec "$@"
    ;;
esac

# Print startup header
echo
printf "${BOLD}${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
printf "${BOLD}${MAGENTA}║${NC}  ${BOLD}${CYAN}🚀 Ranitas Vision Service${NC}                           ${BOLD}${MAGENTA}║${NC}\n"
printf "${BOLD}${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n"
echo

# Copy mobileclip BEFORE starting Ollama to ensure it's available when YOLO loads
if [ -f /app/models/mobileclip2_b.ts ]; then
  log_info "Copiando mobileclip2_b.ts al cache..."
  mkdir -p /root/.cache/ultralytics
  mkdir -p /root/.cache/clip
  cp /app/models/mobileclip2_b.ts /root/.cache/ultralytics/mobileclip2_b.ts
  cp /app/models/mobileclip2_b.ts /root/.cache/clip/mobileclip2_b.ts
  log_success "MobileClip cacheado exitosamente"
else
  log_warn "mobileclip2_b.ts no encontrado - se descargará en primera carga YOLO"
fi

# Start Ollama if binary exists
if command -v ollama >/dev/null 2>&1; then
  log_info "Iniciando Ollama en background..."
  # Redirect oom messages to stdout/stderr to be visible in container logs
  ollama serve >/tmp/ollama.log 2>&1 &
  OLLAMA_PID=$!
  log_success "Ollama PID=${OLLAMA_PID}"
else
  log_warn "Ollama no disponible - continuando sin LLM"
fi

# Small wait to let Ollama start binding (non-blocking - monitor_ollama will keep checking)
sleep 1
log_info "Ollama iniciándose en background (no bloqueante)..."

# Optionally auto-pull configured Ollama model into /root/.ollama (useful when using a host-mounted volume)
if [ "${OLLAMA_AUTO_PULL:-0}" = "1" ] && [ -n "${OLLAMA_MODEL:-}" ]; then
  log_info "OLLAMA_AUTO_PULL=1 — descargando ${OLLAMA_MODEL} en background..."
  (
    # Wait for Ollama to be ready before pulling
    WAIT_COUNT=0
    while ! curl -fsS --max-time 1 ${OLLAMA_HOST:-http://127.0.0.1:11434}/api/tags >/dev/null 2>&1; do
      WAIT_COUNT=$((WAIT_COUNT + 1))
      [ $WAIT_COUNT -ge 30 ] && { log_error "Ollama no disponible después de 150s - abortando pull"; exit 1; }
      sleep 5
    done
    curl -sSf -X POST "${OLLAMA_HOST:-http://127.0.0.1:11434}/api/pull" \
      -H 'Content-Type: application/json' \
      -d "{\"name\": \"${OLLAMA_MODEL}\"}" >/tmp/ollama-pull.log 2>&1
    if [ $? -eq 0 ]; then
      log_success "Modelo ${OLLAMA_MODEL} descargado exitosamente"
    else
      log_error "Fallo descarga de modelo (ver /tmp/ollama-pull.log)"
    fi
  ) &
fi

# Pre-load LLM model into VRAM with keep_alive=-1 (COMPLETELY NON-BLOCKING BACKGROUND)
if [ -n "${LLM_MODEL:-}" ] || [ -n "${OLLAMA_MODEL:-}" ]; then
  MODEL_TO_LOAD="${LLM_MODEL:-${OLLAMA_MODEL}}"
  log_info "Precarga ${MODEL_TO_LOAD} iniciada en background..."
  (
    # Wait for Ollama to be ready before preloading
    WAIT_COUNT=0
    while ! curl -fsS --max-time 1 ${OLLAMA_HOST:-http://127.0.0.1:11434}/api/tags >/dev/null 2>&1; do
      WAIT_COUNT=$((WAIT_COUNT + 1))
      if [ $WAIT_COUNT -eq 1 ]; then
        log_info "Esperando Ollama endpoint..."
      fi
      if [ $WAIT_COUNT -ge 30 ]; then
        log_warn "Ollama no disponible - modelo se cargará en primera petición"
        exit 1
      fi
      sleep 5
    done
    log_success "Ollama listo - cargando ${MODEL_TO_LOAD} a VRAM..."
    curl -sSf -X POST "${OLLAMA_HOST:-http://127.0.0.1:11434}/api/generate" \
      -H 'Content-Type: application/json' \
      -d "{\"model\": \"${MODEL_TO_LOAD}\", \"prompt\": \"ready\", \"keep_alive\": -1}" \
      >/tmp/ollama-preload.log 2>&1
    if [ $? -eq 0 ]; then
      log_success "${MODEL_TO_LOAD} → VRAM (keep_alive=-1) ✓"
    else
      log_warn "Precarga falló - se cargará en primera petición"
    fi
  ) &
fi

# Print diagnostics summary (non-blocking)
echo
printf "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
log_info "Estado del Sistema"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
print_info | sed -n '1,200p' || true
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n\n"

# Start uvicorn (exec to receive signals properly)
log_success "FastAPI Server → http://0.0.0.0:8000"
printf "${BOLD}Endpoints:${NC} ${CYAN}/status${NC} ${CYAN}/ready${NC} ${CYAN}/crop${NC} ${CYAN}/warp${NC} ${CYAN}/analyze${NC}\n"
printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n\n"
# Reduce noisy access logs from uvicorn (healthcheck /status spams INFO by default)
# Set log level to WARNING so INFO-level access logs are not printed repeatedly
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --app-dir /app --log-level warning
