import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { bgCall } from '@/utils/messaging';
import { Badge } from '@/ui/shadcn/badge';
import { Input } from '@/ui/shadcn/input';
import { Button } from '@/ui/shadcn/button';
import { Spinner } from '@/ui/shadcn/spinner';
import { useI18n } from '@/i18n';

/**
 * Full tag editor for the detail panel. Each chip is click-to-filter (toggle
 * that tag as a filter); a ✕ removes the tag; an input adds tags. A "批量"
 * toggle reveals a comma-separated bulk editor.
 *
 * Only the `full` variant exists now — list rows render their own compact
 * tag summary inline (see StarRow), so this component is detail-panel-only.
 */
export function TagEditor({
  full_name,
  tags,
  selectedTags,
  onToggleTag,
  onDataChanged,
}: {
  full_name: string;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onDataChanged?: () => void;
}) {
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState(tags.join(', '));
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | 'bulk' | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const { m } = useI18n();

  useEffect(() => {
    setDraft(tags.join(', '));
  }, [tags]);

  const removeTag = async (t: string) => {
    setPendingAction('remove');
    try {
      await bgCall('setTags', { full_name, tags: tags.filter((x) => x !== t) });
      onDataChanged?.();
    } finally {
      setPendingAction(null);
    }
  };
  const addTag = async () => {
    const v = addInputRef.current?.value.trim();
    if (!v) return;
    setPendingAction('add');
    try {
      if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
        await bgCall('setTags', { full_name, tags: [...tags, v] });
        onDataChanged?.();
      }
      if (addInputRef.current) addInputRef.current.value = '';
    } finally {
      setPendingAction(null);
    }
  };
  const commitBulk = async () => {
    const next = draft.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    setPendingAction('bulk');
    try {
      if (next.join(',') !== tags.join(',')) {
        await bgCall('setTags', { full_name, tags: next });
        onDataChanged?.();
      }
      setBulk(false);
    } finally {
      setPendingAction(null);
    }
  };

  const selectedSet = new Set(selectedTags);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">{m.tagEditor.noTags}</span>
        ) : (
          tags.map((t) => {
            const active = selectedSet.has(t);
            return (
              <span key={t} className="inline-flex items-center gap-1">
                <button onClick={() => onToggleTag(t)} title={active ? m.tagEditor.clearTagFilter(t) : m.tagEditor.filterByTag(t)}>
                  <Badge variant={active ? 'tagActive' : 'tag'} className="cursor-pointer hover:opacity-80">{t}</Badge>
                </button>
                <button disabled={pendingAction !== null} onClick={() => removeTag(t)} className="text-muted-foreground hover:text-destructive disabled:opacity-40" title={m.tagEditor.removeTag}><X className="size-3" /></button>
              </span>
            );
          })
        )}
      </div>

      {!bulk ? (
        <div className="flex items-center gap-1.5">
          <Input
            ref={addInputRef}
            placeholder={m.tagEditor.addTagPlaceholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTag();
              }
            }}
            className="flex-1"
            disabled={pendingAction !== null}
          />
          <Button variant="outline" size="sm" onClick={() => void addTag()} disabled={pendingAction !== null}>
            {pendingAction === 'add' ? (
              <>
                <Spinner data-icon="inline-start" />
                {m.tagEditor.addTagButton}
              </>
            ) : (
              m.tagEditor.addTagButton
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setDraft(tags.join(', ')); setBulk(true); }} title={m.tagEditor.bulkEditTitle} disabled={pendingAction !== null}>
            {m.common.bulk}
          </Button>
        </div>
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitBulk()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitBulk();
            if (e.key === 'Escape') { setDraft(tags.join(', ')); setBulk(false); }
          }}
          placeholder={m.tagEditor.bulkPlaceholder}
          disabled={pendingAction !== null}
        />
      )}
    </div>
  );
}
