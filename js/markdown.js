// ==========================================
//  戦闘ログ表示ユーティリティ
//  Markdown → HTML 変換 + キャラ名色付け
// ==========================================

var BattleLogRenderer = (function () {

    // キャラ名の色パレット (15色)
    var COLORS = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea',
        '#26de81', '#fd9644', '#fc5c65', '#778ca3', '#20bf6b',
        '#eb3b5a', '#2d98da', '#f7b731', '#8854d0', '#0fb9b1',
    ];

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
        // 注意: > はエスケープしない (引用符 ">" をパースするため)
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Markdown テーブルを HTML <table> に変換
     * 「| H1 | H2 |\n|---|---|\n| C1 | C2 |」形式を検出する
     * 末尾の | や空白が省略されていてもマッチする
     */
    function convertTables(html) {
        // 連続する | で始まる行のブロックを探す (末尾の | は任意)
        return html.replace(
            /((?:^\|.+$\n?){2,})/gm,
            function (tableBlock) {
                var rows = tableBlock.trim().split('\n');
                if (rows.length < 2) return tableBlock;

                var isHeaderDone = false;
                var result = '<table>';
                rows.forEach(function (row) {
                    var trimmed = row.trim();
                    // セパレータ行 (|---|---| 等) はスキップ
                    if (/^\|[\s\-:|]+\|?\s*$/.test(trimmed)) {
                        isHeaderDone = true;
                        return;
                    }

                    var cells = trimmed
                        .replace(/^\|/, '')
                        .replace(/\|\s*$/, '')
                        .split('|')
                        .map(function (c) { return c.trim(); });

                    var tag = !isHeaderDone ? 'th' : 'td';
                    result += '<tr>';
                    cells.forEach(function (cell) {
                        result += '<' + tag + '>' + cell + '</' + tag + '>';
                    });
                    result += '</tr>';
                });
                result += '</table>';
                return result;
            }
        );
    }

    /**
     * Markdown テキストを HTML に変換し、キャラ名を色付けする
     */
    function render(text, participantNames) {
        var html = escapeHtml(text);

        // テーブル (太字変換より前に処理)
        html = convertTables(html);

        // 見出し
        html = html.replace(/^### (.+)$/gm, '<span class="log-heading log-h3">▶ $1</span>');
        html = html.replace(/^## (.+)$/gm, '<span class="log-heading log-h2">■ $1</span>');
        html = html.replace(/^# (.+)$/gm, '<span class="log-heading log-h1">★ $1</span>');

        // 引用 (> で始まる行)
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // 太字 → 斜体 → 取り消し線
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // 水平線
        html = html.replace(/^---$/gm, '<hr>');

        // 改行
        html = html.replace(/\n/g, '<br>');

        // キャラクター名の色付け
        if (participantNames && participantNames.length > 0) {
            // 長い名前から先に置換 (部分一致の誤爆を防ぐ)
            var sortedNames = participantNames.slice().sort(function (a, b) {
                return b.length - a.length;
            });

            sortedNames.forEach(function (name) {
                var colorIdx = participantNames.indexOf(name);
                var color = COLORS[colorIdx % COLORS.length];
                var safeName = escapeHtml(name);
                // HTML タグ内 (<...> の間) を除外して置換
                var regex = new RegExp('(?![^<]*>)' + escapeRegExp(safeName), 'g');
                html = html.replace(
                    regex,
                    '<span class="char-name" style="color:' + color + ';">' + safeName + '</span>'
                );
            });
        }

        return html;
    }

    return { render: render };
})();
