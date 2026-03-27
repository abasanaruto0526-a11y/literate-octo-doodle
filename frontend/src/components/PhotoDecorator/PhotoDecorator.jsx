import { useState, useRef, useEffect, useCallback } from 'react';
import './PhotoDecorator.css';

const STICKER_CATEGORIES = [
  {
    label: '表情',
    items: ['😊', '😍', '🥰', '😂', '🤣', '😘', '🥺', '😎', '🤩', '😭']
  },
  {
    label: '動物',
    items: ['🐻', '🐱', '🐶', '🐰', '🦊', '🐼', '🐨', '🦄', '🐸', '🐥']
  },
  {
    label: 'ハート',
    items: ['❤️', '💖', '💕', '💗', '💝', '💘', '✨', '🌟', '⭐', '🔥']
  },
  {
    label: '自然',
    items: ['🌸', '🌺', '🌻', '🌷', '🍀', '🌈', '☀️', '🌙', '⛅', '🌊']
  },
  {
    label: 'デコ',
    items: ['🎀', '🎉', '🎊', '🎈', '🎁', '👑', '💎', '🦋', '🍰', '🧸']
  }
];

const FRAMES = [
  { id: 'none', label: 'なし', style: {} },
  { id: 'rounded', label: '角丸', style: { borderRadius: '20px' } },
  { id: 'polaroid', label: 'ポラロイド', style: { padding: '12px 12px 40px 12px', background: 'white', borderRadius: '4px' } },
  { id: 'circle', label: '円形', style: { borderRadius: '50%' } },
  { id: 'stamp', label: 'スタンプ', style: { border: '6px dashed rgba(255,255,255,0.4)', borderRadius: '8px', padding: '8px' } },
];

