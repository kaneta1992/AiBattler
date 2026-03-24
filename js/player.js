// ==========================================
//  子機（プレイヤー）の処理
// ==========================================

let characters = [];
let selectedChar = null;
let playerConn = null;

function loadCharacters() {
    characters = JSON.parse(localStorage.getItem('ai_battler_chars')) || [];
    renderCharacters();
}

function createCharacter() {
    const name = document.getElementById('char-name').value;
    const ability = document.getElementById('char-ability').value;
    if (!name || !ability) return alert('名前と能力を入力してください');
    characters.push({ id: Date.now(), name, ability });
    localStorage.setItem('ai_battler_chars', JSON.stringify(characters));
    renderCharacters();
}

function renderCharacters() {
    const list = document.getElementById('character-list');
    list.innerHTML = '';
    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = `character-card ${selectedChar && selectedChar.id === char.id ? 'selected' : ''}`;
        div.innerHTML = `<div><strong>${char.name}</strong><br><span style="font-size:0.8em">${char.ability}</span></div>`;
        div.onclick = () => {
            selectedChar = char;
            document.getElementById('selected-char-name').innerText = char.name;
            renderCharacters();
            document.getElementById('join-btn').disabled = false;
        };
        list.appendChild(div);
    });
}

function joinRoom() {
    const pin = document.getElementById('room-pin-input').value;
    if (!pin || pin.length !== 4) return alert('4桁のPINを入力してください');

    const roomId = 'aibattler-room-' + pin;
    const statusEl = document.getElementById('player-status');
    statusEl.innerText = 'ホストに接続中...';

    peer = new Peer();

    peer.on('open', () => {
        playerConn = peer.connect(roomId);

        playerConn.on('open', () => {
            statusEl.innerText = '✅ ロビーに入室しました！ホストが試合を開始するのを待っています...';
            playerConn.send({ type: 'join', character: selectedChar });
        });

        playerConn.on('data', (data) => {
            if (data.type === 'status') {
                statusEl.innerText = data.msg;
            } else if (data.type === 'result') {
                statusEl.innerText = '⚔️ 対戦結果！';
                document.getElementById('battle-log').innerText = data.log;
            }
        });

        playerConn.on('error', () => {
            statusEl.innerText = '❌ ホストに接続できませんでした。';
        });
    });
}
