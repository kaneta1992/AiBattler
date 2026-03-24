// ==========================================
//  共通: 状態管理・画面切り替え・キャラクター管理
// ==========================================

// --- グローバル状態 ---
var App = {
    peer: null,
    isHost: false,
    characters: [],
    selectedChar: null,
};

// ==========================================
//  画面切り替え
// ==========================================

function startHostMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('host-view').classList.remove('hidden');
    App.isHost = true;
    document.getElementById('api-key').value = localStorage.getItem('gemini_api_key') || '';
    CharacterManager.load();
    Host.refreshCharacterList();
    Host.init();
    setupCharCounter('host-char-name', 'host-char-name-counter', CharacterManager.MAX_NAME_LENGTH);
    setupCharCounter('host-char-ability', 'host-char-ability-counter', CharacterManager.MAX_ABILITY_LENGTH);
}

function startPlayerMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
    App.isHost = false;
    CharacterManager.load();
    Player.refreshCharacterList();
    setupCharCounter('player-char-name', 'player-char-name-counter', CharacterManager.MAX_NAME_LENGTH);
    setupCharCounter('player-char-ability', 'player-char-ability-counter', CharacterManager.MAX_ABILITY_LENGTH);
}

// ==========================================
//  キャラクター管理 (共通)
// ==========================================

var CharacterManager = {
    STORAGE_KEY: 'ai_battler_chars',
    MAX_NAME_LENGTH: 20,
    MAX_ABILITY_LENGTH: 200,

    load: function () {
        try {
            App.characters = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch (e) {
            App.characters = [];
        }
    },

    save: function () {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(App.characters));
    },

    /**
     * 入力フォームからキャラクターを作成して保存
     * @param {string} nameInputId   名前の input 要素 ID
     * @param {string} abilityInputId 能力の textarea 要素 ID
     * @param {Function} callback    作成後のコールバック
     */
    createFromInput: function (nameInputId, abilityInputId, callback) {
        var nameEl = document.getElementById(nameInputId);
        var abilityEl = document.getElementById(abilityInputId);
        var name = nameEl.value.trim().slice(0, this.MAX_NAME_LENGTH);
        var ability = abilityEl.value.trim().slice(0, this.MAX_ABILITY_LENGTH);

        if (!name || !ability) {
            return alert('名前と能力を入力してください');
        }

        var char = { id: Date.now(), name: name, ability: ability };
        App.characters.push(char);
        this.save();
        nameEl.value = '';
        abilityEl.value = '';
        // カウンター表示をリセット
        nameEl.dispatchEvent(new Event('input'));
        abilityEl.dispatchEvent(new Event('input'));
        if (callback) callback(char);
    },

    remove: function (charId) {
        App.characters = App.characters.filter(function (c) { return c.id !== charId; });
        if (App.selectedChar && App.selectedChar.id === charId) {
            App.selectedChar = null;
        }
        this.save();
    },
};

// ==========================================
//  文字数カウンター
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

// ==========================================
//  キャラクターリスト描画 (共通)
// ==========================================

/**
 * キャラクターカードのリストを描画する
 * @param {string} containerId  コンテナ要素 ID
 * @param {Object} opts         オプション
 *  - selectedNameId {string}  選択名を表示する要素 ID
 *  - defaultText    {string}  未選択時のテキスト
 *  - allowDeselect  {boolean} 再クリックで選択解除するか
 *  - onSelect       {Function(char)} 選択時コールバック
 *  - onDelete       {Function(char)} 削除時コールバック
 */
function renderCharacterList(containerId, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (App.characters.length === 0) {
        var p = document.createElement('p');
        p.className = 'empty-message';
        p.textContent = 'キャラクターがまだ作成されていません。';
        container.appendChild(p);
        return;
    }

    App.characters.forEach(function (char) {
        var card = document.createElement('div');
        var isSelected = App.selectedChar && App.selectedChar.id === char.id;
        card.className = 'character-card' + (isSelected ? ' selected' : '');

        // キャラ情報
        var info = document.createElement('div');
        info.className = 'character-info';

        var nameEl = document.createElement('strong');
        nameEl.textContent = char.name;
        info.appendChild(nameEl);

        info.appendChild(document.createElement('br'));

        var abilityEl = document.createElement('span');
        abilityEl.className = 'character-ability';
        abilityEl.textContent = char.ability;
        info.appendChild(abilityEl);

        // 削除ボタン
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = function (e) {
            e.stopPropagation();
            if (!confirm('「' + char.name + '」を削除しますか？')) return;
            CharacterManager.remove(char.id);
            renderCharacterList(containerId, opts);
            updateSelectedNameDisplay(opts);
            if (opts.onDelete) opts.onDelete(char);
        };

        // クリックで選択/解除
        card.onclick = function () {
            if (opts.allowDeselect && App.selectedChar && App.selectedChar.id === char.id) {
                App.selectedChar = null;
            } else {
                App.selectedChar = char;
            }
            renderCharacterList(containerId, opts);
            updateSelectedNameDisplay(opts);
            if (opts.onSelect) opts.onSelect(App.selectedChar);
        };

        card.appendChild(info);
        card.appendChild(deleteBtn);
        container.appendChild(card);
    });
}

/** 選択中キャラ名の表示を更新 */
function updateSelectedNameDisplay(opts) {
    if (!opts.selectedNameId) return;
    var el = document.getElementById(opts.selectedNameId);
    if (el) {
        el.innerText = App.selectedChar ? App.selectedChar.name : (opts.defaultText || '未選択');
    }
}

// ==========================================
//  共通 UI ヘルパー
// ==========================================

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
