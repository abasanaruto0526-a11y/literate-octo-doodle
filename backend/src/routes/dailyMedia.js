import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 全メディア取得 (あるいは日付でフィルタ)
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json(db.data.dailyMedia || []);
});

// メディア追加
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  if (!db.data.dailyMedia) db.data.dailyMedia = [];
  
  const { date, mediaBase64 } = req.body;
  
  if (!mediaBase64) {
    return res.status(400).json({ error: 'No media provided' });
  }

  const mediaId = uuidv4();
  const isVideo = mediaBase64.startsWith('data:video');
  const ext = isVideo ? 'mp4' : 'jpg';
  
  const regex = /^data:(.+);base64,(.*)$/;
  const matches = mediaBase64.match(regex);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Invalid media format' });
  }

  const data = matches[2];
  const fileName = `daily_${mediaId}.${ext}`;
  const mediaDir = path.join(process.cwd(), 'data', 'media');
  
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(mediaDir, fileName), data, { encoding: 'base64' });

  const mediaItem = {
    id: mediaId,
    date, // YYYY-MM-DD
    type: isVideo ? 'video' : 'image',
    mediaUrl: `/api/media/${fileName}`,
    createdAt: new Date().toISOString()
  };
  
  db.data.dailyMedia.push(mediaItem);
  await db.write();
  
  res.json(mediaItem);
});

// メディア削除
router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  if (db.data.dailyMedia) {
    db.data.dailyMedia = db.data.dailyMedia.filter(m => m.id !== req.params.id);
    await db.write();
  }
  res.json({ message: '削除しました' });
});

export default router;
