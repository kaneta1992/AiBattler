// 戦闘ログ表示ユーティリティ (Markdown対応・キャラ名色付け)

const CHAR_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea',
    '#26de81', '#fd9644', '#fc5c65', '#778ca3', '#20bf6b',
    '#eb3b5a', '#2d98da', '#f7b731', '#8854d0', '#0fb9b1',
];

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderBattleLog(text, participantNames) {
    let html = escapeHtml(text);

    // 見出し (太字より先に処理)
    html = html.replace(/^### (.+)$/gm, '<span class="log-heading log-h3">▶ $1</span>');
    html = html.replace(/^## (.+)$/gm, '<span class="log-heading log-h2">■ $1</span>');
    html = html.replace(/^# (.+)$/gm, '<span class="log-heading log-h1">★ $1</span>');

    // 太字
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 斜体
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // 取り消し線
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // 水平線
    html = html.replace(/^---$/gm, '<hr>');
    // 改行
    html = html.replace(/\n/g, '<br>');

    // キャラクター名の色付け
    if (participantNames && participantNames.length > 0) {
        // 長い名前から先に置換 (部分一致の誤爆を防ぐ)
        const sortedNames = [...participantNames].sort((a, b) => b.length - a.length);
        sortedNames.forEach(name => {
            const originalIndex = participantNames.indexOf(name);
            const color = CHAR_COLORS[originalIndex % CHAR_COLORS.length];
            const escapedName = escapeHtml(name);
            const regex = new RegExp(escapeRegExp(escapedName), 'g');
            html = html.replace(regex, `<span class="char-name" style="color:${color};">${escapedName}</span>`);
        });
    }

    return html;
}
