import { useState, useEffect } from 'react';
import { VoiceRecorder } from './components/VoiceRecorder/VoiceRecorder';
import { NoteCard } from './components/NoteCard/NoteCard';
import { api } from './services/api';
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [backendStatus, setBackendStatus] = useState(null);

  // バックエンド接続チェック
  useEffect(() => {
    api.checkHealth().then(ok => setBackendStatus(ok ? 'connected' : 'offline'));
  }, []);

  // ノート読み込み
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getNotes();
      setNotes(data);
      setError(null);
    } catch (e) {
      setError('ノートの読み込みに失敗しました。バックエンドが起動しているか確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (noteData) => {
    try {
      const saved = await api.createNote(noteData);
      setNotes(prev => [saved, ...prev]);
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('このノートを削除しますか？')) return;
    try {
      await api.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      alert('削除に失敗しました');
    }
  };

  const filteredNotes = filter === 'all'
    ? notes
    : notes.filter(n => n.emotion === filter);

  const emotionCounts = notes.reduce((acc, n) => {
    acc[n.emotion] = (acc[n.emotion] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app">
      {/* サイドバー */}
      <aside className="sidebar glass-card">
        <div className="sidebar-logo">
          <span className="logo-icon">🎙️</span>
          <div>
            <div className="logo-title">ライフノート</div>
            <div className="logo-sub">音でつながる</div>
          </div>
        </div>

        {/* バックエンドステータス */}
        <div className={`status-pill ${backendStatus}`}>
          <span className="status-dot" />
          {backendStatus === 'connected' ? 'API 接続中' : backendStatus === 'offline' ? 'API オフライン' : '接続確認中...'}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">フィルター</div>
          <button
            className={`nav-item ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📝 すべて ({notes.length})
          </button>
          <button
            className={`nav-item ${filter === 'positive' ? 'active' : ''}`}
            onClick={() => setFilter('positive')}
          >
            😊 ポジティブ ({emotionCounts.positive || 0})
          </button>
          <button
            className={`nav-item ${filter === 'negative' ? 'active' : ''}`}
            onClick={() => setFilter('negative')}
          >
            😔 ネガティブ ({emotionCounts.negative || 0})
          </button>
          <button
            className={`nav-item ${filter === 'excited' ? 'active' : ''}`}
            onClick={() => setFilter('excited')}
          >
            🎉 興奮 ({emotionCounts.excited || 0})
          </button>
          <button
            className={`nav-item ${filter === 'neutral' ? 'active' : ''}`}
            onClick={() => setFilter('neutral')}
          >
            😐 中立 ({emotionCounts.neutral || 0})
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="phase-badge">フェーズ 1</div>
          <div className="phase-label">音声入力プロトタイプ</div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="main-content">
        <header className="main-header">
          <h1>音でつながるライフノート</h1>
          <p className="header-sub">声を記録に、感情を可視化に</p>
        </header>

        {/* 音声入力コンポーネント */}
        <VoiceRecorder onSave={handleSave} />

        {/* エラー表示 */}
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* ノート一覧 */}
        <section className="notes-section">
          <div className="notes-header">
            <h2>
              {filter === 'all' ? 'すべてのノート' : `${filter} のノート`}
            </h2>
            <span className="notes-count">{filteredNotes.length} 件</span>
          </div>

          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎙️</div>
              <p>まだノートがありません</p>
              <p className="empty-sub">上の「録音開始」を押して、最初のノートを作成しましょう</p>
            </div>
          ) : (
            <div className="notes-grid">
              {filteredNotes.map(note => (
                <NoteCard key={note.id} note={note} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
