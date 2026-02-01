#!/usr/bin/env bash
set -euo pipefail

# Script helper to pull an Ollama model into the host-mounted ./models/ollama directory.
# Default model: qwen2.5vl:7b (vision variant)

MODEL=${1:-qwen2.5vl:7b}
HOST_DIR="$(pwd)/models/ollama"
mkdir -p "$HOST_DIR"

log(){ echo "[$(date --iso-8601=seconds)] $*"; }

# If container 'ranitas-vision' exists and is running, prefer using it
if docker ps --format '{{.Names}}' | grep -q '^ranitas-vision$'; then
  log "Using running container 'ranitas-vision' to pull model $MODEL"
  docker exec ranitas-vision ollama pull "$MODEL"
  exit 0
fi

# If image exists, run a temporary container to pull files into the mounted host folder
if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q '^ranitas-vision:'; then
  log "Using image 'ranitas-vision' to pull model $MODEL into $HOST_DIR"
  docker run --rm -v "$HOST_DIR":/root/.ollama ranitas-vision ollama pull "$MODEL"
  exit 0
fi

# Fallback: try to use an official ollama image if available or instruct user
log "No running container or built image named 'ranitas-vision' found."
log "If you have 'ollama' installed on the host, run: ollama pull $MODEL" 
log "Or build the vision image and re-run this script."
exit 2
