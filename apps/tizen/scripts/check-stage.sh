#!/usr/bin/env bash
# Pure contract checks for src/ + dist/stage/. Does not mutate files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

tizen_require_cmd python3
tizen_ensure_stage_dir
tizen_resolve_tv_url

python3 - \
    "$TIZEN_SRC_DIR/js/main.js" \
    "$TIZEN_STAGE_DIR/js/main.js" \
    "$TIZEN_STAGE_DIR/config.xml" \
    "$TIZEN_TV_URL_TOKEN" \
    "$TIZEN_TV_URL" \
    "$TIZEN_VERSION" \
    "$TIZEN_WGT_PACKAGE_ID" \
    "$TIZEN_WGT_APP_ID" <<'PY'
import json, re, sys

src_main, stage_main, config_xml, token, expected_url, version, package_id, app_id = sys.argv[1:]

src = open(src_main, encoding="utf-8").read()
stage = open(stage_main, encoding="utf-8").read()
config = open(config_xml, encoding="utf-8").read()

if token not in src:
    sys.exit(f"error: source must keep placeholder {token}")
if token in stage:
    sys.exit(f"error: staged main.js still contains placeholder {token}")

match = re.search(r"var APP_URL = (.+);", stage)
if not match:
    sys.exit("error: staged main.js missing APP_URL assignment")
try:
    baked = json.loads(match.group(1))
except json.JSONDecodeError as exc:
    sys.exit(f"error: staged APP_URL is not a JSON string: {exc}")
if baked != expected_url:
    sys.exit(f"error: staged APP_URL mismatch (got {baked!r}, expected {expected_url!r})")

if f'version="{version}"' not in config:
    sys.exit(f"error: staged config.xml version != {version}")
if f'package="{package_id}"' not in config or f'id="{app_id}"' not in config:
    sys.exit(f"error: staged config.xml must use {package_id} / {app_id}")

print(f"check-stage: OK (version={version} APP_URL={expected_url})")
PY
