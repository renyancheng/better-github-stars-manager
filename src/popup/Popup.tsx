import { useEffect, useState } from 'react';
import { bgCall, onProgress, type SyncStatus } from '@/utils/messaging';
import { Button } from '@/ui/shadcn/button';
import { Separator } from '@/ui/shadcn/separator';

interface ConnResult {
  status: number;
  statusText: string;
  remaining: string | null;
  limit: string | null;
  scopes: string | null;
  itemCount: number;
  sample: string | null;
}

export function Popup() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [connResult, setConnResult] = useState<string | null>(null);

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
    chrome.tabs.create({ url: u.username ? `https://github.com/${u.username}?tab=stars` : 'https://github.com/stars' });
  };

  const openOptions = () => chrome.runtime.openOptionsPage();

  const testConn = async () => {
    setBusy(true);
    setConnResult('testing…');
    try {
      const r = await bgCall<ConnResult>('testConnection');
      let text =
        `HTTP ${r.status} ${r.statusText}\n` +
        `rate: ${r.remaining}/${r.limit} remaining\n` +
        `scopes: ${r.scopes ?? '(fine-grained: none shown)'}\n` +
        `items on page 1: ${r.itemCount}\n` +
        `sample: ${r.sample ?? '—'}`;
      if (r.status === 200 && r.itemCount > 0) text = `✅ OK — connection works\n${text}`;
      else if (r.status === 204) text = `⚠️ 204 No Content — token may lack /user/starred access\n${text}`;
      else if (r.status === 401) text = `❌ 401 — token rejected\n${text}`;
      else if (r.status === 403) text = `❌ 403 — forbidden (check scopes / repository access)\n${text}`;
      setConnResult(text);
    } catch (e) {
      setConnResult(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const p = status?.progress;
  const hasToken = status?.hasToken;

  return (
    <div className="flex flex-col gap-2 p-3 font-sans" style={{ minWidth: 280 }}>
      <h2 className="m-0 text-[15px] font-semibold text-foreground">⭐ Better GitHub Stars Manager</h2>

      {!hasToken && (
        <div className="flex items-center gap-2 text-[13px] text-warning">
          No token configured.
          <Button variant="outline" size="sm" onClick={openOptions}>Add PAT</Button>
        </div>
      )}

      <div className="min-h-[18px] text-xs text-muted-foreground">
        {p && p.phase !== 'idle' ? `${p.phase}: ${p.message}` : p?.message || 'Idle'}
      </div>

      <div className="grid gap-1.5">
        <Button variant="outline" disabled={busy || !hasToken} onClick={() => run('syncIncremental', 'Incremental sync')}>
          Sync new stars (incremental)
        </Button>
        <Button variant="outline" disabled={busy || !hasToken} onClick={() => run('syncFull', 'Full sync')}>
          Full re-pull all stars
        </Button>
        <Button variant="outline" disabled={busy || !hasToken} onClick={() => run('syncRescan', 'Rescan')}>
          Detect unstars (rescan)
        </Button>
        <Button variant="outline" disabled={busy || !hasToken} onClick={() => run('gistPull', 'Gist pull')}>
          Pull tags from Gist
        </Button>
        <Button variant="outline" disabled={busy || !hasToken} onClick={() => run('gistPush', 'Gist push')}>
          Push tags to Gist
        </Button>
        <Separator className="my-1" />
        <Button onClick={testConn} disabled={busy}>🔌 Test GitHub connection</Button>
        {connResult && (
          <pre className="m-0 max-h-[150px] overflow-auto rounded border border-border bg-muted/40 p-1.5 text-[10px] text-foreground whitespace-pre-wrap">
            {connResult}
          </pre>
        )}
        <Separator className="my-1" />
        <Button variant="ghost" onClick={openStars}>Open my stars page</Button>
        <Button variant="ghost" onClick={openOptions}>Options…</Button>
      </div>

      {err && <div className="mt-1 text-[11px] text-destructive">{err}</div>}
    </div>
  );
}
