#!/usr/bin/env bash
# Camora Desktop post-build:
# Re-sign the DMG-mounted app deeply with our entitlements. electron-builder
# strips/replaces our entitlements when it signs ad-hoc on macOS Tahoe; passing
# them again here keeps audio-input bound to the cdhash.

set -euo pipefail
cd "$(dirname "$0")"

ARCH="${1:-arm64}"
ENTITLEMENTS="$(pwd)/entitlements.mac.plist"

# electron-builder places the app at mac-<arch>/ when arch is specified,
# but falls back to mac/ for default single-arch builds
APP_PATH="build/mac-${ARCH}/Camora.app"
if [[ ! -d "$APP_PATH" ]]; then
  APP_PATH="build/mac/Camora.app"
fi
if [[ ! -d "$APP_PATH" ]]; then
  echo "✗ Camora.app not found in build/mac-${ARCH}/ or build/mac/ — did electron-builder fail?" >&2
  exit 1
fi

echo "→ Re-signing $APP_PATH with entitlements"
codesign --remove-signature "$APP_PATH" 2>/dev/null || true
codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$APP_PATH"
codesign --verify --verbose=2 "$APP_PATH"

echo "→ Verifying entitlements baked in"
codesign -d --entitlements - "$APP_PATH" 2>&1 | grep -E "audio-input|network.client|apple-events" || {
  echo "✗ entitlements missing after resign" >&2
  exit 1
}

# ── Prevent duplicate/triplicate apps in Spotlight & Launchpad ──────────────
# electron-builder leaves the extracted app at build/mac-<arch>/Camora.app after
# the .dmg is already written. LaunchServices indexes that loose bundle as a
# SECOND (and, across successive builds, THIRD) "Camora" alongside the installed
# /Applications copy. The DMG is the only artifact we ship, so drop the loose
# bundle and unregister it every build. Keeps exactly one Camora in Spotlight.
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
"$LSREG" -u "$APP_PATH" 2>/dev/null || true
rm -rf build/mac-arm64/Camora.app build/mac-x64/Camora.app build/mac/Camora.app build/mac-arm64 build/mac-x64 build/mac 2>/dev/null || true
echo "→ Removed loose build app bundle (only the .dmg remains) to avoid duplicate Spotlight entries"

echo ""
VERSION="$(node -p "require('./package.json').version")"
echo "✓ Build complete: build/Camora-${VERSION}-${ARCH}.dmg"
echo ""
echo "Install with:"
echo "  hdiutil attach build/Camora-${VERSION}-${ARCH}.dmg -nobrowse -quiet"
echo "  ditto /Volumes/Camora/Camora.app /Applications/Camora.app"
echo "  hdiutil detach /Volumes/Camora -quiet"
echo "  codesign --force --deep --sign - --entitlements $ENTITLEMENTS /Applications/Camora.app"
echo "  tccutil reset Microphone com.cariara.camora"
echo "  tccutil reset ScreenCapture com.cariara.camora"
echo "  open /Applications/Camora.app"
