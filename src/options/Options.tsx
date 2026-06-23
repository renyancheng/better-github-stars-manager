import { useEffect, useState } from 'react';
import { Sun, Moon, Star, Check, AlertTriangle } from 'lucide-react';
import { authStore } from '@/auth/auth-store';
import { bgCall, mergeProgressStatus, mergeStatusSnapshot, onProgress, type SyncStatus } from '@/utils/messaging';
import { Button } from '@/ui/shadcn/button';
import { Progress } from '@/ui/shadcn/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Spinner } from '@/ui/shadcn/spinner';
import { Textarea } from '@/ui/shadcn/textarea';
import { Separator } from '@/ui/shadcn/separator';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Locale } from '@/types';

export function Options() {
  const [tokenInput, setTokenInput] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [hasUsableToken, setHasUsableToken] = useState(false);
  const [gistId, setGistId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const { locale, setLocale, m } = useI18n();

  const refresh = async () => {
    const [c, hasToken, status] = await Promise.all([
      authStore.getConfig(),
      authStore.hasToken(),
      bgCall<SyncStatus>('getStatus').catch(() => null),
    ]);
    setUsername(c.username);
    setHasUsableToken(hasToken);
    setGistId(c.gistId);
    setTheme(c.theme);
    setSyncStatus((current) => mergeStatusSnapshot(current, status));
  };
  useEffect(() => {
    void refresh();
    const off = onProgress((progress) => {
      setSyncStatus((current) => mergeProgressStatus(current, progress, hasUsableToken));
    });
    return off;
  }, [hasUsableToken]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { username: u } = await authStore.setToken(tokenInput);
      setMsg({ kind: 'ok', text: m.options.tokenVerified(u) });
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
    setMsg({ kind: 'ok', text: m.options.tokenRemoved });
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await authStore.setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const syncing = !!(syncStatus?.progress && syncStatus.progress.phase !== 'idle');
  const progressValue = syncStatus?.progress.total
    ? Math.max(1, Math.min(100, Math.round((syncStatus.progress.done / syncStatus.progress.total) * 100)))
    : null;
  const progressCount = syncStatus?.progress.total ? `${syncStatus.progress.done}/${syncStatus.progress.total}` : null;

  return (
    <div className="mx-auto my-10 max-w-2xl rounded-lg bg-background p-7 font-sans text-foreground">
      <h1 className="mt-0 inline-flex items-center gap-1.5 text-xl font-semibold">
        <Star className="size-5 fill-current text-primary" />
        {m.options.title}
      </h1>

      <section className="mt-6">
        <h2 className="text-base font-medium">{m.options.tokenHeading}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {m.options.tokenIntroPrefix}{' '}
          <a className="text-primary hover:underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            {m.options.tokenLinkLabel}
          </a>
          . {m.options.tokenIntroSuffix}
        </p>
        <ul className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          <li>{m.options.tokenPublicRepos}</li>
          <li>{m.options.tokenGists}</li>
        </ul>
        <p className="mt-1 text-xs text-warning">{m.options.tokenGistNote}</p>

        {hasUsableToken && username && (
          <div className="my-3 flex items-center gap-1.5 text-[13px] text-success">
            <Check className="size-4 shrink-0" />
            <span>{m.options.authenticatedAs(username)}</span>
            <Button variant="ghost" size="sm" className="ml-2" onClick={clear}>{m.options.removeToken}</Button>
          </div>
        )}
        {!hasUsableToken && username && (
          <div className="my-3 flex items-center gap-1.5 text-[13px] text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{m.options.cachedAccountWarning(username)}</span>
            <Button variant="ghost" size="sm" className="ml-2" onClick={clear}>{m.options.clearCachedAuth}</Button>
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
            {busy ? (
              <>
                <Spinner data-icon="inline-start" />
                {m.options.verifying}
              </>
            ) : (
              m.options.saveVerify
            )}
          </Button>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-base font-medium">{m.options.languageHeading}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{m.options.languageBody}</p>
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-foreground">{m.options.languageLabel}</label>
          <Select value={locale} onValueChange={(value) => void setLocale(value as Locale)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={m.options.languageLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh-CN">中文</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{m.common.current(m.localeName)}</span>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-base font-medium">{m.options.appearanceHeading}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{m.options.appearanceBody}</p>
        <div className="mt-2 flex items-center gap-3">
          <Button variant="outline" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
            {theme === 'dark' ? m.options.switchToLight : m.options.switchToDark}
          </Button>
          <span className="text-xs text-muted-foreground">{m.common.current(theme)}</span>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-base font-medium">{m.options.gistHeading}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {gistId
            ? <>{m.options.gistBoundPrefix} <code>{gistId}</code>. {m.options.gistBoundSuffix}</>
            : <>{m.options.gistEmpty}</>}
        </p>
        <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            {syncing && <Spinner className="size-3" />}
            {syncStatus?.progress
              ? `${m.common.phase(syncStatus.progress.phase)}: ${syncStatus.progress.message || m.popup.idle}`
              : m.popup.idle}
          </div>
          {syncing && progressValue != null && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={progressValue} className="h-2 flex-1" />
              <span className="min-w-[48px] text-right tabular-nums text-foreground">{progressCount}</span>
            </div>
          )}
        </div>
      </section>

      {msg && (
        <div className={cn('mt-4 text-[13px]', msg.kind === 'ok' ? 'text-success' : 'text-destructive')}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
