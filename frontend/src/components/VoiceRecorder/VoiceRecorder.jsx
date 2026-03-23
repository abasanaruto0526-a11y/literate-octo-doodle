import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { analyzeEmotion, extractKeywords } from '../../services/api';
import { formatText, extractTasks } from '../../services/textProcessor';
import { TaskList } from '../TaskList/TaskList';
import './VoiceRecorder.css';

const EMOTION_LABELS = {
  positive: '😊 ポジティブ',
  negative: '😔 ネガティブ',
  neutral:  '😐 中立',
  excited:  '🎉 興奮',
};

export function VoiceRecorder({ onSave }) {
  const {
    isListening, transcript, interimTranscript,
    supported, startListening, stopListening, resetTranscript,
    audioUrl, audioBase64
  } = useSpeechRecognition();

  const [editedText, setEditedText]         = useState('');
  const [formattedText, setFormattedText]   = useState('');
  const [emotion, setEmotion]               = useState('neutral');
  const [keywords, setKeywords]             = useState([]);
  const [tasks, setTasks]                   = useState([]);
  const [saving, setSaving]                 = useState(false);
  const [audioLevel, setAudioLevel]         = useState(0);
  const [noiseGateOn, setNoiseGateOn]       = useState(true);
  const [noiseThreshold, setNoiseThreshold] = useState(0.02);
  const [autoFormat, setAutoFormat]         = useState(true);
  const [showRaw, setShowRaw]               = useState(false);

  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const animFrameRef = useRef(null);
  const barCount = 32;

  // マイク音量ビジュアライザー（ノイズゲートはweb speech apiと分離して視覚表示のみ）
  useEffect(() => {
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioCtxRef.current = new AudioContext();
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        source.connect(analyserRef.current);

        const tick = () => {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          // ノイズゲート：閾値以下は表示上ゼロ
          setAudioLevel(noiseGateOn && avg < noiseThreshold * 255 ? 0 : avg);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }).catch(() => {
        let t = 0;
        const demo = () => {
          const raw = 30 + Math.sin(t) * 22 + Math.random() * 10;
          setAudioLevel(noiseGateOn && raw < noiseThreshold * 255 * 10 ? 0 : raw);
          t += 0.15;
          animFrameRef.current = requestAnimationFrame(demo);
        };
        demo();
      });
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      setAudioLevel(0);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isListening, noiseGateOn, noiseThreshold]);

  // テキスト変化時に分析
  useEffect(() => {
    const raw = transcript;
    const formatted = autoFormat ? formatText(raw) : raw;
    setEditedText(formatted);
    setFormattedText(formatted);

    const fullText = raw + interimTranscript;
    if (fullText.length > 5) {
      setEmotion(analyzeEmotion(fullText));
      setKeywords(extractKeywords(fullText));
      setTasks(extractTasks(fullText));
    }
  }, [transcript, interimTranscript, autoFormat]);

  const handleSave = async () => {
    if (!editedText.trim()) return;
    setSaving(true);
    try {
      await onSave({
        content: editedText,
        audioText: transcript,
        emotion,
        tags: keywords,
        audioBase64: audioBase64
      });
      resetTranscript();
      setEditedText('');
      setFormattedText('');
      setKeywords([]);
      setTasks([]);
      setEmotion('neutral');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    stopListening();
    resetTranscript();
    setEditedText('');
    setKeywords([]);
    setTasks([]);
    setEmotion('neutral');
  };

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getBarHeight = (i) => {
    if (!isListening || audioLevel < 2) return 4;
    const center = barCount / 2;
    const dist = Math.abs(i - center);
    const wave = Math.max(0, audioLevel - dist * 2.8);
    return Math.min(60, 4 + wave * 0.75 + Math.random() * 6);
  };

  const displayText = showRaw ? transcript : editedText;

  if (!supported) {
    return (
      <div className="voice-recorder glass-card not-supported">
        <div className="not-supported-icon">🎤</div>
        <p>このブラウザは音声認識に対応していません。</p>
        <p className="muted">Chrome または Edge をお使いください。</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder glass-card">
      <div className="recorder-header">
        <h2>🎙️ 音声入力</h2>
        <div className="recorder-options">
          {/* ノイズゲートトグル */}
          <label className="option-toggle" title="雑音を自動除去">
            <input
              type="checkbox"
              checked={noiseGateOn}
              onChange={e => setNoiseGateOn(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">🔇 ノイズ除去</span>
          </label>
          {/* 自動整形トグル */}
          <label className="option-toggle" title="句読点を自動補完">
            <input
              type="checkbox"
              checked={autoFormat}
              onChange={e => setAutoFormat(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">✍️ 自動整形</span>
          </label>
        </div>
        {isListening && (
          <span className="recording-badge">
            <span className="rec-dot" />
            録音中
          </span>
        )}
      </div>

      {/* ノイズ閾値スライダー（ノイズゲートON時のみ） */}
      {noiseGateOn && (
        <div className="noise-slider-row">
          <span className="noise-label">感度</span>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.005"
            value={noiseThreshold}
            onChange={e => setNoiseThreshold(Number(e.target.value))}
            className="noise-slider"
          />
          <span className="noise-label">{Math.round(noiseThreshold * 1000)}%</span>
        </div>
      )}

      {/* 音波ビジュアライザー */}
      <div className={`waveform-container ${isListening ? 'active' : ''}`}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div key={i} className="waveform-bar" style={{ height: `${getBarHeight(i)}px` }} />
        ))}
      </div>

      {/* コントロールボタン */}
      <div className="recorder-controls">
        {!isListening ? (
          <button id="btn-start-recording" className="record-btn start" onClick={startListening}>
            <span className="record-icon">🎤</span>録音開始
          </button>
        ) : (
          <button id="btn-stop-recording" className="record-btn stop" onClick={stopListening}>
            <span className="record-icon">⏹</span>録音停止
          </button>
        )}
      </div>

      {/* テキストエリア */}
      {(editedText || interimTranscript) && (
        <div className="transcript-area">
          <div className="transcript-label-row">
            <span className="transcript-label">認識テキスト</span>
            {transcript && autoFormat && (
              <button
                className="toggle-raw-btn"
                onClick={() => setShowRaw(v => !v)}
              >
                {showRaw ? '✍️ 整形済みを表示' : '🔤 元のテキストを表示'}
              </button>
            )}
          </div>

          <textarea
            className="transcript-textarea"
            value={displayText + (interimTranscript && !showRaw ? ' ' + interimTranscript : '')}
            onChange={e => setEditedText(e.target.value)}
            placeholder="音声を録音すると、ここにテキストが表示されます..."
            rows={4}
          />

          {audioUrl && (
            <div className="audio-preview" style={{ marginTop: '12px' }}>
              <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
            </div>
          )}

          {/* 感情・キーワード */}
          <div className="analysis-row">
            <span className={`emotion-badge emotion-${emotion}`}>
              {EMOTION_LABELS[emotion]}
            </span>
            <div className="keywords">
              {keywords.map((kw, i) => (
                <span key={i} className="tag">#{kw}</span>
              ))}
            </div>
          </div>

          {/* タスクリスト */}
          {tasks.length > 0 && (
            <div className="inline-tasks">
              <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
            </div>
          )}

          {/* アクションボタン */}
          <div className="recorder-actions">
            <button
              id="btn-save-note"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !editedText.trim()}
            >
              {saving ? '保存中...' : '💾 ノートを保存'}
            </button>
            <button id="btn-clear-note" className="btn btn-danger" onClick={handleClear}>
              🗑️ クリア
            </button>
          </div>
        </div>
      )}

      {!editedText && !interimTranscript && !isListening && (
        <p className="hint-text">「録音開始」を押して話しかけてください</p>
      )}
    </div>
  );
}
