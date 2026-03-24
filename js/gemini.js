// ==========================================
//  Gemini API 通信モジュール
//  モデルやエンドポイントの変更はここだけ修正すれば OK
// ==========================================

var GeminiAPI = (function () {
    var API_URL =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    /**
     * Gemini API を呼び出し、生成テキストを返す
     * - thinkingBudget: 0 で思考トークンを抑制し高速化
     * - maxOutputTokens: 2048 で出力量を制限し高速化
     */
    async function generate(apiKey, prompt) {
        var response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 1.0,
                    maxOutputTokens: 2048,
                    thinkingConfig: { thinkingBudget: 0 },
                },
            }),
        });

        if (!response.ok) {
            var errorBody = await response.text();
            throw new Error('API通信エラー (' + response.status + '): ' + errorBody.slice(0, 200));
        }

        var data = await response.json();
        var parts = data.candidates[0].content.parts;

        // thinking モデルは thought:true のパートを含むのでスキップし、テキスト本体を返す
        for (var i = parts.length - 1; i >= 0; i--) {
            if (parts[i].text !== undefined && !parts[i].thought) {
                return parts[i].text;
            }
        }
        throw new Error('APIレスポンスにテキストが含まれていません');
    }

    return { generate: generate };
})();
