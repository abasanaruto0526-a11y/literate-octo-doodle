import './NoteCard.css';

const EMOTION_ICONS = {
  positive: '😊',
  negative: '😔',
  neutral: '😐',
  excited: '🎉',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function NoteCard({ note, onDelete }) {
  return (
    <div className="note-card glass-card">
      <div className="note-card-header">
        <div className="note-title">{note.title}</div>
        <div className="note-meta">
          <span className={`emotion-badge emotion-${note.emotion}`}>
            {EMOTION_ICONS[note.emotion]} {note.emotion}
          </span>
          <button
            id={`btn-delete-${note.id}`}
            className="delete-btn"
            onClick={() => onDelete(note.id)}
            title="削除"
          >
            ×
          </button>
        </div>
      </div>

      <p className="note-content">{note.content}</p>

      {note.audioUrl && (
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          <audio controls src={`http://localhost:3001${note.audioUrl}`} style={{ width: '100%', height: '36px' }} />
        </div>
      )}

      <div className="note-footer">
        <div className="note-tags">
          {(note.tags || []).map((tag, i) => (
            <span key={i} className="tag">#{tag}</span>
          ))}
        </div>
        <span className="note-date">{formatDate(note.createdAt)}</span>
      </div>
    </div>
  );
}
