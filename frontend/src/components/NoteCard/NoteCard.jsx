import './NoteCard.css';
import { getApiAssetUrl } from '../../services/api';

const EMOTION_ICONS = {
  positive: '😊',
  negative: '😔',
  neutral: '😐',
  excited: '🎉',
};

export function NoteCard({ note, onDelete }) {
  const date = new Date(note.createdAt);
  const monthDay = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
  const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`note-card-container emotion-${note.emotion}`}>
      <span className="note-card-date-label">{weekday} {monthDay}</span>
      <div className="note-card glass-card">
        <div className="card-background-aura" />
        
        <div className="note-card-header">
          <div className="header-top">
            <span className="emotion-icon-large">{EMOTION_ICONS[note.emotion]}</span>
            <span className="emotion-text-label">{note.emotion.toUpperCase()}</span>
            <button
              className="apple-delete-btn"
              onClick={() => onDelete(note.id)}
              title="削除"
            >
              削除
            </button>
          </div>
          <h3 className="note-title">{note.title}</h3>
        </div>

        <p className="note-content">{note.content}</p>

        {note.audioUrl && (
          <div className="apple-audio-wrapper">
            <audio controls src={getApiAssetUrl(note.audioUrl)} className="apple-audio-player" />
          </div>
        )}

        <div className="note-footer">
          <div className="note-tags">
            {(note.tags || []).map((tag, i) => (
              <span key={i} className="apple-tag">#{tag}</span>
            ))}
          </div>
          <span className="note-time-label">{time}</span>
        </div>
      </div>
    </div>
  );
}
