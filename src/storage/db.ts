import Dexie, { type Table } from 'dexie';
import type { Star, Tag, TagMeta } from '@/types';

/**
 * IndexedDB schema (via Dexie). Q3 decision: IndexedDB is the source of truth
 * for the heavy GitHub metadata (stars) + the user's annotation layer (tags/tagMeta).
 * chrome.storage.local holds only light config (see Config type).
 *
 * Index choices drive the management UI's filter/sort paths:
 *  - language: filter by language dropdown
 *  - starred_at: incremental cursor + "recently starred" sort
 *  - pushed_at: "recently updated" sort
 *  - tombstone: hide/gray unstarred rows
 *  - *tags: multiEntry index for "show all repos with tag X"
 */
export class StarsDB extends Dexie {
  stars!: Table<Star, string>;
  tags!: Table<Tag, string>;
  tagMeta!: Table<TagMeta, string>;

  constructor() {
    super('github-stars-manager');
    this.version(1).stores({
      stars: 'full_name, language, starred_at, pushed_at, tombstone',
      tags: 'full_name, *tags, mtime',
      tagMeta: 'name, dimension, mtime',
    });
  }
}

export const db = new StarsDB();

/**
 * Count of live (non-tombstone) stars — used by the UI header.
 * IndexedDB/Dexie index booleans unreliably, so filter in JS (cheap over ~10k rows).
 */
export async function liveStarCount(): Promise<number> {
  let n = 0;
  await db.stars.each((s) => {
    if (!s.tombstone) n++;
  });
  return n;
}
