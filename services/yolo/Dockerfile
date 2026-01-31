# Production-ready Docker image for unified Vision AI stack
# RTX 3090 optimized: YOLOv11 + Ollama qwen2.5-vl:7b + FastAPI
# Base: nvidia/cuda (lighter than ultralytics, manual torch install)

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

WORKDIR /app

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Build args to control optional heavy installs
ARG INSTALL_TORCH=1
ARG INSTALL_CLIP=0

# System dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    curl \
    ca-certificates \
    zstd \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    tesseract-ocr \
    libtesseract-dev \
    iproute2 \
    procps \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Python dependencies with pip cache (BuildKit cache-friendly)
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --no-cache-dir -U pip setuptools wheel && \
    # Force numpy to <2 to ensure compatibility with torch and precompiled extensions
    pip3 install --no-cache-dir "numpy<2" && \
    pip3 install --no-cache-dir -r requirements.txt && \
    pip3 install --no-cache-dir ultralytics && \
    # Re-enforce numpy<2 after ultralytics (ultralytics may pull a numpy>=2 wheel)
    pip3 install --no-cache-dir "numpy<2" --force-reinstall && \
    # Ensure compatible OpenCV (some opencv wheels require numpy>=2). Prefer a known working headless wheel.
    pip3 uninstall -y opencv-python || true && \
    # Prefer a pre-4.11 opencv headless wheel that does not require numpy>=2
    pip3 install --no-cache-dir "opencv-python-headless==4.9.0.80" --force-reinstall

# Optional CLIP install (controlled by build ARG)
RUN if [ "${INSTALL_CLIP}" = "1" ]; then pip3 install --no-cache-dir "git+https://github.com/ultralytics/CLIP.git"; fi

# Optional Torch (kept separate to use the official index and controlled by ARG)
RUN if [ "${INSTALL_TORCH}" = "1" ]; then pip3 install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    --index-url https://download.pytorch.org/whl/cu121; fi

# Ensure numpy/opencv compatibility if needed - prefer requirements.txt pinning
# (Keep explicit opencv headless if runtime errors occur)
# RUN pip3 install --no-cache-dir opencv-python-headless==4.9.0.80

# Application code
# Copia todos los módulos python del contexto actual (como antes), pero sin copiar detect_corners.py
COPY *.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Model directories and cache
RUN mkdir -p /app/models /root/.ollama /root/.cache/ultralytics /app/scripts
# Do not copy large model weights into the image. Mount host models directory into /app/models
VOLUME ["/app/models"]
# Copy helper scripts and mark executable
# copy optional helper scripts (check_gpu.py is optional and may be absent)
COPY scripts/download_models.sh /app/scripts/download_models.sh
RUN chmod +x /app/scripts/download_models.sh || true
# NOTE: We avoid COPY of optional small cache files at build time because COPY fails if the source file
# is not present. The `entrypoint.sh` will copy `mobileclip2_b.ts` at runtime when found in /app/models.

# Environment
ENV PYTHONUNBUFFERED=1 \
    YOLO_MODEL_PATH=/app/models/yoloe-26x-seg.pt \
    OLLAMA_HOST=http://127.0.0.1:11434 \
    OLLAMA_MODELS=/root/.ollama/models \
    CUDA_VISIBLE_DEVICES=0

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/status || exit 1

ENTRYPOINT ["./entrypoint.sh"]
