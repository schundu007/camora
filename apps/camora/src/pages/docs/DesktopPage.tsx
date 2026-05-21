import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsSection from '../../components/shared/docs/DocsSection';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function DesktopDocsPage() {
  return (
    <DocsPageLayout
      title="Desktop app"
      description="Native macOS shell that adds system audio loopback, native screenshot capture, real PDF/DOCX export, and a global show/hide hotkey."
      path="/docs/desktop"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Desktop app' }]}
      onThisPage={[
        { id: 'why-desktop', label: 'Why use the desktop app' },
        { id: 'install', label: 'Install' },
        { id: 'features', label: 'What you get' },
        { id: 'hotkeys', label: 'Hotkeys' },
        { id: 'privacy', label: 'Hiding the window' },
        { id: 'limits', label: 'Current limitations' },
      ]}
    >
      <DocsSection id="why-desktop" title="Why use the desktop app">
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
          The desktop app is the same Camora web frontend embedded in a native shell. It exists for
          a few capabilities that browsers can't provide cleanly:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-primary)' }}>
          <li><strong>System audio loopback</strong> — capture interviewer audio from Zoom / Meet / Teams
          without virtual cables (BlackHole, VoiceMeeter). The app routes loopback through ScreenCaptureKit
          on macOS.</li>
          <li><strong>Native screenshot capture</strong> — interactive window picker via macOS&apos;s built-in
          <code className="mx-1 px-1.5 py-0.5 text-[12px]" style={{ background: 'var(--bg-elevated)', borderRadius: 4 }}>screencapture -W</code>,
          producing a real PNG at full resolution.</li>
          <li><strong>Cmd+B global hotkey</strong> — instantly hide or show the window from any app.</li>
          <li><strong>Real PDF / DOCX export</strong> — uses Chromium&apos;s printToPDF and the
          <code className="mx-1 px-1.5 py-0.5 text-[12px]" style={{ background: 'var(--bg-elevated)', borderRadius: 4 }}>docx</code> package
          for proper documents (not browser screenshots).</li>
          <li><strong>Mic permission at launch</strong> — one-time prompt when the app first opens, so
          you&apos;re not surprised by a permission dialog mid-interview.</li>
        </ul>
      </DocsSection>

      <DocsSection id="install" title="Install">
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
          Visit <Link to="/download" className="text-[var(--accent)] underline">/download</Link> and grab
          the macOS DMG. Currently the desktop app ships <strong>Apple Silicon only</strong> (M1 / M2 /
          M3 / M4). Intel Macs, Windows, and Linux builds are on the roadmap.
        </p>
        <DocsCallout variant="note">
          On first launch, macOS will prompt for microphone access. Approve it. If you
          plan to use the screenshot feature, also approve the Screen Recording permission
          when prompted &mdash; it&apos;s required for full-resolution capture.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="features" title="What you get">
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          All Camora features &mdash; live session, coding helper, system design, prep &mdash; work
          identically to the web app, because the desktop shell loads the same frontend at
          camora.cariara.com. The differences are OS-level capabilities the browser can&apos;t reach:
          system audio loopback, native screenshots, real document export, and a global show/hide
          hotkey.
        </p>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-primary)' }}>
          The HTTP cache is wiped on every launch so a fresh Vercel deploy never shows you stale
          chunks &mdash; you don&apos;t have to manually quit-and-relaunch after we ship a fix.
        </p>
      </DocsSection>

      <DocsSection id="hotkeys" title="Hotkeys">
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-primary)' }}>
          <li><strong>Cmd+B</strong> &mdash; toggle window visibility (works from any app, even
          when Camora is hidden).</li>
          <li><strong>Cmd+R</strong> &mdash; hard-reload, ignoring cache. Use if a chunk-hash
          mismatch ever happens.</li>
          <li><strong>Cmd+Shift+R</strong> &mdash; same as Cmd+R (alternate binding for muscle
          memory from browsers).</li>
        </ul>
      </DocsSection>

      <DocsSection id="privacy" title="Hiding the window">
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
          The desktop app does <strong>not</strong> hide itself from screen-capture APIs &mdash; if you
          full-screen share your display, the Camora window will be visible to whoever you&apos;re
          sharing with. The recommended workflow is:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-primary)' }}>
          <li>Share only the meeting tab (Zoom &ldquo;Share Window&rdquo;, Meet share-tab) instead of
          your whole screen.</li>
          <li>If you must share the whole screen, hit <strong>Cmd+B</strong> to hide Camora before
          starting the share. Cmd+B again to bring it back when you need it.</li>
        </ol>
        <DocsCallout variant="warning">
          Don&apos;t rely on positioning, opacity tricks, or virtual desktops for invisibility &mdash;
          screen-capture APIs see all of it. Use Cmd+B and tab-share-only as your discipline.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="limits" title="Current limitations">
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-primary)' }}>
          <li><strong>macOS Apple Silicon only</strong> &mdash; no Intel Mac, Windows, or Linux
          builds yet.</li>
          <li><strong>No auto-update</strong> &mdash; when we ship a new desktop release, you&apos;ll
          need to download a fresh DMG. We&apos;ll email subscribers when that happens.</li>
          <li><strong>No system tray</strong> &mdash; close button quits the window. Cmd+B is the
          recommended way to keep Camora alive in the background.</li>
        </ul>
      </DocsSection>
    </DocsPageLayout>
  );
}
