#!/usr/bin/env bash
# Package unsigned WGT from dist/stage/ (zip only — no URL bake here).
#
# Usage:
#   bun run build:tizen:wgt          # stage + check + zip
#   SKIP_STAGE=1 bun run build:tizen:wgt   # zip existing stage (build:all)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

tizen_require_cmd zip "install zip / use WSL on Windows"
tizen_require_cmd python3
tizen_resolve_tv_url

if [[ "${SKIP_STAGE:-0}" != "1" ]]; then
    bash "$SCRIPT_DIR/stage-shell.sh"
    bash "$SCRIPT_DIR/check-stage.sh"
else
    tizen_ensure_stage_dir
    bash "$SCRIPT_DIR/check-stage.sh"
fi

mkdir -p "$TIZEN_DIST_DIR"
rm -f "$TIZEN_WGT_OUT"
(
    cd "$TIZEN_STAGE_DIR"
    zip -r -X -q "$TIZEN_WGT_OUT" .
)

SIZE="$(du -h "$TIZEN_WGT_OUT" | cut -f1 | tr -d ' ')"
echo "wgt → $TIZEN_WGT_OUT (v$TIZEN_VERSION, $SIZE)"
echo "sideload: Apps2Samsung → custom .wgt → $TIZEN_WGT_OUT"
echo "optional sign: tizen package -t wgt -s <profile> -- $TIZEN_STAGE_DIR"
