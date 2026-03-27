import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabase } from './database.js';
import notesRouter from './routes/notes.js';
import tagsRouter from './routes/tags.js';
import eventsRouter from './routes/events.js';
import dailyMediaRouter from './routes/dailyMedia.js';
import analyzeRouter from './routes/analyze.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');
const frontendDistDir = path.join(projectRoot, 'frontend', 'dist');

if (process.env.GEMINI_API_KEY) {
  console.log('GEMINI_API_KEY detected');
} else {
  console.warn('GEMINI_API_KEY is not set');
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.use('/api/audio', express.static(path.join(process.cwd(), 'data', 'audio')));
app.use('/api/media', express.static(path.join(process.cwd(), 'data', 'media')));

createDatabase().then((db) => {
  app.locals.db = db;

  app.use('/api/notes', notesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/daily-media', dailyMediaRouter);
  app.use('/api/analyze', analyzeRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LifeNote API is running' });
  });

  if (fs.existsSync(frontendDistDir)) {
    app.use(express.static(frontendDistDir));

    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(frontendDistDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`LifeNote server running on http://${HOST}:${PORT}`);
  });
});
