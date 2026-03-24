// 共通変数・画面切り替え

let peer = null;
let isHost = false;

function startHostMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('host-view').classList.remove('hidden');
    isHost = true;
    document.getElementById('api-key').value = localStorage.getItem('gemini_api_key') || '';
    initHost();
}

function startPlayerMode() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
    isHost = false;
    loadCharacters();
}
