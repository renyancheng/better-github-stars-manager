import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { authStore } from '@/auth/auth-store';
import { Button } from '@/ui/shadcn/button';
import { Textarea } from '@/ui/shadcn/textarea';
import { Separator } from '@/ui/shadcn/separator';
import { cn } from '@/lib/utils';

export function Options() {
  const [tokenInput, setTokenInput] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [gistId, setGistId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const refresh = async () => {
    const c = await authStore.getConfig();
    setUsername(c.username);
    setGistId(c.gistId);
    setTheme(c.theme);
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

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await authStore.setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="mx-auto my-10 max-w-2xl rounded-lg bg-background p-7 font-sans text-foreground">
      <h1 className="mt-0 text-xl font-semibold">⭐ Better GitHub Stars Manager — Options</h1>

      <section className="mt-6">
        <h2 className="text-base font-medium">1. GitHub Token</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Create a <b className="text-foreground">fine-grained PAT</b> at{' '}
          <a className="text-primary hover:underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            github.com/settings/tokens
          </a>
          . Required permissions:
        </p>
        <ul className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          <li><b className="text-foreground">Account → Public Repositories</b> (read starred repos via <code>/user/starred</code>)</li>
          <li><b className="text-foreground">Account → Gists</b> (read/write, for cross-device tag sync)</li>
        </ul>
        <p className="mt-1 text-xs text-warning">
          Note: GitHub Gist scope is account-wide (no per-gist isolation for fine-grained tokens).
          We create one dedicated secret gist for sync.
        </p>

        {username && (
          <div className="my-3 flex items-center text-[13px]">
            ✅ Authenticated as <b className="ml-1">@{username}</b>.
            <Button variant="ghost" size="sm" className="ml-2" onClick={clear}>Remove token</Button>
          </div>
        )}

        <Textarea
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="github_pat_..."
          rows={2}
          className="mt-1 font-mono"
        />
        <div className="mt-2">
          <Button disabled={busy || !tokenInput.trim()} onClick={save}>
            {busy ? 'Verifying…' : 'Save & verify'}
          </Button>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-base font-medium">2. Appearance</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Black/white theme. Applies to the stars page, options, and popup.</p>
        <div className="mt-2 flex items-center gap-3">
          <Button variant="outline" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </Button>
          <span className="text-xs text-muted-foreground">当前: {theme}</span>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-base font-medium">3. Gist sync</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {gistId
            ? <>Bound to gist <code>{gistId}</code>. Tags sync to/from this gist (per-repo LWW).</>
            : <>No gist yet. One is created automatically on your first tag push.</>}
        </p>
      </section>

      {msg && (
        <div className={cn('mt-4 text-[13px]', msg.kind === 'ok' ? 'text-success' : 'text-destructive')}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
