// 共通変数・画面切り替え・キャラクター管理

let peer = null;
let isHost = false;
let characters = [];
let selectedChar = null;

// --- 画面切り替え ---
function startHostMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('host-view').classList.remove('hidden');
    isHost = true;
    document.getElementById('api-key').value = localStorage.getItem('gemini_api_key') || '';
    loadCharacters();
    refreshHostCharacterList();
    initHost();
}

function startPlayerMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
    isHost = false;
    loadCharacters();
    refreshPlayerCharacterList();
}

// --- キャラクター管理 (共通) ---
function loadCharacters() {
    characters = JSON.parse(localStorage.getItem('ai_battler_chars')) || [];
}

function saveCharacters() {
    localStorage.setItem('ai_battler_chars', JSON.stringify(characters));
}

function createCharacterFromInput(nameInputId, abilityInputId, callback) {
    const nameEl = document.getElementById(nameInputId);
    const abilityEl = document.getElementById(abilityInputId);
    const name = nameEl.value.trim();
    const ability = abilityEl.value.trim();
    if (!name || !ability) return alert('名前と能力を入力してください');
    const char = { id: Date.now(), name, ability };
    characters.push(char);
    saveCharacters();
    nameEl.value = '';
    abilityEl.value = '';
    if (callback) callback(char);
}

function deleteCharacter(charId) {
    characters = characters.filter(c => c.id !== charId);
    if (selectedChar && selectedChar.id === charId) {
        selectedChar = null;
    }
    saveCharacters();
}

function renderCharacterList(containerId, options) {
    options = options || {};
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    if (characters.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'color: #999; margin: 0; padding: 10px;';
        p.textContent = 'キャラクターがまだ作成されていません。';
        list.appendChild(p);
        return;
    }

    characters.forEach(function(char) {
        const div = document.createElement('div');
        div.className = 'character-card' + (selectedChar && selectedChar.id === char.id ? ' selected' : '');

        const info = document.createElement('div');
        info.style.flex = '1';
        const nameEl = document.createElement('strong');
        nameEl.textContent = char.name;
        const br = document.createElement('br');
        const abilityEl = document.createElement('span');
        abilityEl.style.fontSize = '0.8em';
        abilityEl.textContent = char.ability;
        info.appendChild(nameEl);
        info.appendChild(br);
        info.appendChild(abilityEl);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            if (!confirm('「' + char.name + '」を削除しますか？')) return;
            deleteCharacter(char.id);
            renderCharacterList(containerId, options);
            if (options.selectedNameId) {
                document.getElementById(options.selectedNameId).innerText =
                    selectedChar ? selectedChar.name : (options.defaultText || '未選択');
            }
            if (options.onDelete) options.onDelete(char);
        };

        div.onclick = function() {
            if (options.allowDeselect && selectedChar && selectedChar.id === char.id) {
                selectedChar = null;
            } else {
                selectedChar = char;
            }
            if (options.selectedNameId) {
                document.getElementById(options.selectedNameId).innerText =
                    selectedChar ? selectedChar.name : (options.defaultText || '未選択');
            }
            renderCharacterList(containerId, options);
            if (options.onSelect) options.onSelect(selectedChar);
        };

        div.appendChild(info);
        div.appendChild(deleteBtn);
        list.appendChild(div);
    });
}
