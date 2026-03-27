import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { deepAnalyzeText } from '../services/ai.js';

const router = express.Router();

// 全ノート取得
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const notes = [...db.data.notes].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(notes);
});

// ノート作成
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const { title, content, audioText, emotion, tags, audioBase64 } = req.body;
  
  let finalEmotion = emotion || 'neutral';
  let finalTags = tags || [];

  // フェーズ3: OpenAIによる深層分析の実行（※APIキーが存在する場合のみ発動）
  // ユーザーの音声入力または手書きのテキスト全体をAIに渡す
  const analyzeTarget = content || audioText || title || '';
  if (analyzeTarget.trim() !== '') {
    const aiResult = await deepAnalyzeText(analyzeTarget);
    if (aiResult) {
      // AIが判定した真の感情と核心を突くタグで上書きする！
      finalEmotion = aiResult.emotion;
      finalTags = aiResult.tags;
      console.log(`✅ [AI分析結果適用] 感情: ${finalEmotion}, タグ: ${finalTags.join(', ')}`);
    }
  }

  let finalAudioUrl = '';
  const noteId = uuidv4();

  if (audioBase64) {
    const base64Data = audioBase64.split(';base64,').pop();
    const fileName = `${noteId}.webm`;
    const audioDir = path.join(process.cwd(), 'data', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    fs.writeFileSync(path.join(audioDir, fileName), base64Data, { encoding: 'base64' });
    finalAudioUrl = `/api/audio/${fileName}`;
  }

  const note = {
    id: noteId,
    title: title || (content && content.substring(0, 30) + '…') || '無題',
    content: content || '',
    audioText: audioText || '',
    audioUrl: finalAudioUrl,
    emotion: finalEmotion,
    tags: finalTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.notes.push(note);
  await db.write();
  res.json(note);
});

// ノート更新
router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const idx = db.data.notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.data.notes[idx] = {
    ...db.data.notes[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  await db.write();
  res.json(db.data.notes[idx]);
});

// ノート削除
router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  db.data.notes = db.data.notes.filter(n => n.id !== req.params.id);
  await db.write();
  res.json({ message: '削除しました' });
});

export default router;