const FILTERS = [
  { id: 'none', label: 'なし', css: 'none' },
  { id: 'warm', label: '暖かい', css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { id: 'cool', label: '涼しい', css: 'saturate(0.8) hue-rotate(20deg) brightness(1.05)' },
  { id: 'vintage', label: 'ビンテージ', css: 'sepia(0.5) contrast(0.9) brightness(0.95)' },
  { id: 'bright', label: '明るい', css: 'brightness(1.2) contrast(1.05)' },
  { id: 'mono', label: 'モノクロ', css: 'grayscale(1)' },
];

export function PhotoDecorator({ imageSrc, onSave, onClose }) {
  const containerRef = useRef(null);
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeFrame, setActiveFrame] = useState('none');
  const [activeFilter, setActiveFilter] = useState('none');
  const [stickerSize, setStickerSize] = useState(48);
  const [activeTab, setActiveTab] = useState('stickers');
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const imgRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [selectedPlacedIdx, setSelectedPlacedIdx] = useState(null);

  const TEXT_COLORS = [
    { id: 'white', color: '#ffffff', label: '白' },
    { id: 'black', color: '#000000', label: '黒' },
    { id: 'pink', color: '#ff6b9d', label: 'ピンク' },
    { id: 'red', color: '#ff4444', label: '赤' },
    { id: 'orange', color: '#ff9f43', label: 'オレンジ' },
    { id: 'yellow', color: '#feca57', label: '黄色' },
    { id: 'green', color: '#2ed573', label: '緑' },
    { id: 'cyan', color: '#4ecdc4', label: '水色' },
    { id: 'blue', color: '#6c8fff', label: '青' },
    { id: 'purple', color: '#a55eea', label: '紫' },
  ];

  // 画像の読み込み
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; };
    img.src = imageSrc;
  }, [imageSrc]);

  // キャンバスクリックでスタンプ配置
  const handleCanvasClick = (e) => {
    // ドラッグ直後のクリックは無視する
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (draggingIdx !== null) return;
    if (!selectedSticker) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStickers(prev => [...prev, {
      emoji: selectedSticker,
      x, y,
      size: stickerSize,
      rotation: Math.random() * 30 - 15
    }]);
    // 配置したら選択状態を解除
    setSelectedPlacedIdx(null);
  };

  // ドラッグ開始
  const handleStickerMouseDown = (e, idx) => {
    e.stopPropagation();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setDraggingIdx(idx);
    setDragOffset({
      x: e.clientX - rect.left - stickers[idx].x,
      y: e.clientY - rect.top - stickers[idx].y
    });
  };

  // ドラッグ中
  const handleMouseMove = useCallback((e) => {
    if (draggingIdx === null) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStickers(prev => prev.map((s, i) =>
      i === draggingIdx ? { ...s, x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y } : s
    ));
  }, [draggingIdx, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (draggingIdx !== null) {
      justDraggedRef.current = true;
    }
    setDraggingIdx(null);
  }, [draggingIdx]);

  useEffect(() => {
    if (draggingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIdx, handleMouseMove, handleMouseUp]);

  // スタンプ削除
  const handleDeleteSticker = (idx) => {
    setStickers(prev => prev.filter((_, i) => i !== idx));
    if (selectedPlacedIdx === idx) setSelectedPlacedIdx(null);
  };

  // 配置済みスタンプのサイズ変更
  const handleResizeSticker = (idx, delta) => {
    setStickers(prev => prev.map((s, i) =>
      i === idx ? { ...s, size: Math.max(12, Math.min(120, s.size + delta)) } : s
    ));
  };

  // 配置済みスタンプの角度変更
  const handleRotateSticker = (idx, delta) => {
    setStickers(prev => prev.map((s, i) =>
      i === idx ? { ...s, rotation: s.rotation + delta } : s
    ));
  };

  // テキストをスタンプとして追加
  const handleAddText = () => {
    if (!textInput.trim()) return;
    setStickers(prev => [...prev, {
      emoji: textInput.trim(),
      x: 150,
      y: 150,
      size: 24,
      rotation: 0,
      isText: true,
      color: textColor
    }]);
    setTextInput('');
  };

  // 配置済みテキストの色変更
  const handleChangeColor = (idx, color) => {
    setStickers(prev => prev.map((s, i) =>
      i === idx ? { ...s, color } : s
    ));
  };

  // 保存処理：Canvas上に画像+スタンプを描画してBase64変換
  const handleSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');

    // フィルター適用
    const filterObj = FILTERS.find(f => f.id === activeFilter);
    if (filterObj && filterObj.css !== 'none') {
      ctx.filter = filterObj.css;
    }
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    // スタンプ描画
    const containerEl = containerRef.current;
    if (containerEl) {
      const scaleX = img.naturalWidth / containerEl.offsetWidth;
      const scaleY = img.naturalHeight / containerEl.offsetHeight;

      stickers.forEach(s => {
        const realX = s.x * scaleX;
        const realY = s.y * scaleY;
        const realSize = s.size * scaleX;

        ctx.save();
        ctx.translate(realX, realY);
        ctx.rotate((s.rotation * Math.PI) / 180);

        if (s.isText) {
          ctx.font = `bold ${realSize}px 'Noto Sans JP', sans-serif`;
          ctx.fillStyle = s.color || '#ffffff';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = realSize * 0.08;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeText(s.emoji, 0, 0);
          ctx.fillText(s.emoji, 0, 0);
        } else {
          ctx.font = `${realSize}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(s.emoji, 0, 0);
        }
        ctx.restore();
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave(dataUrl);
  };

  const currentFilter = FILTERS.find(f => f.id === activeFilter);
  const currentFrame = FRAMES.find(f => f.id === activeFrame);

  return (
    <div className="photo-deco-overlay" onClick={onClose}>
      <div className="photo-deco-container glass-card" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <header className="deco-header">
          <h3>🎨 写真デコレーション</h3>
          <div className="deco-header-actions">
            <button className="deco-save-btn" onClick={handleSave}>💾 保存する</button>
            <button className="deco-close-btn" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="deco-body">
          {/* キャンバスエリア */}
          <div className="deco-canvas-area">
            <div
              ref={containerRef}
              className="deco-image-wrapper"
              style={currentFrame?.style || {}}
              onClick={handleCanvasClick}
            >
              <img
                src={imageSrc}
                alt="decorating"
                className="deco-image"
                style={{ filter: currentFilter?.css === 'none' ? undefined : currentFilter?.css }}
                draggable={false}
              />
              {/* スタンプレイヤー */}
              {stickers.map((s, idx) => (
                <div
                  key={idx}
                  className={`placed-sticker ${draggingIdx === idx ? 'dragging' : ''} ${selectedPlacedIdx === idx ? 'selected' : ''}`}
                  style={{
                    left: s.x,
                    top: s.y,
                    fontSize: `${s.size}px`,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                    fontFamily: s.isText ? "'Noto Sans JP', sans-serif" : undefined,
                    fontWeight: s.isText ? 'bold' : undefined,
                    color: s.isText ? (s.color || '#ffffff') : undefined,
                    textShadow: s.isText ? '2px 2px 4px rgba(0,0,0,0.7)' : undefined,
                  }}
                  onMouseDown={e => handleStickerMouseDown(e, idx)}
                  onClick={e => { e.stopPropagation(); setSelectedPlacedIdx(selectedPlacedIdx === idx ? null : idx); }}
                  onDoubleClick={(e) => { e.stopPropagation(); handleDeleteSticker(idx); }}
                  title="クリックで選択 / ダブルクリックで削除"
                >
                  {s.emoji}
                  {/* サイズ調整ボタン */}
                  {selectedPlacedIdx === idx && (
                    <div className="sticker-resize-controls" onClick={e => e.stopPropagation()}>
                      <div className="resize-row">
                        <button
                          className="resize-btn"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleResizeSticker(idx, -6); }}
                        >−</button>
                        <span className="resize-size">{s.size}</span>
                        <button
                          className="resize-btn"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleResizeSticker(idx, 6); }}
                        >+</button>
                        <span className="resize-divider">|</span>
                        <button
                          className="resize-btn rotate"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleRotateSticker(idx, -15); }}
                          title="左に15°回転"
                        >↺</button>
                        <span className="resize-size">{Math.round(s.rotation)}°</span>
                        <button
                          className="resize-btn rotate"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleRotateSticker(idx, 15); }}
                          title="右に15°回転"
                        >↻</button>
                        <span className="resize-divider">|</span>
                        <button
                          className="resize-btn delete"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleDeleteSticker(idx); }}
                        >🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedSticker && (
              <p className="deco-hint">画像をクリックしてスタンプを配置 ✨</p>
            )}
            {!selectedSticker && stickers.length === 0 && (
              <p className="deco-hint">右からスタンプを選んでね 👉</p>
            )}
          </div>

          {/* ツールパネル */}
          <div className="deco-tools">
            <div className="deco-tabs">
              <button className={`deco-tab ${activeTab === 'stickers' ? 'active' : ''}`} onClick={() => setActiveTab('stickers')}>🎃 スタンプ</button>
              <button className={`deco-tab ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveTab('frames')}>🖼️ フレーム</button>
              <button className={`deco-tab ${activeTab === 'filters' ? 'active' : ''}`} onClick={() => setActiveTab('filters')}>✨ フィルター</button>
              <button className={`deco-tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>✏️ 文字</button>
            </div>

            {activeTab === 'stickers' && (
              <div className="deco-stickers-panel">
                <div className="sticker-size-control">
                  <span>サイズ</span>
                  <input type="range" min="24" max="96" value={stickerSize} onChange={e => setStickerSize(Number(e.target.value))} />
                  <span style={{ fontSize: `${stickerSize * 0.5}px` }}>{selectedSticker || '🐻'}</span>
                </div>
                {STICKER_CATEGORIES.map(cat => (
                  <div key={cat.label} className="sticker-category">
                    <div className="sticker-cat-label">{cat.label}</div>
                    <div className="sticker-grid">
                      {cat.items.map(emoji => (
                        <button
                          key={emoji}
                          className={`sticker-btn ${selectedSticker === emoji ? 'selected' : ''}`}
                          onClick={() => setSelectedSticker(selectedSticker === emoji ? null : emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'frames' && (
              <div className="deco-frames-panel">
                {FRAMES.map(frame => (
                  <button
                    key={frame.id}
                    className={`frame-btn ${activeFrame === frame.id ? 'active' : ''}`}
                    onClick={() => setActiveFrame(frame.id)}
                  >
                    {frame.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="deco-filters-panel">
                {FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    <div className="filter-preview"
                      style={{
                        backgroundImage: `url(${imageSrc})`,
                        filter: filter.css === 'none' ? undefined : filter.css
                      }}
                    />
                    <span>{filter.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="deco-text-panel">
                <p className="text-panel-hint">写真に文字を追加できます</p>
                <div className="text-input-row">
                  <input
                    type="text"
                    placeholder="テキストを入力…"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddText()}
                    className="text-deco-input"
                    style={{ color: textColor }}
                  />
                  <button className="text-add-btn" onClick={handleAddText}>追加</button>
                </div>
                <div className="color-palette">
                  <span className="color-label">文字色</span>
                  <div className="color-swatches">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c.id}
                        className={`color-swatch ${textColor === c.color ? 'active' : ''}`}
                        style={{ background: c.color }}
                        onClick={() => setTextColor(c.color)}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                {selectedPlacedIdx !== null && stickers[selectedPlacedIdx]?.isText && (
                  <div className="color-palette selected-color">
                    <span className="color-label">選択中の文字色を変更</span>
                    <div className="color-swatches">
                      {TEXT_COLORS.map(c => (
                        <button
                          key={c.id}
                          className={`color-swatch ${stickers[selectedPlacedIdx]?.color === c.color ? 'active' : ''}`}
                          style={{ background: c.color }}
                          onClick={() => handleChangeColor(selectedPlacedIdx, c.color)}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {stickers.length > 0 && (
              <button className="clear-stickers-btn" onClick={() => setStickers([])}>
                🗑️ スタンプを全削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
