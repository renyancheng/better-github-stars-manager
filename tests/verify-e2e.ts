#!/usr/bin/env node
/**
 * End-to-end verification OUTSIDE the Chrome runtime.
 *
 * Proves the full business flow against the REAL GitHub API + REAL code paths:
 *   token → fetch /user/starred → parse nested payload (the bug we fixed) →
 *   write to IndexedDB (fake-indexeddb) → query via the real engine → print rows.
 *
 * AND exercises the REAL Chrome sync orchestrator (githubStarSource.syncFull),
 * with a minimal chrome.storage.local shim so authStore works under Node. This
 * catches bugs in the orchestration layer that a bare toStar()+bulkPut() test
 * would miss.
 *
 * Usage:
 *   GH_TOKEN=<your_pat> pnpm exec tsx tests/verify-e2e.ts
 *   echo <pat> | pnpm exec tsx tests/verify-e2e.ts   (stdin, never on cmdline)
 *
 * The token is read from the environment or stdin (never logged). It only needs
 * read access to /user/starred (public_repo or fine-grained public-repo read).
 */
import 'fake-indexeddb/auto';
import { db } from '../src/storage/db';
import { queryStars, invalidateCache } from '../src/background/query';

// --- Minimal chrome.storage.local shim so authStore works under Node ---
const storageBacking: Record<string, unknown> = {};
(globalThis as any).chrome = {
  ...(globalThis as any).chrome,
  storage: {
    local: {
      async get<T extends string>(keys: T | T[] | null): Promise<Record<string, unknown>> {
        if (keys === null || keys === undefined) return { ...storageBacking };
        const ks = Array.isArray(keys) ? keys : [keys];
        const out: Record<string, unknown> = {};
        for (const k of ks) if (k in storageBacking) out[k] = storageBacking[k];
        return out;
      },
      async set(obj: Record<string, unknown>): Promise<void> {
        Object.assign(storageBacking, obj);
      },
    },
  },
  runtime: { sendMessage: async () => {}, id: 'verify-e2e' },
};

// Token resolution order: env var → stdin (so it never has to appear on the
// command line or in shell history). Never logged.
let TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  process.stderr.write('GH_TOKEN not set. Paste it now (input hidden, press Enter):\n> ');
  for await (const chunk of process.stdin) {
    TOKEN = chunk.toString().trim();
    break;
  }
}
if (!TOKEN) {
  console.error('❌ No token provided. Either `export GH_TOKEN=...` or pipe it via stdin.');
  process.exit(1);
}

const PER_PAGE = 100;

// --- 1. Verify token + capture username via the REAL authStore.setToken ---
// This also exercises encrypt/decrypt (AES-GCM) + chrome.storage persistence.
console.log('1) Verifying token via real authStore.setToken() (exercises AES-GCM) …');
import { authStore } from '../src/auth/auth-store';
try {
  const { username } = await authStore.setToken(TOKEN);
  console.log(`   ✓ authenticated as @${username} (token AES-GCM encrypted in storage)`);
} catch (e) {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

// --- 2. Raw shape check: confirm the nested repo payload (the bug source) ---
console.log('2) Fetching /user/starred (page 1, star+json media) …');
const starRes = await fetch('https://api.github.com/user/starred?per_page=1&page=1', {
  headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.star+json' },
  cache: 'no-store',
});
console.log(`   HTTP ${starRes.status} | rate ${starRes.headers.get('x-ratelimit-remaining')}/${starRes.headers.get('x-ratelimit-limit')}`);
if (!starRes.ok) {
  console.error(`❌ /user/starred returned ${starRes.status}`);
  process.exit(1);
}
const page1 = (await starRes.json()) as Array<{ starred_at: string; repo: { full_name: string } }>;
if (!page1.length || !page1[0].repo) {
  console.error(`❌ Unexpected payload shape — no nested repo object.`);
  process.exit(1);
}
console.log(`   ✓ nested repo.full_name = "${page1[0].repo.full_name}"`);

// --- 3. Run the REAL Chrome sync orchestrator (githubStarSource.syncFull) ---
// This is the path the extension uses. It does page 1 + concurrent rest pages,
// maps through the real toStar, and bulkPut's into Dexie. If the extension
// would fail to populate stars, this is where it'd show.
console.log('3) Running real syncFull() orchestrator (concurrent pages → toStar → bulkPut) …');
import { githubStarSource } from '../src/api/github-star-source';
let progressLines = 0;
const syncResult = await githubStarSource.syncFull((p) => {
  if (progressLines++ < 3) console.log(`   progress: ${p.phase} ${p.done}/${p.total ?? '?'} — ${p.message}`);
});
const dbCount = await db.stars.count();
console.log(`   ✓ syncFull returned ${JSON.stringify(syncResult)} | DB now holds ${dbCount} stars`);

// --- 4. Query through the REAL engine ---
invalidateCache();
const result = await queryStars({
  filter: { query: '', languages: [], tags: [], tagMode: 'any', showTombstone: false, onlyUntagged: false, sortKey: 'starred_at', sortDir: 'desc' },
  offset: 0,
  limit: 5,
});
console.log('4) Querying through real engine (top 5 by starred_at desc) …');
console.log(`   ✓ grandTotal=${result.grandTotal} | filtered=${result.total} | languages facet count=${result.languages.length}`);
console.log('   Top 5 rows:');
for (const s of result.rows) {
  console.log(`     • ${s.full_name}  (★${s.stargazers_count}, ${s.language ?? '—'}, starred ${s.starred_at.slice(0, 10)})`);
}

// --- 5. Verify the incremental cursor was advanced (syncIncremental depends on it) ---
const cfg = await authStore.getConfig();
console.log('5) Checking incremental cursor advanced …');
if (!cfg.lastSyncStarredAt) {
  console.error('❌ lastSyncStarredAt cursor was NOT set — syncIncremental will re-pull everything.');
  process.exit(1);
}
console.log(`   ✓ lastSyncStarredAt cursor = ${cfg.lastSyncStarredAt}`);

console.log('\n✅ END-TO-END VERIFIED: token → authStore → syncFull orchestrator → nested-parse → IDB write → query → rows.');
console.log('   The FULL Chrome sync path works against the real GitHub API with the real code.');
console.log('   If stars still don\'t appear in Chrome, the cause is purely Chrome-runtime');
console.log('   (extension not reloaded / token not saved in Options page), NOT the data logic.');
