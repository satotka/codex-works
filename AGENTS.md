# AMBER POKER cloud handoff

This is a migration of the existing working game, not a request to rebuild it.
Use the current source as the behavior baseline. Read AMBER-POKER-SPEC.md and README.md; later input-rule updates override earlier descriptions.

Run `npm run build` before `npm test`: the standalone test reads generated PLAY.html.
There are no third-party dependencies. Use Node.js 20 or newer.
Generate both dist/ and PLAY.html after source changes. The game must remain usable offline by opening PLAY.html directly.

Current controls:
- 1–5: HOLD during hold phase.
- D/Space: DEAL when ready/lost, DRAW when holding, DOUBLE when won. Inactive during double choice.
- W/S: BET +1/-1 when ready/lost, HIGH/LOW during double.
- A: COLLECT when won.
- Numpad 0/Enter: DEAL/DRAW; 6: DOUBLE; 4: COLLECT; 8: HIGH; 2: LOW. HOLD takes priority for 1–5 during hold phase.
- Mouse/touch buttons support all actions.

Double: reveal a reference card, choose HIGH/LOW, draw the next card from the same 52-card deck without replacement. A=14. Equal rank loses. Win doubles uncollected WIN, loss sets WIN to zero. Each new double starts a new deck.

.openai/hosting.json belongs to the SAME existing Site. Preserve its project_id for a future expressly requested Sites publish; do not register a duplicate Site. Publishing has not succeeded yet. Do not publish merely to verify this migration.

No real-browser visual/audio verification has been completed. Record actual checks and limitations honestly. Commit completed work to the remote repository so it is not stored only in an ephemeral task workspace.

Monorepo scope: work only inside amber-poker/. Do not change the root dist/ or .openai/ used by another app. Run all build/test commands from amber-poker/.


## 主操作キーの統一（2026-10-04更新）
Space・Enter（通常／テンキー）・D・6（数字列／テンキー）は全て同じ主操作。ready/lostではDEAL、holdではDRAW、wonではDOUBLE、doubleでは無効。0は操作に割り当てない。Enterはフォーカスボタンの通常動作より主操作を優先する。操作説明はBET時・通常ゲーム時（HOLD/交換と当たり後）・ダブル中に分ける。この規定が以前のキー割当より優先する。


## 状態の自動保存（2026-10-04更新）
localStorageのamber-poker.state.v1に、操作ごとにCREDIT・BET・未獲得WIN・手札・HOLD・通常ゲームとダブルの残り山札・進行状態・サウンド設定をまとめて保存する。リロード後は同じ途中状態から再開し、DEALの控除やCOLLECTを二重に実行しない。保存データの形式・カード・残高を検証し、不正なデータは初期状態に戻す。保存が使えない時は画面に表示し、プレイは継続できる。以前の「リロードで初期化」「保存なし」の記述よりこの規定を優先する。サイトデータ削除で保存は消える。端末間同期はなく、複数タブで同時に遊ぶ場合は最後に保存したタブが優先される。PLAY.htmlのfile://保存はブラウザーによって利用できない場合がある。


## ダブル引き分け（2026-10-04更新）
基準カードと次のカードが同rankならHIGH/LOWどちらも引き分け（outcome=draw）。賭けていたWINを倍増せずそのままCREDITへ自動COLLECTし、WIN=0、readyへ戻る。結果カードと引き分け表示は次のDEALまで維持し、リロードでも二重加算しない。従来の同rank敗北規定より優先する。


BET操作更新（2026-10-04）: ready/lostでは8（テンキー／数字列）=BET＋1、2=BET−1。W/Sと同じ。holdでは2=HOLD、doubleでは8=HIGH・2=LOWを維持する。


## 初回UX改善（2026-10-04）
主ボタンを同じ場所でDEAL→DRAW→DOUBLEに切り替える。手動COLLECT後は手札・HOLD・前回の役・ダブル表示をクリアし、カードは5枚の裏面へ戻す。獲得額は保存してリロード後も表示する。引き分けの自動COLLECTでは結果の2枚を次のDEALまで維持する。メッセージは結果・比較/補足・次の操作の3段に整理し、引き分けにはDRAW表記を使わない。以前の表示規定より優先する。
