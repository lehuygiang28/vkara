#!/usr/bin/env bash
# Orchestrate: stage once → check → WGT + TizenBrew from the same tree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/stage-shell.sh"
bash "$SCRIPT_DIR/check-stage.sh"
SKIP_STAGE=1 bash "$SCRIPT_DIR/build-wgt.sh"
SKIP_STAGE=1 bash "$SCRIPT_DIR/pack-tizenbrew.sh"
