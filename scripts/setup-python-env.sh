#!/usr/bin/env bash
set -euo pipefail

# Setup script for Python environments used by the project (YOLO service)
# Usage: bash scripts/setup-python-env.sh [--with-cuda]
# --with-cuda tries to install CUDA-aware torch (requires appropriate CUDA runtime on system)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
YOLO_DIR="$ROOT_DIR/services/yolo"
VENV_DIR="$YOLO_DIR/.venv"
REQ_FILE="$YOLO_DIR/requirements.txt"

WITH_CUDA=0
if [[ "${1:-}" == "--with-cuda" ]]; then
  WITH_CUDA=1
fi

echo "[setup] root: $ROOT_DIR"

echo "[setup] Checking for python3..."
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found. Install Python 3.10+ and re-run."
  exit 1
fi

PYTHON_BIN=python3

# Install system deps for Ubuntu/Debian if apt available (best-effort)
if command -v apt-get >/dev/null 2>&1; then
  echo "[setup] Detected apt-get, installing system packages (sudo may be required)"
  sudo apt-get update
  sudo apt-get install -y python3-venv python3-dev build-essential pkg-config libgl1-mesa-glx libglib2.0-0
else
  echo "[setup] No apt-get found; please ensure build-essential / python3-venv / libgl installed on your system"
fi

# Create YOLO venv
if [[ ! -d "$VENV_DIR" ]]; then
  echo "[setup] Creating virtualenv for YOLO at $VENV_DIR"
  $PYTHON_BIN -m venv "$VENV_DIR"
fi

# Activate and install requirements
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip wheel setuptools

if [[ -f "$REQ_FILE" ]]; then
  echo "[setup] Installing requirements from $REQ_FILE"
  python -m pip install -r "$REQ_FILE"
else
  echo "[setup] WARNING: $REQ_FILE not found. Create it with required packages (fastapi, uvicorn, ultralytics, opencv-python, pillow, numpy, python-multipart)."
fi

# Torch: install CPU-only by default. If --with-cuda, attempt to install CUDA wheel (best-effort).
if [[ "$WITH_CUDA" -eq 1 ]]; then
  echo "[setup] Installing CUDA-enabled PyTorch (best-effort). Ensure CUDA runtime & drivers are installed on the host."
  # Attempt to install latest stable CUDA wheel via pytorch download index (may need adjustment per CUDA version)
  python -m pip install --index-url https://download.pytorch.org/whl/cu121 torch torchvision --upgrade || {
    echo "[setup] CUDA torch installation failed. Falling back to CPU torch."
    python -m pip install --index-url https://download.pytorch.org/whl/cpu torch --upgrade
  }
else
  echo "[setup] Installing CPU-only torch (safe default)"
  python -m pip install --index-url https://download.pytorch.org/whl/cpu torch --upgrade || echo "[setup] CPU torch install failed; you may need to install manually according to your platform."
fi

# DocRes support is deprecated. The service works without DocRes using OpenCV fallbacks
echo "[setup] DocRes support is deprecated and not installed by default (skip)"

# Summary
echo "\n[setup] ✔ Virtualenv setup complete for YOLO service"
echo "[setup] YOLO venv: $VENV_DIR"
echo "[setup] To run the YOLO service: bash scripts/run-yolo.sh"

deactivate || true

exit 0
