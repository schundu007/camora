/**
 * Pins the image normalization contract for screenshots attached to a question.
 *
 * Two properties matter, and neither fails loudly in production if broken:
 *
 * 1. Garbage is DROPPED, never thrown. A screenshot that can't be attached must
 *    still leave the candidate with an answer — they are mid-interview, and an
 *    exception here would take the whole answer down with it.
 * 2. The count is capped. These ride inline in the request body at megabytes
 *    each; an unbounded array is a 413 (or an Anthropic 400) at the worst
 *    possible moment.
 */
import { describe, it, expect } from 'vitest';
import { normalizeImages } from '../src/services/visionImage.js';

// 1x1 PNG — small enough to skip the resize ladder entirely.
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const dataUrl = (mime, b64 = PNG_1PX) => `data:${mime};base64,${b64}`;

describe('normalizeImages', () => {
  it('passes a well-formed PNG through as an Anthropic block', async () => {
    const out = await normalizeImages([dataUrl('image/png')]);
    expect(out).toEqual([{ mediaType: 'image/png', data: PNG_1PX }]);
  });

  it('accepts every media type Anthropic supports', async () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      const out = await normalizeImages([dataUrl(mime)]);
      expect(out).toHaveLength(1);
      expect(out[0].mediaType).toBe(mime);
    }
  });

  it('drops junk instead of throwing — an answer still has to come back', async () => {
    const junk = [
      'not a data url',
      'data:text/plain;base64,aGVsbG8=',      // not an image
      'data:image/tiff;base64,' + PNG_1PX,    // image, but unsupported by the API
      '',
      null,
      undefined,
      42,
      {},
    ];
    await expect(normalizeImages(junk)).resolves.toEqual([]);
  });

  it('keeps the good images when only some are junk', async () => {
    const out = await normalizeImages(['nope', dataUrl('image/png'), 'data:image/tiff;base64,x']);
    expect(out).toHaveLength(1);
  });

  it('caps the count so one request cannot carry an unbounded payload', async () => {
    const many = Array.from({ length: 12 }, () => dataUrl('image/png'));
    expect(await normalizeImages(many)).toHaveLength(3);
    expect(await normalizeImages(many, { max: 1 })).toHaveLength(1);
  });

  it('treats a missing / non-array value as no images', async () => {
    for (const v of [null, undefined, '', 'data:image/png;base64,x', {}, 0]) {
      await expect(normalizeImages(v)).resolves.toEqual([]);
    }
  });
});
