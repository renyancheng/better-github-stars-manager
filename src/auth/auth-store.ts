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

export const CONFIG_STORAGE_KEY = 'gsm_config';

const DEFAULT_CONFIG: Config = {
  tokenEncrypted: null,
  tokenCryptoMeta: null,
  theme: 'dark',
  locale: 'en',
  defaultView: 'table',
  lastSyncStarredAt: null,
  gistId: null,
  gistSyncCursor: null,
  username: null,
  avatarUrl: null,
  displayName: null,
};

let cache: Config | null = null;
let plaintextToken: string | null = null; // in-memory only

async function read(): Promise<Config> {
  if (cache) return cache;
  const raw = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
  const stored = (raw[CONFIG_STORAGE_KEY] ?? {}) as Partial<Config>;
  cache = { ...DEFAULT_CONFIG, ...stored };
  return cache;
}

async function write(next: Config): Promise<void> {
  cache = next;
  await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: next });
}

async function readDecryptedToken(): Promise<string | null> {
  if (plaintextToken) return plaintextToken;
  const c = await read();
  if (!c.tokenEncrypted || !c.tokenCryptoMeta) return null;
  plaintextToken = await decrypt(c.tokenEncrypted, c.tokenCryptoMeta);
  return plaintextToken;
}

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const change = changes[CONFIG_STORAGE_KEY];
    if (!change) return;

    const prev = cache;
    const stored = (change.newValue ?? {}) as Partial<Config>;
    cache = { ...DEFAULT_CONFIG, ...stored };

    const tokenChanged =
      prev?.tokenEncrypted !== cache.tokenEncrypted ||
      JSON.stringify(prev?.tokenCryptoMeta ?? null) !== JSON.stringify(cache.tokenCryptoMeta ?? null);
    if (tokenChanged) plaintextToken = null;
  });
}

export const authStore = {
  async getConfig(): Promise<Config> {
    return read();
  },

  async hasToken(): Promise<boolean> {
    return !!(await readDecryptedToken());
  },

  /** The decrypted token, or null. Held only in memory. */
  async getToken(): Promise<string | null> {
    return readDecryptedToken();
  },

  async getUsername(): Promise<string | null> {
    return (await read()).username;
  },

  /** Account identity for the top bar: username + avatar + display name. */
  async getAccount(): Promise<{ username: string | null; avatarUrl: string | null; displayName: string | null }> {
    const c = await read();
    return { username: c.username, avatarUrl: c.avatarUrl, displayName: c.displayName };
  },

  async getTheme(): Promise<'dark' | 'light'> {
    return (await read()).theme;
  },

  async getLocale(): Promise<'en' | 'zh-CN'> {
    return (await read()).locale;
  },

  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    await write({ ...(await read()), theme });
  },

  async setLocale(locale: 'en' | 'zh-CN'): Promise<void> {
    await write({ ...(await read()), locale });
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

    const body = (await res.json()) as { login?: string; avatar_url?: string; name?: string | null };
    if (!body.login) throw new Error('Could not read username from /user');

    const { cipher, meta } = await encrypt(clean);
    plaintextToken = clean;
    await write({
      ...(await read()),
      tokenEncrypted: cipher,
      tokenCryptoMeta: meta,
      username: body.login,
      avatarUrl: body.avatar_url ?? null,
      displayName: body.name ?? null,
    });
    return { username: body.login };
  },

  async clearToken(): Promise<void> {
    plaintextToken = null;
    await write({
      ...(await read()),
      tokenEncrypted: null,
      tokenCryptoMeta: null,
      username: null,
      avatarUrl: null,
      displayName: null,
    });
  },

  async update(patch: Partial<Config>): Promise<void> {
    await write({ ...(await read()), ...patch });
  },
};
