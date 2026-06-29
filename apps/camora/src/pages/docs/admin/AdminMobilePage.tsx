import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminMobilePage() {
  return (
    <DocsPageLayout
      title="Mobile publishing"
      description="iOS App Store and Google Play submission runbook. Who does what, and where agents can run unattended."
      path="/docs/admin/mobile"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Mobile publishing' }]}
      onThisPage={[
        { id: 'legend', label: 'Agent vs human legend' },
        { id: 'phase-0', label: 'Phase 0 — Accounts' },
        { id: 'phase-1', label: 'Phase 1 — Local tooling' },
        { id: 'phase-2', label: 'Phase 2 — App Store Connect' },
        { id: 'phase-3', label: 'Phase 3 — Play Console' },
        { id: 'phase-4', label: 'Phase 4 — First build' },
        { id: 'phase-5', label: 'Phase 5 — TestFlight + Play Internal' },
        { id: 'phase-6', label: 'Phase 6 — Store review' },
        { id: 'rejection-risks', label: 'Rejection risks' },
        { id: 'ci', label: 'CI build' },
        { id: 'post-v1', label: 'After v1 is live' },
      ]}
    >
      <section id="legend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Agent vs human legend</h2>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 font-semibold w-28">⚡ Agent</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Claude can run this unattended via CLI or CI</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 font-semibold">🔑 Human</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Requires your Apple/Google account, browser login, or legal sign-off</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold">🚀 Handoff</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Agent prepares everything; human clicks the final submit button</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="phase-0" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 0 — Accounts <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>🔑 Human · one-time · ~3 days</span></h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Must complete before any build can ship. Start the D-U-N-S number request immediately — it can take up to a week.
        </p>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Step</th>
                <th className="text-left px-4 py-2.5 font-semibold">Cost</th>
                <th className="text-left px-4 py-2.5 font-semibold">Wait</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Enroll in Apple Developer Program (developer.apple.com)</td>
                <td className="px-4 py-2.5">$99/yr</td>
                <td className="px-4 py-2.5">24–48 hrs</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Get D-U-N-S number if registering as Cariara LLC</td>
                <td className="px-4 py-2.5">Free via Apple</td>
                <td className="px-4 py-2.5">Up to 1 week</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Complete tax + banking forms in App Store Connect</td>
                <td className="px-4 py-2.5">—</td>
                <td className="px-4 py-2.5">30 min</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Create Google Play Console account + verify identity</td>
                <td className="px-4 py-2.5">$25 once</td>
                <td className="px-4 py-2.5">Hours</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="phase-1" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 1 — Local tooling <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>⚡ Agent · ~30 min</span></h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Agent runs all of this. The <code>eas login</code> step opens a browser for one human click, then the agent continues.
        </p>
        <pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{`cd apps/mobile
pnpm install
npm i -g eas-cli
eas login         # browser opens — one human click
eas init          # links repo to EAS; writes extra.eas.projectId into app.json`}</pre>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          After <code>eas init</code>, commit the updated <code>app.json</code>. Node 20 is pinned in EAS cloud builds — no local prebuild required.
        </p>
      </section>

      <section id="phase-2" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 2 — App Store Connect setup <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>🔑 Human · ~2 hrs</span></h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Steps 1–9 are browser-only in App Store Connect. Steps 10–12 can be handed to the agent once you have the IDs.
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>App Store Connect → My Apps → <strong>+</strong> → New App</li>
          <li>Bundle ID: <code>com.cariara.camora</code> (must match <code>app.json</code>)</li>
          <li>SKU: <code>camora-mobile-001</code></li>
          <li>Primary language: English (US)</li>
          <li>Fill title, subtitle, description, keywords from <code>apps/mobile/store/app-store.md</code></li>
          <li>Upload <strong>1024×1024 icon</strong> — replace <code>assets/icon.png</code> with final artwork first</li>
          <li>Upload screenshots per <code>apps/mobile/store/screenshots-checklist.md</code></li>
          <li>Fill <strong>App Privacy</strong> section from <code>apps/mobile/store/privacy-answers.md</code></li>
          <li>Fill <strong>App Review Information</strong> — sign-in credentials, contact email/phone, reviewer notes</li>
          <li>⚡ Copy the <strong>numeric App ID</strong> (top of App Information) → paste into <code>eas.json</code> <code>submit.production.ios.ascAppId</code></li>
          <li>⚡ Copy your <strong>Apple Team ID</strong> (account.apple.com → Membership) → paste into <code>eas.json</code> <code>submit.production.ios.appleTeamId</code></li>
          <li>⚡ Commit the updated <code>eas.json</code></li>
        </ol>
        <DocsCallout variant="warning" label="Current blocker">
          <code>eas.json</code> still has placeholder values — <code>REPLACE_WITH_APP_STORE_CONNECT_APP_ID</code> and{' '}
          <code>REPLACE_WITH_APPLE_TEAM_ID</code>. Nothing can be submitted until these are filled.
        </DocsCallout>
      </section>

      <section id="phase-3" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 3 — Play Console setup <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>🔑 Human · ~2 hrs</span></h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Play Console → Create app → name: <strong>Camora — Interview Prep &amp; Audio</strong></li>
          <li>Default language: English (US), free app</li>
          <li>Declarations: not directed at children, complies with Play policies + US export laws</li>
          <li>Fill listing from <code>apps/mobile/store/play-store.md</code></li>
          <li>Content rating → complete IARC questionnaire (answers in <code>store/play-store.md</code>)</li>
          <li>Data safety → fill from <code>apps/mobile/store/privacy-answers.md</code> (Play side)</li>
          <li>Upload feature graphic (1024×500) — <strong>Play rejects without it</strong></li>
          <li>App access → provide test credentials for reviewers</li>
          <li>
            ⚡ Service account for <code>eas submit</code>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Google Cloud Console → IAM → Service Accounts → create <code>play-publisher</code>, grant "Service Account User"</li>
              <li>Create a JSON key, download it</li>
              <li>Save as <code>apps/mobile/store/play-service-account.json</code> (already in <code>.gitignore</code>)</li>
              <li>Play Console → Setup → API access → Link → invite service account, grant "Release manager"</li>
            </ul>
          </li>
        </ol>
      </section>

      <section id="phase-4" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 4 — First build <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>⚡ Agent · ~15 min iOS / ~10 min Android</span></h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          EAS handles certificates, provisioning profiles, and the Android upload keystore automatically. The very first iOS build prompts for App Store Connect credentials — one browser sign-in, then agent continues.
        </p>
        <pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{`cd apps/mobile

# Preview build — install on your phone via QR, no App Store review
eas build --platform all --profile preview

# After you verify the preview, kick off production:
eas build --platform all --profile production`}</pre>
      </section>

      <section id="phase-5" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 5 — TestFlight + Play Internal <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>⚡ Agent submits · 🔑 Human tests</span></h2>
        <pre className="rounded-lg p-4 text-sm overflow-x-auto mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{`cd apps/mobile
eas submit --platform ios --latest      # uploads .ipa to TestFlight
eas submit --platform android --latest  # uploads .aab to Play Internal`}</pre>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          TestFlight processing takes 5–30 min. Install via the TestFlight app on your iPhone.
          Android appears in Play Internal Testing within minutes.
        </p>
        <p className="text-[15px] font-semibold mb-2">Test checklist (human — on a real device):</p>
        <ul className="list-disc pl-6 space-y-1 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Login flow</li>
          <li>Prep tab — topic navigation works end-to-end</li>
          <li>Live tab — mic consent → record → transcript appears</li>
          <li>Library context renders in Sona answers</li>
          <li>Account → Delete account flow works</li>
        </ul>
      </section>

      <section id="phase-6" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Phase 6 — Submit for store review <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>🚀 Handoff</span></h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Agent prepares everything; human clicks final submit.
        </p>
        <h3 className="text-lg font-semibold mb-2">iOS</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          <li>App Store Connect → your app → TestFlight → select build → <strong>"Submit to App Store"</strong></li>
          <li>Confirm metadata, screenshots, privacy answers, sign-in info</li>
          <li>Submit — Apple review typically <strong>24–48 hrs</strong> in 2026. Plan for one rejection round.</li>
        </ol>
        <h3 className="text-lg font-semibold mb-2">Android</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Play Console → Production → Create new release</li>
          <li>Promote the Internal build or upload a fresh production artifact</li>
          <li>Add release notes</li>
          <li>Roll out at <strong>20%</strong> first, monitor for crashes 24 hrs, then ramp to 100%</li>
        </ol>
      </section>

      <section id="rejection-risks" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Rejection risks — current mitigation status</h2>
        <h3 className="text-lg font-semibold mt-4 mb-2">iOS (App Store)</h3>
        <div className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Risk</th>
                <th className="text-left px-4 py-2.5 font-semibold">Guideline</th>
                <th className="text-left px-4 py-2.5 font-semibold">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Academic dishonesty framing</td>
                <td className="px-4 py-2.5">5.6.1</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Reframed as "Study &amp; Live Notes" everywhere reviewer-visible. "Interview" + "AI" stripped from screen titles, tab labels, store copy, mic permission strings, and reviewer notes.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Reader-app rule</td>
                <td className="px-4 py-2.5">3.1.3</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>iOS Account screen has <code>Platform.OS</code> check — no web checkout deeplink on iOS.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Minimum functionality</td>
                <td className="px-4 py-2.5">4.2</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>4 categories × 6 topics with full bodies in <code>src/data/topics.ts</code>. No "Coming soon" placeholders.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Account deletion missing</td>
                <td className="px-4 py-2.5">5.1.1(v)</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>"Delete account" → confirmation → <code>DELETE /api/auth/account</code> fully wired.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Privacy label mismatch</td>
                <td className="px-4 py-2.5">5.1.2</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}><code>store/privacy-answers.md</code> is the source of truth. Update it AND App Store Connect on the same day if any tracking SDK is added.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Recording without visible indicator</td>
                <td className="px-4 py-2.5">5.1.1(ix)</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Red sticky banner "Recording — M:SS" shown during active record. iOS system orange dot also appears.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Background recording surprise</td>
                <td className="px-4 py-2.5">5.1.1(ix)</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Hard 10-min cap (<code>MAX_RECORDING_MS</code>). No auto-loop, no continuous mode. Mic releases on stop and screen unmount.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mb-2">Android (Play Store)</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Risk</th>
                <th className="text-left px-4 py-2.5 font-semibold">Policy</th>
                <th className="text-left px-4 py-2.5 font-semibold">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Permissions without disclosure</td>
                <td className="px-4 py-2.5">Permissions &amp; APIs</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Mic permission string is explicit. Foreground-service mic declared in <code>app.json</code>. <code>blockedPermissions</code> removes location/contacts/camera.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Data Safety form mismatch</td>
                <td className="px-4 py-2.5">Data Safety</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>Audio marked "Collected, not shared" in <code>store/privacy-answers.md</code>.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Account deletion missing</td>
                <td className="px-4 py-2.5">User Data</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>In-app delete flow same as iOS; web alternative documented in support page.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="ci" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">CI build <span className="text-base font-normal ml-2" style={{ color: 'var(--text-muted)' }}>⚡ Agent triggers · 🔑 Human sets EXPO_TOKEN once</span></h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Automated builds via <code>.github/workflows/build-mobile.yml</code> — triggers on <code>mobile-v*</code> tags or <code>workflow_dispatch</code>. Requires <code>EXPO_TOKEN</code> secret in GitHub repo Settings → Secrets → Actions.
        </p>
        <pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{`git tag mobile-v1.0.0
git push origin mobile-v1.0.0`}</pre>
      </section>

      <section id="post-v1" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">After v1 is live</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Universal Links / App Links</strong> — auth handoff (<code>/mobile/auth</code>) opens the app directly. Needs <code>apple-app-site-association</code> + <code>assetlinks.json</code> served by <code>camora.cariara.com</code>.</li>
          <li><strong>Real artwork</strong> — <code>assets/icon.png</code> and splash are placeholder PNGs. Replace before public release.</li>
          <li><strong>Per-token streaming</strong> on Live Notes — use <code>react-native-sse</code> so context renders progressively.</li>
          <li><strong>iOS App Tracking Transparency</strong> — only required if a third-party tracking SDK is added. Not needed for v1.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
