#!/usr/bin/env bash
# Camora Desktop post-build:
# Re-sign the DMG-mounted app deeply with our entitlements. electron-builder
# strips/replaces our entitlements when it signs ad-hoc on macOS Tahoe; passing
# them again here keeps audio-input bound to the cdhash.

set -euo pipefail
cd "$(dirname "$0")"

APP_PATH="build/mac-arm64/Camora.app"
ENTITLEMENTS="$(pwd)/entitlements.mac.plist"

if [[ ! -d "$APP_PATH" ]]; then
  echo "✗ $APP_PATH not found — did electron-builder fail?" >&2
  exit 1
fi

echo "→ Re-signing $APP_PATH with entitlements"
codesign --remove-signature "$APP_PATH" 2>/dev/null || true
codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$APP_PATH"
codesign --verify --verbose=2 "$APP_PATH"

echo "→ Verifying entitlements baked in"
codesign -d --entitlements - "$APP_PATH" 2>&1 | grep -E "audio-input|network.client" || {
  echo "✗ entitlements missing after resign" >&2
  exit 1
}

echo ""
echo "✓ Build complete: build/Camora-2.0.0-arm64.dmg"
echo ""
echo "Install with:"
echo "  hdiutil attach build/Camora-2.0.0-arm64.dmg -nobrowse -quiet"
echo "  ditto /Volumes/Camora/Camora.app /Applications/Camora.app"
echo "  hdiutil detach /Volumes/Camora -quiet"
echo "  codesign --force --deep --sign - --entitlements $ENTITLEMENTS /Applications/Camora.app"
echo "  tccutil reset Microphone com.cariara.camora"
echo "  tccutil reset ScreenCapture com.cariara.camora"
echo "  open /Applications/Camora.app"
