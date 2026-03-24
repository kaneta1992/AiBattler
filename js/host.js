// ==========================================
//  親機（ホスト）の処理
// ==========================================

var Host = (function () {

    // ロビー内のプレイヤー配列
    // { id, conn, character: {name, ability}, type: 'player'|'host'|'npc' }
    var lobbyPlayers = [];

    // ==========================================
    //  初期化
    // ==========================================

    function init() {
        var pin = String(Math.floor(1000 + Math.random() * 9000));
        var roomId = 'aibattler-room-' + pin;
        App.peer = new Peer(roomId);

        App.peer.on('open', function () {
            document.getElementById('display-pin').innerText = pin;
        });

        App.peer.on('connection', handleConnection);

        document.getElementById('api-key').addEventListener('change', function (e) {
            localStorage.setItem('gemini_api_key', e.target.value);
        });
    }

    function handleConnection(conn) {
        conn.on('data', function (data) {
            switch (data.type) {
                case 'join':
                    lobbyPlayers.push({
                        id: conn.peer,
                        conn: conn,
                        character: data.character,
                        type: 'player',
                    });
                    refreshLobby();
                    broadcastStatus('新しいプレイヤー「' + data.character.name + '」がロビーに参加しました！');
                    break;

                case 'change_character':
                    var player = findPlayer(conn.peer);
                    if (player) {
                        var oldName = player.character.name;
                        player.character = data.character;
                        refreshLobby();
                        broadcastStatus('「' + oldName + '」が「' + data.character.name + '」にキャラ変更しました！');
                    }
                    break;
            }
        });

        conn.on('close', function () {
            lobbyPlayers = lobbyPlayers.filter(function (p) { return p.id !== conn.peer; });
            refreshLobby();
        });
    }

    function findPlayer(peerId) {
        return lobbyPlayers.find(function (p) { return p.id === peerId; });
    }

    // ==========================================
    //  ホストキャラクター
    // ==========================================

    function refreshCharacterList() {
        renderCharacterList('host-character-list', {
            selectedNameId: 'host-selected-char-name',
            defaultText: '未選択 (参戦しない)',
            allowDeselect: true,
            onSelect: function () { syncHostToLobby(); },
            onDelete: function () { syncHostToLobby(); },
        });
    }

    function createCharacter() {
        CharacterManager.createFromInput('host-char-name', 'host-char-ability', function () {
            refreshCharacterList();
        });
    }

    /** ホストの選択キャラをロビーに反映 */
    function syncHostToLobby() {
        lobbyPlayers = lobbyPlayers.filter(function (p) { return p.type !== 'host'; });
        if (App.selectedChar) {
            lobbyPlayers.unshift({
                id: 'host',
                conn: null,
                character: { name: App.selectedChar.name, ability: App.selectedChar.ability },
                type: 'host',
            });
        }
        refreshLobby();
    }

    // ==========================================
    //  NPC 管理
    // ==========================================

    function addRandomNPC() {
        var used = {};
        lobbyPlayers.forEach(function (p) {
            if (p.type === 'npc') used[p.character.name] = true;
        });

        var available = NPC_POOL.filter(function (npc) { return !used[npc.name]; });
        if (available.length === 0) return alert('使用可能なNPCがもういません！');

        var npc = available[Math.floor(Math.random() * available.length)];
        lobbyPlayers.push({
            id: 'npc-' + Date.now(),
            conn: null,
            character: { name: npc.name, ability: npc.ability },
            type: 'npc',
        });
        refreshLobby();
    }

    function removeNPC(npcId) {
        lobbyPlayers = lobbyPlayers.filter(function (p) { return p.id !== npcId; });
        refreshLobby();
    }

    function removeAllNPCs() {
        lobbyPlayers = lobbyPlayers.filter(function (p) { return p.type !== 'npc'; });
        refreshLobby();
    }

    // ==========================================
    //  ロビー UI
    // ==========================================

    /** ロビーUIを更新し、全ゲストにも通知する */
    function refreshLobby() {
        renderLobbyUI();
        broadcastLobbyList();
    }

    function renderLobbyUI() {
        var list = document.getElementById('lobby-list');
        document.getElementById('lobby-count').innerText = lobbyPlayers.length;

        if (lobbyPlayers.length === 0) {
            list.innerHTML = '';
            var msg = document.createElement('p');
            msg.className = 'empty-message';
            msg.textContent = 'プレイヤーの参加を待っています...';
            list.appendChild(msg);
            return;
        }

        list.innerHTML = '';
        lobbyPlayers.forEach(function (p, index) {
            var div = document.createElement('div');
            div.className = 'player-item';

            // チェックボックス
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'check-' + index;
            checkbox.dataset.index = index;
            checkbox.checked = true;

            // ラベル
            var label = document.createElement('label');
            label.htmlFor = 'check-' + index;

            var badge = createPlayerBadge(p.type);
            var nameSpan = document.createElement('strong');
            nameSpan.textContent = ' ' + p.character.name;
            var abilitySpan = document.createElement('span');
            abilitySpan.className = 'player-ability-text';
            abilitySpan.textContent = p.character.ability;

            label.appendChild(badge);
            label.appendChild(nameSpan);
            label.appendChild(abilitySpan);
            div.appendChild(checkbox);
            div.appendChild(label);

            // NPC 個別削除ボタン
            if (p.type === 'npc') {
                var delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.className = 'btn-delete';
                delBtn.onclick = (function (id) {
                    return function (e) { e.stopPropagation(); removeNPC(id); };
                })(p.id);
                div.appendChild(delBtn);
            }

            list.appendChild(div);
        });
    }

    // ==========================================
    //  ブロードキャスト (ゲストへの送信)
    // ==========================================

    function sendToAll(data) {
        lobbyPlayers.forEach(function (p) {
            if (p.conn && p.conn.open) p.conn.send(data);
        });
    }

    function broadcastLobbyList() {
        var lobbyData = lobbyPlayers.map(function (p) {
            return { name: p.character.name, playerType: p.type };
        });
        sendToAll({ type: 'lobby_update', players: lobbyData });
    }

    function broadcastStatus(msg) {
        sendToAll({ type: 'status', msg: msg });
    }

    function broadcastAbilitiesReveal(participants) {
        var data = participants.map(function (p) {
            return { name: p.character.name, ability: p.character.ability, playerType: p.type };
        });
        sendToAll({ type: 'abilities_reveal', players: data });
    }

    function broadcastResult(log, participantNames) {
        var logEl = document.getElementById('host-battle-log');
        logEl.innerHTML = BattleLogRenderer.render(log, participantNames);
        logEl.scrollTop = logEl.scrollHeight;
        sendToAll({ type: 'result', log: log, participantNames: participantNames });
    }

    // ==========================================
    //  バトル
    // ==========================================

    function startSelectedBattle() {
        var checkboxes = document.querySelectorAll('#lobby-list input[type="checkbox"]:checked');
        if (checkboxes.length < 2) return alert('対戦させるプレイヤーを2人以上チェックしてください。');

        var selected = Array.from(checkboxes).map(function (cb) {
            return lobbyPlayers[parseInt(cb.dataset.index, 10)];
        });
        executeBattle(selected);
    }

    function startBattleRoyale() {
        if (lobbyPlayers.length < 2) return alert('ロビーに2人以上のプレイヤーが必要です。');
        executeBattle(lobbyPlayers.slice());
    }

    async function executeBattle(participants) {
        var apiKey = document.getElementById('api-key').value;
        if (!apiKey) return alert('APIキーが設定されていません。');

        var names = participants.map(function (p) { return p.character.name; });

        // ゲストに能力公開
        broadcastAbilitiesReveal(participants);

        document.getElementById('host-status').innerText = 'AIがバトルを生成中... (数秒かかります)';
        broadcastStatus('⚔️ バトル生成中... 参加者: ' + names.join(', '));

        var prompt = buildBattlePrompt(participants);

        try {
            var resultText = await GeminiAPI.generate(apiKey, prompt);
            document.getElementById('host-status').innerText = '完了！結果を送信しました。';
            broadcastResult(resultText, names);
        } catch (error) {
            document.getElementById('host-status').innerText = 'エラーが発生しました。';
            broadcastResult('エラー: ' + error.message, []);
        }
    }

    // ==========================================
    //  プロンプト生成
    // ==========================================

    function buildBattlePrompt(participants) {
        var charList = participants.map(function (p, i) {
            return '【' + (i + 1) + '】' + p.character.name + ' ／ 能力: ' + p.character.ability;
        }).join('\n');

        return [
            'あなたは公平でドラマチックなバトル実況者です。',
            '以下の' + participants.length + '人のキャラクターがバトルロイヤルで戦います。',
            '必ず以下の出力フォーマットに厳密に従ってください。フォーマット外の文章は一切出力しないでください。',
            '',
            '--- 参加キャラクター ---',
            charList,
            '',
            '--- 出力フォーマット (これに厳密に従うこと) ---',
            '',
            '## ⚔️ バトル開始！',
            '',
            '（参加者紹介を1行ずつ。「**名前** — 能力の短い説明」の形式で）',
            '',
            '---',
            '',
            '（ラウンドごとに以下を繰り返す）',
            '## 🔥 ラウンドN',
            '',
            '（そのラウンドの戦闘描写。生存キャラ全員の行動・攻防を最低2〜3文で描写する。キャラ名は必ず **太字** にする。）',
            '（【重要】脱落させる前に必ずそのキャラの戦闘行動と、やられる過程を描写すること。戦闘描写なしでいきなり脱落させるのは禁止。）',
            '',
            '> 💀 **脱落: 〇〇** — （脱落理由を簡潔に）',
            '',
            '（脱落者がいない場合は上記の行を省略）',
            '',
            '---',
            '',
            '全員が脱落して1人になるまで繰り返す。',
            '',
            '最後に以下を必ず出力:',
            '',
            '## 🏆 最終結果',
            '',
            '| 順位 | キャラクター | 備考 |',
            '|------|------------|------|',
            '| 🥇 1位 | 〇〇 | 勝者 |',
            '| 🥈 2位 | 〇〇 | ラウンドNで脱落 |',
            '| 🥉 3位 | 〇〇 | ラウンドNで脱落 |',
            '（以下、脱落が遅い順に全員分記載）',
            '',
            '勝者：〇〇',
            '',
            '--- 注意事項 ---',
            '・能力の強弱は論理的に判定する。チートキャラでも弱点や相性を考慮すること',
            '・「つよい」「かみ」「最強」「無敵」など、具体的な戦闘手段や特徴が不明な能力は「何ができるか分からない」として弱い扱いにする。能力から攻撃・防御・戦術が具体的に想像できるほど有利にする',
            '・各ラウンドは最低3文の戦闘描写を含めること。脱落者がいる場合はその攻防を必ず描写する',
            '・全体で1000文字以内を目標',
            '・脱落表記は必ず「> 💀 **脱落: 〇〇** —」の形式で統一',
            '・キャラ名は文中で必ず **太字** にすること',
            '・最終結果の表は必ず | で始まり | で終わる正しいMarkdownテーブル形式にすること',
        ].join('\n');
    }

    // ==========================================
    //  公開インターフェース
    // ==========================================

    return {
        init: init,
        refreshCharacterList: refreshCharacterList,
        createCharacter: createCharacter,
        addRandomNPC: addRandomNPC,
        removeAllNPCs: removeAllNPCs,
        startSelectedBattle: startSelectedBattle,
        startBattleRoyale: startBattleRoyale,
    };
})();

// --- HTML onclick から呼び出すグローバル関数 ---
function createCharacterHost() { Host.createCharacter(); }
function addRandomNPC() { Host.addRandomNPC(); }
function removeAllNPCs() { Host.removeAllNPCs(); }
function startSelectedBattle() { Host.startSelectedBattle(); }
function startBattleRoyale() { Host.startBattleRoyale(); }
