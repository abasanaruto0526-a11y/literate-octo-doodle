const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const res = await fetch(`${API_URL}/api/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('ノートの削除に失敗しました');
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

// 感情分析（ローカル簡易版 - フェーズ3でOpenAI APIに置き換え）
export function analyzeEmotion(text) {
  const positiveWords = ['楽しい', '嬉しい', '最高', '素晴らしい', '好き', '良い', '幸', '感謝', 'ありがとう', '達成', '成功', '喜', '笑', '希望'];
  const negativeWords = ['辛い', '悲しい', '嫌', '最悪', '難しい', '困った', '疲れ', '失敗', '不安', '怖', '怒', '悔', '苦'];
  const excitedWords = ['やった', 'すごい', '驚', 'びっくり', '感動', 'ワクワク', '興奮', '信じられない'];

  let positiveScore = 0;
  let negativeScore = 0;
  let excitedScore = 0;

  positiveWords.forEach(w => { if (text.includes(w)) positiveScore++; });
  negativeWords.forEach(w => { if (text.includes(w)) negativeScore++; });
  excitedWords.forEach(w => { if (text.includes(w)) excitedScore++; });

  if (excitedScore > 0) return 'excited';
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

// キーワード抽出（ローカル簡易版）
export function extractKeywords(text) {
  // 一般的な助詞・助動詞を除外
  const stopWords = ['は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'から', 'まで', 'より', 'て', 'た', 'だ', 'です', 'ます', 'ない', 'ある', 'いる', 'する', 'した', 'して', 'ので', 'から', 'けど'];
  const words = text.split(/[、。\s！!？?]/g).filter(w => w.length > 1);
  const keywords = [...new Set(words)]
    .filter(w => !stopWords.includes(w))
    .slice(0, 5);
  return keywords;
}
