import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// dataフォルダ作成
mkdirSync(dataDir, { recursive: true });

const defaultData = { notes: [], tags: [], events: [], dailyMedia: [] };

let db;

export async function createDatabase() {
  const dbPath = path.join(dataDir, 'lifenote.json');
  const adapter = new JSONFile(dbPath);
  db = new Low(adapter, defaultData);
  await db.read();
  console.log('✅ データベース初期化完了');
  return db;
}

export function getDb() {
  return db;
}
