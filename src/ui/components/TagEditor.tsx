import { useEffect, useRef, useState } from 'react';
import { bgCall } from '@/utils/messaging';
import { Badge } from '@/ui/shadcn/badge';
import { Input } from '@/ui/shadcn/input';
import { Button } from '@/ui/shadcn/button';

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
}: {
  full_name: string;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState(tags.join(', '));
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(tags.join(', '));
  }, [tags]);

  const removeTag = async (t: string) => {
    await bgCall('setTags', { full_name, tags: tags.filter((x) => x !== t) });
  };
  const addTag = async () => {
    const v = addInputRef.current?.value.trim();
    if (!v) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      await bgCall('setTags', { full_name, tags: [...tags, v] });
    }
    if (addInputRef.current) addInputRef.current.value = '';
  };
  const commitBulk = async () => {
    const next = draft.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    if (next.join(',') !== tags.join(',')) {
      await bgCall('setTags', { full_name, tags: next });
    }
    setBulk(false);
  };

  const selectedSet = new Set(selectedTags);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">尚无标签</span>
        ) : (
          tags.map((t) => {
            const active = selectedSet.has(t);
            return (
              <span key={t} className="inline-flex items-center gap-1">
                <button onClick={() => onToggleTag(t)} title={active ? `筛选中:移除 "${t}"` : `按 "${t}" 筛选`}>
                  <Badge variant={active ? 'tagActive' : 'tag'} className="cursor-pointer hover:opacity-80">{t}</Badge>
                </button>
                <button onClick={() => removeTag(t)} className="text-xs text-muted-foreground hover:text-destructive" title="移除标签">✕</button>
              </span>
            );
          })
        )}
      </div>

      {!bulk ? (
        <div className="flex items-center gap-1.5">
          <Input
            ref={addInputRef}
            placeholder="添加标签,回车确认"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addTag}>添加</Button>
          <Button variant="ghost" size="sm" onClick={() => { setDraft(tags.join(', ')); setBulk(true); }} title="批量编辑(逗号分隔)">批量</Button>
        </div>
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitBulk}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitBulk();
            if (e.key === 'Escape') { setDraft(tags.join(', ')); setBulk(false); }
          }}
          placeholder="tag1, tag2, …"
        />
      )}
    </div>
  );
}
