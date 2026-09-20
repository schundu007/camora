// Screenshot attachments for a composer.
//
// Extracted so the Claude and Gemini tabs get the capture Ask Sona already had
// rather than each growing its own copy. An interviewer shares a diagram, a
// failing test, a stack trace — snapping it is faster and more accurate than
// reading it out, and it was the one thing those two tabs could not do.
import { useCallback, useState } from 'react';
import { snapRegion } from '@/lib/lumora/snapCapture';
import { dialogAlert } from '@/components/shared/Dialog';

export type PendingImage = { id: string; dataUrl: string };

/** Matches MAX_IMAGES in the backends' _shared/interviewImages.js. */
export const MAX_PENDING_IMAGES = 4;

export function useSnapAttach(onAttached?: () => void) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [snapping, setSnapping] = useState(false);

  const snap = useCallback(async () => {
    if (snapping) return;
    setSnapping(true);
    try {
      const res = await snapRegion();
      // Escape is not an error — the candidate changed their mind mid-interview
      // and the last thing they need is a dialog about it.
      if (res.cancelled) return;
      if (!res.dataUrl) {
        if (res.error) dialogAlert({ title: 'Screenshot failed', message: res.error });
        return;
      }
      setPending(prev => prev.length >= MAX_PENDING_IMAGES
        ? prev
        : [...prev, { id: `snap-${Date.now()}-${prev.length}`, dataUrl: res.dataUrl }]);
      onAttached?.();
    } finally {
      setSnapping(false);
    }
  }, [snapping, onAttached]);

  const remove = useCallback((id: string) => {
    setPending(prev => prev.filter(p => p.id !== id));
  }, []);

  const clear = useCallback(() => setPending([]), []);

  /** Accept a paste or a drop of image files into the composer. */
  const addFiles = useCallback((files: FileList | File[] | null) => {
    const imgs = [...(files || [])].filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    imgs.slice(0, MAX_PENDING_IMAGES).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        setPending(prev => prev.length >= MAX_PENDING_IMAGES
          ? prev
          : [...prev, { id: `file-${Date.now()}-${i}`, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  return { pending, snapping, snap, remove, clear, addFiles, full: pending.length >= MAX_PENDING_IMAGES };
}
