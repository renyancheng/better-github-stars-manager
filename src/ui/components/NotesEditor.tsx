import { useState } from 'react';
import { bgCall } from '@/utils/messaging';

/** Collapsible notes editor for a star row. Writes via bgCall('setNotes'). */
export function NotesEditor({ full_name, notes }: { full_name: string; notes: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes);

  const save = async () => {
    if (draft !== notes) await bgCall('setNotes', { full_name, notes: draft });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setDraft(notes);
          setOpen(true);
        }}
        title={notes || 'Add a note'}
        style={btnStyle}
      >
        {notes ? '📝' : '🗒️'}
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'flex-start' }}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Why did you star this?"
        rows={2}
        style={{
          font: '12px system-ui',
          padding: 4,
          background: '#0d1117',
          color: '#c9d1d9',
          border: '1px solid #30363d',
          borderRadius: 4,
          width: 220,
          boxSizing: 'border-box',
        }}
      />
      <button onClick={save} style={{ ...btnStyle, background: '#238636', color: '#fff' }}>✓</button>
      <button onClick={() => setOpen(false)} style={btnStyle}>✕</button>
    </span>
  );
}

const btnStyle: React.CSSProperties = {
  font: '12px system-ui',
  padding: '1px 6px',
  background: '#21262d',
  color: '#c9d1d9',
  border: '1px solid #30363d',
  borderRadius: 4,
  cursor: 'pointer',
};
