#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT_DIR/services"
DRY_RUN=0
YES=0

usage() {
  cat <<EOF
Usage: $0 [--dry-run] [--yes]

 --dry-run   : show what would be removed, don't delete
 --yes       : don't prompt for confirmation, proceed

This script removes local Python development artifacts under the 'services/'
directory (virtualenvs, __pycache__, .pyc files and local log files).
It is safe to run and will only operate inside the repository's services/ tree.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1; shift ;; 
    --yes) YES=1; shift ;; 
    -h|--help) usage; exit 0 ;; 
    *) echo "Unknown argument: $arg"; usage; exit 1 ;;
  esac
done

if [ ! -d "$SERVICES_DIR" ]; then
  echo "No services/ directory found at $SERVICES_DIR. Nothing to do." >&2
  exit 0
fi

# Collect targets
mapfile -t VENV_DIRS < <(find "$SERVICES_DIR" -type d -name ".venv" -print 2>/dev/null || true)
mapfile -t PYCACHE_DIRS < <(find "$SERVICES_DIR" -type d -name "__pycache__" -print 2>/dev/null || true)
mapfile -t PYC_FILES < <(find "$SERVICES_DIR" -type f -name "*.pyc" -print 2>/dev/null || true)
mapfile -t LOG_FILES < <(find "$SERVICES_DIR" -type f -name "*.log" -print 2>/dev/null || true)

if [ ${#VENV_DIRS[@]} -eq 0 ] && [ ${#PYCACHE_DIRS[@]} -eq 0 ] && [ ${#PYC_FILES[@]} -eq 0 ] && [ ${#LOG_FILES[@]} -eq 0 ]; then
  echo "No artifacts found to remove under services/."; exit 0
fi

echo "Artifacts found:"
[ ${#VENV_DIRS[@]} -gt 0 ] && printf "  %s (virtualenv)
" "${VENV_DIRS[@]}"
[ ${#PYCACHE_DIRS[@]} -gt 0 ] && printf "  %s (pycache)
" "${PYCACHE_DIRS[@]}"
[ ${#PYC_FILES[@]} -gt 0 ] && printf "  %s (pyc file)
" "${PYC_FILES[@]}"
[ ${#LOG_FILES[@]} -gt 0 ] && printf "  %s (log file)
" "${LOG_FILES[@]}"

if [ $DRY_RUN -eq 1 ]; then
  echo "\nDry-run mode: no files will be deleted."; exit 0
fi

if [ $YES -ne 1 ]; then
  read -p "Proceed to delete these artifacts? [y/N]: " REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborted by user."; exit 1
  fi
fi

# Perform deletion
for d in "${VENV_DIRS[@]:-}"; do
  echo "Removing virtualenv: $d"
  rm -rf "$d"
done
for d in "${PYCACHE_DIRS[@]:-}"; do
  echo "Removing __pycache__: $d"
  rm -rf "$d"
done
for f in "${PYC_FILES[@]:-}"; do
  echo "Removing pyc file: $f"
  rm -f "$f"
done
for f in "${LOG_FILES[@]:-}"; do
  echo "Removing log file: $f"
  rm -f "$f"
done

echo "Cleanup complete."
