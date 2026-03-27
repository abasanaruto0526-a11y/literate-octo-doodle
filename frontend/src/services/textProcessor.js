/**
 * テキスト自動整形サービス
 * 音声認識テキストを読みやすく整形する
 */

// 句読点を自動補完するルール
const PUNCTUATION_RULES = [
  // 文末に句点を追加（「です」「ます」「た」「だ」など）
  { pattern: /(です|ます|でした|ました|だった|である|でしょう|ましょう)(\s|$)/g, replacement: '$1。$2' },
  { pattern: /(した|した|だ|ない|ある|いる|する|できる|なる)(\s|$)/g, replacement: '$1。$2' },
  // 接続詞の前に読点
  { pattern: /([^\s。、])(そして|しかし|また|ところで|それに|ただし|つまり|なので|だから)/g, replacement: '$1、$2' },
  // 連続スペースを削除
  { pattern: /\s{2,}/g, replacement: ' ' },
  // 連続する句点を整理
  { pattern: /。{2,}/g, replacement: '。' },
];

// タスクを検出するパターン（「したい」「必要がある」など）
const TASK_PATTERNS = [
  /(.{3,20})(したい|しなければ|する必要がある|やりたい|やらなければ|要確認|忘れずに|検討する|調べる)/g,
  /(.{3,20})(を買う|を送る|に連絡|を確認|を作る|を修正|を追加|を削除)/g,
  /(todo|TODO|タスク|やること)[：:\s]*(.{3,30})/g,
];

/**
 * テキストを整形する
 * @param {string} text - 整形前のテキスト
 * @param {object} options - オプション
 * @returns {string} 整形後のテキスト
 */
export function formatText(text, options = {}) {
  if (!text || text.trim() === '') return text;

  let result = text.trim();

  const {
    addPunctuation = true,    // 句読点自動追加
    removeFiller = true,      // フィラー語除去
  } = options;

  // フィラー語（えー、あのー、うーん）除去
  if (removeFiller) {
    result = result.replace(/[えEE]+[ー〜っ]*(と|あの|その)?/g, '');
    result = result.replace(/あ[のNO]+[ー〜っ]*/g, '');
    result = result.replace(/[うU][ー〜んn]+/g, '');
    result = result.replace(/\s{2,}/g, ' ').trim();
  }

  // 句読点補完
  if (addPunctuation) {
    for (const rule of PUNCTUATION_RULES) {
      result = result.replace(rule.pattern, rule.replacement);
    }
  }

  // 文末に句点がなければ追加
  if (result.length > 0 && !/[。！？!?]$/.test(result)) {
    // 質問文の検出
    if (/か(\s*)$/.test(result)) {
      result = result.replace(/か(\s*)$/, 'か？');
    } else if (result.length > 5) {
      result += '。';
    }
  }

  return result.trim();
}

/**
 * テキストからタスクを自動抽出する
 * @param {string} text
 * @returns {Array<{text: string, priority: string}>}
 */
export function extractTasks(text) {
  if (!text) return [];

  const tasks = [];
  const seen = new Set();

  for (const pattern of TASK_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const taskText = (match[1] || match[2] || '').trim() + (match[2] || '').trim();
      const cleanTask = taskText.replace(/[。、！？]/g, '').trim();

      if (cleanTask.length > 2 && !seen.has(cleanTask)) {
        seen.add(cleanTask);
        // 優先度の推定
        const priority = /すぐ|急|至急|今日|明日|締め切り/.test(text) ? 'high'
          : /できれば|なるべく|いつか/.test(text) ? 'low' : 'medium';
        tasks.push({ text: cleanTask, priority, done: false, id: Date.now() + tasks.length });
      }
    }
  }

  return tasks.slice(0, 10); // 最大10タスク
}

/**
 * ノートを全文検索する
 * @param {Array} notes
 * @param {string} query
 * @returns {Array}
 */
export function searchNotes(notes, query) {
  if (!query || query.trim() === '') return notes;

  const q = query.trim().toLowerCase();
  return notes.filter(note => {
    const content = (note.content + ' ' + note.title + ' ' + (note.tags || []).join(' ')).toLowerCase();
    return content.includes(q);
  });
}
