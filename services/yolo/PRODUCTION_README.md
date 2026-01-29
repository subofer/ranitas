# Vision AI Service - Production Stack

## Architecture

**Single-container unified stack** optimizado para NVIDIA RTX 3090 (24GB VRAM):
- **YOLOv26-seg**: Detección de documentos
- **Ollama qwen2.5-vl:7b**: Parsing de facturas con visión
- **FastAPI**: Orquestador HTTP

### Zero Waste Design
- No transformers/bitsandbytes en Python (todo delegado a Ollama)
- No modelos locales LLM (puro Ollama HTTP)
- VRAM persistence: `keep_alive: -1` en todas las llamadas

## Quick Start

```bash
# Build
docker compose build vision

# Start
docker compose up -d vision

# Check status (esperar ~2min para primer startup con model pull)
curl http://localhost:8000/status | jq

# Expected output:
# {
#   "ok": true,
#   "service": "vision-ai",
#   "cuda": {
#     "available": true,
#     "gpu": "NVIDIA GeForce RTX 3090",
#     "vram_gb": 23.6
#   },
#   "ollama": {
#     "ready": true,
#     "models": ["qwen2.5vl:7b"]
#   }
# }
```

## API Endpoints

### POST /detect
Detecta esquinas de documento en imagen.

```bash
curl -X POST http://localhost:8000/detect \
  -F "image=@factura.jpg" | jq '.points'
```

### POST /restore
Pipeline completo: detectar → recortar → mejorar → parsear con Ollama.

**Modo streaming (SSE)**:
```bash
curl -X POST http://localhost:8000/restore \
  -F "image=@factura.jpg" \
  -F "stream=1" \
  -F "parse_invoice=1"
```

**Modo JSON**:
```bash
curl -X POST http://localhost:8000/restore \
  -F "image=@factura.jpg" \
  -F "stream=0" \
  -F "parse_invoice=1" | jq '.extraction'
```

### GET /status
Health check y estado de modelos.

```bash
curl http://localhost:8000/status | jq
```

## Signal Handling

El entrypoint maneja **SIGTERM/SIGINT** correctamente:
1. Mata FastAPI (uvicorn) con TERM
2. Mata Ollama serve con TERM
3. Espera a que liberen recursos
4. Exit limpio

```bash
# Graceful shutdown
docker compose stop vision

# Logs deberían mostrar:
# 🛑 Shutdown signal received, cleaning up...
# ✅ Cleanup complete
```

## VRAM Management

### Keep Alive Permanente
Todas las llamadas a Ollama incluyen `"keep_alive": -1` para mantener el modelo en VRAM:

```python
payload = {
    "model": "qwen2.5vl:7b",
    "prompt": "...",
    "keep_alive": -1,  # ← NUNCA descargar de VRAM
    "images": [base64_img]
}
```

### Monitoring VRAM
```bash
# Desde host
nvidia-smi

# Desde container
docker exec ranitas-vision nvidia-smi
```

Consumo esperado:
- Ollama qwen2.5vl:7b: ~6GB
- YOLOv26-seg: ~500MB
- Overhead CUDA: ~500MB
- **Total**: ~7-8GB / 24GB disponibles

## Environment Variables

```yaml
environment:
  - YOLO_MODEL_PATH=/app/models/yolov26l-seg.pt
  - YOLO_CONF=0.25                # Confidence threshold
  - OLLAMA_MODEL=qwen2.5vl:7b     # Modelo Ollama
  - OLLAMA_HOST=http://127.0.0.1:11434
  - OLLAMA_TIMEOUT=600            # Timeout HTTP (segundos)
```

## Troubleshooting

### GPU no detectada
```bash
# Verificar runtime nvidia
docker info | grep -i runtime

# Debe mostrar: Runtimes: ... nvidia ...

# Verificar CUDA en container
docker exec ranitas-vision python3 -c "import torch; print(torch.cuda.is_available())"
```

### Ollama no responde
```bash
# Ver logs de Ollama daemon
docker exec ranitas-vision tail -100 /tmp/ollama.log

# Verificar API
docker exec ranitas-vision curl http://127.0.0.1:11434/api/tags
```

### Out of Memory
```bash
# Verificar VRAM usage
docker exec ranitas-vision nvidia-smi

# Si >22GB usado, reiniciar para liberar:
docker compose restart vision
```

## Files Structure

```
services/yolo/
├── Dockerfile              # nvidia/cuda:12.1 base
├── entrypoint.sh           # Signal handling + Ollama startup
├── detect_corners.py       # FastAPI app (450 LOC, zero waste)
├── requirements.txt        # Minimal deps (no transformers)
└── models/
    └── yolo26n-seg.pt      # Auto-download en startup
```

## Production Checklist

- [x] CUDA 12.1 support
- [x] Ollama daemon con auto-start
- [x] Model persistence (keep_alive=-1)
- [x] Signal handling (SIGTERM/SIGINT)
- [x] Health checks (/status endpoint)
- [x] Graceful shutdown
- [x] VRAM monitoring
- [x] Auto-download de modelos
- [x] Logs estructurados

## Performance

**Startup time** (primera vez con model pull):
- Base image pull: ~30s
- Ollama model pull (6GB): ~90s
- YOLO download: ~5s
- Model warm-up: ~10s
- **Total**: ~2.5 minutos

**Startup time** (subsecuentes con cache):
- Container start: <5s
- Ollama serve ready: ~3s
- Model load (desde /root/.ollama): ~10s
- **Total**: ~20 segundos

**Inference**:
- YOLO detection: 50-100ms
- Image enhancement (CLAHE + denoise): 200-300ms
- Ollama parsing (qwen2.5vl): 2-5s (depende de complejidad)
- **Total pipeline**: 3-6 segundos

## Docker Compose Integration

```yaml
services:
  vision:
    build:
      context: ./services/yolo
    runtime: nvidia  # ← Crítico
    ports:
      - "8000:8000"
    volumes:
      - ./services/yolo/models:/app/models
      - vision-ollama:/root/.ollama  # Persist models
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
    restart: unless-stopped
```

## Maintainer Notes

- Base image: `nvidia/cuda:12.1.0-runtime-ubuntu22.04`
- PyTorch: 2.2.0+cu121 (desde whl oficial)
- Ultralytics: 8.4.8
- Ollama: Latest (instalado via script oficial)
- Python: 3.11

**No modificar**:
- `keep_alive: -1` en `call_ollama_generate()` (crítico para VRAM persistence)
- Signal handlers en `entrypoint.sh` (previene zombies)
- `runtime: nvidia` en docker-compose (GPU access)
