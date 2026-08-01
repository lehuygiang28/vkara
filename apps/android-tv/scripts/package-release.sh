#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VER="$(node -p "require('$ROOT/package.json').version")"
SRC="${1:-}"
OUT_DIR="$ROOT/dist"
mkdir -p "$OUT_DIR"

if [[ -z "$SRC" ]]; then
  shopt -s nullglob
  CANDIDATES=("$OUT_DIR"/*.apk "$ROOT"/*.apk)
  if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
    echo "usage: package-release.sh <path-to.apk>" >&2
    exit 1
  fi
  SRC="${CANDIDATES[0]}"
fi

OUT="$OUT_DIR/vKara-tv-${VER}.apk"
cp -f "$SRC" "$OUT"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT" | awk '{print $1}' > "${OUT}.sha256"
else
  shasum -a 256 "$OUT" | awk '{print $1}' > "${OUT}.sha256"
fi
echo "packed: $OUT"
echo "sha256: $(cat "${OUT}.sha256")"
