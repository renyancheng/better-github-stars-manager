import { memo } from 'react';
import type { Star, Tag } from '@/types';
import { TagEditor } from './TagEditor';
import { NotesEditor } from './NotesEditor';
import { suggestTags } from '@/ui/suggest';
import { bgCall } from '@/utils/messaging';

/** A single virtualized row. memo()'d because react-virtual re-renders on scroll. */
export const StarRow = memo(function StarRow({
  star,
  tag,
}: {
  star: Star;
  tag: Tag | undefined;
}) {
  const myTags = tag?.tags ?? [];
  const suggestions = suggestTags(star, myTags);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px,1.6fr) 2fr 90px 70px 120px 1.4fr 28px',
        gap: 10,
        alignItems: 'center',
        padding: '6px 12px',
        borderBottom: '1px solid #21262d',
        fontSize: 12,
        opacity: star.tombstone ? 0.4 : 1,
        background: star.tombstone ? '#161b22' : 'transparent',
      }}
    >
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <a href={star.html_url} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>
          {star.full_name}
        </a>
        {star.archived && <span style={{ color: '#d29922', marginLeft: 4 }} title="archived">📦</span>}
        {star.tombstone && <span style={{ color: '#f85149', marginLeft: 4 }} title="unstarred">⊘</span>}
      </div>

      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8b949e' }}>
        {star.description || <span style={{ color: '#6e7681' }}>—</span>}
      </div>

      <div style={{ color: '#79c0ff' }}>{star.language ?? <span style={{ color: '#6e7681' }}>—</span>}</div>

      <div style={{ color: '#8b949e', textAlign: 'right' }}>★{fmt(star.stargazers_count)}</div>

      <div style={{ color: '#8b949e', fontSize: 11 }}>{fmtDate(star.pushed_at)}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TagEditor full_name={star.full_name} tags={myTags} />
        {suggestions.length > 0 && (
          <button
            title={`Suggested: ${suggestions.join(', ')}`}
            onClick={() => bgCall('acceptSuggestions', { full_name: star.full_name, toAdd: suggestions })}
            style={{ font: '10px system-ui', padding: '0 4px', background: '#1f6feb22', color: '#79c0ff', border: '1px solid #1f6feb44', borderRadius: 8, cursor: 'pointer' }}
          >
            +{suggestions.length}
          </button>
        )}
      </div>

      <NotesEditor full_name={star.full_name} notes={tag?.notes ?? ''} />
    </div>
  );
});

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}
