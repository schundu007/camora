# Mobile Publishing — iOS App Store & Google Play

Publishing runbook for `apps/mobile` (Expo + EAS). Each step is marked with who does the work.

**Legend:**
- ⚡ **Agent** — Claude can run this unattended
- 🔑 **Human** — requires your Apple/Google account, browser login, or legal sign-off
- 🚀 **Handoff** — agent prepares, human clicks final "Submit"

---

## Phase 0 — Accounts

> One-time setup. Must complete before any build can ship.

| Step | Who | Notes |
|------|-----|-------|
| Enroll in Apple Developer Program (developer.apple.com) | 🔑 Human | $99/yr. Takes 24–48 hrs to verify. |
| Get D-U-N-S number if registering as Cariara LLC | 🔑 Human | Free via Apple. Up to a week — start immediately if needed. |
| Complete tax + banking forms in App Store Connect | 🔑 Human | account.apple.com → Agreements. ~30 min in browser. |
| Create Google Play Console account | 🔑 Human | $25 one-time. Verify identity + complete tax/banking forms. |

---

## Phase 1 — Local Tooling

> ⚡ Agent handles this entirely.

```bash
cd apps/mobile
pnpm install
npm i -g eas-cli
eas login              # opens browser for Expo account — one human click, then agent continues
eas init               # links repo to EAS project; writes extra.eas.projectId into app.json
```

After `eas init`, commit the updated `app.json`.

**Note:** `eas.json` is already committed. Node 20 is pinned in EAS cloud builds — no local prebuild required before submitting.

---

## Phase 2 — App Store Connect Setup

> 🔑 Human does initial app creation; ⚡ Agent can fill `eas.json` once IDs are known.

1. App Store Connect → My Apps → **+** → New App
2. Bundle ID: `com.cariara.camora` (must match `app.json`)
3. SKU: `camora-mobile-001`
4. Primary language: English (US)
5. Fill title, subtitle, description, keywords from `store/app-store.md`
6. Upload **1024×1024 icon** (`assets/icon.png` — replace with final artwork first)
7. Upload screenshots per `store/screenshots-checklist.md`
8. Fill **App Privacy** section from `store/privacy-answers.md`
9. Fill **App Review Information** — sign-in credentials, contact email/phone, notes for reviewer
10. Copy the **numeric App ID** from the top of App Information → paste into `eas.json` `submit.production.ios.ascAppId`
11. Copy your **Apple Team ID** (account.apple.com → Membership) → paste into `eas.json` `submit.production.ios.appleTeamId`
12. Commit the updated `eas.json`

> Steps 1–9 are browser-only actions in App Store Connect. Agent can handle steps 10–12 once you paste the IDs.

---

## Phase 3 — Play Console Setup

> 🔑 Human does browser setup; ⚡ Agent can wire up the service account key.

1. Play Console → Create app → name: **"Camora — Interview Prep & Audio"**
2. Default language: English (US), free app
3. Declarations: not directed at children, complies with Play policies and US export laws
4. Fill listing from `store/play-store.md`
5. Content rating → complete IARC questionnaire (answers in `store/play-store.md`)
6. Data safety → fill from `store/privacy-answers.md` (Play side)
7. Upload feature graphic (1024×500) — **Play rejects without it**
8. App access → provide test credentials so reviewers can log in
9. Service account for `eas submit`:
   - Google Cloud Console → IAM → Service Accounts → create `play-publisher`
   - Grant role "Service Account User"
   - Create a JSON key, download it
   - Save as `apps/mobile/store/play-service-account.json` (already in `.gitignore`)
   - Play Console → Setup → API access → Link → invite service account, grant "Release manager"

---

## Phase 4 — First Build

> ⚡ Agent runs this unattended (~15 min iOS, ~10 min Android).

```bash
cd apps/mobile

# Internal preview — install on your phone via QR, no review needed
eas build --platform all --profile preview

# After you approve the preview, production builds:
eas build --platform all --profile production
```

EAS handles certificates, provisioning profiles, and the Android upload keystore automatically. The first iOS build prompts for App Store Connect credentials — a browser sign-in is needed once, then agent continues.

**Current blocker:** `eas.json` has placeholder values that must be filled first (see Phase 2 steps 10–11):
```json
"ascAppId": "REPLACE_WITH_APP_STORE_CONNECT_APP_ID",
"appleTeamId": "REPLACE_WITH_APPLE_TEAM_ID"
```

---

## Phase 5 — Submit to TestFlight + Play Internal

> ⚡ Agent runs the submit commands; 🔑 Human installs and tests on real device.

```bash
cd apps/mobile
eas submit --platform ios --latest      # uploads .ipa to TestFlight
eas submit --platform android --latest  # uploads .aab to Play Internal
```

- **iOS:** TestFlight processing takes 5–30 min. Install via TestFlight app on your iPhone.
- **Android:** Appears in Play Internal Testing within minutes via opt-in link.

**Test checklist (human):**
- [ ] Login flow
- [ ] Prep tab — topic navigation works
- [ ] Live tab — mic consent → record → transcript appears
- [ ] Library context renders in Sona answers
- [ ] Account → Delete account flow works

