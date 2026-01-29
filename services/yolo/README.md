# Servicio de Visión Docker - YOLOv26 + DocRes

Microservicio dockerizado para procesamiento de imágenes de facturas con detección de esquinas (YOLO) y restauración de documentos (DocRes).

## 🎯 Características

- **Detección de esquinas**: YOLOv26 segmentation para encontrar bordes de documentos
- **Restauración de imágenes**: DocRes para "planchar" arrugas, sombras y mejorar legibilidad
- **Parámetros configurables**: Ajusta el procesamiento desde la UI sin reiniciar el servicio
- **Optimizado para GPU**: RTX 3090 con CUDA 12.1
- **API REST**: FastAPI con documentación automática
- **Healthcheck**: Endpoint `/status` para monitoreo

## ⚙️ Parámetros de Mejora Configurables

El endpoint `/restore` acepta parámetros opcionales para controlar el procesamiento cuando `enhance=1`:

| Parámetro | Tipo | Rango | Predeterminado | Descripción |
|-----------|------|-------|----------------|-------------|
| `clahe_clip` | float | 1.0 - 4.0 | 1.8 | Límite de contraste adaptativo. Mayor valor = más contraste |
| `kernel_size` | int | 15 - 61 (impar) | 31 | Tamaño del kernel para detección de sombras. Mayor = menos detalle |
| `shadow_threshold` | int | 10 - 40 | 25 | Umbral para detectar sombras. Mayor = menos corrección |
| `brightness_boost` | float | 1.0 - 1.15 | 1.03 | Multiplicador de brillo en zonas oscuras |
| `denoise_strength` | int | 3 - 12 | 4 | Fuerza del denoising. Mayor = más suave (puede perder texto) |
| `sharpen_amount` | float | 1.0 - 1.3 | 1.08 | Cantidad de sharpening. Mayor = más nitidez |
| `contrast_boost` | float | 1.0 - 1.1 | 1.01 | Boost final de contraste |

**💡 Configuración desde UI**: Los parámetros se configuran en `/configuracion` y se guardan en localStorage. El frontend los envía automáticamente.

**⚠️ Valores conservadores**: Los predeterminados están ajustados para preservar texto. Si la mejora es muy agresiva, reduce `kernel_size`, `brightness_boost` y `denoise_strength`.

## 📋 Requisitos Previos

### Hardware
- GPU NVIDIA con CUDA 12.1+ (recomendado RTX 3090 o superior)
- 8GB+ VRAM para modelos
- 16GB+ RAM sistema

### Software
- Docker 24.0+
- Docker Compose 2.0+
- NVIDIA Container Toolkit
- Python 3.10+ (solo para scripts de descarga)

> 💡 Recomendación: Para desarrollo y ejecución preferimos la versión dockerizada del servicio. Evita crear entornos `.venv` dentro de `services/yolo/` a menos que sea estrictamente necesario; usa el contenedor para reproducibilidad y para simplificar limpieza de artefactos.

### Instalar NVIDIA Container Toolkit

```bash
# Ubuntu/Debian
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Verificar
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

## 🚀 Inicio Rápido

### 1. Descargar Modelos

```bash
# Desde la raíz del proyecto
./scripts/download-models.sh
```

Esto descarga:
- ✅ `yolo26n-seg.pt` (automático)
- ⚠️ `docres.pt` (manual, ver más abajo)

### 2. Iniciar Servicios

```bash
./scripts/start-vision.sh
```

Esto levanta:
- PostgreSQL en puerto 5432
- Servicio de visión en puerto 8000

### 3. Verificar Estado

```bash
curl http://localhost:8000/status | jq
```

Respuesta esperada:
```json
{
  "ok": true,
  "torch_installed": true,
  "cuda_available": true,
  "device": "cuda",
  "gpu_name": "NVIDIA GeForce RTX 3090",
  "cv2_installed": true,
  "numpy_installed": true,
  "pil_installed": true,
  "yolo_loaded": true,
  "docres_available": true
}
```

## 📡 API Endpoints

### GET /status
Healthcheck del servicio

```bash
curl http://localhost:8000/status
```

### POST /detect
Detecta esquinas de documento en imagen

```bash
curl -X POST http://localhost:8000/detect \
  -F "image=@factura.jpg"
```

Respuesta:
```json
{
  "ok": true,
  "points": [
    {"x": 123, "y": 456},
    {"x": 890, "y": 456},
    {"x": 890, "y": 1200},
    {"x": 123, "y": 1200}
  ],
  "debug_image_base64": "...",
  "timing_ms": 234
}
```

### POST /restore
Restaura/mejora documento (opcional `enhance=1`)

```bash
curl -X POST http://localhost:8000/restore \
  -F "image=@factura_crop.jpg" \
  -F "enhance=1"
