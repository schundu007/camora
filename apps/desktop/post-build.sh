#!/usr/bin/env bash
# Camora Desktop post-build.
#
# Re-signing, entitlement verification, loose-bundle removal and stale-DMG
# pruning used to live here. They now live in the electron-builder
# `afterAllArtifactBuild` hook (build-hooks/after-all-artifact-build.js) so they
# run on EVERY build. A direct `electron-builder --mac` skipped this script and
# left a loose build/mac*/Camora.app that Spotlight indexed as a duplicate.
#
# What remains here: a safety net, and the install recipe.

set -euo pipefail
cd "$(dirname "$0")"

ARCH="${1:-arm64}"
VERSION="$(node -p "require('./package.json').version")"
DMG="build/Camora-${VERSION}-${ARCH}.dmg"
ENTITLEMENTS="$(pwd)/entitlements.mac.plist"

if [[ ! -f "$DMG" ]]; then
  echo "✗ $DMG not found — did electron-builder fail?" >&2
  exit 1
fi

# Belt and braces: if a loose bundle survived (hook disabled, older
# electron-builder), take it out before LaunchServices indexes it.
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
for d in build/mac build/mac-arm64 build/mac-x64 build/mac-universal; do
  if [[ -d "$d/Camora.app" ]]; then
    echo "⚠ loose bundle survived the build hook: $d/Camora.app — removing"
    "$LSREG" -u "$(pwd)/$d/Camora.app" 2>/dev/null || true
    rm -rf "$d"
  fi
done

echo ""
echo "✓ Build complete: $DMG"
echo ""
echo "Install with:"
echo "  hdiutil attach $DMG -nobrowse -quiet"
echo "  ditto /Volumes/Camora/Camora.app /Applications/Camora.app"
echo "  hdiutil detach /Volumes/Camora -quiet"
echo "  codesign --force --deep --sign - --entitlements $ENTITLEMENTS /Applications/Camora.app"
echo "  tccutil reset Microphone com.cariara.camora"
echo "  tccutil reset ScreenCapture com.cariara.camora"
echo "  open /Applications/Camora.app"
