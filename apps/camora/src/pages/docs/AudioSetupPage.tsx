import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function AudioSetupDocsPage() {
  return (
    <DocsPageLayout
      title="Audio setup"
      description="Camora works with any microphone, speakers, and meeting platform. Pick the path that matches your setup — most users only need the auto-detected default."
      path="/docs/audio-setup"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Audio setup' }]}
      onThisPage={[
        { id: 'overview', label: 'How Camora hears the interview' },
        { id: 'pick-method', label: 'Pick the right method' },
        { id: 'desktop-app', label: 'Desktop app — easiest' },
        { id: 'browser-tab', label: 'Browser tab share' },
        { id: 'virtual-loopback', label: 'Virtual loopback (BlackHole / VoiceMeeter)' },
        { id: 'mic-only', label: 'Mic-only fallback' },
        { id: 'devices', label: 'Microphone & speakers' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
      ]}
    >
      <section id="overview" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How Camora hears the interview</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora captures two streams during a live interview:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Your microphone</strong> — picks up your own voice. Used for self-prompting and post-call review.</li>
          <li><strong>The interviewer's voice</strong> — captured separately so the AI assistant can answer the questions you're being asked.</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          The first time you open the interview screen, the audio setup wizard runs automatically. It picks the best capture path for your environment, lets you confirm with a live level meter, and saves your choice for next time.
        </p>
        <DocsCallout variant="tip">
          Use headphones during the interview. With speakers, the interviewer's voice leaks into your mic and Camora's echo cancellation strips it before we can analyze it.
        </DocsCallout>
      </section>

      <section id="pick-method" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Pick the right method</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The wizard auto-selects, but here's how to choose if you're overriding:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="py-2 pr-4 font-bold" style={{ color: 'var(--text-primary)' }}>Your setup</th>
                <th className="py-2 pr-4 font-bold" style={{ color: 'var(--text-primary)' }}>Best method</th>
                <th className="py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Setup cost</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 pr-4">Camora desktop app + any meeting client</td>
                <td className="py-2 pr-4">Desktop loopback</td>
                <td className="py-2">None</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 pr-4">Chrome / Edge browser + Zoom Web / Google Meet / Teams Web</td>
                <td className="py-2 pr-4">Tab share</td>
                <td className="py-2">None</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 pr-4">Browser + native Zoom / Teams / Webex desktop client</td>
                <td className="py-2 pr-4">Virtual loopback</td>
                <td className="py-2">Install BlackHole / VoiceMeeter / Loopback</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 pr-4">Safari / Firefox + anything</td>
                <td className="py-2 pr-4">Mic-only fallback</td>
                <td className="py-2">None — quality is lower</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="desktop-app" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Desktop app — easiest</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The Camora desktop app captures system audio natively — anything playing through your speakers or headphones, including the native Zoom / Teams / Webex desktop clients. No virtual cables, no tab juggling.
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Install the desktop app from <a href="/docs/desktop" className="font-bold" style={{ color: 'var(--accent)' }}>/docs/desktop</a>.</li>
          <li>Open Camora and start a live interview.</li>
          <li>The wizard picks <strong>Desktop loopback</strong> automatically. Click <strong>Connect system audio</strong>.</li>
          <li>On macOS 13+, grant Screen Recording permission once when prompted (it's required for the system-audio API even though we don't record video).</li>
        </ol>
      </section>

      <section id="browser-tab" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Browser tab share</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Works in Chrome, Edge, and other Chromium browsers. The interviewer must be in a browser tab — native Zoom or Teams desktop clients can't have their audio captured this way.
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Open the interview platform <strong>in a Chrome tab</strong> (Zoom Web, Google Meet, Teams Web). Join the meeting.</li>
          <li>Open Camora in a second tab. The setup wizard appears.</li>
          <li>Click <strong>Share interviewer tab</strong>.</li>
          <li>In the picker: pick the <strong>Chrome Tab</strong> tab at the top, select the meeting tab, and <strong>check &quot;Share tab audio&quot;</strong> at the bottom-left. The checkbox is the most common point of failure.</li>
          <li>The level meter rises when the interviewer speaks. Hit <strong>Save and continue</strong>.</li>
        </ol>
        <DocsCallout variant="warning">
          If you pick &quot;Window&quot; or &quot;Entire screen&quot; instead of &quot;Chrome Tab&quot;, the audio checkbox is not offered and capture fails silently. Always pick &quot;Chrome Tab&quot;.
        </DocsCallout>
      </section>

      <section id="virtual-loopback" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Virtual loopback (BlackHole / VoiceMeeter)</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Use this when the interview is on a native desktop client (Zoom, Teams, Webex, Slack Huddles) and you don't want to install Camora's desktop app. You install a free virtual audio driver that exposes &quot;system audio&quot; as a regular microphone — Camora picks it up like any other input.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">macOS — BlackHole (free)</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Download <strong>BlackHole 2ch</strong> from <a href="https://existential.audio/blackhole/" target="_blank" rel="noreferrer" className="font-bold" style={{ color: 'var(--accent)' }}>existential.audio/blackhole</a>. Install the .pkg.</li>
          <li>Open <strong>Audio MIDI Setup</strong> (Spotlight → &quot;Audio MIDI Setup&quot;).</li>
          <li>Click <strong>+</strong> in the bottom-left → <strong>Create Multi-Output Device</strong>. Check both <strong>BlackHole 2ch</strong> and your real output (e.g., MacBook Speakers, AirPods). Set the real output as the master.</li>
          <li>Right-click the new Multi-Output Device → <strong>Use This Device For Sound Output</strong>.</li>
          <li>Open Zoom / Teams / Webex. Set its <strong>Speaker</strong> to <strong>Multi-Output Device</strong>. Keep its mic on your real mic.</li>
          <li>Open Camora's audio wizard. Pick <strong>Virtual loopback</strong>. The device dropdown shows <strong>BlackHole 2ch ✓</strong> — pick it.</li>
          <li>Have someone speak — the level meter rises. Done.</li>
        </ol>
        <DocsCallout variant="tip">
          The Multi-Output trick is what makes you still hear the interviewer through your headphones while BlackHole captures a copy.
        </DocsCallout>

        <h3 className="text-lg font-bold mt-6 mb-2">Windows — VoiceMeeter Banana (free)</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Download <strong>VoiceMeeter Banana</strong> from <a href="https://vb-audio.com/Voicemeeter/banana.htm" target="_blank" rel="noreferrer" className="font-bold" style={{ color: 'var(--accent)' }}>vb-audio.com/Voicemeeter/banana</a>. Install and reboot.</li>
          <li>Open <strong>Sound settings</strong> → <strong>Output</strong> → set to <strong>VoiceMeeter Input</strong>.</li>
          <li>In VoiceMeeter, set <strong>A1</strong> to your real headphones / speakers (so you still hear the meeting).</li>
          <li>Open Zoom / Teams. Set its <strong>Speaker</strong> to <strong>VoiceMeeter Input</strong>.</li>
          <li>In Camora's wizard, pick <strong>Virtual loopback</strong>. Device dropdown shows <strong>VoiceMeeter Output ✓</strong> — pick it.</li>
        </ol>

        <h3 className="text-lg font-bold mt-6 mb-2">macOS / Windows — Loopback by Rogue Amoeba (paid, $99)</h3>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          Slicker setup than BlackHole if you want a GUI. Buy from <a href="https://rogueamoeba.com/loopback/" target="_blank" rel="noreferrer" className="font-bold" style={{ color: 'var(--accent)' }}>rogueamoeba.com/loopback</a>. Create a virtual device that pulls from Zoom / Teams, then pick it as <strong>Virtual loopback</strong> in Camora.
        </p>
      </section>

      <section id="mic-only" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Mic-only fallback</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          When no other path works (Safari, Firefox, locked-down work laptop), Camora falls back to your microphone alone. Server-side speaker diarization tries to filter out your voice from the stream so only the interviewer's questions reach the AI.
        </p>
        <DocsCallout variant="warning">
          This path is lossy — the interviewer's voice has to bleed back into your mic, which means you must be on speakers (not headphones) and the room must be quiet. Use one of the other methods if at all possible.
        </DocsCallout>
      </section>

      <section id="devices" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Microphone &amp; speakers</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The wizard's first two sections let you pick which mic captures your voice and which speakers play Camora's sound cues. Both selections persist across sessions and devices.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Microphone</strong> — pick the one labeled with your headset / interface (e.g., &quot;AirPods Pro&quot;, &quot;Shure MV7&quot;). Avoid &quot;Default&quot; if you have multiple — the system default can flip mid-call when you plug something in.</li>
          <li><strong>Speakers</strong> — same logic. The wizard's <strong>Test sound</strong> button plays a short tone through your selection so you can confirm before joining.</li>
          <li><strong>Speaker output device control requires Chrome / Edge.</strong> Safari and Firefox always play through the OS default and ignore the speaker dropdown.</li>
        </ul>
      </section>

      <section id="troubleshooting" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Troubleshooting</h2>

        <h3 className="text-lg font-bold mt-4 mb-2">The level meter is flat — I can't hear bars rising</h3>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>The interviewer might just be silent — wait for them to talk.</li>
          <li>For tab share: did you pick <strong>Chrome Tab</strong> (not &quot;Window&quot; or &quot;Entire Screen&quot;)? Did you check <strong>Share tab audio</strong>?</li>
          <li>For virtual loopback: is your meeting client's <em>output</em> set to the virtual device, not its input?</li>
          <li>Click <strong>Stop and reconnect</strong> in the wizard and try again.</li>
        </ul>

        <h3 className="text-lg font-bold mt-4 mb-2">&quot;Browser unsupported&quot; banner</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          You're on Safari or Firefox, which don't expose the screen-share API with audio. Switch to Chrome or Edge, or download the <a href="/docs/desktop" className="font-bold" style={{ color: 'var(--accent)' }}>Camora desktop app</a>, or use the virtual loopback method above.
        </p>

        <h3 className="text-lg font-bold mt-4 mb-2">No virtual loopback device shows up</h3>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>You haven't installed one yet — see the BlackHole / VoiceMeeter instructions above.</li>
          <li>You installed it but the browser hasn't seen it yet — close the wizard, hit refresh, reopen.</li>
          <li>The device label doesn't match a known driver name. Pick it manually from the dropdown — Camora accepts any audio input as a virtual loopback if you select it explicitly.</li>
        </ul>

        <h3 className="text-lg font-bold mt-4 mb-2">Microphone permission was denied</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Click the lock icon in your browser's address bar → <strong>Site settings</strong> → set <strong>Microphone</strong> to <strong>Allow</strong>. Reload Camora.
        </p>

        <h3 className="text-lg font-bold mt-4 mb-2">Audio worked yesterday, now nothing</h3>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>If you switched headphones / mics, the OS may have shifted to a different default. Open the wizard and re-pick.</li>
          <li>If you're on macOS, sometimes the Screen Recording permission needs to be re-granted after OS updates: <strong>System Settings → Privacy &amp; Security → Screen Recording</strong>.</li>
          <li>Use the <strong>Reset to defaults</strong> link at the bottom of the wizard if all else fails.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
