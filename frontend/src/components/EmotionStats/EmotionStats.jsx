import './EmotionStats.css';

const EMOTIONS = [
  { key: 'positive', label: 'ポジティブ', icon: '😊', color: 'var(--color-teal)' },
  { key: 'excited',  label: '興奮',       icon: '🎉', color: 'var(--color-accent)' },
  { key: 'neutral',  label: '中立',       icon: '😐', color: 'var(--color-text-muted)' },
  { key: 'negative', label: 'ネガティブ', icon: '😔', color: 'var(--color-recording)' },
];

export function EmotionStats({ notes }) {
  if (notes.length === 0) return null;

  const counts = notes.reduce((acc, n) => {
    acc[n.emotion] = (acc[n.emotion] || 0) + 1;
    return acc;
  }, {});

  const total = notes.length;

  return (
    <div className="emotion-stats glass-card">
      <div className="stats-title">📊 感情分布</div>
      <div className="stats-bars">
        {EMOTIONS.map(({ key, label, icon, color }) => {
          const count = counts[key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className="stat-row">
              <span className="stat-label">
                {icon} {label}
              </span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: color,
                  }}
                />
              </div>
              <span className="stat-value" style={{ color }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="stats-total">合計 {total} 件のノート</div>
    </div>
  );
}
