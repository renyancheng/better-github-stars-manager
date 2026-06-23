import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { FilterState } from '@/ui/filter-store';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/shadcn/popover';
import { Input } from '@/ui/shadcn/input';
import { Badge } from '@/ui/shadcn/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * Left filter sidebar. Special toggles up top; Languages and Tags each open a
 * shadcn Popover containing a searchable, scrollable list (no hard caps — the
 * old slice(0,30)/slice(0,50) are gone). The tag popover surfaces tagMode
 * (any/all), which previously had state but no UI.
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
  const { m } = useI18n();

  return (
    <div className="flex w-52 shrink-0 flex-col gap-3 overflow-auto border-r border-border bg-card p-2 text-sm">
      {/* Special filters */}
      <Section title={m.filterSidebar.specialFilters}>
        <FilterToggle
          checked={f.onlyUntagged}
          onChange={() => f.setOnlyUntagged(!f.onlyUntagged)}
          label={m.filterSidebar.onlyUntaggedLabel}
          hint={m.filterSidebar.onlyUntaggedHint}
        />
        {/* "Show unstarred" (tombstone) — disabled for now; keep commented to re-enable later.
        <FilterToggle
          checked={f.showTombstone}
          onChange={() => f.setShowTombstone(!f.showTombstone)}
          label={m.filterSidebar.showTombstoneLabel}
          hint={m.filterSidebar.showTombstoneHint}
        />
        */}
      </Section>

      {/* Languages — popover with search + scroll, no cap */}
      <LanguagesPopover f={f} languages={languages} />

      {/* Tags — popover with search + scroll + any/all, no cap */}
      <TagsPopover f={f} tagTree={tagTree} />
    </div>
  );
}

/** A trigger button that opens a popover with a searchable checkbox list. */
function FilterListPopover({
  trigger,
  selectedCount,
  searchPlaceholder,
  emptyText,
  children,
  contentClassName,
}: {
  trigger: string;
  selectedCount: number;
  searchPlaceholder: string;
  emptyText: string;
  children: (query: string) => ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted/40',
            selectedCount > 0 && 'border-primary/40 text-foreground',
          )}
        >
          <span className="truncate">{trigger}</span>
          <span className="ml-1.5 inline-flex shrink-0 items-center gap-1">
            {selectedCount > 0 && <Badge variant="default" className="px-1.5 py-0 text-[10px]">{selectedCount}</Badge>}
            <ChevronDown className="size-3.5 opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-64 p-0', contentClassName)} align="start">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-7 pr-7 text-xs"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[280px] overflow-auto p-1.5">{children(query) || <div className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyText}</div>}</div>
      </PopoverContent>
    </Popover>
  );
}

function LanguagesPopover({ f, languages }: { f: FilterState; languages: [string, number][] }) {
  const { m } = useI18n();
  return (
    <FilterListPopover
      trigger={m.filterSidebar.languages(f.languages.length)}
      selectedCount={f.languages.length}
      searchPlaceholder={m.filterSidebar.languagesSearch}
      emptyText={m.filterSidebar.languagesEmpty}
    >
      {(query) => {
        const q = query.trim().toLowerCase();
        const list = q ? languages.filter(([lang]) => lang.toLowerCase().includes(q)) : languages;
        return list.map(([lang, count]) => {
          const on = f.languages.includes(lang);
          return (
            <label key={lang} className={cn('flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 hover:bg-muted/40', on ? 'text-foreground' : 'text-muted-foreground')}>
              <Checkbox checked={on} onCheckedChange={() => f.toggleLanguage(lang)} />
              <span className="flex-1 truncate">{lang}</span>
              <span className="tabular-nums text-[10px] text-muted-foreground/70">{count}</span>
            </label>
          );
        });
      }}
    </FilterListPopover>
  );
}

function TagsPopover({
  f,
  tagTree,
}: {
  f: FilterState;
  tagTree: { grouped: Map<string | null, { name: string; count: number }[]>; total: number };
}) {
  const { m } = useI18n();
  const entries = useMemo(() => [...tagTree.grouped.entries()], [tagTree]);

  return (
    <FilterListPopover
      trigger={m.filterSidebar.tags(tagTree.total)}
      selectedCount={f.tags.length}
      searchPlaceholder={m.filterSidebar.tagsSearch}
      emptyText={m.filterSidebar.noTagsPrefix}
      contentClassName="w-72"
    >
      {(query) => {
        if (entries.length === 0) {
          return (
            <div className="px-2 py-3 text-center text-xs leading-relaxed text-muted-foreground">
              {m.filterSidebar.noTagsPrefix} <b className="text-foreground">{m.filterSidebar.noTagsEmphasis}</b> {m.filterSidebar.noTagsSuffix}
            </div>
          );
        }
        const q = query.trim().toLowerCase();
        return (
          <>
            {/* tagMode any/all segmented toggle */}
            <div className="mb-1.5 flex items-center gap-1 border-b border-border px-0.5 pb-1.5">
              <span className="mr-auto text-[10px] text-muted-foreground">{m.filterSidebar.tagsMatchHelp}</span>
              {(['any', 'all'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => f.setTagMode(mode)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[11px] font-medium',
                    f.tagMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {mode === 'any' ? m.filterSidebar.tagsMatchAny : m.filterSidebar.tagsMatchAll}
                </button>
              ))}
            </div>
            {entries.map(([dim, tags]) => {
              const filtered = q ? tags.filter(({ name }) => name.toLowerCase().includes(q)) : tags;
              if (filtered.length === 0) return null;
              return (
                <div key={dim ?? '__none'} className="mb-1.5">
                  {dim && <div className="mb-0.5 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">{dim}</div>}
                  {filtered.map(({ name, count }) => {
                    const on = f.tags.includes(name);
                    return (
                      <label key={name} className={cn('flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 hover:bg-muted/40', on ? 'text-foreground' : 'text-muted-foreground')}>
                        <Checkbox checked={on} onCheckedChange={() => f.toggleTag(name)} />
                        <span className="flex-1 truncate">{name}</span>
                        <span className="tabular-nums text-[10px] text-muted-foreground/70">{count}</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </>
        );
      }}
    </FilterListPopover>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function FilterToggle({ checked, onChange, label, hint }: { checked: boolean; onChange: () => void; label: string; hint: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-muted/40', checked ? 'text-foreground' : 'text-muted-foreground')}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
      <span className="ml-auto text-[10px] text-muted-foreground/70">{hint}</span>
    </label>
  );
}
