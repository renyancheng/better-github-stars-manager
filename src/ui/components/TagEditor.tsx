import { useEffect, useRef, useState } from 'react';
import { bgCall } from '@/utils/messaging';

/**
 * Inline tag editor for a star row. Commits on blur/Enter; Esc cancels.
 * Writes go through the background (which owns the IDB) via bgCall('setTags').
 */
export function TagEditor({
  full_name,
  tags,
  onSaved,
}: {
  full_name: string;
  tags: string[];
  onSaved?: (next: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tags.join(', '));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const next = draft.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    if (next.join(',') !== tags.join(',')) {
      await bgCall('setTags', { full_name, tags: next });
      onSaved?.(next);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(tags.join(', '));
            setEditing(false);
          }
        }}
        placeholder="tag1, tag2"
        style={inputStyle}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(tags.join(', '));
        setEditing(true);
      }}
      style={{ cursor: 'text', minHeight: 18, display: 'inline-block', minWidth: 60 }}
    >
      {tags.length === 0 ? (
        <span style={{ color: '#6e7681', fontStyle: 'italic', fontSize: 11 }}>+ tag</span>
      ) : (
        tags.map((t) => <span key={t} style={chipStyle}>{t}</span>)
      )}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  font: '12px ui-monospace, monospace',
  padding: '1px 6px',
  background: '#0d1117',
  color: '#c9d1d9',
  border: '1px solid #1f6feb',
  borderRadius: 4,
  width: '100%',
  boxSizing: 'border-box',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0 6px',
  margin: '0 2px',
  borderRadius: 8,
  background: '#1f6feb33',
  color: '#79c0ff',
  border: '1px solid #1f6feb55',
  fontSize: 11,
};
