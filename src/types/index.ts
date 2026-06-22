/**
 * Core domain types for Better GitHub Stars Manager.
 *
 * Data model (from the grill blueprint):
 *  - `stars` store: GitHub repo metadata, rebuildable from the API, NOT synced to Gist.
 *  - `tags`  store: the user's own tags + notes, synced to Gist (per-repo field-level LWW).
 *  - `tagMeta` store: tag dimension/color metadata, synced to Gist (tiny).
 *
 * chrome.storage.local holds light config: encrypted token, theme, view prefs,
 * the incremental sync cursor (lastSyncStarredAt), gistId, gistSyncCursor.
 */

/** A starred repo record as stored locally (mirrors /user/starred fields we keep). */
export interface Star {
  /** PK, e.g. "NVIDIA/SkillSpector" */
  full_name: string;
  html_url: string;
  description: string;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  pushed_at: string; // ISO, repo last push
  fork: boolean;
  archived: boolean;
  /** When the user starred it (ISO). Comes from the authenticated /user/starred endpoint. */
  starred_at: string;
  /** B2 soft-delete: true once a full rescan no longer sees this repo in /user/starred. */
  tombstone: boolean;
  /** When we last refreshed this row locally. */
  synced_at: string;
}

/** The user's own annotation layer for a repo. Synced to Gist (per-repo LWW by mtime). */
export interface Tag {
  /** PK, joins Star.full_name */
  full_name: string;
  tags: string[];
  notes: string;
  /** Per-repo field-level last-write-wins arbitration timestamp (ISO). */
  mtime: string;
  /**
   * Phase 2 interface slot — DO NOT populate in MVP.
   * Reserved for syncing a tag/repo membership into a GitHub native List (list_id).
   * See blueprint: GitHub Lists have no public API; sync is Phase 2 (DOM automation /
   * reverse-engineered internal endpoints), ToS medium.
   */
  gh_list_id?: number | null;
}

/** Metadata about a tag itself (dimension grouping + color). Synced to Gist (tiny). */
export interface TagMeta {
  /** PK, the tag string, e.g. "ai" */
  name: string;
  /** Soft dimension grouping, e.g. "领域" | "语言" | "用途". null = ungrouped. */
  dimension: string | null;
  color: string | null;
  mtime: string;
}

/** Light config kept in chrome.storage.local (not IndexedDB). */
export interface Config {
  /** Encrypted fine-grained PAT (ciphertext blob). Plaintext never persisted. */
  tokenEncrypted: string | null;
  /** Initialization vector + salt metadata for the Web Crypto encryption, base64. */
  tokenCryptoMeta: CryptoMeta | null;
  theme: 'dark' | 'light';
  defaultView: 'list' | 'table';
  /** Incremental sync cursor: the newest starred_at we've already ingested. */
  lastSyncStarredAt: string | null;
  /** Gist id used as the cross-device tag sync transport (once bound). */
  gistId: string | null;
  /** Gist sync cursor: last mtime pushed/pulled, to short-circuit no-op syncs. */
  gistSyncCursor: string | null;
  /** GitHub username derived from the token (for the /user/starred endpoint). */
  username: string | null;
}

export interface CryptoMeta {
  iv: string; // base64
  salt: string; // base64
}

/** What we serialize into the Gist as the tag-layer transport. */
export interface GistPayload {
  /** Schema version for forward-compat during per-repo LWW merge. */
  v: 1;
  tags: Record<string, Omit<Tag, 'full_name'>>;
  tagMeta: Record<string, Omit<TagMeta, 'name'>>;
  exportedAt: string;
}

/** A suggested tag derived from repo metadata (language/topics), for one-click accept. */
export interface TagSuggestion {
  full_name: string;
  suggested: string[];
  source: 'language' | 'topics';
}

/** Sync progress reported to the UI during the first full pull (99 pages). */
export interface SyncProgress {
  phase: 'idle' | 'full' | 'incremental' | 'rescan' | 'gist';
  done: number;
  total: number | null;
  message: string;
}
