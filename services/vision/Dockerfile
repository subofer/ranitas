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
    python3.11 python3-pip curl ca-certificates libgl1 libglib2.0-0 libgomp1 git zstd bc && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# 2) Ollama (binario estático; raramente cambia) ✅
#    - Colocado antes de instalar dependencias Python
# --------------------------------------------------
RUN curl -fsSL https://ollama.com/install.sh | sh

# --------------------------------------------------
# 3) Dependencias Python: usar requirements.txt para cache óptimo
#    - Copiar solo requirements.txt primero para maximizar cache
#    - Si requirements.txt no cambia, esta capa se reutiliza
# --------------------------------------------------
RUN pip3 install --no-cache-dir -U pip setuptools wheel

# Copiar requirements.txt antes de instalar para aprovechar cache de Docker
COPY requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# --------------------------------------------------
# 4) Código (MUY volátil) - copiar AL FINAL para minimizar
#    invalidación de cache cuando editás main.py / entrypoint.sh
# --------------------------------------------------
COPY main.py entrypoint.sh audit.py state.py /app/
COPY routes_*.py /app/
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
VOLUME ["/app/models", "/root/.ollama"]

# Metadata labels
LABEL org.opencontainers.image.title="ranitas-vision" \
      org.opencontainers.image.description="Vision service (YOLOE + Ollama) for invoice/receipt detection" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="Ranitas Team"

# HEALTHCHECK definido en docker-compose.yml para mayor flexibilidad

ENTRYPOINT ["/app/entrypoint.sh"]
# CMD removido - el entrypoint maneja el inicio de uvicorn