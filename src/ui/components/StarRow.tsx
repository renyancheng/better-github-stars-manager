import { memo } from 'react';
import type { Star, Tag } from '@/types';
import { Badge } from '@/ui/shadcn/badge';
import { cn } from '@/lib/utils';

/**
 * Compact scan-optimized list row. Fixed height h-16 (64px) — MUST stay 64 to
 * match the virtualizer's estimateSize, or scroll math drifts at 10k+ rows.
 *
 * Interaction: click row → open detail panel. Click a tag chip → toggle that
 * tag as a filter (stopPropagation). No inline editors — deep editing is in the
 * detail panel. Only the first COMPACT_VISIBLE tags show; "+N" opens nothing in
 * the row (the full list is in the detail panel).
 */
const COMPACT_VISIBLE = 2;

export const StarRow = memo(function StarRow({
  star,
  tag,
  selectedTags,
  onToggleTag,
  selected,
  onSelect,
}: {
  star: Star;
  tag: Tag | undefined;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  selected: boolean;
  onSelect: (full_name: string) => void;
}) {
  const myTags = tag?.tags ?? [];
  const hasNotes = !!(tag?.notes && tag.notes.trim());
  const selectedSet = new Set(selectedTags);
  const overflow = myTags.length > COMPACT_VISIBLE;
  const visible = overflow ? myTags.slice(0, COMPACT_VISIBLE) : myTags;
  const hiddenCount = myTags.length - visible.length;

  return (
    <div
      onClick={() => onSelect(star.full_name)}
      className={cn(
        'grid h-16 cursor-pointer items-center gap-2 border-b border-border px-3 text-sm',
        // columns: repo | desc | lang | stars | updated | tags | note
        'grid-cols-[minmax(180px,1.4fr)_2fr_80px_64px_84px_1.6fr_20px]',
        selected ? 'bg-primary/10' : star.tombstone ? 'bg-muted/40' : 'bg-transparent',
        selected ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-transparent',
        star.tombstone && 'opacity-55',
      )}
    >
      {/* Repo name + status icons */}
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="truncate text-primary">{star.full_name}</span>
        {star.archived && <span className="shrink-0 text-warning" title="archived">📦</span>}
        {star.tombstone && <span className="shrink-0 text-destructive" title="unstarred">⊘</span>}
      </div>

      {/* Description */}
      <div className="truncate text-xs text-muted-foreground">
        {star.description || <span className="text-muted-foreground/60">—</span>}
      </div>

      {/* Language */}
      <div className="truncate text-xs text-primary">
        {star.language ?? <span className="text-muted-foreground/60">—</span>}
      </div>

      {/* Stars */}
      <div className="text-right text-xs text-muted-foreground">★{fmt(star.stargazers_count)}</div>

      {/* Updated */}
      <div className="text-xs text-muted-foreground/70">{star.pushed_at.slice(0, 10)}</div>

      {/* Tags */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-wrap items-center gap-1 overflow-hidden"
      >
        {myTags.length === 0 ? (
          <span className="text-xs italic text-muted-foreground/50">—</span>
        ) : (
          <>
            {visible.map((t) => (
              <button key={t} onClick={() => onToggleTag(t)} title={selectedSet.has(t) ? `筛选中:移除 "${t}"` : `按 "${t}" 筛选`}>
                <Badge variant={selectedSet.has(t) ? 'tagActive' : 'tag'} className="cursor-pointer hover:opacity-80">
                  {t}
                </Badge>
              </button>
            ))}
            {overflow && (
              <span className="text-[10px] text-muted-foreground" title={`还有 ${hiddenCount} 个,在详情中查看全部`}>
                +{hiddenCount}
              </span>
            )}
          </>
        )}
      </div>

      {/* Note indicator */}
      <div className="text-center" title={hasNotes ? '有笔记(详情中查看)' : '无笔记'}>
        {hasNotes && <span className="text-xs text-muted-foreground">📝</span>}
      </div>
    </div>
  );
});

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
