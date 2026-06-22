import type { Config } from '@/types';
import { encrypt, decrypt } from './crypto';

/**
 * AuthStore — owns the fine-grained PAT lifecycle (Q4).
 *
 * Token flow: the options page collects a PAT, we call GET /user with it to (a)
 * verify it works and (b) capture the username (for /user/starred). We also probe
 * scope: a fine-grained PAT with Stars:Read + Gists:ReadWrite is what we expect.
 * The plaintext token lives only in memory after verification; on disk it's AES-GCM
 * encrypted in chrome.storage.local.
 */

const STORAGE_KEY = 'gsm_config';

const DEFAULT_CONFIG: Config = {
  tokenEncrypted: null,
  tokenCryptoMeta: null,
  theme: 'dark',
  defaultView: 'table',
  lastSyncStarredAt: null,
  gistId: null,
  gistSyncCursor: null,
  username: null,
};

let cache: Config | null = null;
let plaintextToken: string | null = null; // in-memory only

async function read(): Promise<Config> {
  if (cache) return cache;
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const stored = (raw[STORAGE_KEY] ?? {}) as Partial<Config>;
  cache = { ...DEFAULT_CONFIG, ...stored };
  return cache;
}

async function write(next: Config): Promise<void> {
  cache = next;
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export const authStore = {
  async getConfig(): Promise<Config> {
    return read();
  },

  async hasToken(): Promise<boolean> {
    const c = await read();
    return !!c.tokenEncrypted;
  },

  /** The decrypted token, or null. Held only in memory. */
  async getToken(): Promise<string | null> {
    if (plaintextToken) return plaintextToken;
    const c = await read();
    if (!c.tokenEncrypted || !c.tokenCryptoMeta) return null;
    plaintextToken = await decrypt(c.tokenEncrypted, c.tokenCryptoMeta);
    return plaintextToken;
  },

  async getUsername(): Promise<string | null> {
    return (await read()).username;
  },

  /**
   * Verify a PAT against the GitHub API and persist it (encrypted) if valid.
   * Returns the username on success or throws with a descriptive error.
   */
  async setToken(token: string): Promise<{ username: string }> {
    const clean = token.trim();
    if (!clean) throw new Error('Token is empty');

    // Verify + capture username + scope.
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${clean}`, Accept: 'application/vnd.github+json' },
    });
    if (res.status === 401) throw new Error('Token rejected by GitHub (401). Check the value.');
    if (!res.ok) throw new Error(`GitHub /user returned ${res.status}`);

    const scopes = (res.headers.get('x-oauth-scopes') ?? '').toLowerCase();
    // fine-grained PATs report scopes differently; we accept either the classic
    // 'public_repo'/'gist' or fine-grained (which returns no x-oauth-scopes but works).
    const classicOk = scopes.includes('public_repo') && scopes.includes('gist');
    // For fine-grained tokens, x-oauth-scopes is empty — we rely on the actual API
    // calls to fail later if permissions are missing. Warn but don't block.
    if (scopes && !classicOk) {
      console.warn('[gsm] classic-token scopes may be insufficient:', scopes);
    }

    const body = (await res.json()) as { login?: string };
    if (!body.login) throw new Error('Could not read username from /user');

    const { cipher, meta } = await encrypt(clean);
    plaintextToken = clean;
    await write({
      ...(await read()),
      tokenEncrypted: cipher,
      tokenCryptoMeta: meta,
      username: body.login,
    });
    return { username: body.login };
  },

  async clearToken(): Promise<void> {
    plaintextToken = null;
    await write({ ...(await read()), tokenEncrypted: null, tokenCryptoMeta: null, username: null });
  },

  async update(patch: Partial<Config>): Promise<void> {
    await write({ ...(await read()), ...patch });
  },
};
