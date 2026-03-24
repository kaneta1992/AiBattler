// ==========================================
//  共通: グローバル状態・画面切り替え
//  アプリケーションのエントリーポイント
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
