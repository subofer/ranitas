# 🟢 Ranitas-Vision: Production Stack

## Arquitectura

**Stack unificado en un solo contenedor**, optimizado para NVIDIA RTX 3090 (24GB VRAM):
- **YOLOv26-seg**: Detección y corrección de perspectiva de facturas.
- **Ollama qwen2.5-vl:7b**: Parsing de facturas con visión.
- **FastAPI/Uvicorn**: Orquestador HTTP multi-thread/multi-worker.

## Quick Start

```bash
# Build
docker compose build vision

# Start
docker compose up -d vision

# Check status (esperar ~2min para primer startup con model pull)
curl http://localhost:8000/status | jq
```

## Endpoints principales

- `POST /vision/detect`: Detecta y corrige perspectiva de facturas (devuelve esquinas y base64 de la imagen derecha).
- `POST /llm/analyze`: Extrae datos de la factura usando Ollama (Qwen2.5-VL:7b).
- `GET /status`: Estado de hardware, modelos y salud de servicios.

### Ejemplo: Detección y corrección de factura
```bash
curl -X POST http://localhost:8000/vision/detect \
    -F "image=@factura.jpg" | jq
# Devuelve: { ok, points, debug_image_base64, timing_ms, model }
```

### Ejemplo: Análisis LLM
```bash
curl -X POST http://localhost:8000/llm/analyze \
    -F "image=@factura.jpg" | jq
# Devuelve: { ok, proveedor, fecha, total, items, ... }
```

## Variables de entorno críticas

- `YOLO_MODEL_PATH=/app/models/yolov26l-seg.pt`
- `OLLAMA_MODEL=qwen2.5vl:7b`
- `OLLAMA_HOST=http://127.0.0.1:11434`
- `OLLAMA_TIMEOUT=600`
- `NVIDIA_VISIBLE_DEVICES=all`

## Logs esperados
- 🚀 [SYSTEM] : Ciclo de vida del contenedor.
- 🧠 [VISION] : Carga de pesos YOLO y detección.
- 💬 [LLM]    : Pings y respuestas de Ollama.
- 📊 [STATUS] : Reporte periódico de VRAM/RAM.

## Troubleshooting rápido

- **GPU no detectada**: Verifica `docker info | grep -i runtime` y que el contenedor use `runtime: nvidia`.
- **Ollama no responde**: `docker exec ranitas-vision curl http://127.0.0.1:11434/api/tags`
- **VRAM alta**: `docker exec ranitas-vision nvidia-smi` y reinicia si supera 22GB.

## Producción: Checklist
- [x] FastAPI/Uvicorn multi-thread/multi-worker
- [x] Endpoints JSON correctos
- [x] YOLO detectando y corrigiendo perspectiva
- [x] LLM extrayendo todos los datos
- [x] Docker limpio, sin archivos legacy
- [x] Logs estructurados

## Performance targets
- Status: <5ms
- YOLO: 50-80ms
- Geometry: 150ms
- LLM: 2-4s (Qwen2.5-VL:7b caliente)