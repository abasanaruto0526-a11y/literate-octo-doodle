import { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { analyzeEmotion, extractKeywords } from '../../services/api';
import './VoiceRecorder.css';

const EMOTION_LABELS = {
  positive: '😊 ポジティブ',
  negative: '😔 ネガティブ',
  neutral: '😐 中立',
  excited: '🎉 興奮',
};

export function VoiceRecorder({ onSave }) {
  const {
    isListening, transcript, interimTranscript,
    supported, startListening, stopListening, resetTranscript,
  } = useSpeechRecognition();

  const [editedText, setEditedText] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [keywords, setKeywords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const barCount = 30;

  // マイク音量ビジュアライザー
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
          setAudioLevel(avg);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }).catch(() => {
        // マイクアクセス拒否時はデモアニメーション
        let t = 0;
        const demo = () => {
          setAudioLevel(30 + Math.sin(t) * 20 + Math.random() * 10);
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
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isListening]);

  // 音声テキストが変化したら感情・キーワード分析
  useEffect(() => {
    const fullText = transcript + interimTranscript;
    setEditedText(transcript);
    if (fullText.length > 5) {
      setEmotion(analyzeEmotion(fullText));
      setKeywords(extractKeywords(fullText));
    }
  }, [transcript, interimTranscript]);

  const handleSave = async () => {
    if (!editedText.trim()) return;
    setSaving(true);
    try {
      await onSave({
        content: editedText,
        audioText: transcript,
        emotion,
        tags: keywords,
      });
      resetTranscript();
      setEditedText('');
      setKeywords([]);
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
    setEmotion('neutral');
  };

  // 音波バーの高さ計算
  const getBarHeight = (i) => {
    if (!isListening || audioLevel < 2) return 4;
    const center = barCount / 2;
    const dist = Math.abs(i - center);
    const wave = Math.max(0, audioLevel - dist * 3);
    const rand = Math.random() * 8;
    return Math.min(60, 4 + wave * 0.8 + rand);
  };

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
        {isListening && (
          <span className="recording-badge">
            <span className="rec-dot" />
            録音中
          </span>
        )}
      </div>

      {/* 音波ビジュアライザー */}
      <div className={`waveform-container ${isListening ? 'active' : ''}`}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="waveform-bar"
            style={{ height: `${getBarHeight(i)}px` }}
          />
        ))}
      </div>

      {/* コントロールボタン */}
      <div className="recorder-controls">
        {!isListening ? (
          <button
            id="btn-start-recording"
            className="record-btn start"
            onClick={startListening}
          >
            <span className="record-icon">🎤</span>
            録音開始
          </button>
        ) : (
          <button
            id="btn-stop-recording"
            className="record-btn stop"
            onClick={stopListening}
          >
            <span className="record-icon">⏹</span>
            録音停止
          </button>
        )}
      </div>

      {/* リアルタイムテキスト表示 */}
      {(editedText || interimTranscript) && (
        <div className="transcript-area">
          <div className="transcript-label">認識テキスト</div>
          <textarea
            className="transcript-textarea"
            value={editedText + (interimTranscript ? ' ' + interimTranscript : '')}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="音声を録音すると、ここにテキストが表示されます..."
            rows={4}
          />

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
            <button
              id="btn-clear-note"
              className="btn btn-danger"
              onClick={handleClear}
            >
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
