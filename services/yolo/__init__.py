"""Ranitas Vision - services.yolo package initializer

Keep imports minimal and avoid side-effects on import (no background threads).
This file exists so `import services.yolo.status` works when the project is installed
or when the `services/` directory is copied into the image instead of flattening
module files into /app.
"""
__all__ = [
    'app_main',
    'vision',
    'inferencia',
    'orchestrator',
    'status',
]

# Do not import submodules here to avoid executing startup logic on import.
