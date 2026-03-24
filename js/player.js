// ==========================================
//  子機（ゲスト / プレイヤー）の処理
// ==========================================

var Player = (function () {

    var playerConn = null;

    // ==========================================
    //  初期化
    // ==========================================

    function init() {
        // Player 側の PeerJS 初期化は joinRoom で行う
    }

    // ==========================================
    //  キャラクター管理
    // ==========================================

    function refreshCharacterList() {
        renderCharacterList('player-character-list', {
            selectedNameId: 'player-selected-char-name',
            defaultText: '未選択（参戦できません）',
            allowDeselect: false,
            onSelect: notifyCharacterChange,
        });
    }

    function createCharacter() {
        CharacterManager.createFromInput('player-char-name', 'player-char-ability', function () {
            refreshCharacterList();
        });
    }

    /** ホストにキャラ変更を通知 + join ボタン有効化 */
    function notifyCharacterChange() {
        // キャラ選択状態に応じて join ボタンの有効/無効を切り替え
        var joinBtn = document.getElementById('join-btn');
        if (joinBtn) joinBtn.disabled = !App.selectedChar;

        if (playerConn && playerConn.open && App.selectedChar) {
            playerConn.send({ type: 'change_character', character: App.selectedChar });
        }
    }

    // ==========================================
    //  ルーム参加
    // ==========================================

    function joinRoom() {
        if (!App.selectedChar) return alert('先にキャラクターを選択してください。');

        var pinEl = document.getElementById('room-pin');
        var pin = pinEl.value.trim();
        if (!/^\d{4}$/.test(pin)) return alert('4桁の数字でPINを入力してください。');

        var targetId = 'aibattler-room-' + pin;
        document.getElementById('player-status').innerText = '接続中...';

        // 既存の Peer をクリーンアップ
        if (App.peer) {
            App.peer.destroy();
            App.peer = null;
        }

        App.peer = new Peer();

        App.peer.on('open', function () {
            playerConn = App.peer.connect(targetId, { reliable: true });

            playerConn.on('open', function () {
                document.getElementById('player-status').innerText = '接続完了！ ロビーで待機中...';
                playerConn.send({ type: 'join', character: App.selectedChar });
            });

            playerConn.on('data', handleHostMessage);

            playerConn.on('close', function () {
                document.getElementById('player-status').innerText = 'ホストとの接続が切れました。';
            });
        });

        App.peer.on('error', function (err) {
            document.getElementById('player-status').innerText = 'エラー: ' + err.message;
        });
    }

    // ==========================================
    //  ホストからのメッセージ処理
    // ==========================================

    function handleHostMessage(data) {
        switch (data.type) {
            case 'status':
                document.getElementById('player-status').innerText = data.msg;
                break;

            case 'lobby_update':
                document.getElementById('player-lobby-section').classList.remove('hidden');
                updateLobbyUI(data.players, false);
                break;

            case 'abilities_reveal':
                updateLobbyUI(data.players, true);
                break;

            case 'result':
                var logEl = document.getElementById('player-battle-log');
                logEl.innerHTML = BattleLogRenderer.render(data.log, data.participantNames);
                logEl.scrollTop = 0;
                break;
        }
    }

    // ==========================================
    //  ロビー UI
    // ==========================================

    function updateLobbyUI(players, showAbility) {
        var list = document.getElementById('player-lobby-list');
        list.innerHTML = '';

        if (!players || players.length === 0) {
            var msg = document.createElement('p');
            msg.className = 'empty-message';
            msg.textContent = 'ロビーにプレイヤーがいません。';
            list.appendChild(msg);
            return;
        }

        players.forEach(function (p) {
            var div = document.createElement('div');
            div.className = 'player-item';

            var badge = createPlayerBadge(p.playerType);
            var nameSpan = document.createElement('strong');
            nameSpan.textContent = ' ' + p.name;

            div.appendChild(badge);
            div.appendChild(nameSpan);

            if (showAbility && p.ability) {
                var abilitySpan = document.createElement('span');
                abilitySpan.className = 'player-ability-text';
                abilitySpan.textContent = p.ability;
                div.appendChild(abilitySpan);
            }

            list.appendChild(div);
        });
    }

    // ==========================================
    //  公開インターフェース
    // ==========================================

    return {
        init: init,
        refreshCharacterList: refreshCharacterList,
        createCharacter: createCharacter,
        joinRoom: joinRoom,
    };
})();

// --- HTML onclick から呼び出すグローバル関数 ---
function createCharacter() { Player.createCharacter(); }
function joinRoom() { Player.joinRoom(); }
