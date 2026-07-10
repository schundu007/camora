'use strict'

// electron-builder `afterPack` hook. Runs AFTER the app is packed into
// context.appOutDir but BEFORE the DMG/zip artifact is created — so the app we
// sign here is the one that actually ships inside the installer.
//
// Why this exists: signing used to live in `afterAllArtifactBuild`, which runs
// AFTER the DMG is already packaged. That only re-signed a throwaway loose
// bundle (which the cleanup step then deletes), so every shipped DMG carried
// the raw prebuilt Electron signature — `Identifier=Electron`, adhoc,
// linker-signed, with NO entitlements. On stricter macOS that reads as a broken
// signature and the mic entitlement is absent. electron-builder itself signs
// nothing here (`mac.identity: null` skips its signing step), so the signature
// we apply in afterPack is final and survives into the DMG.

const { execFileSync } = require('node:child_process')
const path = require('node:path')

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/** Ad-hoc re-sign with our entitlements and assert they stuck to the cdhash. */
function resignAndVerify(appPath, entitlements) {
  console.log(`  → [afterPack] signing ${path.basename(appPath)} with entitlements`)
  try {
    sh('codesign', ['--remove-signature', appPath])
  } catch {
    // unsigned already — fine
  }
  sh('codesign', ['--force', '--deep', '--sign', '-', '--entitlements', entitlements, appPath])
  sh('codesign', ['--verify', '--verbose=2', appPath])

  let dumped = ''
  try {
    dumped = execFileSync('codesign', ['-d', '--entitlements', '-', appPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (err) {
    dumped = String(err.stdout || '') + String(err.stderr || '')
  }
  for (const ent of ['audio-input', 'network.client', 'apple-events']) {
    if (!dumped.includes(ent)) {
      throw new Error(`entitlement "${ent}" missing after re-sign of ${appPath}`)
    }
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = path.join(context.appOutDir, appName)
  const entitlements = path.join(__dirname, '..', 'entitlements.mac.plist')
  resignAndVerify(appPath, entitlements)
}