---

## Phase 6 — Submit for Store Review

> 🚀 Handoff — agent can prepare everything; human clicks final submit.

**iOS:**
1. App Store Connect → your app → TestFlight → select build → **"Submit to App Store"**
2. Confirm metadata, screenshots, privacy answers, sign-in info
3. Submit — Apple review: typically **24–48 hrs** in 2026. Plan for one rejection round.

**Android:**
1. Play Console → Production → Create new release
2. Promote the Internal build or upload a fresh production artifact
3. Add release notes
4. Roll out at **20%** initially, monitor for crashes 24 hrs, then ramp to 100%

---

## Rejection Risks — Current Mitigation Status

### iOS (App Store)

| Risk | Guideline | Status |
|------|-----------|--------|
| Academic dishonesty framing | 5.6.1 | App reframed as "Study & Live Notes" everywhere reviewer-visible. "Interview" and "AI" stripped from screen titles, tab labels, store description, keywords, mic permission strings, and reviewer notes. |
| Reader-app rule (no web checkout deeplink) | 3.1.3 | iOS Account screen has `Platform.OS` check — no web checkout link on iOS. |
| Minimum functionality | 4.2 | 4 categories × 6 topics with full bodies wired in `src/data/topics.ts`. No "Coming soon" placeholders. |
| Account deletion missing | 5.1.1(v) | "Delete account" → confirmation → `DELETE /api/auth/account` fully wired. |
| Privacy nutrition label mismatch | 5.1.2 | `store/privacy-answers.md` is the source of truth. Update it AND App Store Connect on the same day if any tracking SDK is added. |
| Recording without visible indicator | 5.1.1(ix) | Red sticky banner shows "Recording — M:SS" during active record. iOS system orange dot also appears. |
| Background recording surprise | 5.1.1(ix) | Hard 10-min cap (`MAX_RECORDING_MS`). No auto-loop, no continuous mode. Mic releases on stop and screen unmount. |

### Android (Play Store)

| Risk | Policy | Status |
|------|--------|--------|
| Sensitive permissions without disclosure | Permissions & APIs | Mic permission string is explicit. Foreground-service mic declared in `app.json`. `blockedPermissions` removes location/contacts/camera. |
| Data Safety form mismatch | Data Safety | Audio marked "Collected, not shared" in `store/privacy-answers.md`. |
| Account deletion missing | User Data | In-app delete flow same as iOS; web alternative documented in support page. |

---

## After v1 is Live

- **Universal Links / App Links** — so the auth handoff (`/mobile/auth`) opens the app directly. Needs `apple-app-site-association` + `assetlinks.json` served by `camora.cariara.com`.
- **Real artwork** — `assets/icon.png` and splash are placeholder PNGs. Replace before first public release.
- **Per-token streaming** on Live Notes — use `react-native-sse` so context renders progressively instead of arriving in one chunk.
- **iOS App Tracking Transparency** — only required if a third-party tracking SDK is added. Not needed for v1.

---

## CI Workflows (GitHub Actions)

> ⚡ Agent triggers; 🔑 Human must set secrets once.

### build-mobile.yml — tag-triggered build (fire and forget)

Triggered by `mobile-v*` tags or `workflow_dispatch`. Fires an EAS build with `--no-wait` and exits. No human gates, no submission. Use to queue a build without going through the full deploy pipeline.

```bash
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
```

Required secret: `EXPO_TOKEN` (Settings → Secrets → Actions).

---

### deploy-ios.yml — 5-stage deployment pipeline with human gates

Triggered manually via `workflow_dispatch` (Actions → Deploy iOS → Run workflow). Waits for the build to complete and threads a build ID through each stage.

| Stage | Role | What happens |
|-------|------|-------------|
| 1 — Preflight + build | ⚡ Agent | Checks `eas.json` has no placeholders → `eas build --wait --json` → captures build ID |
| 2 — TestFlight gate | 🔑 Human | GitHub emails you → "Review pending deployments" → Approve |
| 3 — TestFlight upload | ⚡ Agent | `eas submit --platform ios --id <build-id>` |
| 4 — Device test gate | 🔑 Human | Install from TestFlight, run the checklist, Approve |
| 5 — App Store review | ⚡ Agent | Submits via ASC API; falls back to a direct App Store Connect link if secrets absent |

**One-time setup (do this before first run):**
1. GitHub → Settings → Environments → create `ios-testflight-gate`, add yourself as required reviewer
2. GitHub → Settings → Environments → create `ios-appstore-gate`, add yourself as required reviewer
3. Add secrets for Stage 5 automation (optional — Stage 5 falls back gracefully if absent):
   - `ASC_API_KEY_ID` — Key ID from App Store Connect API Keys
   - `ASC_API_ISSUER_ID` — Issuer ID from App Store Connect
   - `ASC_API_PRIVATE_KEY` — full contents of `AuthKey_*.p8`

Full native runbook with per-platform detail lives at `apps/mobile/PUBLISHING.md`.
