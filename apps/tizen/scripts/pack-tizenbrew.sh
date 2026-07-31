#!/usr/bin/env bash
# Package TizenBrew app module from dist/stage/ (no URL bake here).
#
# Usage:
#   bun run build:tizen:tizenbrew
#   SKIP_STAGE=1 bun run build:tizen:tizenbrew
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

tizen_require_cmd npm "Node.js npm is required to pack"
tizen_require_cmd python3
tizen_resolve_tv_url

[[ -f "$TIZEN_BREW_TEMPLATE" ]] || tizen_die "missing $TIZEN_BREW_TEMPLATE"

if [[ "${SKIP_STAGE:-0}" != "1" ]]; then
    bash "$SCRIPT_DIR/stage-shell.sh"
    bash "$SCRIPT_DIR/check-stage.sh"
else
    tizen_ensure_stage_dir
    bash "$SCRIPT_DIR/check-stage.sh"
fi

rm -rf "$TIZEN_BREW_DIR"
mkdir -p "$TIZEN_BREW_DIR/js" "$TIZEN_BREW_DIR/css"

cp "$TIZEN_STAGE_DIR/index.html" "$TIZEN_BREW_DIR/"
cp "$TIZEN_STAGE_DIR/icon.png" "$TIZEN_BREW_DIR/"
cp "$TIZEN_STAGE_DIR/js/main.js" "$TIZEN_BREW_DIR/js/"
cp "$TIZEN_STAGE_DIR/css/style.css" "$TIZEN_BREW_DIR/css/"

python3 - "$TIZEN_BREW_TEMPLATE" "$TIZEN_BREW_DIR/package.json" "$TIZEN_VERSION" <<'PY'
import json, sys

template_path, out_path, version = sys.argv[1:4]
with open(template_path, encoding="utf-8") as f:
    pkg = json.load(f)
pkg["version"] = version
pkg["name"] = pkg.get("name") or "@vkara/tv"
pkg["private"] = False
pkg.setdefault("publishConfig", {})["access"] = "public"
pkg.setdefault("repository", {})["url"] = "https://github.com/lehuygiang28/vkara"
required = ("packageType", "appName", "appPath", "keys")
missing = [k for k in required if k not in pkg]
if missing:
    sys.exit(f"error: TizenBrew template missing fields: {', '.join(missing)}")
if pkg.get("packageType") != "app":
    sys.exit("error: packageType must be 'app'")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")
PY

PKG_NAME="$(python3 -c 'import json; print(json.load(open("'"$TIZEN_BREW_DIR"'/package.json"))["name"])')"

[[ ! -e "$TIZEN_BREW_DIR/config.xml" ]] || tizen_die "config.xml must not be included in TizenBrew package"

TGZ_NAME="$(cd "$TIZEN_BREW_DIR" && npm pack --silent)"
[[ -n "$TGZ_NAME" && -f "$TIZEN_BREW_DIR/$TGZ_NAME" ]] || tizen_die "npm pack did not produce a .tgz"

rm -f "$TIZEN_DIST_DIR"/vkara-tv-*.tgz "$TIZEN_DIST_DIR"/lehuygiang28-vkara-*.tgz "$TIZEN_DIST_DIR"/vkara-[0-9]*.tgz "$TIZEN_DIST_DIR"/vkara-tizenbrew-*.tgz
mv "$TIZEN_BREW_DIR/$TGZ_NAME" "$TIZEN_DIST_DIR/$TGZ_NAME"

echo "tizenbrew → $TIZEN_BREW_DIR (name=$PKG_NAME v$TIZEN_VERSION)"
echo "tarball → $TIZEN_DIST_DIR/$TGZ_NAME"
echo "install: TizenBrew Module Manager → $PKG_NAME"
