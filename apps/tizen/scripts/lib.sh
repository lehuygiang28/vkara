#!/usr/bin/env bash
# Shared helpers for apps/tizen packaging. Sourced by other scripts — do not run directly.
# shellcheck shell=bash

if [[ -n "${VKARA_TIZEN_LIB_LOADED:-}" ]]; then
    return 0
fi
VKARA_TIZEN_LIB_LOADED=1

TIZEN_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIZEN_SRC_DIR="$TIZEN_APP_DIR/src"
TIZEN_DIST_DIR="$TIZEN_APP_DIR/dist"
TIZEN_STAGE_DIR="$TIZEN_DIST_DIR/stage"
TIZEN_PKG_JSON="$TIZEN_APP_DIR/package.json"
TIZEN_TV_URL_TOKEN='__VKARA_TV_URL__'
TIZEN_WGT_PACKAGE_ID='VkaraApp01'
TIZEN_WGT_APP_ID='VkaraApp01.vkara'
TIZEN_WGT_OUT="$TIZEN_DIST_DIR/vKara.wgt"
TIZEN_BREW_DIR="$TIZEN_DIST_DIR/tizenbrew"
TIZEN_BREW_TEMPLATE="$TIZEN_APP_DIR/tizenbrew/package.template.json"

tizen_die() {
    echo "error: $*" >&2
    exit 1
}

tizen_require_cmd() {
    local cmd="$1"
    local hint="${2:-}"
    command -v "$cmd" >/dev/null 2>&1 || tizen_die "'$cmd' is required${hint:+ ($hint)}"
}

tizen_read_pkg() {
    # Prints: version\ndefaultTvUrl\n
    python3 - "$TIZEN_PKG_JSON" <<'PY'
import json, sys
path = sys.argv[1]
try:
    pkg = json.load(open(path, encoding="utf-8"))
except OSError as exc:
    sys.exit(f"error: cannot read {path}: {exc}")
version = str(pkg.get("version") or "").strip()
default_url = str((pkg.get("vkara") or {}).get("defaultTvUrl") or "").strip()
if not version:
    sys.exit(f"error: missing version in {path}")
if not default_url:
    sys.exit(f"error: missing vkara.defaultTvUrl in {path}")
print(version)
print(default_url)
PY
}

tizen_resolve_tv_url() {
    # Sets: TIZEN_VERSION, TIZEN_DEFAULT_TV_URL, TIZEN_TV_URL, TIZEN_TV_URL_SOURCE
    local fields
    mapfile -t fields < <(tizen_read_pkg)
    TIZEN_VERSION="${fields[0]:-}"
    TIZEN_DEFAULT_TV_URL="${fields[1]:-}"
    if [[ -n "${VKARA_TV_URL:-}" ]]; then
        TIZEN_TV_URL="$VKARA_TV_URL"
        TIZEN_TV_URL_SOURCE="VKARA_TV_URL"
    else
        TIZEN_TV_URL="$TIZEN_DEFAULT_TV_URL"
        TIZEN_TV_URL_SOURCE="package.json vkara.defaultTvUrl"
    fi
}

tizen_validate_tv_url() {
    python3 - "$1" <<'PY'
import re, sys
url = sys.argv[1]
if not re.match(r"^https?://.+$", url):
    sys.exit(f"error: TV URL must match https?://... (got: {url!r})")
if any(ch in url for ch in ("\n", "\r", "\0")):
    sys.exit("error: TV URL must not contain control characters")
PY
}

tizen_ensure_stage_dir() {
    [[ -d "$TIZEN_STAGE_DIR" ]] || tizen_die "missing staged tree at $TIZEN_STAGE_DIR — run: bun run --cwd apps/tizen stage"
}
