// ==========================================
//  親機（ホスト）の処理
// ==========================================

let lobbyPlayers = []; // { id, conn, character: {name, ability}, type: 'player'|'host'|'npc' }

// --- ホスト初期化 ---
function initHost() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const roomId = 'aibattler-room-' + pin;
    peer = new Peer(roomId);

    peer.on('open', function() {
        document.getElementById('display-pin').innerText = pin;
    });

    peer.on('connection', function(conn) {
        conn.on('data', function(data) {
            if (data.type === 'join') {
                var playerObj = { id: conn.peer, conn: conn, character: data.character, type: 'player' };
                lobbyPlayers.push(playerObj);
                updateLobbyUI();
                broadcastLobby();
                broadcastStatus('新しいプレイヤー「' + data.character.name + '」がロビーに参加しました！');
            } else if (data.type === 'change_character') {
                var player = lobbyPlayers.find(function(p) { return p.id === conn.peer; });
                if (player) {
                    var oldName = player.character.name;
                    player.character = data.character;
                    updateLobbyUI();
                    broadcastLobby();
                    broadcastStatus('「' + oldName + '」が「' + data.character.name + '」にキャラ変更しました！');
                }
            }
        });

        conn.on('close', function() {
            var player = lobbyPlayers.find(function(p) { return p.id === conn.peer; });
            var name = player ? player.character.name : '不明';
            lobbyPlayers = lobbyPlayers.filter(function(p) { return p.id !== conn.peer; });
            updateLobbyUI();
            broadcastLobby();
        });
    });

    document.getElementById('api-key').addEventListener('change', function(e) {
        localStorage.setItem('gemini_api_key', e.target.value);
    });
}

// --- ホストキャラクター ---
function refreshHostCharacterList() {
    renderCharacterList('host-character-list', {
        selectedNameId: 'host-selected-char-name',
        defaultText: '未選択 (参戦しない)',
        allowDeselect: true,
        onSelect: function() { updateHostInLobby(); },
        onDelete: function() { updateHostInLobby(); }
    });
}

function createCharacterHost() {
    createCharacterFromInput('host-char-name', 'host-char-ability', function() {
        refreshHostCharacterList();
    });
}

function updateHostInLobby() {
    lobbyPlayers = lobbyPlayers.filter(function(p) { return p.type !== 'host'; });
    if (selectedChar) {
        lobbyPlayers.unshift({
            id: 'host',
            conn: null,
            character: { name: selectedChar.name, ability: selectedChar.ability },
            type: 'host'
        });
    }
    updateLobbyUI();
    broadcastLobby();
}

// --- NPC管理 ---
function addRandomNPC() {
    var available = NPC_POOL.filter(function(npc) {
        return !lobbyPlayers.some(function(p) { return p.type === 'npc' && p.character.name === npc.name; });
    });
    if (available.length === 0) return alert('使用可能なNPCがもういません！');
    var npc = available[Math.floor(Math.random() * available.length)];
    lobbyPlayers.push({
        id: 'npc-' + Date.now(),
        conn: null,
        character: { name: npc.name, ability: npc.ability },
        type: 'npc'
    });
    updateLobbyUI();
    broadcastLobby();
}

function removeNPC(npcId) {
    lobbyPlayers = lobbyPlayers.filter(function(p) { return p.id !== npcId; });
    updateLobbyUI();
    broadcastLobby();
}

function removeAllNPCs() {
    lobbyPlayers = lobbyPlayers.filter(function(p) { return p.type !== 'npc'; });
    updateLobbyUI();
    broadcastLobby();
}

