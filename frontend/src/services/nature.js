/**
 * 自然環境（旧暦・潮汐・二十四節気）を計算するサービス
 * （簡易計算版）
 */

/**
 * 指定した日付の月齢、月相アイコン、潮汐などを返す
 * @param {Date} date
 * @returns {object} { age, emoji, name, tide }
 */
export function getMoonPhase(date = new Date()) {
  // 基準となる新月（2024年1月11日）からの経過時間を利用した簡易計算
  const knownNewMoon = new Date('2024-01-11T00:00:00Z').getTime();
  const lunarCycle = 2551443000; // 約29.530588日（ミリ秒）
  const diff = date.getTime() - knownNewMoon;
  
  let phase = (diff % lunarCycle) / lunarCycle;
  if (phase < 0) phase += 1;
  
  const age = phase * 29.53;
  
  let emoji = '🌕';
  let name = '満月';
  let tide = '大潮';
  
  if (age < 1.8 || age > 28.5) { emoji = '🌑'; name = '新月'; tide = '大潮'; }
  else if (age < 6.4) { emoji = '🌒'; name = '三日月'; tide = '中潮'; }
  else if (age < 8.4) { emoji = '🌓'; name = '上弦の月'; tide = '小潮'; }
  else if (age < 13.8) { emoji = '🌔'; name = '十三夜'; tide = '中潮'; }
  else if (age < 15.8) { emoji = '🌕'; name = '満月'; tide = '大潮'; }
  else if (age < 21.4) { emoji = '🌖'; name = '居待月'; tide = '中潮'; }
  else if (age < 23.4) { emoji = '🌗'; name = '下弦の月'; tide = '小潮'; }
  else { emoji = '🌘'; name = '二十六夜'; tide = '中潮'; }
  
  // 潮回りは月齢に依存する（概算）
  // 大潮 (15, 0付近), 中潮, 小潮 (7, 22付近), 長潮 (10, 25付近), 若潮 (11, 26付近)
  if ((age >= 0 && age < 3) || (age >= 14 && age < 18) || age >= 28) { tide = '大潮'; }
  else if ((age >= 3 && age < 7) || (age >= 18 && age < 22)) { tide = '中潮'; }
  else if ((age >= 7 && age < 10) || (age >= 22 && age < 25)) { tide = '小潮'; }
  else if ((age >= 10 && age < 11) || (age >= 25 && age < 26)) { tide = '長潮'; }
  else if ((age >= 11 && age < 12) || (age >= 26 && age < 27)) { tide = '若潮'; }
  else { tide = '中潮'; }
  
  return { age: age.toFixed(1), emoji, name, tide };
}

/**
 * 指定した日付の二十四節気を返す（簡易固定日ベース）
 * @param {Date} date
 * @returns {string} 節気の名前
 */
export function getSolarTerm(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const terms = [
    { m: 1, d: 6, name: '小寒' }, { m: 1, d: 20, name: '大寒' },
    { m: 2, d: 4, name: '立春' }, { m: 2, d: 19, name: '雨水' },
    { m: 3, d: 5, name: '啓蟄' }, { m: 3, d: 21, name: '春分' },
    { m: 4, d: 4, name: '清明' }, { m: 4, d: 20, name: '穀雨' },
    { m: 5, d: 5, name: '立夏' }, { m: 5, d: 21, name: '小満' },
    { m: 6, d: 5, name: '芒種' }, { m: 6, d: 21, name: '夏至' },
    { m: 7, d: 7, name: '小暑' }, { m: 7, d: 23, name: '大暑' },
    { m: 8, d: 7, name: '立秋' }, { m: 8, d: 23, name: '処暑' },
    { m: 9, d: 8, name: '白露' }, { m: 9, d: 23, name: '秋分' },
    { m: 10, d: 8, name: '寒露' }, { m: 10, d: 23, name: '霜降' },
    { m: 11, d: 7, name: '立冬' }, { m: 11, d: 22, name: '小雪' },
    { m: 12, d: 7, name: '大雪' }, { m: 12, d: 22, name: '冬至' }
  ];
  
  let currentTerm = '冬至';
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (m > t.m || (m === t.m && d >= t.d)) {
      currentTerm = t.name;
    } else {
      break;
    }
  }
  return currentTerm;
}
