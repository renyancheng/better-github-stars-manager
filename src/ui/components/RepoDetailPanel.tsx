import { useEffect, useState } from 'react';
import type { Star, Tag } from '@/types';
import { suggestTags } from '@/ui/suggest';
import { bgCall } from '@/utils/messaging';
import { TagEditor } from './TagEditor';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Textarea } from '@/ui/shadcn/textarea';
import { Separator } from '@/ui/shadcn/separator';
import { cn } from '@/lib/utils';

/**
 * Right-side detail drawer for a single repo. Deep editing (tags + notes +
 * suggestions) lives here so list rows stay compact. Aside in the flex layout —
 * no portal, no reflow of the virtual list. Prev/next + Esc/[/] navigation.
 */
export function RepoDetailPanel({
  star,
  tag,
  selectedTags,
  onToggleTag,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  star: Star;
  tag: Tag | undefined;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const myTags = tag?.tags ?? [];
  const notes = tag?.notes ?? '';
  const suggestions = suggestTags(star, myTags);

  const [draft, setDraft] = useState(notes);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft(notes);
    setSaved(false);
  }, [star.full_name, notes]);

  const saveNotes = async () => {
    if (draft !== notes) {
      await bgCall('setNotes', { full_name: star.full_name, notes: draft });
      setSaved(true);
    }
  };

  const acceptSuggestions = async () => {
    if (suggestions.length === 0) return;
    await bgCall('acceptSuggestions', { full_name: star.full_name, toAdd: suggestions });
  };

  // Keyboard nav (Esc close, [ / ] prev/next) — ignored while typing in fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === '[' && hasPrev) onPrev();
      else if (e.key === ']' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const selectedSet = new Set(selectedTags);

  return (
    // Width/opacity animation is handled by the parent container in ManagerPanel
    // (drawer-anim); this is just the inner content, full-height.
    <div className="flex h-full w-[340px] flex-col overflow-auto border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={!hasPrev} title="上一个 ( [ )" className={cn(!hasPrev && 'opacity-30')}>‹</Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={!hasNext} title="下一个 ( ] )" className={cn(!hasNext && 'opacity-30')}>›</Button>
        <span className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onClose} title="关闭 (Esc)">✕</Button>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* Title + link */}
        <div>
          <a href={star.html_url} target="_blank" rel="noreferrer" className="break-all text-[13px] font-semibold text-primary no-underline hover:underline">
            {star.full_name}
          </a>
          <div className="mt-0.5 flex gap-2">
            {star.archived && <span className="text-xs text-warning" title="archived">📦 archived</span>}
            {star.tombstone && <span className="text-xs text-destructive" title="unstarred">⊘ unstarred</span>}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <Meta label="Language" value={star.language ?? '—'} />
          <Meta label="Stars" value={`★ ${fmt(star.stargazers_count)}`} />
          <Meta label="Updated" value={star.pushed_at.slice(0, 10)} />
          <Meta label="Starred" value={star.starred_at.slice(0, 10)} />
        </div>

        {star.description && (
          <>
            <Separator />
            <Section title="Description">
              <p className="m-0 text-xs leading-relaxed text-foreground">{star.description}</p>
            </Section>
          </>
        )}

        {star.topics.length > 0 && (
          <>
            <Separator />
            <Section title={`Topics (${star.topics.length})`}>
              <div className="flex flex-wrap gap-1">
                {star.topics.map((t) => (
                  <button key={t} onClick={() => onToggleTag(t)} title="点击按此 topic 筛选">
                    <Badge variant={selectedSet.has(t) ? 'tagActive' : 'tag'} className="cursor-pointer hover:opacity-80">{t}</Badge>
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {suggestions.length > 0 && (
          <>
            <Separator />
            <Section title="Suggested tags">
              <div className="flex flex-wrap items-center gap-1">
                {suggestions.map((t) => (
                  <Badge key={t} variant="outline" className="opacity-70 [border-style:dashed]">{t}</Badge>
                ))}
                <Button variant="outline" size="sm" onClick={acceptSuggestions} title="把这些建议加为标签">+ 全部接受</Button>
              </div>
            </Section>
          </>
        )}

        <Separator />
        <Section title={`Tags (${myTags.length})`}>
          <TagEditor full_name={star.full_name} tags={myTags} selectedTags={selectedTags} onToggleTag={onToggleTag} />
        </Section>

        <Separator />
        <Section title="Notes">
          <Textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            onBlur={saveNotes}
            placeholder="为什么 star 这个仓库?"
            rows={4}
          />
          <div className="mt-0.5 h-3 text-[10px] text-muted-foreground">
            {saved ? <span className="text-success">✓ 已保存</span> : draft !== notes ? '未保存(失焦保存)' : ''}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground/70">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
