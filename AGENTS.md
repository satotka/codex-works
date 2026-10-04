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


## 保存保護と操作安定化（2026-10-04）
Web Locks対応ブラウザーでは同時プレイを1タブに限定し、停止タブには最新状態を読み込むボタンを表示。非対応環境では保存内容の変更を各操作前に照合して古い状態の上書きを停止する。DRAW直後の650msは主操作を無効にして意図しないDOUBLEを防ぐ。HOLDは既存カードDOMのクラスと属性のみ更新してフォーカスを維持。ダブル選択欄は非表示時にも高さを確保。復元失敗データはlocalStorageに日時付きで退避して通知し、退避不能なら元データを上書きせず操作停止する。以前の複数タブ・初期化規定より優先する。


## 表示領域への対応（2026-10-04）
カード直下にCREDIT/BET/WINと操作領域をまとめる。ダブル中は通常の操作領域をHIGH/LOWへ入れ替え、カードと金額の間に空欄を設けない。幅760px以下または高さ760px以下では配当表を初期折りたたみ、操作説明も初期折りたたみ。PCカード高は表示領域の高さに合わせて調整し、モバイル操作は44px以上を維持。極端に狭い/低い画面や文字拡大ではスクロールを許容する。ブラウザーによる各解像度の目視確認は未実施。


## PC/スマホモードと簡潔な表示（2026-10-04）
幅760pxを境にPC（左側に配当パネル）とスマホ（配当を初期折りたたみ）を自動切替。ボタンは操作名のみ、キー説明は遊び方へ移動。ガイドON/OFFをlocalStorageに保存し、OFFでは状態・金額・結果と必要なエラーだけ表示する。主操作ショートカットはDと6（数字列/テンキー）のみ。Space/Enterは主操作に使わない。フォーカス中の主ボタンの標準Space/Enter操作も抑止する。カード幅:高さは18:25で固定、画面に合わせサイズだけを変更。この規定は以前のキー・表示規定より優先する。


## 期待配当による自動HOLD（2026-10-04）
初回DEALのHOLDは、許可した候補について未知の48枚から交換する全組み合わせの平均配当を計算し最大の候補を採用。実際の山札順は参照せず、配られた5枚は交換候補から除外する。JOKERは必ず保持。2枚以上交換する場合、JOKER以外は実カードのペア/セットだけを保持候補とし、スート/連番の単独カードは残さない。ストレート/フラッシュ狙いは4枚保持（1枚交換）または5枚保持（交換なし）だけ。配当計算にはすべての交換結果を含める。手動解除/変更は可能。以前の役を構成するカードによるHOLDより優先する。


## BET操作更新（2026-10-04）
BETは−10・−5・BET数・＋5・＋10・All inの1行。固定上限40を撤廃し、BETは1以上でCREDITまで。All inはCREDIT全額。W/8/＋は＋5、S/2/−は−5、＊はAll in。ゲーム中は変更操作を隠す。配当と保存は40超のBETに対応。JavaScript安全整数を超える可能性のある極端なBETのDEALは拒否し、金額を丸めない。この規定が旧BET上限/プリセット規定より優先。
