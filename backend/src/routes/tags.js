import express from 'express';
const router = express.Router();

// 全タグ取得
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(tags);
});

// タグ作成
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, color } = req.body;
  const result = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)').run(name, color || '#6366f1');
  res.json({ id: result.lastInsertRowid, message: 'タグを作成しました' });
});

export default router;
