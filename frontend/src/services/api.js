import { Capacitor } from '@capacitor/core';

const DEFAULT_WEB_API_URL = 'http://localhost:3001';
const DEFAULT_ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:3001';
const DEFAULT_NATIVE_PRODUCTION_API_URL = 'https://lifenote-app.onrender.com';
const SAME_ORIGIN_API_URL = '';
const LOCAL_DB_KEY = 'lifenote-local-db-v1';

const USE_LOCAL_DATA = Capacitor.isNativePlatform() && !import.meta.env.DEV;

export const STORAGE_MODE = USE_LOCAL_DATA ? 'device' : 'cloud';

function readEnv(name) {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : '';
}

function resolveApiUrl() {
  if (Capacitor.isNativePlatform()) {
    if (!import.meta.env.DEV) {
      return DEFAULT_NATIVE_PRODUCTION_API_URL;
    }

    const deviceUrl = readEnv('VITE_DEVICE_API_URL');
    const androidEmulatorUrl = readEnv('VITE_ANDROID_EMULATOR_API_URL');

    if (Capacitor.getPlatform() === 'android') {
      return deviceUrl || androidEmulatorUrl || DEFAULT_ANDROID_EMULATOR_API_URL;
    }

    return deviceUrl || DEFAULT_WEB_API_URL;
  }

  const explicitUrl = readEnv('VITE_API_URL');
  if (explicitUrl) return explicitUrl;

  if (!import.meta.env.DEV) {
    return SAME_ORIGIN_API_URL;
  }

  return DEFAULT_WEB_API_URL;
}

function createEmptyDb() {
  return {
    notes: [],
    events: [],
    dailyMedia: [],
  };
}

function readLocalDb() {
  try {
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return createEmptyDb();

    const parsed = JSON.parse(raw);
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      dailyMedia: Array.isArray(parsed.dailyMedia) ? parsed.dailyMedia : [],
    };
  } catch {
    return createEmptyDb();
  }
}

