import React, { useState } from 'react';
import { PhotoDecorator } from '../PhotoDecorator/PhotoDecorator';
import { getApiAssetUrl } from '../../services/api';
import './DailyDetailModal.css';

export function DailyDetailModal({ date, notes, events, mediaList, onUpload, onDelete, onClose }) {
  const [isUploading, setIsUploading] = useState(false);
  const [decoratingImage, setDecoratingImage] = useState(null);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = r => {
              onUpload(r.target.result); // Base64を渡す
              resolve();
          };
          reader.readAsDataURL(file);
        });
    }
    // 少し待ってUIを更新
    setTimeout(() => setIsUploading(false), 500);
  };

  const handleDecoSave = (decoratedBase64) => {
    // デコレーションした画像を新しいメディアとしてアップロード
    onUpload(decoratedBase64);
    setDecoratingImage(null);
  };

  return (
    <>
      <div className="daily-modal-overlay" onClick={onClose}>
        <div className="daily-modal-box glass-card" onClick={e => e.stopPropagation()}>
          <header className="daily-header">
             <h2>{date.getFullYear()}年 {date.getMonth() + 1}月{date.getDate()}日の思い出</h2>
             <button className="close-btn" onClick={onClose}>×</button>
          </header>

          <div className="daily-content">
            <section className="album-section">
              <div className="album-header">
                <h3>📸 ギャラリー</h3>
                <label className="upload-btn">
                  {isUploading ? '保存中...' : '写真・動画を追加'}
                  <input type="file" multiple accept="image/*,video/*" hidden onChange={handleFileChange} disabled={isUploading} />
                </label>
              </div>
              
              {mediaList.length === 0 ? (
                <div className="empty-album">ここに写真や動画をたくさん詰め込んで思い出を残しましょう！</div>
              ) : (
                <div className="media-grid">
                  {mediaList.map(m => (
                    <div key={m.id} className="media-item">
                      {m.type === 'video' ? (
                        <video src={getApiAssetUrl(m.mediaUrl)} controls />
                      ) : (
                        <>
                          <img src={getApiAssetUrl(m.mediaUrl)} alt="gallery" />
                          <button
                            className="decorate-media-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDecoratingImage(getApiAssetUrl(m.mediaUrl));
                            }}
                            title="デコレーションする"
                          >
                            🎨
                          </button>
                        </>
                      )}
                      <button className="delete-media-btn" onClick={() => {
                        if (window.confirm('この写真を削除しますか？')) onDelete(m.id);
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="timeline-section">
              <h3>📝 この日の記録</h3>
              <div className="timeline-list">
                {events.map(e => (
                  <div key={e.id} className="timeline-event" style={{borderLeftColor: e.color}}>
                    <span className="event-icon">🎀</span> {e.title}
                  </div>
                ))}
                {notes.map(n => (
                  <div key={n.id} className={`timeline-note emotion-${n.emotion}`}>
                    <span className="note-time">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="note-title">{n.title || '音声メモ'}</span>
                  </div>
                ))}
                {events.length === 0 && notes.length === 0 && (
                  <div className="empty-album">記録がありません</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* 写真デコレーションモーダル */}
      {decoratingImage && (
        <PhotoDecorator
          imageSrc={decoratingImage}
          onSave={handleDecoSave}
          onClose={() => setDecoratingImage(null)}
        />
      )}
    </>
  );
}
