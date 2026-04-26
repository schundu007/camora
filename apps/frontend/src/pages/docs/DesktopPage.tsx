import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function DesktopDocsPage() {
  return (
    <DocsPageLayout
      title="Desktop app"
      description="Stealth-mode Camora client with global hotkey, system audio, screen-share invisibility, and BYOK API keys."
      path="/docs/desktop"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Desktop app' }]}
      onThisPage={[
        { id: 'why-desktop', label: 'Why use the desktop app' },
        { id: 'install', label: 'Install' },
        { id: 'features', label: 'Features' },
        { id: 'byok', label: 'Bring your own keys (BYOK)' },
        { id: 'business-license', label: 'Business 10-seat license' },
      ]}
    >
      <section id="why-desktop" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Why use the desktop app</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Screen-share invisible</strong> — the window is excluded from screen capture by OS-level APIs. Interviewers literally can't see Camora when you full-screen share.</li>
          <li><strong>Global hotkey</strong> — Cmd+Shift+C (or Ctrl+Shift+C on Windows) summons Camora over any app, even when it's hidden.</li>
          <li><strong>System tray</strong> — closes to tray, not quit. Your session stays alive across calls.</li>
          <li><strong>Native mic permission</strong> — no browser prompt mid-call.</li>
        </ul>
      </section>

      <section id="install" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Install</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Visit <Link to="/download" className="text-[var(--accent)] underline">/download</Link> and pick your platform.
          Camora auto-detects macOS (Apple Silicon vs Intel), Windows, and Linux. Auto-update is built in,
          so you'll always have the latest features without re-downloading.
        </p>
      </section>

      <section id="features" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Features</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The desktop app is the same Camora web frontend embedded in an Electron shell. All features
          (Lumora live, coding helper, system design, prep) work identically. The differences are
          OS-level capabilities the browser can't provide: invisibility to screen capture, global hotkeys,
          tray integration.
        </p>
      </section>

      <section id="byok" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Bring your own keys (BYOK)</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Desktop Lifetime ($99) is a BYOK-only license — you supply your own OpenAI / Anthropic API keys
          in the desktop app's settings, and AI calls go directly from your machine to those providers.
          No Camora-side metering, no AI hour pool. Useful for power users who already pay for
          ChatGPT Plus or Claude Pro.
        </p>
        <DocsCallout variant="note">
          BYOK isn't free either — you're paying API costs to OpenAI / Anthropic per token. For most
          interview prep, the regular Pro Max pool is cheaper.
        </DocsCallout>
      </section>

      <section id="business-license" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Business 10-seat license</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Business Desktop Lifetime ($999) lets you install on up to 10 machines. Useful for bootcamps,
          recruiting teams, or coaching agencies that want all their candidates on the desktop client.
          Same BYOK model — each install uses its own API keys.
        </p>
      </section>
    </DocsPageLayout>
  );
}
