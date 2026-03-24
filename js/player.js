// ==========================================
//  子機（プレイヤー）の処理
// ==========================================

let playerConn = null;

// --- キャラクター表示 ---
function refreshPlayerCharacterList() {
    renderCharacterList('character-list', {
        selectedNameId: 'selected-char-name',
        defaultText: '未選択',
        allowDeselect: false,
        onSelect: function(char) {
            document.getElementById('join-btn').disabled = !char;
            // 接続中ならキャラ変更を送信
            if (playerConn && playerConn.open && char) {
                playerConn.send({ type: 'change_character', character: { name: char.name, ability: char.ability } });
            }
        },
        onDelete: function() {
            document.getElementById('join-btn').disabled = !selectedChar;
        }
    });
}

function createCharacter() {
    createCharacterFromInput('char-name', 'char-ability', function() {
        refreshPlayerCharacterList();
    });
}

// --- ロビー表示 (ゲスト側) ---
function updatePlayerLobby(players, showAbilities) {
    var section = document.getElementById('player-lobby-section');
    section.classList.remove('hidden');
    var list = document.getElementById('player-lobby-list');
    list.innerHTML = '';

    players.forEach(function(p) {
        var div = document.createElement('div');
        div.className = 'player-lobby-item';

        // バッジ (ホストと同じ表示形式)
        var badge = document.createElement('span');
        badge.className = 'badge';
        if (p.playerType === 'host') {
            badge.textContent = '👑ホスト';
            badge.classList.add('badge-host');
        } else if (p.playerType === 'npc') {
            badge.textContent = '🤖NPC';
            badge.classList.add('badge-npc');
        } else {
            badge.textContent = '🎮';
        }

        var nameSpan = document.createElement('strong');
        nameSpan.textContent = ' ' + p.name;

        // 自分のキャラにバッジ表示
        if (selectedChar && p.name === selectedChar.name && p.playerType === 'player') {
            var youBadge = document.createElement('span');
            youBadge.className = 'badge badge-you';
            youBadge.textContent = 'あなた';
            nameSpan.appendChild(document.createTextNode(' '));
            nameSpan.appendChild(youBadge);
        }

        div.appendChild(badge);
        div.appendChild(nameSpan);

        if (showAbilities && p.ability) {
            var abilitySpan = document.createElement('div');
            abilitySpan.style.cssText = 'font-size:0.8em; color:#666; margin-left: 1.5em;';
            abilitySpan.textContent = '💡 ' + p.ability;
            div.appendChild(abilitySpan);
        }

        list.appendChild(div);
    });
}

// --- ルーム参加 ---
function joinRoom() {
    var pin = document.getElementById('room-pin-input').value;
    if (!pin || pin.length !== 4) return alert('4桁のPINを入力してください');
    if (!selectedChar) return alert('キャラクターを選択してください');

    var roomId = 'aibattler-room-' + pin;
    var statusEl = document.getElementById('player-status');
    statusEl.innerText = 'ホストに接続中...';

    peer = new Peer();

    peer.on('open', function() {
        playerConn = peer.connect(roomId);

        playerConn.on('open', function() {
            statusEl.innerText = '✅ ロビーに入室しました！ホストが試合を開始するのを待っています...';
            playerConn.send({ type: 'join', character: { name: selectedChar.name, ability: selectedChar.ability } });
            document.getElementById('join-btn').disabled = true;
            document.getElementById('join-btn').textContent = '入室済み';
            document.getElementById('room-pin-input').disabled = true;
        });

        playerConn.on('data', function(data) {
            if (data.type === 'status') {
                statusEl.innerText = data.msg;
            } else if (data.type === 'lobby_update') {
                updatePlayerLobby(data.players, false);
            } else if (data.type === 'abilities_reveal') {
                updatePlayerLobby(data.players, true);
            } else if (data.type === 'result') {
                statusEl.innerText = '⚔️ 対戦結果！';
                document.getElementById('battle-log').innerHTML = renderBattleLog(data.log, data.participantNames);
            }
        });

        playerConn.on('error', function() {
            statusEl.innerText = '❌ ホストに接続できませんでした。';
        });

        playerConn.on('close', function() {
            statusEl.innerText = '⚠️ ホストとの接続が切れました。';
            playerConn = null;
        });
    });
}
