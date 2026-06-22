import type { SyncProgress } from '@/types';

/**
 * StarSource — abstraction over "where starred repos come from".
 *
 * Q2 decision: the UI depends only on this interface, never on the concrete
 * GitHubStarSource. The evolution path (Q2=B OAuth + backend) is implemented by
 * adding a second StarSource and swapping the binding — UI stays untouched.
 *
 * The MVP implementation is GitHubStarSource (src/api/github-star-source.ts),
 * which calls the authenticated GET /user/starred endpoint.
 */
export interface StarSource {
  /**
   * First-time (or forced) full pull of all starred repos.
   * ~99 pages for a 9900-star account, batched concurrently within the 5000/h limit.
   * Upserts every repo into the stars store. Does NOT detect unstars (use rescan).
   */
  syncFull(onProgress?: (p: SyncProgress) => void): Promise<{ added: number; updated: number }>;

  /**
   * Incremental sync (Q5 A2): pull newest starred repos in starred_at-desc order,
   * stop at the first repo we already have (cursor = lastSyncStarredAt).
   * Typically 1–2 requests. Triggered on entering the stars page.
   */
  syncIncremental(): Promise<{ added: number }>;

  /**
   * Full rescan (Q5 B2): re-pull everything to detect unstars.
   * Any repo present locally but absent from the API → mark tombstone=true (soft
   * delete; tags/notes preserved for re-star revival). Manual, low-frequency.
   */
  syncRescan(onProgress?: (p: SyncProgress) => void): Promise<{ tombstoned: number; revived: number }>;

  /** GitHub username backing this source (from the token's /user). */
  getUsername(): Promise<string>;
}
