import { CLOUD_SERVICE_MAP, CLOUD_SERVICE_MULTIWORD } from './serviceNames';
import type { CloudProvider } from '@/hooks/useCloudProvider';

/**
 * Translate AWS service names in text to the equivalents for the chosen
 * cloud. AWS is canonical and never modified. Auto is treated as AWS for
 * content purposes (the diagram engine still picks "best fit", but the
 * prose uses authored AWS names so nothing reads weird).
 *
 * Rules:
 *   - Word-boundary match for single-word services so "S3" doesn't match
 *     "S3.foo()" (boundary is the dot) but DOES match "use S3 for blobs".
 *   - Multi-word services are matched literally with case-sensitive
 *     `replaceAll` because regex word boundaries don't span spaces.
 *   - Fenced code blocks (```...```) are skipped — translating SDK calls
 *     half-way ("blob storage.putObject(...)") is worse than not
 *     translating. Inline code (`x`) is also skipped.
 *   - Translation is intentionally one-way (AWS → other). We never try to
 *     reverse-translate, because content is authored once with AWS names
 *     and cached on disk under those names.
 */
export function formatCloudContent(text: string, provider: CloudProvider): string {
  if (!text || provider === 'aws' || provider === 'auto') return text;

  // Split on fenced code blocks. Replace only in non-code segments. Even
  // indices are prose, odd indices are fenced code we leave alone.
  const fencedSegments = text.split(/(```[\s\S]*?```|`[^`]*`)/);

  for (let i = 0; i < fencedSegments.length; i += 2) {
    let segment = fencedSegments[i];
    if (!segment) continue;

    // Multi-word first — they could contain words that single-word pass
    // would otherwise catch first ("API Gateway" vs "API").
    for (const [aws, mapping] of Object.entries(CLOUD_SERVICE_MULTIWORD)) {
      const target = mapping[provider];
      if (!target || target === aws) continue;
      segment = segment.split(aws).join(target);
    }

    // Single-word with word boundaries.
    for (const [aws, mapping] of Object.entries(CLOUD_SERVICE_MAP)) {
      const target = mapping[provider];
      if (!target || target === aws) continue;
      // Escape the AWS key for regex (e.g. X-Ray contains a hyphen).
      const escaped = aws.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      segment = segment.replace(new RegExp(`\\b${escaped}\\b`, 'g'), target);
    }

    fencedSegments[i] = segment;
  }

  return fencedSegments.join('');
}

/**
 * Map a provider value to a human label for UI. `auto` shows as "Auto"
 * even though it's treated as AWS for content — the user explicitly chose
 * "let the system decide" so the diagram engine still benefits.
 */
export function cloudProviderLabel(provider: CloudProvider): string {
  switch (provider) {
    case 'aws': return 'AWS';
    case 'azure': return 'Azure';
    case 'gcp': return 'GCP';
    case 'auto': return 'Auto';
  }
}
