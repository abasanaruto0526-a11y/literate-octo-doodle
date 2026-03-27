import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json(db.data.events || []);
});

router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  if (!db.data.events) db.data.events = [];
  
  const { title, date, color, isAnnual, mediaBase64 } = req.body;
  const eventId = uuidv4();

  let mediaUrl = null;
  if (mediaBase64) {
    const isVideo = mediaBase64.startsWith('data:video');
    const ext = isVideo ? 'mp4' : 'jpg';
    const regex = /^data:(.+);base64,(.*)$/;
    const matches = mediaBase64.match(regex);
    if (matches && matches.length === 3) {
      const data = matches[2];
      const fileName = `${eventId}.${ext}`;
      const mediaDir = path.join(process.cwd(), 'data', 'media');
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      fs.writeFileSync(path.join(mediaDir, fileName), data, { encoding: 'base64' });
      mediaUrl = `/api/media/${fileName}`;
    }
  }

  const event = {
    id: eventId,
    title: title || '無題の予定',
    date, // YYYY-MM-DD
    color: color || '#f0a060',
    isAnnual: !!isAnnual,
    mediaUrl,
    createdAt: new Date().toISOString()
  };
  
  db.data.events.push(event);
  await db.write();
  res.json(event);
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  if (db.data.events) {
    db.data.events = db.data.events.filter(e => e.id !== req.params.id);
    await db.write();
  }
  res.json({ message: '削除しました' });
});

export default router;
