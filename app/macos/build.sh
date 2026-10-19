#!/bin/zsh
# Builds Palimpsest.app for macOS from this repository.
#
#   ./app/macos/build.sh               build into build/ and install into /Applications
#   ./app/macos/build.sh --no-install  build only
#
# The app reads its pages live from this repository (so edits show up without rebuilding) and falls back
# to the copies bundled inside it if the repository moves. Rebuild after changing anything in app/macos.
set -euo pipefail
cd "$(dirname "$0")"
HERE="$PWD"
ROOT="$(cd ../.. && pwd)"
APP="$ROOT/build/Palimpsest.app"
RES="$APP/Contents/Resources"
MAPLIBRE=5.8.0
LEAFLET=1.9.4

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$RES/vendor"
cp Info.plist "$APP/Contents/"
/usr/libexec/PlistBuddy -c "Add :PalimpsestSourceFolder string $ROOT" "$APP/Contents/Info.plist"
cp Resources/AppIcon.icns "$RES/"

# Bundled fallback copy of the web app, with its libraries stored locally so it starts without a CDN
cp "$ROOT/index.html" "$ROOT/compare.html" "$RES/"
cp -R "$ROOT/css" "$ROOT/js" "$ROOT/assets" "$RES/"
curl -fsSL -o "$RES/vendor/maplibre-gl.js"  "https://cdn.jsdelivr.net/npm/maplibre-gl@$MAPLIBRE/dist/maplibre-gl.js"
curl -fsSL -o "$RES/vendor/maplibre-gl.css" "https://cdn.jsdelivr.net/npm/maplibre-gl@$MAPLIBRE/dist/maplibre-gl.css"
curl -fsSL -o "$RES/vendor/leaflet.js"      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/$LEAFLET/leaflet.min.js"
curl -fsSL -o "$RES/vendor/leaflet.css"     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/$LEAFLET/leaflet.min.css"
sed -i '' -e "s#https://cdn.jsdelivr.net/npm/maplibre-gl@$MAPLIBRE/dist/#vendor/#g" "$RES/index.html"
sed -i '' -e "s#https://cdnjs.cloudflare.com/ajax/libs/leaflet/$LEAFLET/leaflet.min.#vendor/leaflet.#g" "$RES/compare.html"

# A universal binary for Apple Silicon and Intel Macs
swiftc -O -target arm64-apple-macos13.0  -o "$APP/Contents/MacOS/Palimpsest-arm64"  Sources/main.swift
swiftc -O -target x86_64-apple-macos13.0 -o "$APP/Contents/MacOS/Palimpsest-x86_64" Sources/main.swift
lipo -create -output "$APP/Contents/MacOS/Palimpsest" "$APP/Contents/MacOS/Palimpsest-arm64" "$APP/Contents/MacOS/Palimpsest-x86_64"
rm "$APP/Contents/MacOS/Palimpsest-arm64" "$APP/Contents/MacOS/Palimpsest-x86_64"
codesign --force --deep --sign - "$APP"
echo "Built $APP (reads live from $ROOT)"

if [[ "${1:-}" != "--no-install" ]]; then
  pkill -x Palimpsest 2>/dev/null || true
  rm -rf /Applications/Palimpsest.app
  cp -R "$APP" /Applications/
  echo "Installed /Applications/Palimpsest.app"
fi
