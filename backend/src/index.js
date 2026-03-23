import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDatabase } from './database.js';
import notesRouter from './routes/notes.js';
import tagsRouter from './routes/tags.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DB初期化後にサーバー起動
createDatabase().then((db) => {
  app.locals.db = db;

  app.use('/api/notes', notesRouter);
  app.use('/api/tags', tagsRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '音でつながるライフノート API 稼働中' });
  });

  app.listen(PORT, () => {
    console.log(`🎙️ LifeNote API サーバー起動: http://localhost:${PORT}`);
  });
});
