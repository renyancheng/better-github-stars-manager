import { useEffect, useState } from 'react';
import { bgCall, onProgress, type SyncStatus } from '@/utils/messaging';

export function Popup() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => bgCall<SyncStatus>('getStatus').then(setStatus).catch(() => {});

  useEffect(() => {
    refresh();
    const off = onProgress(() => refresh());
    return off;
  }, []);

  const run = async (type: string, label: string) => {
    setBusy(true);
    setErr(null);
    try {
      await bgCall(type);
      await refresh();
    } catch (e) {
      setErr(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const openStars = async () => {
    const u = await bgCall<{ username: string | null }>('getUsername');
    if (u.username) {
      chrome.tabs.create({ url: `https://github.com/${u.username}?tab=stars` });
    } else {
      chrome.tabs.create({ url: 'https://github.com/stars' });
    }
  };

  const openOptions = () => chrome.runtime.openOptionsPage();

  const p = status?.progress;
  const hasToken = status?.hasToken;

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', minWidth: 280 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>⭐ GitHub Stars Manager</h2>

      {!hasToken && (
        <div style={{ fontSize: 13, color: '#d29922', marginBottom: 10 }}>
          No token configured.
          <button onClick={openOptions} style={{ marginLeft: 6 }}>
            Add PAT
          </button>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10, minHeight: 18 }}>
        {p && p.phase !== 'idle' ? `${p.phase}: ${p.message}` : p?.message || 'Idle'}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <button disabled={busy || !hasToken} onClick={() => run('syncIncremental', 'Incremental sync')}>
          Sync new stars (incremental)
        </button>
        <button disabled={busy || !hasToken} onClick={() => run('syncFull', 'Full sync')}>
          Full re-pull all stars
        </button>
        <button disabled={busy || !hasToken} onClick={() => run('syncRescan', 'Rescan')}>
          Detect unstars (rescan)
        </button>
        <button disabled={busy || !hasToken} onClick={() => run('gistPull', 'Gist pull')}>
          Pull tags from Gist
        </button>
        <button disabled={busy || !hasToken} onClick={() => run('gistPush', 'Gist push')}>
          Push tags to Gist
        </button>
        <hr style={{ border: 0, borderTop: '1px solid #30363d', margin: '4px 0' }} />
        <button onClick={openStars}>Open my stars page</button>
        <button onClick={openOptions}>Options…</button>
      </div>

      {err && <div style={{ fontSize: 11, color: '#f85149', marginTop: 8 }}>{err}</div>}
    </div>
  );
}
