import { useState } from 'react';
import type { FilterState } from '@/ui/filter-store';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { cn } from '@/lib/utils';

/**
 * Left filter sidebar. Three regions: special toggles up top, languages
 * (collapsible, off by default), tags grouped by dimension. Reads as a filter
 * panel — selected items highlighted, the rest quiet; counts right-aligned.
 */
export function FilterSidebar({
  f,
  languages,
  tagTree,
}: {
  f: FilterState;
  languages: [string, number][];
  tagTree: { grouped: Map<string | null, { name: string; count: number }[]>; total: number };
}) {
  const [langOpen, setLangOpen] = useState(false);
  const tagEntries = [...tagTree.grouped.entries()];

  return (
    <div className="flex w-52 shrink-0 flex-col gap-4 overflow-auto border-r border-border bg-card p-2 text-sm">
      {/* Special filters */}
      <Section title="特殊筛选">
        <FilterToggle checked={f.onlyUntagged} onChange={() => f.setOnlyUntagged(!f.onlyUntagged)} label="未标注" hint="only untagged" />
        <FilterToggle checked={f.showTombstone} onChange={() => f.setShowTombstone(!f.showTombstone)} label="已 unstar" hint="show unstarred" />
      </Section>

      {/* Languages */}
      <Section
        title={`Languages${f.languages.length > 0 ? ` · ${f.languages.length}` : ''}`}
        collapsible
        open={langOpen}
        onToggle={() => setLangOpen((v) => !v)}
      >
        {langOpen &&
          languages.slice(0, 30).map(([lang, count]) => {
            const on = f.languages.includes(lang);
            return (
              <label key={lang} className={cn('flex cursor-pointer items-center gap-1.5', on ? 'text-foreground' : 'text-muted-foreground')}>
                <Checkbox checked={on} onCheckedChange={() => f.toggleLanguage(lang)} />
                <span className="truncate">{lang}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/70">{count}</span>
              </label>
            );
          })}
      </Section>

      {/* Tags */}
      <Section title={`Tags (${tagTree.total})`}>
        {tagEntries.length === 0 ? (
          <div className="text-xs leading-relaxed text-muted-foreground">
            暂无标签。点工具栏 <b className="text-foreground">⚡ Tags</b> 从 language/topics 自动生成。
          </div>
        ) : (
          tagEntries.map(([dim, tags]) => (
            <div key={dim ?? '__none'} className="mb-2">
              {dim && <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{dim}</div>}
              {tags.slice(0, 50).map(({ name, count }) => {
                const on = f.tags.includes(name);
                return (
                  <label key={name} className={cn('flex cursor-pointer items-center gap-1.5', on ? 'text-foreground' : 'text-muted-foreground')}>
                    <Checkbox checked={on} onCheckedChange={() => f.toggleTag(name)} />
                    <span className="truncate">{name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/70">{count}</span>
                  </label>
                );
              })}
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  collapsible,
  open,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div>
      {collapsible ? (
        <button
          onClick={onToggle}
          className="mb-1 flex w-full items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground"
        >
          <span>{title}</span>
          <span>{open ? '▾' : '▸'}</span>
        </button>
      ) : (
        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function FilterToggle({ checked, onChange, label, hint }: { checked: boolean; onChange: () => void; label: string; hint: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-1.5', checked ? 'text-foreground' : 'text-muted-foreground')}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
      <span className="text-[10px] text-muted-foreground/70">{hint}</span>
    </label>
  );
}