// --- ロビーUI ---
function updateLobbyUI() {
    var list = document.getElementById('lobby-list');
    document.getElementById('lobby-count').innerText = lobbyPlayers.length;

    if (lobbyPlayers.length === 0) {
        list.innerHTML = '<p style="padding: 10px; color: #999; margin:0;">プレイヤーの参加を待っています...</p>';
        return;
    }

    list.innerHTML = '';
    lobbyPlayers.forEach(function(p, index) {
        var div = document.createElement('div');
        div.className = 'player-item';

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'check-' + index;
        checkbox.value = index;
        checkbox.checked = true;

        var label = document.createElement('label');
        label.htmlFor = 'check-' + index;
        label.style.cssText = 'cursor:pointer; flex:1;';

        var badge = document.createElement('span');
        badge.className = 'badge';
        if (p.type === 'host') {
            badge.textContent = '👑ホスト';
            badge.classList.add('badge-host');
        } else if (p.type === 'npc') {
            badge.textContent = '🤖NPC';
            badge.classList.add('badge-npc');
        } else {
            badge.textContent = '🎮';
        }

        var nameSpan = document.createElement('strong');
        nameSpan.textContent = ' ' + p.character.name;

        var abilitySpan = document.createElement('span');
        abilitySpan.style.cssText = 'font-size:0.75em; color:#888; display:block; margin-left: 2em;';
        abilitySpan.textContent = p.character.ability;

        label.appendChild(badge);
        label.appendChild(nameSpan);
        label.appendChild(abilitySpan);
        div.appendChild(checkbox);
        div.appendChild(label);

        if (p.type === 'npc') {
            var delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.className = 'btn-delete';
            delBtn.onclick = (function(npcId) {
                return function(e) { e.stopPropagation(); removeNPC(npcId); };
            })(p.id);
            div.appendChild(delBtn);
        }

        list.appendChild(div);
    });
}

// --- ブロードキャスト ---
function broadcastLobby() {
    var lobbyData = lobbyPlayers.map(function(p) {
        return { name: p.character.name, playerType: p.type };
    });
    lobbyPlayers.forEach(function(p) {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'lobby_update', players: lobbyData });
        }
    });
}

function broadcastStatus(msg) {
    lobbyPlayers.forEach(function(p) {
        if (p.conn && p.conn.open) p.conn.send({ type: 'status', msg: msg });
    });
}

function broadcastAbilitiesReveal(participants) {
    var revealData = participants.map(function(p) {
        return { name: p.character.name, ability: p.character.ability, playerType: p.type };
    });
    lobbyPlayers.forEach(function(p) {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'abilities_reveal', players: revealData });
        }
    });
}

function broadcastResult(log, participantNames) {
    document.getElementById('host-battle-log').innerHTML = renderBattleLog(log, participantNames);
    lobbyPlayers.forEach(function(p) {
        if (p.conn && p.conn.open) {
            p.conn.send({ type: 'result', log: log, participantNames: participantNames });
        }
    });
}

// --- バトル ---
function startSelectedBattle() {
    var checkboxes = document.querySelectorAll('#lobby-list input[type="checkbox"]:checked');
    if (checkboxes.length < 2) return alert('対戦させるプレイヤーを2人以上チェックしてください。');
    var selectedPlayers = Array.from(checkboxes).map(function(cb) { return lobbyPlayers[cb.value]; });
    executeBattle(selectedPlayers);
}

function startBattleRoyale() {
    if (lobbyPlayers.length < 2) return alert('ロビーに2人以上のプレイヤーが必要です。');
    executeBattle(lobbyPlayers.slice());
}

async function executeBattle(participants) {
    var apiKey = document.getElementById('api-key').value;
    if (!apiKey) return alert('APIキーが設定されていません。');

    var participantNames = participants.map(function(p) { return p.character.name; });

    // 能力公開 (ゲスト側に能力情報を送信)
    broadcastAbilitiesReveal(participants);

    document.getElementById('host-status').innerText = 'AIがバトルを生成中... (数秒かかります)';
    broadcastStatus('⚔️ バトル生成中... 参加者: ' + participantNames.join(', '));

    var prompt = 'あなたは公平でドラマチックな実況者です。以下の' + participants.length + '人のキャラクターが戦います。\n\n';
    participants.forEach(function(p, index) {
        prompt += '【キャラクター' + (index + 1) + '】名前: ' + p.character.name + ' / 能力: ' + p.character.ability + '\n';
    });
    prompt += '\n全員の能力を論理的に解釈し、互いの能力がどのように干渉し合うかを描写する、白熱した戦闘ログを生成してください。\n最後は必ず「勝者：〇〇」と、最終的に生き残った一人の名前を明記してください。';

    try {
        var resultText = await callGeminiAPI(apiKey, prompt);
        document.getElementById('host-status').innerText = '完了！結果を送信しました。';
        broadcastResult(resultText, participantNames);
    } catch (error) {
        document.getElementById('host-status').innerText = 'エラーが発生しました。';
        broadcastResult('エラー: ' + error.message, []);
    }
}