function writeLocalDb(db) {
  window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inferTitle(content = '') {
  const normalized = String(content).trim();
  if (!normalized) return '新しいノート';
  return normalized.length > 30 ? `${normalized.slice(0, 30)}...` : normalized;
}

function extractKeywords(text) {
  const tokens = String(text)
    .toLowerCase()
    .replace(/[0-9０-９]/g, ' ')
    .match(/[ぁ-んァ-ヶ一-龠a-zA-Z]{2,}/g) || [];

  const stopWords = new Set([
    'こと', 'これ', 'それ', 'ため', 'よう', 'さん', 'する', 'した', 'して',
    'いる', 'ある', 'です', 'ます', 'and', 'the', 'for', 'with', 'this',
  ]);

  const unique = [];
  for (const token of tokens) {
    if (stopWords.has(token)) continue;
    if (!unique.includes(token)) unique.push(token);
    if (unique.length >= 5) break;
  }

  return unique;
}

function inferEmotion(text) {
  const normalized = String(text).toLowerCase();

  const excitedWords = ['最高', 'やった', 'うれしい', '嬉しい', '楽しい', 'わくわく', '最高だ', 'happy'];
  const negativeWords = ['つらい', '疲れた', 'しんどい', '悲しい', '最悪', 'むり', '無理', 'sad'];
  const positiveWords = ['よかった', '落ち着く', '安心', '感謝', '好き', '助かった', 'ありがとう'];

  if (excitedWords.some((word) => normalized.includes(word.toLowerCase()))) return 'excited';
  if (negativeWords.some((word) => normalized.includes(word.toLowerCase()))) return 'negative';
  if (positiveWords.some((word) => normalized.includes(word.toLowerCase()))) return 'positive';
  return 'neutral';
}

async function analyzeTextLocally(text) {
  const keywords = extractKeywords(text);
  return {
    emotion: inferEmotion(text),
    keywords,
    tags: keywords,
  };
}

async function getNotesLocally() {
  const db = readLocalDb();
  return [...db.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createNoteLocally(note) {
  const db = readLocalDb();
  const analysis = await analyzeTextLocally(note.content || note.audioText || note.title || '');
  const now = new Date().toISOString();

  const saved = {
    id: generateId(),
    title: note.title || inferTitle(note.content || note.audioText),
    content: note.content || '',
    audioText: note.audioText || '',
    audioUrl: note.audioBase64 || '',
    emotion: note.emotion || analysis.emotion || 'neutral',
    tags: Array.isArray(note.tags) && note.tags.length > 0 ? note.tags : analysis.tags,
    createdAt: now,
    updatedAt: now,
  };

  db.notes.push(saved);
  writeLocalDb(db);
  return saved;
}

async function updateNoteLocally(id, note) {
  const db = readLocalDb();
  const index = db.notes.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('Not found');

  db.notes[index] = {
    ...db.notes[index],
    ...note,
    updatedAt: new Date().toISOString(),
  };

  writeLocalDb(db);
  return db.notes[index];
}

async function deleteNoteLocally(id) {
  const db = readLocalDb();
  db.notes = db.notes.filter((item) => item.id !== id);
  writeLocalDb(db);
  return { message: '削除しました' };
}

async function getEventsLocally() {
  const db = readLocalDb();
  return [...db.events].sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function createEventLocally(data) {
  const db = readLocalDb();
  const isVideo = typeof data.mediaBase64 === 'string' && data.mediaBase64.startsWith('data:video');

  const saved = {
    id: generateId(),
    title: data.title || '新しい予定',
    date: data.date,
    color: data.color || '#f0a060',
    isAnnual: Boolean(data.isAnnual),
    mediaUrl: data.mediaBase64 || null,
    type: data.mediaBase64 ? (isVideo ? 'video' : 'image') : null,
    createdAt: new Date().toISOString(),
  };

  db.events.push(saved);
  writeLocalDb(db);
  return saved;
}

async function deleteEventLocally(id) {
  const db = readLocalDb();
  db.events = db.events.filter((item) => item.id !== id);
  writeLocalDb(db);
  return { message: '削除しました' };
}

async function getDailyMediaLocally() {
  const db = readLocalDb();
  return [...db.dailyMedia].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function uploadDailyMediaLocally(data) {
  const db = readLocalDb();
  const isVideo = typeof data.mediaBase64 === 'string' && data.mediaBase64.startsWith('data:video');

  const saved = {
    id: generateId(),
    date: data.date,
    type: isVideo ? 'video' : 'image',
    mediaUrl: data.mediaBase64,
    createdAt: new Date().toISOString(),
  };

  db.dailyMedia.push(saved);
  writeLocalDb(db);
  return saved;
}

async function deleteDailyMediaLocally(id) {
  const db = readLocalDb();
  db.dailyMedia = db.dailyMedia.filter((item) => item.id !== id);
  writeLocalDb(db);
  return { message: '削除しました' };
}

export const API_URL = resolveApiUrl();

export function getApiAssetUrl(path = '') {
  if (!path) return API_URL;
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  return `${API_URL}${path}`;
}

export const api = {
  async getNotes() {
    if (USE_LOCAL_DATA) return getNotesLocally();

    const res = await fetch(`${API_URL}/api/notes`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async createNote(note) {
    if (USE_LOCAL_DATA) return createNoteLocally(note);

    const res = await fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async updateNote(id, note) {
    if (USE_LOCAL_DATA) return updateNoteLocally(id, note);

    const res = await fetch(`${API_URL}/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async deleteNote(id) {
    if (USE_LOCAL_DATA) return deleteNoteLocally(id);

    const res = await fetch(`${API_URL}/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async getEvents() {
    if (USE_LOCAL_DATA) return getEventsLocally();

    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async createEvent(data) {
    if (USE_LOCAL_DATA) return createEventLocally(data);

    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async deleteEvent(id) {
    if (USE_LOCAL_DATA) return deleteEventLocally(id);

    const res = await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async getDailyMedia() {
    if (USE_LOCAL_DATA) return getDailyMediaLocally();

    const res = await fetch(`${API_URL}/api/daily-media`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async uploadDailyMedia(data) {
    if (USE_LOCAL_DATA) return uploadDailyMediaLocally(data);

    const res = await fetch(`${API_URL}/api/daily-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async deleteDailyMedia(id) {
    if (USE_LOCAL_DATA) return deleteDailyMediaLocally(id);

    const res = await fetch(`${API_URL}/api/daily-media/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async analyzeText(text) {
    if (USE_LOCAL_DATA) return analyzeTextLocally(text);

    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async checkHealth() {
    if (USE_LOCAL_DATA) return true;

    try {
      const res = await fetch(`${API_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
