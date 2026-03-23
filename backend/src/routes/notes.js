import express from 'express';
import { v4 as uuidv4 } from 'uuid';
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
  const { title, content, audioText, emotion, tags } = req.body;
  const note = {
    id: uuidv4(),
    title: title || (content && content.substring(0, 30) + '…') || '無題',
    content: content || '',
    audioText: audioText || '',
    emotion: emotion || 'neutral',
    tags: tags || [],
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
