// ==========================================
//  親機（ホスト）の処理
// ==========================================

let lobbyPlayers = []; // { id, conn, character }

function initHost() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const roomId = 'aibattler-room-' + pin;
    peer = new Peer(roomId);

    peer.on('open', () => {
        document.getElementById('display-pin').innerText = pin;
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => {
            if (data.type === 'join') {
                const playerObj = { id: conn.peer, conn: conn, character: data.character };
                lobbyPlayers.push(playerObj);
                updateLobbyUI();
                broadcastStatus(`新しいプレイヤー「${data.character.name}」がロビーに参加しました！`);
            }
        });

        conn.on('close', () => {
            lobbyPlayers = lobbyPlayers.filter(p => p.id !== conn.peer);
            updateLobbyUI();
        });
    });

    document.getElementById('api-key').addEventListener('change', (e) => {
        localStorage.setItem('gemini_api_key', e.target.value);
    });
}

function updateLobbyUI() {
    const list = document.getElementById('lobby-list');
    document.getElementById('lobby-count').innerText = lobbyPlayers.length;

    if (lobbyPlayers.length === 0) {
        list.innerHTML = '<p style="padding: 10px; color: #999; margin:0;">プレイヤーの参加を待っています...</p>';
        return;
    }

    list.innerHTML = '';
    lobbyPlayers.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'player-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `check-${index}`;
        checkbox.value = index;
        checkbox.style.cssText = 'width:auto; margin:0 10px 0 0; transform:scale(1.5);';

        const label = document.createElement('label');
        label.htmlFor = `check-${index}`;
        label.style.cssText = 'cursor:pointer; flex:1;';

        const strong = document.createElement('strong');
        strong.textContent = p.character.name;

        const span = document.createElement('span');
        span.style.cssText = 'font-size:0.8em; color:#666;';
        span.textContent = ` - ${p.character.ability}`;

        label.appendChild(strong);
        label.appendChild(span);
        div.appendChild(checkbox);
        div.appendChild(label);
        list.appendChild(div);
    });
}

function broadcastStatus(msg) {
    lobbyPlayers.forEach(p => {
        if (p.conn && p.conn.open) p.conn.send({ type: 'status', msg: msg });
    });
}

function broadcastResult(log) {
    document.getElementById('host-battle-log').innerText = log;
    lobbyPlayers.forEach(p => {
        if (p.conn && p.conn.open) p.conn.send({ type: 'result', log: log });
    });
}

// 指名対戦（チェックを入れた人で対戦、2人以上なら何人でもOK）
function startSelectedBattle() {
    const checkboxes = document.querySelectorAll('#lobby-list input[type="checkbox"]:checked');
    if (checkboxes.length < 2) return alert('対戦させるプレイヤーを2人以上チェックしてください。');

    const selectedPlayers = Array.from(checkboxes).map(cb => lobbyPlayers[cb.value]);
    executeBattle(selectedPlayers);
}

// 大乱闘（ロビーにいる全員で対戦）
function startBattleRoyale() {
    if (lobbyPlayers.length < 2) return alert('ロビーに2人以上のプレイヤーが必要です。');
    executeBattle(lobbyPlayers);
}

async function executeBattle(participants) {
    const apiKey = document.getElementById('api-key').value;
    if (!apiKey) return alert('APIキーが設定されていません。');

    document.getElementById('host-status').innerText = 'AIがバトルを生成中... (数秒かかります)';
    broadcastStatus(`⚔️ バトル生成中... 参加者: ${participants.map(p => p.character.name).join(', ')}`);

    let prompt = `あなたは公平でドラマチックな実況者です。以下の${participants.length}人のキャラクターが戦います。\n\n`;
    participants.forEach((p, index) => {
        prompt += `【キャラクター${index + 1}】名前: ${p.character.name} / 能力: ${p.character.ability}\n`;
    });
    prompt += `\n全員の能力を論理的に解釈し、互いの能力がどのように干渉し合うかを描写する、白熱した戦闘ログを生成してください。
最後は必ず「勝者：〇〇」と、最終的に生き残った一人の名前を明記してください。`;

    try {
        const resultText = await callGeminiAPI(apiKey, prompt);
        document.getElementById('host-status').innerText = '完了！結果を送信しました。';
        broadcastResult(resultText);
    } catch (error) {
        document.getElementById('host-status').innerText = 'エラーが発生しました。';
        broadcastResult(`エラー: ${error.message}`);
    }
}
