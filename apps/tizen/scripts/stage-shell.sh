#!/usr/bin/env bash
# Stage shell SoT: src/ → dist/stage/ (bake TV URL once, stamp widget version).
# Adapters must only package this tree — never re-bake.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

tizen_require_cmd python3
[[ -f "$TIZEN_PKG_JSON" ]] || tizen_die "missing $TIZEN_PKG_JSON"

tizen_resolve_tv_url
tizen_validate_tv_url "$TIZEN_TV_URL"

REQUIRED_SRC=(
    config.xml
    index.html
    icon.png
    js/main.js
    css/style.css
)
for rel in "${REQUIRED_SRC[@]}"; do
    [[ -f "$TIZEN_SRC_DIR/$rel" ]] || tizen_die "missing $TIZEN_SRC_DIR/$rel"
done

grep -q "$TIZEN_TV_URL_TOKEN" "$TIZEN_SRC_DIR/js/main.js" \
    || tizen_die "$TIZEN_SRC_DIR/js/main.js must contain $TIZEN_TV_URL_TOKEN (do not hardcode a host)"

rm -rf "$TIZEN_STAGE_DIR"
mkdir -p "$TIZEN_STAGE_DIR"
cp -R "$TIZEN_SRC_DIR"/. "$TIZEN_STAGE_DIR/"

python3 - "$TIZEN_STAGE_DIR/js/main.js" "$TIZEN_TV_URL_TOKEN" "$TIZEN_TV_URL" <<'PY'
import json, re, sys

path, token, url = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
pattern = rf"var APP_URL = '{re.escape(token)}';"
matches = list(re.finditer(pattern, text))
if len(matches) != 1:
    sys.exit(f"error: expected exactly one APP_URL placeholder assignment, found {len(matches)}")
replacement = "var APP_URL = " + json.dumps(url) + ";"
open(path, "w", encoding="utf-8").write(re.sub(pattern, replacement, text, count=1))
PY

if grep -q "$TIZEN_TV_URL_TOKEN" "$TIZEN_STAGE_DIR/js/main.js"; then
    tizen_die "placeholder $TIZEN_TV_URL_TOKEN still present after bake"
fi

python3 - "$TIZEN_STAGE_DIR/config.xml" "$TIZEN_VERSION" "$TIZEN_WGT_PACKAGE_ID" "$TIZEN_WGT_APP_ID" <<'PY'
import re, sys

path, version, package_id, app_id = sys.argv[1:5]
text = open(path, encoding="utf-8").read()
text2, n = re.subn(
    r'(<widget\b[^>]*\bversion=")[^"]*(")',
    rf"\g<1>{version}\g<2>",
    text,
    count=1,
)
if n != 1:
    sys.exit(f"error: expected one widget version attribute in {path}, found {n}")
if f'package="{package_id}"' not in text2 or f'id="{app_id}"' not in text2:
    sys.exit(f"error: config.xml must declare package={package_id} id={app_id}")
open(path, "w", encoding="utf-8").write(text2)
PY

echo "staged → $TIZEN_STAGE_DIR"
echo "  version=$TIZEN_VERSION"
echo "  APP_URL=$TIZEN_TV_URL"
echo "  source=$TIZEN_TV_URL_SOURCE"
