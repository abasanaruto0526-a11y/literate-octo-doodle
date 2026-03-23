import { useState, useEffect } from 'react';
import { VoiceRecorder } from './components/VoiceRecorder/VoiceRecorder';
import { NoteCard } from './components/NoteCard/NoteCard';
import { SearchBar } from './components/SearchBar/SearchBar';
import { EmotionStats } from './components/EmotionStats/EmotionStats';
import { CalendarView } from './components/CalendarView/CalendarView';
import { MindMapView } from './components/MindMapView/MindMapView';
import { DailyDetailModal } from './components/DailyDetailModal/DailyDetailModal';
import { api } from './services/api';
import { searchNotes } from './services/textProcessor';
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [dailyMediaList, setDailyMediaList] = useState([]);
  const [todaysEvents, setTodaysEvents] = useState([]);
  const [showReminder, setShowReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [backendStatus, setBackendStatus] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);

  // 通知用のチャイム音声を生成・再生する関数
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // キラキラしたベルのような音色
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 2.0);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6
      osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 2.0);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 2.1);
      osc2.stop(ctx.currentTime + 2.1);
    } catch(e) {
      console.warn("ブラウザの制限によりサウンドが再生できませんでした", e);
    }
  };

  useEffect(() => {
    api.checkHealth().then(ok => setBackendStatus(ok ? 'connected' : 'offline'));
  }, []);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getNotes();
      const eventData = await api.getEvents().catch(() => []);
      const mediaData = await api.getDailyMedia().catch(() => []);
      
      setNotes(data);
      setEvents(eventData);
      setDailyMediaList(mediaData);

      const today = new Date();
      const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const yyyymmdd = `${today.getFullYear()}-${mmdd}`;
      const matchingEvents = eventData.filter(e => e.isAnnual ? e.date.endsWith(mmdd) : e.date === yyyymmdd);
      if (matchingEvents.length > 0) {
        setTodaysEvents(matchingEvents);
        setShowReminder(true);
        setTimeout(() => playChime(), 100);
      }

      setError(null);
    } catch {
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
    } catch {
      alert('削除に失敗しました');
    }
  };

  const handleAddEvent = async (eventData) => {
    try {
      const saved = await api.createEvent(eventData);
      setEvents(prev => [...prev, saved]);
    } catch (e) {
      alert('イベントの保存に失敗しました: ' + e.message);
    }
  };

  const handleDailyMediaUpload = async (mediaBase64) => {
    if (!selectedDate) return;
    const yyyymmdd = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
    try {
      const saved = await api.uploadDailyMedia({ date: yyyymmdd, mediaBase64 });
      setDailyMediaList(prev => [...prev, saved]);
    } catch {
      alert('メディアの保存に失敗しました');
    }
  };

  const handleDailyMediaDelete = async (id) => {
    try {
      await api.deleteDailyMedia(id);
      setDailyMediaList(prev => prev.filter(m => m.id !== id));
    } catch {
      alert('メディアの削除に失敗しました');
    }
  };

  // フィルター → 検索
  const emotionFiltered = filter === 'all' ? notes : notes.filter(n => n.emotion === filter);
  let filteredNotes = searchQuery ? searchNotes(emotionFiltered, searchQuery) : emotionFiltered;

  // カレンダーの日付フィルタ
  if (selectedDate) {
    filteredNotes = filteredNotes.filter(n => {
      const d = new Date(n.createdAt);
      return d.getFullYear() === selectedDate.getFullYear() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getDate() === selectedDate.getDate();
    });
  }

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

        <div className={`status-pill ${backendStatus}`}>
          <span className="status-dot" />
          {backendStatus === 'connected' ? 'API 接続中'
            : backendStatus === 'offline' ? 'API オフライン'
            : '接続確認中...'}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">フィルター</div>
          {[
            { key: 'all',      label: '📝 すべて' },
            { key: 'positive', label: '😊 ポジティブ' },
            { key: 'excited',  label: '🎉 興奮' },
            { key: 'neutral',  label: '😐 中立' },
            { key: 'negative', label: '😔 ネガティブ' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`nav-item ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} ({key === 'all' ? notes.length : (emotionCounts[key] || 0)})
            </button>
          ))}
        </nav>

        {/* 感情統計 */}
        <div className="sidebar-stats">
          <EmotionStats notes={notes} />
        </div>

        <div className="sidebar-footer">
          <div className="phase-badge">フェーズ 5</div>
          <div className="phase-label">旧暦・潮汐情報カレンダー</div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="main-content">
        <header className="main-header">
          <h1>音でつながるライフノート</h1>
          <p className="header-sub">声を記録に、感情を可視化に</p>
        </header>

        <VoiceRecorder onSave={handleSave} />

        {error && <div className="error-banner">⚠️ {error}</div>}

        <section className="notes-section">
          <SearchBar onSearch={setSearchQuery} noteCount={filteredNotes.length} />

          <div className="notes-header">
            <h2>
              {filter === 'all' ? 'すべてのノート' : `${filter} のノート`}
              {selectedDate && ` (${selectedDate.getMonth() + 1}/${selectedDate.getDate()})`}
            </h2>
            <div className="notes-header-actions">
              <span className="notes-count">{filteredNotes.length} 件</span>
              <div className="view-toggle">
                <button 
                  className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  📝 リスト
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                >
                  📅 カレンダー
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'mindmap' ? 'active' : ''}`}
                  onClick={() => setViewMode('mindmap')}
                >
                  🕸️ マップ
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' && (
            <CalendarView 
              notes={notes}
              events={events}
              onAddEvent={handleAddEvent}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          )}

          {viewMode === 'mindmap' && (
            <MindMapView notes={notes} />
          )}

          {selectedDate && (
             <DailyDetailModal
               date={selectedDate}
               notes={filteredNotes}
               events={events.filter(e => {
                  const mmdd = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                  const yyyymmdd = `${selectedDate.getFullYear()}-${mmdd}`;
                  return e.isAnnual ? e.date.endsWith(mmdd) : e.date === yyyymmdd;
               })}
               mediaList={dailyMediaList.filter(m => {
                  const yyyymmdd = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
                  return m.date === yyyymmdd;
               })}
               onUpload={handleDailyMediaUpload}
               onDelete={handleDailyMediaDelete}
               onClose={() => setSelectedDate(null)}
             />
          )}

          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎙️</div>
              <p>{searchQuery ? `「${searchQuery}」に一致するノートがありません` : 'まだノートがありません'}</p>
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

      {showReminder && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'}}>
          <div className="glass-card" style={{padding: '30px', width: '400px', background: 'var(--color-bg-deep)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: '0 0 30px rgba(78, 205, 196, 0.3)'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>🔔</div>
            <h2 style={{margin: '0 0 20px 0', color: 'var(--color-primary)'}}>本日のリマインダー</h2>
            <p style={{color: 'var(--color-text-muted)', marginBottom: '16px'}}>今日は以下の記念日・イベントです！</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px', maxHeight: '400px', overflowY: 'auto'}}>
              {todaysEvents.map(e => (
                <div key={e.id} style={{background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', fontSize: '18px', fontWeight: '700', borderLeft: `4px solid ${e.color}`}}>
                  {e.isAnnual && '🎁 '}{e.title}
                  {e.mediaUrl && (
                    <div style={{marginTop: '12px', background: 'rgba(0,0,0,0.2)', padding:'8px', borderRadius:'8px'}}>
                      {e.mediaUrl.endsWith('.mp4') ? (
                        <video src={`http://localhost:3001${e.mediaUrl}`} controls style={{width:'100%', borderRadius:'4px', maxHeight:'250px', backgroundColor: '#000'}} />
                      ) : (
                        <img src={`http://localhost:3001${e.mediaUrl}`} alt="" style={{width:'100%', borderRadius:'4px', maxHeight:'250px', objectFit:'contain'}} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowReminder(false)}
              style={{background: 'var(--color-primary)', border: 'none', padding: '10px 24px', borderRadius: '30px', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)'}}
              onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.target.style.transform = 'scale(1)'}
            >
              確認しました
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
