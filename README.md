# 🎙️ 音でつながるライフノート

> 音声入力に特化した次世代ノートアプリ。感情・季節・自然と共鳴しながら、日常の記録を知的に整理・進化させる。

[![Phase](https://img.shields.io/badge/Phase-1%20音声入力-blue)](https://github.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org)

---

## ✨ 機能

- 🎤 **リアルタイム音声入力** — Web Speech API（日本語対応）
- 📊 **音波ビジュアライザー** — マイク入力をビジュアル化
- 😊 **感情分析** — ポジティブ / ネガティブ / 興奮 / 中立
- 🏷️ **キーワード自動タグ付け**
- 💾 **ノート永続化** — Node.js + JSON DB
- 🎨 **ダークテーマUI** — グラスモーフィズム

---

## 🚀 セットアップ

### 必要環境
- Node.js 18+
- Chrome または Edge（音声認識）

### インストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd backend
npm install
```

### 起動

```bash
# バックエンド（ポート3001）
cd backend
node src/index.js

# フロントエンド（ポート5173）
cd frontend
npx vite --port 5173
```

ブラウザで http://localhost:5173 を開く

---

## 📁 プロジェクト構成

```
├── frontend/          # React + Vite
│   └── src/
│       ├── components/VoiceRecorder/   # 音声入力
│       ├── components/NoteCard/        # ノートカード
│       ├── hooks/useSpeechRecognition  # 音声認識フック
│       └── services/api.js             # API通信・感情分析
└── backend/           # Node.js + Express
    └── src/
        ├── routes/notes.js   # ノートCRUD
        ├── routes/tags.js    # タグAPI
        └── database.js       # lowdb設定
```

---

## 🗺️ ロードマップ

- [x] **フェーズ1**: 音声入力プロトタイプ
- [ ] **フェーズ2**: 雑音除去・テキスト整理
- [ ] **フェーズ3**: OpenAI API感情分析
- [ ] **フェーズ4**: タスク・マインドマップ自動生成
- [ ] **フェーズ5**: 旧暦カレンダー・潮汐情報連携
- [ ] **フェーズ6**: Google Cloud Runデプロイ
