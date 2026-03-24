// ==========================================
//  キャラクター管理 (共通)
//  データの読み書き・作成・削除と、
//  キャラクターカード一覧のUI描画を担う
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
//  キャラクターリスト描画
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
