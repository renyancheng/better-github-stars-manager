import type { Star } from '@/types';

/**
 * Suggest tags for a repo based on its language + topics (Q7: auto-suggest).
 * Pure function — no storage access. The actual write happens via the background
 * (bgCall('acceptSuggestions' | 'acceptSuggestionsBatch')), which owns the IDB.
 *
 * Returns suggestions not already applied (case-insensitive dedupe), capped at 5.
 */
export function suggestTags(star: Star, existing: string[]): string[] {
  const have = new Set(existing.map((t) => t.toLowerCase()));
  const out: string[] = [];
  if (star.language && !have.has(star.language.toLowerCase())) out.push(star.language);
  for (const t of star.topics) {
    if (!have.has(t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 5);
}
