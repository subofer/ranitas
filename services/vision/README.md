Vision service (ranitas-vision)

Quick usage & diagnostics ✅

- Start normally (inside container):
  - ENTRYPOINT runs `/app/entrypoint.sh` which starts Ollama (if present) and uvicorn `main:app`.

- Inspect runtime diagnostics without starting services:
  - docker run --rm -it ranitas/vision image ... /app/entrypoint.sh info
  - Locally: `bash entrypoint.sh info`

What `info` prints:
- ENV variables (VISION_MODEL, LLM_MODEL, OLLAMA_HOST)
- Python version and whether important packages are installed (ultralytics, torch, pynvml)
- Contents of `/app/models` and verifies if `VISION_MODEL` exists
- GPU detection (nvidia-smi / pynvml)
- Ollama reachability test

Healthcheck
- Dockerfile includes a HEALTHCHECK which queries `/status`:
  - curl -fsS http://127.0.0.1:8000/status

Service endpoints (examples)
- Root: GET /
- Status/health: GET /status

Tips
- Mount model files to `/app/models` (e.g. `-v /host/models:/app/models`)
- If you have a pre-downloaded `mobileclip2_b.ts`, place it in one of the mounted model directories (e.g. `./models` or `./services/yolo/models`) as `mobileclip2_b.ts`, or set `MOBILECLIP_PATH` to the file's full path inside the container. The entrypoint will search common mounts and copy it into `/root/.cache/ultralytics` automatically.

- To avoid downloading large model artifacts repeatedly, persist the ultralytics cache and model directory on the host. Example using `docker-compose.vision.yml`:

  volumes:
    - ./models:/app/models            # Put your yolo model here (yoloe-26x-seg.pt)
    - ./models/ultralytics_cache:/root/.cache  # Persist ultralytics cache (mobileclip and other assets)

  environment:
    - XDG_CACHE_HOME=/root/.cache
    - MOBILECLIP_PATH=/app/models/mobileclip2_b.ts

  With this setup, the YOLO model (`/app/models/yoloe-26x-seg.pt`) and the ultralytics cache are kept on the host and will not be re-downloaded on container restart.

- If Ollama isn't installed inside the container, you can point `OLLAMA_HOST` to an external Ollama instance.

Download Ollama model to host volume (recommended)
- The `vision` compose maps `./models/ollama` to the container path `/root/.ollama` so you can pre-download Ollama model files on the host and reuse them across container restarts.
- To populate the host volume using the running container (recommended after build):
  ```bash
  # inside project root
  mkdir -p ./models/ollama
  docker exec ranitas-vision ollama pull qwen2.5vl:7b
  tail -f ./models/ollama/ollama.log # (or check container log at /tmp/ollama.log)
  ```
- If the container isn't running yet, you can use the built image to pull into the host folder:
  ```bash
  docker run --rm -v "$(pwd)/models/ollama":/root/.ollama ranitas-vision ollama pull qwen2.5vl:7b
  ```
- Alternatively, install `ollama` on the host and run `ollama pull qwen2.5vl:7b`; files will be stored under `./models/ollama` and used by the service when the container mounts that directory.

Contact
- For issues, check container logs and run `/app/entrypoint.sh info` for quick diagnostics.
