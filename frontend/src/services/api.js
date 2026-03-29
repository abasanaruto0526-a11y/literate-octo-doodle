import { Capacitor } from '@capacitor/core';

const DEFAULT_WEB_API_URL = 'http://localhost:3001';
const DEFAULT_ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:3001';
const DEFAULT_NATIVE_PRODUCTION_API_URL = 'https://lifenote-app.onrender.com';
const SAME_ORIGIN_API_URL = '';

function readEnv(name) {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : '';
}

function resolveApiUrl() {
  const explicitUrl = readEnv('VITE_API_URL');
  if (explicitUrl) return explicitUrl;

  const deviceUrl = readEnv('VITE_DEVICE_API_URL');
  const androidEmulatorUrl = readEnv('VITE_ANDROID_EMULATOR_API_URL');

  if (Capacitor.isNativePlatform()) {
    if (!import.meta.env.DEV) {
      return DEFAULT_NATIVE_PRODUCTION_API_URL;
    }

    if (Capacitor.getPlatform() === 'android') {
      return deviceUrl || androidEmulatorUrl || DEFAULT_ANDROID_EMULATOR_API_URL;
    }

    return deviceUrl || DEFAULT_WEB_API_URL;
  }

  if (!import.meta.env.DEV) {
    return SAME_ORIGIN_API_URL;
  }

  return DEFAULT_WEB_API_URL;
}

export const API_URL = resolveApiUrl();

export function getApiAssetUrl(path = '') {
  if (!path) return API_URL;
  return `${API_URL}${path}`;
}

export const api = {
  // ノート一覧取得
  async getNotes() {
    const res = await fetch(`${API_URL}/api/notes`);
    if (!res.ok) throw new Error('ノートの取得に失敗しました');
    return res.json();
  },

  // ノート作成
  async createNote(note) {
    const res = await fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('ノートの保存に失敗しました');
    return res.json();
  },

  // ノート更新
  async updateNote(id, note) {
    const res = await fetch(`${API_URL}/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('ノートの更新に失敗しました');
    return res.json();
  },

  // ノート削除
  async deleteNote(id) {
    const res = await fetch(`${API_URL}/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  // --- Events API ---
  async getEvents() {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  async createEvent(data) {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  async deleteEvent(id) {
    const res = await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  // --- Daily Media API ---
  async getDailyMedia() {
    const res = await fetch(`${API_URL}/api/daily-media`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  async uploadDailyMedia(data) {
    const res = await fetch(`${API_URL}/api/daily-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  async deleteDailyMedia(id) {
    const res = await fetch(`${API_URL}/api/daily-media/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  // --- AI Analysis API ---
  async analyzeText(text) {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  // ヘルスチェック
  async checkHealth() {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
};

// 感情分析とキーワード抽出はバックエンドの /api/analyze に統合されました。
