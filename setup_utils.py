#!/usr/bin/env python3
"""Setup utilities: checks for CUDA, model presence, and preflight tasks.
Provides CLI interface for entrypoint to call (no inline Python in entrypoint.sh).
"""
import sys
import argparse
import time

try:
    import pynvml
    PYNVML_AVAILABLE = True
except Exception:
    PYNVML_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False

# logging with icons
def _log(msg, icon='🚀', tag='[SYSTEM]'):
    print(f"{icon} {tag} {msg}")


def check_cuda():
    _log('Running CUDA checks', '🚀', '[SYSTEM]')
    if PYNVML_AVAILABLE:
        try:
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_name = pynvml.nvmlDeviceGetName(handle).decode()
            mem = pynvml.nvmlDeviceGetMemoryInfo(handle).total / 1024**3
            _log(f'GPU: {gpu_name} ({mem:.1f}GB)', '📊', '[STATUS]')
            return True
        except Exception as e:
            _log(f'PYNVML init error: {e}', '❌', '[STATUS]')
            return False
    elif TORCH_AVAILABLE:
        try:
            if torch.cuda.is_available():
                name = torch.cuda.get_device_name(0)
                mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
                _log(f'GPU (torch): {name} ({mem:.1f}GB)', '📊', '[STATUS]')
                return True
            else:
                _log('torch reports no CUDA available', '❌', '[STATUS]')
                return False
        except Exception as e:
            _log(f'torch CUDA probe failed: {e}', '❌', '[STATUS]')
            return False
    else:
        _log('No pynvml or torch available; cannot probe GPU', '❌', '[STATUS]')
        return False


def check_model(path='/app/models/yolov26l-seg.pt'):
    import os
    if os.path.exists(path):
        _log(f'Model present at {path}', '✅', '[VISION]')
        return True
    _log(f'Model not found at {path}', '❌', '[VISION]')
    return False


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--preflight', action='store_true')
    args = p.parse_args()
    if args.preflight:
        _log('Starting preflight checks', '🚀', '[SYSTEM]')
        check_cuda()
        check_model()
        _log('Preflight finished', '✅', '[SYSTEM]')
        sys.exit(0)
    _log('No action specified; use --preflight', '⚠️', '[SYSTEM]')
    sys.exit(1)
