# Production-ready Docker image for unified Vision AI stack
# RTX 3090 optimized: YOLOv11 + Ollama qwen2.5-vl:7b + FastAPI
# Base: nvidia/cuda (lighter than ultralytics, manual torch install)

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

WORKDIR /app

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
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
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -U pip setuptools wheel

# Install PyTorch with CUDA 12.1 support
RUN pip3 install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    --index-url https://download.pytorch.org/whl/cu121


# Instalar dependencias principales (incluye nvidia-ml-py3, no pynvml)
RUN pip3 install --no-cache-dir -r requirements.txt

# Install ultralytics separately to ensure compatibility
RUN pip3 install --no-cache-dir ultralytics

# Force numpy to a <2 version to avoid ABI issues with extensions compiled against numpy 1.x
RUN pip3 install --no-cache-dir "numpy<2"
# Ensure opencv headless compatible with numpy<2
RUN pip3 install --no-cache-dir opencv-python-headless==4.9.0.80

# Application code
# Copia todos los módulos python del contexto actual (como antes), pero sin copiar detect_corners.py
COPY *.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Model directories
RUN mkdir -p /app/models /root/.ollama

# Environment
ENV PYTHONUNBUFFERED=1 \
    YOLO_MODEL_PATH=/app/models/yolov26l-seg.pt \
    OLLAMA_HOST=http://127.0.0.1:11434 \
    OLLAMA_MODELS=/root/.ollama/models \
    CUDA_VISIBLE_DEVICES=0

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/status || exit 1

ENTRYPOINT ["./entrypoint.sh"]
