// Gemini API通信モジュール
// モデルやエンドポイントの変更はここだけ修正すればOK

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

async function callGeminiAPI(apiKey, prompt) {
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error('API通信エラー');
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
