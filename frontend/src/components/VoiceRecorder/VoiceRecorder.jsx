import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { api } from '../../services/api';
import { formatText, extractTasks } from '../../services/textProcessor';
import { TaskList } from '../TaskList/TaskList';
import './VoiceRecorder.css';

const EMOTION_LABELS = {
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
  excited: 'Excited',
};

export function VoiceRecorder({ onSave }) {
  const {
    isListening,
    transcript,
    interimTranscript,
    supported,
    startListening,
    stopListening,
    resetTranscript,
    audioUrl,
    audioBase64,
    audioStream,
  } = useSpeechRecognition();

  const [editedText, setEditedText] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [keywords, setKeywords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseGateOn, setNoiseGateOn] = useState(true);
  const [noiseThreshold, setNoiseThreshold] = useState(0.02);
  const [autoFormat, setAutoFormat] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [inputMode, setInputMode] = useState('voice');
  const [textDraft, setTextDraft] = useState('');
  const [textEmotion, setTextEmotion] = useState('neutral');
  const [textKeywords, setTextKeywords] = useState([]);
  const [textTasks, setTextTasks] = useState([]);
  const [stopRequested, setStopRequested] = useState(false);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const sourceRef = useRef(null);
  const barCount = 32;

  useEffect(() => {
    if (isListening && audioStream) {
      audioCtxRef.current = new AudioContext();
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(audioStream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      sourceRef.current.connect(analyserRef.current);

      const tick = () => {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
        setAudioLevel(noiseGateOn && avg < noiseThreshold * 255 ? 0 : avg);
        animFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } else if (isListening) {
      let t = 0;
      const demo = () => {
        const raw = 30 + Math.sin(t) * 22 + Math.random() * 10;
        setAudioLevel(noiseGateOn && raw < noiseThreshold * 255 * 10 ? 0 : raw);
        t += 0.15;
        animFrameRef.current = requestAnimationFrame(demo);
      };

      demo();
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      setAudioLevel(0);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioStream, isListening, noiseGateOn, noiseThreshold]);

  useEffect(() => {
    if (!isListening) {
      setStopRequested(false);
    }
  }, [isListening]);

  useEffect(() => {
    const raw = transcript;
    const formatted = autoFormat ? formatText(raw) : raw;
    setEditedText(formatted);

    const fullText = raw + interimTranscript;
    if (fullText.length <= 5) return undefined;

    setTasks(extractTasks(fullText));

    const timeoutId = setTimeout(async () => {
      try {
        const result = await api.analyzeText(fullText);
        if (result) {
          setEmotion(result.emotion || 'neutral');
          setKeywords(result.keywords || []);
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [autoFormat, interimTranscript, transcript]);

  const handleSave = async () => {
    if (!editedText.trim()) return;

    setSaving(true);
    try {
      await onSave({
        content: editedText,
        audioText: transcript,
        emotion,
        tags: keywords,
        audioBase64,
      });
      resetTranscript();
      setEditedText('');
      setKeywords([]);
      setTasks([]);
      setEmotion('neutral');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (inputMode === 'voice') {
      stopListening();
      resetTranscript();
      setEditedText('');
      setKeywords([]);
      setTasks([]);
      setEmotion('neutral');
    } else {
      setTextDraft('');
      setTextKeywords([]);
      setTextTasks([]);
      setTextEmotion('neutral');
    }
  };

  useEffect(() => {
    if (inputMode !== 'text' || textDraft.length < 5) return undefined;

    setTextTasks(extractTasks(textDraft));

    const timeoutId = setTimeout(async () => {
      try {
        const result = await api.analyzeText(textDraft);
        if (result) {
          setTextEmotion(result.emotion || 'neutral');
          setTextKeywords(result.keywords || []);
        }
      } catch (error) {
        console.error('Text AI analysis failed:', error);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [inputMode, textDraft]);

  const handleTextSave = async () => {
    if (!textDraft.trim()) return;

    setSaving(true);
    try {
      await onSave({
        content: textDraft,
        audioText: '',
        emotion: textEmotion,
        tags: textKeywords,
        audioBase64: null,
      });
      setTextDraft('');
      setTextKeywords([]);
      setTextTasks([]);
      setTextEmotion('neutral');
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = useCallback((id) => {
    setTasks((prev) => prev.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const toggleTextTask = useCallback((id) => {
    setTextTasks((prev) => prev.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )));
  }, []);

  const deleteTextTask = useCallback((id) => {
    setTextTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const handleStartRecording = async () => {
    setStopRequested(false);
    await startListening();
  };

  const handleStopRecording = async () => {
    setStopRequested(true);
    try {
      await stopListening();
    } finally {
      setStopRequested(false);
    }
  };

  const getBarHeight = (index) => {
    if (!isListening || audioLevel < 2) return 4;

    const center = barCount / 2;
    const distance = Math.abs(index - center);
    const wave = Math.max(0, audioLevel - distance * 2.8);
    return Math.min(60, 4 + wave * 0.75 + Math.random() * 6);
  };

  const displayText = showRaw ? transcript : editedText;

  if (!supported) {
    return (
      <div className="voice-recorder glass-card not-supported">
        <div className="not-supported-icon">Mic</div>
        <p>このブラウザまたは端末では音声認識が使えません。</p>
        <p className="muted">Chrome または Edge を試してください。</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder glass-card">
      <div className="recorder-header">
        <div className="input-mode-tabs">
          <button
            className={`mode-tab ${inputMode === 'voice' ? 'active' : ''}`}
            onClick={() => setInputMode('voice')}
          >
            音声入力
          </button>
          <button
            className={`mode-tab ${inputMode === 'text' ? 'active' : ''}`}
            onClick={() => setInputMode('text')}
          >
            テキスト入力
          </button>
        </div>

        {inputMode === 'voice' && (
          <div className="recorder-options">
            <label className="option-toggle" title="小さな音を無視します">
              <input
                type="checkbox"
                checked={noiseGateOn}
                onChange={(event) => setNoiseGateOn(event.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-label">ノイズ除去</span>
            </label>

            <label className="option-toggle" title="認識した文章を自動で整えます">
              <input
                type="checkbox"
                checked={autoFormat}
                onChange={(event) => setAutoFormat(event.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-label">自動整形</span>
            </label>
          </div>
        )}

        {isListening && (
          <span className="recording-badge">
            <span className="rec-dot" />
            録音中
          </span>
        )}
      </div>

      {inputMode === 'voice' && noiseGateOn && (
        <div className="noise-slider-row">
          <span className="noise-label">感度</span>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.005"
            value={noiseThreshold}
            onChange={(event) => setNoiseThreshold(Number(event.target.value))}
            className="noise-slider"
          />
          <span className="noise-label">{Math.round(noiseThreshold * 1000)}%</span>
        </div>
      )}

      {inputMode === 'voice' && (
        <div className={`waveform-container ${isListening ? 'active' : ''}`}>
          {Array.from({ length: barCount }).map((_, index) => (
            <div
              key={index}
              className="waveform-bar"
              style={{ height: `${getBarHeight(index)}px` }}
            />
          ))}
        </div>
      )}

      {inputMode === 'voice' && (
        <div className="recorder-controls">
          {!isListening ? (
            <button
              id="btn-start-recording"
              className="record-btn start"
              onClick={handleStartRecording}
            >
              録音開始
            </button>
          ) : (
            <button
              id="btn-stop-recording"
              className="record-btn stop"
              onClick={handleStopRecording}
            >
              {stopRequested ? '停止中...' : '録音停止'}
            </button>
          )}
        </div>
      )}

      {inputMode === 'voice' && isListening && (
        <div className="sticky-stop-wrap">
          <button
            className="sticky-stop-btn"
            onClick={handleStopRecording}
            disabled={stopRequested}
          >
            {stopRequested ? '停止中...' : '停止'}
          </button>
        </div>
      )}

      {(editedText || interimTranscript) && (
        <div className="transcript-area">
          <div className="transcript-label-row">
            <span className="transcript-label">認識テキスト</span>
            {transcript && autoFormat && (
              <button
                className="toggle-raw-btn"
                onClick={() => setShowRaw((value) => !value)}
              >
                {showRaw ? '整形版を表示' : '生テキストを表示'}
              </button>
            )}
          </div>

          <textarea
            className="transcript-textarea"
            value={displayText + (interimTranscript && !showRaw ? ` ${interimTranscript}` : '')}
            onChange={(event) => setEditedText(event.target.value)}
            placeholder="ここに認識したテキストが表示されます"
            rows={4}
          />

          {audioUrl && (
            <div className="audio-preview" style={{ marginTop: '12px' }}>
              <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
            </div>
          )}

          <div className="analysis-row">
            <span className={`emotion-badge emotion-${emotion}`}>
              {EMOTION_LABELS[emotion]}
            </span>
            <div className="keywords">
              {keywords.map((keyword, index) => (
                <span key={index} className="tag">#{keyword}</span>
              ))}
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="inline-tasks">
              <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
            </div>
          )}

          <div className="recorder-actions">
            <button
              id="btn-save-note"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !editedText.trim()}
            >
              {saving ? '保存中...' : 'ノートを保存'}
            </button>
            <button id="btn-clear-note" className="btn btn-danger" onClick={handleClear}>
              クリア
            </button>
          </div>
        </div>
      )}

      {inputMode === 'text' && (
        <div className="text-input-mode">
          <textarea
            className="transcript-textarea text-mode-textarea"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            placeholder="ここにノートを入力してください"
            rows={5}
          />

          {textDraft.trim() && (
            <>
              <div className="analysis-row">
                <span className={`emotion-badge emotion-${textEmotion}`}>
                  {EMOTION_LABELS[textEmotion]}
                </span>
                <div className="keywords">
                  {textKeywords.map((keyword, index) => (
                    <span key={index} className="tag">#{keyword}</span>
                  ))}
                </div>
              </div>

              {textTasks.length > 0 && (
                <div className="inline-tasks">
                  <TaskList tasks={textTasks} onToggle={toggleTextTask} onDelete={deleteTextTask} />
                </div>
              )}

              <div className="recorder-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleTextSave}
                  disabled={saving || !textDraft.trim()}
                >
                  {saving ? '保存中...' : 'ノートを保存'}
                </button>
                <button className="btn btn-danger" onClick={handleClear}>
                  クリア
                </button>
              </div>
            </>
          )}

          {!textDraft.trim() && (
            <p className="hint-text">キーボードでノートを入力できます。</p>
          )}
        </div>
      )}

      {inputMode === 'voice' && !editedText && !interimTranscript && !isListening && (
        <p className="hint-text">録音開始を押して話しかけてください</p>
      )}
    </div>
  );
}
