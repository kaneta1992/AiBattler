// ==========================================
//  共通 UI ヘルパー
//  ホスト画面・ゲスト画面で共有するUI部品
// ==========================================

/**
 * input/textarea に文字数カウンターを接続する
 * @param {string} inputId    入力要素の ID
 * @param {string} counterId  カウンター表示要素の ID
 * @param {number} maxLen     最大文字数
 */
function setupCharCounter(inputId, counterId, maxLen) {
    var input = document.getElementById(inputId);
    var counter = document.getElementById(counterId);
    if (!input || !counter) return;

    function update() {
        var len = input.value.length;
        counter.textContent = len + ' / ' + maxLen;
        counter.classList.toggle('near-limit', len >= maxLen * 0.8 && len < maxLen);
        counter.classList.toggle('at-limit', len >= maxLen);
    }

    input.addEventListener('input', update);
    update();
}

/**
 * プレイヤータイプに応じたバッジ要素を生成する
 * ホスト画面/ゲスト画面で統一したバッジ表示に使う
 */
function createPlayerBadge(playerType) {
    var badge = document.createElement('span');
    badge.className = 'badge';

    switch (playerType) {
        case 'host':
            badge.textContent = '👑ホスト';
            badge.classList.add('badge-host');
            break;
        case 'npc':
            badge.textContent = '🤖NPC';
            badge.classList.add('badge-npc');
            break;
        default:
            badge.textContent = '🎮';
            badge.classList.add('badge-player');
            break;
    }
    return badge;
}
