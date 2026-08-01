/**
 * One capture path for every camera button in Lumora (CoFix, Coding, the shell
 * screenshot strip, refine).
 *
 * Desktop: macOS `screencapture -i` — a crosshair the user DRAGS to select the
 * exact area. Space toggles to whole-window mode, Escape cancels. This works no
 * matter where the problem lives: a Zoom screen share, CoderPad, a PDF, an IDE.
 * The previous implementation captured the entire front browser window and hard
 * -failed with "No browser window found" whenever the source was not a browser.
 *
 * Web: the browser's own share picker, then one frame off the track.
 *
 * Contract: never throws. Cancels and failures are distinct — a cancel must not
 * surface as an error, and an error must carry a reason the user can act on.
 */

export interface SnapResult {
  /** Empty string only when cancelled or errored. */
  dataUrl: string;
  /** On-disk copy in the session folder (desktop only). */
  filePath?: string;
  /** Verbatim problem text from the platform DOM — beats OCR when present. */
  domText?: string | null;
  /** Verbatim editor template from the platform DOM — must be filled, not rewritten. */
  domStarter?: string | null;
  /** User pressed Escape / dismissed the picker. Not a failure — stay silent. */
  cancelled?: boolean;
  /** Human-readable reason the capture failed. */
  error?: string;
}

const bridge = () => (window as any).camo;

/** True when drag-to-select region capture is available (desktop app). */
export const canRegionSnap = (): boolean => !!bridge()?.captureRegion;

/** Pull one frame off a display-media track, with a fallback for browsers
 *  that do not implement ImageCapture (Safari, Firefox). */
const grabFrame = async (track: MediaStreamTrack, stream: MediaStream): Promise<string> => {
  const canvas = document.createElement('canvas');
  if ((window as any).ImageCapture) {
    const bitmap = await new (window as any).ImageCapture(track).grabFrame();
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png');
  }
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  // One rAF so the first frame is actually painted before we read it.
  await new Promise<void>(res => requestAnimationFrame(() => res()));
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(video, 0, 0);
  video.pause();
  video.srcObject = null;
  return canvas.toDataURL('image/png');
};

/**
 * @param opts.withDom Also pull the verbatim problem text + editor template from
 *   the front coding-platform tab. A region snap of just the problem statement
 *   leaves the editor out of the image, so OCR alone would lose the template.
 */
export async function snapRegion(opts: { withDom?: boolean } = {}): Promise<SnapResult> {
  const camo = bridge();

  if (camo?.captureRegion) {
    let region: any;
    try {
      region = await camo.captureRegion();
    } catch (err: any) {
      return { dataUrl: '', error: err?.message || 'Region capture failed.' };
    }
    if (region?.cancelled) return { dataUrl: '', cancelled: true };
    if (!region?.ok || !region.dataUrl) {
      return { dataUrl: '', error: region?.error || 'Region capture failed.' };
    }
    let domText: string | null = null;
    let domStarter: string | null = null;
    if (opts.withDom && camo.extractBrowserProblem) {
      try {
        const dom = await camo.extractBrowserProblem();
        if (dom?.ok) {
          domText = typeof dom.text === 'string' && dom.text.trim() ? dom.text : null;
          domStarter = typeof dom.starterCode === 'string' && dom.starterCode.trim() ? dom.starterCode : null;
        }
      } catch { /* DOM extraction is an enrichment, never a blocker */ }
    }
    return { dataUrl: region.dataUrl, filePath: region.filePath ?? undefined, domText, domStarter };
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    return { dataUrl: '', error: 'Screen capture is not available in this browser. Use the Camora desktop app to snap a selected area.' };
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch (err: any) {
    // Dismissing the picker is a cancel, not a failure.
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return { dataUrl: '', cancelled: true };
    return { dataUrl: '', error: err?.message || 'Screen capture failed.' };
  }
  const track = stream.getVideoTracks()[0];
  if (!track) return { dataUrl: '', error: 'No video track in the shared stream.' };
  try {
    return { dataUrl: await grabFrame(track, stream) };
  } catch (err: any) {
    return { dataUrl: '', error: err?.message || 'Could not read the captured frame.' };
  } finally {
    stream.getTracks().forEach(t => t.stop());
  }
}
