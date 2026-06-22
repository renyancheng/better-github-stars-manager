import { useEffect, useState } from 'react';
import { authStore } from '@/auth/auth-store';

export function Options() {
  const [tokenInput, setTokenInput] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [gistId, setGistId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const refresh = async () => {
    const c = await authStore.getConfig();
    setUsername(c.username);
    setGistId(c.gistId);
  };
  useEffect(() => {
    refresh();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { username: u } = await authStore.setToken(tokenInput);
      setMsg({ kind: 'ok', text: `Token verified. Logged in as ${u}.` });
      setTokenInput('');
      await refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    await authStore.clearToken();
    await refresh();
    setMsg({ kind: 'ok', text: 'Token removed.' });
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, sans-serif', color: '#c9d1d9', background: '#0d1117', padding: 28, borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>⭐ GitHub Stars Manager — Options</h1>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>1. GitHub Token</h2>
        <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>
          Create a <b>fine-grained PAT</b> at{' '}
          <a style={{ color: '#2f81f7' }} href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            github.com/settings/tokens
          </a>
          . Required permissions:
        </p>
        <ul style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.7 }}>
          <li><b>Account → Public Repositories</b> (read starred repos via <code>/user/starred</code>)</li>
          <li><b>Account → Gists</b> (read/write, for cross-device tag sync)</li>
        </ul>
        <p style={{ fontSize: 12, color: '#d29922' }}>
          Note: GitHub Gist scope is account-wide (no per-gist isolation for fine-grained tokens).
          We create one dedicated secret gist for sync.
        </p>

        {username ? (
          <div style={{ fontSize: 13, margin: '12px 0' }}>
            ✅ Authenticated as <b>@{username}</b>.{' '}
            <button onClick={clear} style={{ marginLeft: 8 }}>Remove token</button>
          </div>
        ) : null}

        <textarea
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="github_pat_..."
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, padding: 8 }}
        />
        <div style={{ marginTop: 8 }}>
          <button disabled={busy || !tokenInput.trim()} onClick={save}>
            {busy ? 'Verifying…' : 'Save & verify'}
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>2. Gist sync</h2>
        <p style={{ fontSize: 13, color: '#8b949e' }}>
          {gistId
            ? <>Bound to gist <code>{gistId}</code>. Tags sync to/from this gist (per-repo LWW).</>
            : <>No gist yet. One is created automatically on your first tag push.</>}
        </p>
      </section>

      {msg && (
        <div style={{ marginTop: 16, fontSize: 13, color: msg.kind === 'ok' ? '#3fb950' : '#f85149' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
