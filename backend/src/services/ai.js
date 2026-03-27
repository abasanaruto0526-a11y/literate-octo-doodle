import OpenAI from "openai";
import dotenv from "dotenv";

// 念のためここでも環境変数を読み込む
dotenv.config();

let openai = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
  openai = new OpenAI({ 
    apiKey: process.env.GEMINI_API_KEY.trim(),
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
  });
}

export async function deepAnalyzeText(text) {
  if (!openai) {
    console.log("ℹ️ Gemini APIキーが未設定のため、AI深層分析はスキップされました（簡易モード動作）");
    return null; // キーがない場合はfallbackとしてnullを返し、フロントの判定をそのまま使う
  }
  
  if (!text || text.trim() === '') return null;

  console.log("🧠 Geminiによるノートの深層感情・文脈分析を実行中...");
  
  try {
    const prompt = `以下のテキスト（ユーザー自身の声で記録された日記やアイデア）の裏側にある「本当の感情」と「重要なキーワード」を分析し、以下の仕様に従って厳密なJSONフォーマットのみで出力してください。

【出力要件】
1. "emotion" キー: 次の4つのうち、内容全体から感じられる雰囲気に一番近いものを1つ選ぶこと。
   - "positive" (喜び、感謝、希望に満ちた前向きな内容)
   - "negative" (恐れ、不安、怒り、悲しみ、疲れなどの後ろ向きな内容)
   - "excited" (驚き、強い興奮、とても強いワクワク感、大きな発見)
   - "neutral" (日常的な予定、単なる事実の記録、フラットな内容)
2. "tags" キー: この文章を構成する最も重要なキーワードを3〜5個の文字列配列として抽出すること（名詞や短めのフレーズが望ましい）。

【テキスト】:
"${text}"`;

    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash", // 無料枠が豊富なGoogleの最新高速モデル
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a highly empathetic AI assistant that analyzes human diary notes and outputs ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // 安定した分析結果を得るために少し低め
    });

    const resultString = response.choices[0].message.content;
    const parsed = JSON.parse(resultString);
    
    // 値の検証と安全性確保
    const validEmotions = ['positive', 'negative', 'excited', 'neutral'];
    let emotion = parsed.emotion;
    if (!validEmotions.includes(emotion)) emotion = 'neutral';
    
    return {
      emotion,
      tags: Array.isArray(parsed.tags) ? parsed.tags : []
    };
  } catch (error) {
    console.error("❌ Gemini Analysis Error:", error);
    return null;
  }
}
