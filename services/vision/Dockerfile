FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    VISION_MODEL=/app/models/yoloe-26x-seg.pt \
    LLM_MODEL=qwen2.5vl:7b \
    OLLAMA_HOST=http://127.0.0.1:11434

# --------------------------------------------------
# 1) Dependencias de sistema (poco volátiles) ✅
#    - Mantener arriba para aprovechar cache entre builds
#    - Limpiar listas de apt para reducir tamaño
# --------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3-pip curl ca-certificates libgl1 libglib2.0-0 libgomp1 git zstd && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# 2) Ollama (binario estático; raramente cambia) ✅
#    - Colocado antes de instalar dependencias Python
# --------------------------------------------------
RUN curl -fsSL https://ollama.com/install.sh | sh

# --------------------------------------------------
# 3) Dependencias Python: copia SOLO requirements.txt
#    e instala paquetes en una capa dedicada
#    - Si usás BuildKit, podés habilitar cache con --mount
#    - Si no, la sección comentada no afectará (descomentar manualmente)
# --------------------------------------------------
COPY requirements.txt /app/requirements.txt

# Crear cache dir (útil si usás --mount=type=cache,target=/root/.cache/pip)
RUN mkdir -p /root/.cache/pip

# BuildKit optimized (descomentá si usás BuildKit):
# RUN --mount=type=cache,target=/root/.cache/pip pip3 install --no-cache-dir -U pip setuptools wheel && \
#     pip3 install --no-cache-dir "numpy<2" && \
#     pip3 install --no-cache-dir -r /app/requirements.txt && \
#     pip3 install --no-cache-dir ultralytics pynvml

# Fallback (compatible con Docker clásico):
RUN pip3 install --no-cache-dir -U pip setuptools wheel && \
    pip3 install --no-cache-dir "numpy<2" && \
    pip3 install --no-cache-dir -r /app/requirements.txt && \
    pip3 install --no-cache-dir ultralytics pynvml

# --------------------------------------------------
# 4) Código (MUY volátil) - copiar AL FINAL para minimizar
#    invalidación de cache cuando editás main.py / entrypoint.sh
# --------------------------------------------------
COPY main.py /app/main.py
COPY entrypoint.sh /app/entrypoint.sh
COPY audit.py state.py routes_*.py /app/

# Copy remaining service files (routes_*, audit, state, etc.) so the container has all source modules
COPY . /app
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
VOLUME ["/app/models", "/root/.ollama"]

# Metadata labels
LABEL org.opencontainers.image.title="ranitas-vision" \
      org.opencontainers.image.description="Vision service (YOLOE + Ollama) for invoice/receipt detection" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="Ranitas Team"

# Docker healthcheck uses the service /status endpoint; requires curl (installed above)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/ready || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000","--workers","1"]