```

Respuesta:
```json
{
  "ok": true,
  "restored_image_base64": "...",
  "timing_ms": 567
}
```

## 🔧 Configuración

### Variables de Entorno

Archivo `.env.vision`:
```bash
NEXT_PUBLIC_VISION_SERVICE_URL=http://localhost:8000
```

### Docker Compose

El servicio ya está configurado en `docker-compose.yml`:

```yaml
vision:
  build: ./services/yolo
  ports:
    - "8000:8000"
  volumes:
    - ./services/yolo/models:/app/models
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## 📦 Modelos

### YOLOv26 (Automático)

Field detection (invoice regions): This service can optionally run text-prompted field detection using YOLOE/YOLO models that support text prompts. The env var `FIELD_PROMPTS` controls which fields to look for (comma-separated), and `FIELD_DET_CONF` controls per-field confidence threshold. Detected regions are returned as `fields` in `/detect` and streamed as a `fields` stage in `/restore`.
Se descarga automáticamente al ejecutar `download-models.sh` o al iniciar el contenedor.

### DocRes (Manual)
Para habilitar restauración avanzada:

1. Descarga `docres.pt` desde el repositorio oficial
2. Colócalo en `services/yolo/models/docres.pt`
3. Reinicia el contenedor: `docker-compose restart vision`

Sin DocRes, el sistema usa restauración básica con OpenCV (CLAHE, morphological ops, denoising).

## 🐛 Troubleshooting

### GPU no detectada
```bash
# Verificar NVIDIA driver
nvidia-smi

# Verificar Docker con GPU
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# Reinstalar NVIDIA Container Toolkit
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Servicio no responde
```bash
# Ver logs
docker-compose logs -f vision

# Reiniciar
docker-compose restart vision

# Rebuild (si cambió código)
docker-compose build vision && docker-compose up -d vision
```

### Modelos no encontrados
```bash
# Verificar directorio
ls -lh services/yolo/models/

# Re-descargar
./scripts/download-models.sh

# Verificar dentro del contenedor
docker-compose exec vision ls -lh /app/models/
```

### Error CUDA Out of Memory
Reduce el tamaño de imagen antes de enviar o ajusta `deploy.resources.limits` en docker-compose.yml

## 🧹 Limpiar artefactos Python locales

Si has estado ejecutando el servicio localmente puedes acumular artefactos de desarrollo como entornos virtuales (`.venv`), `__pycache__`, archivos `*.pyc` o `*.log`. Para facilitar su remoción hemos añadido un script seguro en `scripts/cleanup-python-artifacts.sh`.

Uso recomendado:

```bash
# Ver qué se eliminaría (modo simulación)
./scripts/cleanup-python-artifacts.sh --dry-run

# Eliminar (se pedirá confirmación)
./scripts/cleanup-python-artifacts.sh

# O eliminar sin confirmación
./scripts/cleanup-python-artifacts.sh --yes
```

El script sólo opera dentro del árbol `services/` del repo y no borra modelos en `services/yolo/models/`.

## 🔄 Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f vision

# Entrar al contenedor
docker-compose exec vision bash

# Verificar GPU dentro del contenedor
docker-compose exec vision python -c "import torch; print(torch.cuda.is_available())"

# Rebuild después de cambios
# Usa el cache por defecto para ahorrar ancho de banda y tiempo.
# Sólo usa `--no-cache` si sabes que necesitas forzar la reconstrucción completa.
# Ejemplo (rápido y recomendado):
docker-compose build vision
# Forzar sin cache (sólo si es necesario):
# docker-compose build vision --no-cache

# Detener todo
docker-compose down

# Limpiar volúmenes (cuidado: borra caché de modelos)
docker-compose down -v
```

## 📊 Performance

Con RTX 3090:
- Detección de esquinas: ~200-300ms
- Restauración básica (OpenCV): ~400-600ms
- Restauración avanzada (DocRes): ~800-1200ms

CPU-only:
- Detección: ~2-3s
- Restauración: ~3-5s

## 🔐 Seguridad

- El servicio solo escucha en localhost por defecto
- Para producción, usa reverse proxy (nginx/traefik)
- Limita tamaño de uploads en FastAPI
- Considera autenticación con API keys

## 📝 Desarrollo

Para modificar el código:

1. Edita `services/yolo/detect_corners.py`
2. Rebuild: `docker-compose build vision`
3. Reinicia: `docker-compose up -d vision`
4. Verifica logs: `docker-compose logs -f vision`

## 📚 Referencias

- [Ultralytics YOLOv26](https://docs.ultralytics.com/)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [PyTorch Docker](https://hub.docker.com/r/pytorch/pytorch)
