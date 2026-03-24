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

    var charList = '';
    participants.forEach(function(p, index) {
        charList += '【' + (index + 1) + '】' + p.character.name + ' ／ 能力: ' + p.character.ability + '\n';
    });

    var prompt = 'あなたは公平でドラマチックなバトル実況者です。以下の' + participants.length + '人のキャラクターがバトルロイヤルで戦います。\n'
        + '必ず以下の出力フォーマットに厳密に従ってください。フォーマット外の文章は一切出力しないでください。\n\n'
        + '--- 参加キャラクター ---\n' + charList + '\n'
        + '--- 出力フォーマット (これに厳密に従うこと) ---\n\n'
        + '## ⚔️ バトル開始！\n\n'
        + '（参加者紹介を1行ずつ。「**名前** ― 能力の短い説明」の形式で）\n\n'
        + '---\n\n'
        + '（ラウンドごとに以下を繰り返す）\n'
        + '## 🔥 ラウンドN\n\n'
        + '（そのラウンドの戦闘描写。各キャラの行動を描写する。キャラ名は必ず **名前** で太字にする。）\n\n'
        + '> 💀 **脱落: ○○** ― （脱落理由を簡潔に）\n\n'
        + '（脱落者がいない場合は上記の行を省略）\n\n'
        + '---\n\n'
        + '全員が脱落して1人になるまで繰り返す。\n\n'
        + '最後に以下を必ず出力:\n\n'
        + '## 🏆 最終結果\n\n'
        + '| 順位 | キャラクター | 備考 |\n'
        + '|------|------------|------|\n'
        + '| 🥇 1位 | ○○ | 勝者 |\n'
        + '| 🥈 2位 | ○○ | ラウンドNで脱落 |\n'
        + '| 🥉 3位 | ○○ | ラウンドNで脱落 |\n'
        + '（以下、脱落が遅い順に全員分記載）\n\n'
        + '勝者：○○\n\n'
        + '--- 注意事項 ---\n'
        + '・能力の強弱は論理的に判定すること。チートキャラでも弱点や相性を考慮すること\n'
        + '・簡潔に。各ラウンドは3〜5文程度。全体で800文字以内を目標\n'
        + '・脱落表記は必ず「> 💀 **脱落: ○○** ―」の形式で統一\n'
        + '・キャラ名は文中で必ず **太字** にすること';

    try {
        var resultText = await callGeminiAPI(apiKey, prompt);
        document.getElementById('host-status').innerText = '完了！結果を送信しました。';
        broadcastResult(resultText, participantNames);
    } catch (error) {
        document.getElementById('host-status').innerText = 'エラーが発生しました。';
        broadcastResult('エラー: ' + error.message, []);
    }
}
