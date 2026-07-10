'use strict'

// electron-builder `afterAllArtifactBuild` hook. Runs after every artifact is
// written, on EVERY electron-builder invocation — `pnpm build:dmg`, a bare
// `electron-builder --mac`, or a run from the repo root. That is the point:
// this used to live in post-build.sh, which only runs when you go through the
// npm script, so any direct invocation left a loose build/mac*/Camora.app that
// LaunchServices happily indexed as a second (then third) "Camora" in Spotlight.

const { execFileSync } = require('node:child_process')
const { existsSync, readdirSync, rmSync } = require('node:fs')
const path = require('node:path')

const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

const MAC_OUT_DIRS = ['mac', 'mac-arm64', 'mac-x64', 'mac-universal']

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// NOTE: entitlement re-signing moved to build-hooks/after-pack.js — it MUST run
// before the DMG is packaged, otherwise the shipped installer carries the raw
// unsigned Electron binary. This hook now only does post-artifact CLEANUP.

/** Drop the loose bundle and unregister it so Spotlight keeps exactly one Camora. */
function unregisterAndRemove(dir, appPath) {
  try {
    sh(LSREGISTER, ['-u', appPath])
  } catch {
    // lsregister exits non-zero when the bundle was never indexed — not an error
  }
  rmSync(dir, { recursive: true, force: true })
  console.log(`  → removed loose ${path.basename(dir)}/ (the .dmg is the only artifact we ship)`)
}

/**
 * Drop installers left over from an older version. `build:dmg-x64` never wipes
 * the output dir, so old-version DMGs pile up next to the current ones and it
 * stops being obvious which artifact is the one to install.
 */
function pruneStaleInstallers(outDir, version) {
  for (const file of readdirSync(outDir)) {
    const m = /^Camora-(\d+\.\d+\.\d+)-.*\.(dmg|blockmap|exe|zip)$/.exec(file)
    if (!m || m[1] === version) continue
    rmSync(path.join(outDir, file), { force: true })
    console.log(`  → pruned stale installer ${file} (current version is ${version})`)
  }
}

exports.default = async function afterAllArtifactBuild(buildResult) {
  if (process.platform !== 'darwin') return []

  const outDir = buildResult.outDir
  const { version } = require('../package.json')

  for (const name of MAC_OUT_DIRS) {
    const dir = path.join(outDir, name)
    const appPath = path.join(dir, 'Camora.app')
    if (!existsSync(appPath)) continue

    // Signing already happened in afterPack; here we only clear the loose
    // bundle so LaunchServices keeps exactly one indexed "Camora".
    unregisterAndRemove(dir, appPath)
  }

  pruneStaleInstallers(outDir, version)
  return []
}
