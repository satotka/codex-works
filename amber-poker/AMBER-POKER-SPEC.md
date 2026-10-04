# AMBER POKER 再実装仕様書

版: 1.0 / 作成日: 2026-10-04 / 言語: 日本語

## 1. この文書の使い方・優先順位

この文書を唯一の入力として、新規フォルダーに動作するゲームを再作成できることを目的とする。既存ソース、過去の会話、外部素材は必要としない。ゲームルールと受入テストを必須とし、内部コードの書き方や細かな画面のピクセル位置は任意とする。同一ソースや完全に同一の画面を復元する文書ではない。

「必須」は実装条件。「補完仕様」は曖昧さをなくすためにこの文書で定めた再実装条件であり、現行版で検証済みとは限らない。「任意」は完了条件に含めない。判断が必要ならゲームルール→状態・会計→操作→見た目の順に守る。追加機能を独断で増やさない。

## 2. 目的・対象・範囲

1980〜90年代のゲームセンターのメダル式ビデオポーカーを想起させる、現代PC用の5枚ドローゲーム。名称はオリジナルの **AMBER POKER**。参考テーマはSIGMA「JOKER'S DOUBLE」だが、実機の完全再現を主張しない。ロゴ、写真、カード画像、フォントファイル、音源などの既存素材をコピーしない。

利用者はPCのブラウザーで1人で遊ぶ。実際の金銭、メダル、換金、購入、賞品、アカウント、ランキング、通信対戦、バックエンド、データベース、分析送信は不要。CREDITは画面内の架空ポイント。起動後すぐ操作できるゲーム画面にする。

## 3. 技術・成果物

新規実装の標準はHTML/CSS/JavaScript、ES Modules、外部依存なし。Node.js 20以上は開発・テスト・ビルド用。既存リポジトリに適切な技術構成がある場合はそれに合わせてよいが、以下の成果物とルールは維持する。

必須成果物:

1. 分離されたゲームロジック、UI、音声のソース。
2. `PLAY.html`: CSSとJavaScriptを全て内蔵する、直接開いて遊べる単体ファイル。ネット接続・サーバー・Node.jsを遊ぶために要求しない。
3. `dist/`: HTTP配信できる静的ファイル群。`index.html` が入口。
4. `start-game.cmd`: Windowsで自身と同じフォルダーのPLAY.htmlを既定ブラウザーで開く。ZIP展開後に使う。Node.js不要。
5. `npm start`: 127.0.0.1:4173で開発版を配信。`npm test`: 自動テスト。`npm run build`: distとPLAY.htmlを再生成。
6. README: 起動、操作、配当、JOKER、DOUBLE、構成、テスト、実機未確認の項目。

本仕様書の生成だけでは公開しない。Sites等への公開は別作業。ゲームは公開の成否に関係なくローカルで動作すること。

## 4. データモデル

通常カード: `{rank: number, suit: 'S'|'H'|'D'|'C', joker: false}`。rankは整数2〜14。11=J、12=Q、13=K、14=A。S=♠、H=♥、D=♦、C=♣。

JOKER: `{rank: 0, suit: null, joker: true}`。実デッキに1枚だけ存在する。

実際の最終手札は5枚の配列。通常カードのrank+suit重複、JOKER2枚以上、カード数不正、スート不正、範囲外rankは入力エラー。入力検証は評価前に行う。手札を評価しても入力配列・カードを書き換えない。

評価結果:

```ts
type HandResult = {
  id: string;              // 第6節の役ID
  name: string;            // 英語の役名
  order: number;           // 強さ順、0が最上位
  multiplier: number;      // JOKER倍増後の適用倍率
  jokerUsed: boolean;      // 最終手札にJOKERがあるか
  substitution?: Card;    // JOKER代替カード。JOKERがある場合のみ
};
```

JOKERがあれば、配当0の役でもjokerUsed=true。substitutionは内部説明・テスト用で、UIに必ず表示する必要はない。

## 5. Deckと配布

通常52枚＋JOKER1枚=53枚。毎回のDEALで新規作成し、Fisher–Yatesでシャッフル。乱数はブラウザーの `crypto.getRandomValues` を使用。テストではrandom関数またはdeckFactoryを注入できるようにする。固定乱数への黙ったフォールバックはしない。

DEALで5枚を山札から取り出す。DRAWでHOLDされていない場所を左から順番に残りの山札から交換する。捨てたカードは戻さない。最大10枚消費。全5枚HOLDでもDRAWは実行でき、その時点で役を確定する。空の山札からdrawするとエラー。

ダブル用のデッキは独立したJOKERなし52枚であり、通常ゲームの残りの山札を使わない。

## 6. 役・倍率・優先順位

上から強い順。One PairとHigh Cardにも評価結果を返すが、配当は0。

|order|id|name|基本倍率|JOKER適用倍率|
|---:|---|---|---:|---:|
|0|naturalRoyal|Natural Royal Flush|500|成立不可|
|1|fiveKind|Five of a Kind|100|200|
|2|straightFlush|Straight Flush|40|80|
|3|fourKind|Four of a Kind|14|28|
|4|fullHouse|Full House|6|12|
|5|flush|Flush|4|8|
|6|straight|Straight|3|6|
|7|threeKind|Three of a Kind|1|2|
|8|twoPair|Two Pair|1|2 ※|
|9|onePair|One Pair|0|0|
|10|highCard|High Card|0|0|

※ 実際のJOKER入りツーペア形はFull Houseに昇格するため、最適評価後のtwoPairは発生しない。

役定義:

- Natural Royal Flush: JOKERなしの同一スート10-J-Q-K-A。
- Five of a Kind: 同rank5枚。実デッキでは4枚＋JOKERのみ成立。
- Straight Flush: 同一スートかつStraight。JOKERで作ったロイヤル形もこの役。
- Four of a Kind: 同rank4枚。
- Full House: 同rank3枚＋別rank2枚。
- Flush: 同一スート5枚。
- Straight: 異なるrank5個が連続。A-2-3-4-5と10-J-Q-K-Aを認める。Q-K-A-2-3等の循環は認めない。
- Three of a Kind: 同rank3枚。
- Two Pair: 異なる2組の同rank2枚。
- One Pair: 同rank2枚1組。
- High Card: 上記いずれでもない。

Straight判定にはrankの重複がないことが必要。FlushとStraightを別々に評価して役の優先順位を誤らない。Three of a KindとTwo Pairは同配当だが、役の強さはThree of a Kindを上とする。

## 7. JokerRule

JOKERを含む手札について、JOKERをrank2〜14×4スートの52候補に置き換えて通常判定し、orderが最小の候補を採用する。その際Natural Royal Flushを成立禁止とする。

代替候補は、他4枚に既に存在する同一rank/suitのカードであっても許す。これはワイルドの解釈であり、実手札の重複とは異なる。この許可がFive of a Kind成立に必要。

採用役の基本倍率を2倍し、評価結果のmultiplierに入れる。配当計算でさらに2倍してはならない。最終手札にJOKERがなければ倍率を倍増しない。配布時にJOKERがあってもDRAWで捨てれば通常倍率。

同じ役の代替候補が複数ある場合、再現性のためS→H→D→C、それぞれrank2→14の探索順で最初の候補を採用してよい。代替カードの選択は配当・ゲーム結果に影響しない。

## 8. BET・会計

起動時CREDIT=1000、BET=1、WIN=0。BETは1〜40、単位1。−／＋は1ずつ変更、MAXは40。残高に合わせた自動BET変更はしない。

DEALが成立した瞬間にCREDITからBETを1回だけ引く。DRAW時に追加控除しない。WIN=BET×HandResult.multiplier。One Pair以下は0。

WINは未確定の獲得額であり、COLLECT前にはCREDITに加算しない。COLLECTでCREDIT+=WIN、WIN=0。同じ賞金を2回加算しない。DOUBLEはWIN全額のみを賭け、CREDITから追加控除しない。

CREDIT<BETならDEAL不可で「BETを減らす」案内。CREDIT=0かつ未確定WINなしならNEW CREDITを表示して1000に戻せる。リロードでは全て初期化する。保存・復元は不要。NEW CREDITは現在のBETとサウンド設定を維持し、手札・役・ダブル結果を消す。

補完仕様: CREDIT・WINは非負の安全整数を維持する。DOUBLEは `WIN <= floor((Number.MAX_SAFE_INTEGER - CREDIT)/2)` の時だけ許可し、上限時はCOLLECTを促す。通常配当の加算でも安全整数を超える極端な残高の場合は次のDEALを拒否し、「上限に達したためリロードで再開」を案内する。上限を黙って切り捨てたり丸めたりしない。この通常ゲームの上限処理は現行版に対する強化条件。

## 9. GameState・状態遷移

状態はready、hold、won、double、lostの5種類。無効な操作は状態や金額を変更しない。

|現在状態|操作・条件|処理|次状態|
|---|---|---|---|
|ready / lost|BET変更|1〜40に変更|同じ|
|ready / lost|DEAL、CREDIT>=BET|控除、新規デッキ、5枚配布、HOLD全解除、WIN/役/ダブル結果消去|hold|
|hold|カード0〜4をクリック|該当HOLDを反転|hold|
|hold|DRAW|未HOLD交換、役評価、WIN計算|WIN>0ならwon、それ以外lost|
|won|COLLECT|WIN加算、WIN=0|ready|
|won|DOUBLE、上限内|HIGH/LOW選択を開始|double|
|double|HIGH / LOW|独立デッキで判定、WIN更新|WIN>0ならwon、それ以外lost|
|ready / lost|NEW CREDIT、CREDIT=0|1000に戻し手札等を消す|ready|

hold以降COLLECT／負け終了まではBET固定。wonではDEAL不可。doubleではCOLLECT、DEAL、BET変更、HOLD不可。DRAWはholdのみで1回。guessはdoubleのみで1回。HOLDの無効インデックスは無視。

状態データ: credit、bet、win、phase、hand[5]、held[5]、deck、result、doubleResult。UIだけに状態を隠さず、GameStateを単体で操作・検証できること。

APIの目安:

```ts
new GameState({deckFactory?, doubleDown?})
setBet(value: number): void   // 有限値だけ受け付け、整数化し1〜40へ制限
deal(): boolean              // 無効時false
toggleHold(index: number): void
draw(): boolean
canDouble: boolean           // getter
startDouble(): boolean
guess(choice: 'high'|'low'): DoubleResult | false
collect(): boolean
reset(): boolean
```

## 10. DoubleDown（差し替え可能な代替ルール）

この方式は本プロジェクトの設計判断であり実機確認済みの方式ではない。

1. wonでDOUBLEを押す。新規52枚デッキ（JOKERなし）をシャッフルし、基準カードを1枚公開。WINを維持したままdoubleへ移る。
2. 公開した基準カードを見てHIGHまたはLOWを選ぶ。次のカードは選択前に見せない。
3. 同じ山札から次のカードを引き、基準カードとrankを比較。A=14で最大、スートは比較しない。
4. HIGHは次のrankが基準より大きい場合、LOWは小さい場合のみ勝ち。
5. 同rankはどちらの選択でも敗北。的中ならWIN×2、外れ・同rankなら0。引き分けなし。
6. 勝利なら再度DOUBLE／COLLECT、敗北なら次のDEAL。

各DOUBLE挑戦で新しいデッキを使い、1回の比較内では基準と次カードは同じ実カードにならない。同rank・別スートは出現する。固定境界8は使わない。通常ポーカーのJOKER倍増をダブル結果に適用しない。

```ts
type DoubleResult = {referenceCard: Card, card: Card, outcome: 'win'|'lose', win: number};
new DoubleDown(deckFactory?)
start(): Card // 基準カードを公開し、山札を保持
play(win: number, choice: 'high'|'low'): DoubleResult
```

playはstart後1回だけ許可し、正の安全整数WIN、合法choiceを検証。倍増が安全整数範囲を超える入力はエラー。GameState側ではCREDITとの合計も事前確認。doubleResultは開始時にreferenceCardとcard:nullを保持。モジュールはDOM・音声に依存しない。

## 11. UI・見た目

主対象はPC横長画面。黒〜濃紺の画面、暗い金属風の外枠、琥珀色のアクセント。タイトルAMBER POKER、補助表示JOKER DOUBLE / 53 CARD VIDEO POKER。SIGMAロゴは使用しない。

画面は上から、タイトル／サウンド切替、配当表、状態メッセージ、横並び5枚カード、CREDIT/BET/WIN、操作ボタン。説明用ランディングページを挟まない。

配当表は役名・通常倍率・JOKER倍率の3列。当たった役の行を琥珀色で強調。Natural RoyalのJOKER欄は「—」。Five of a Kindの通常欄100は基本倍率であり通常デッキで成立しないことをREADMEに説明。

カードは明るい白〜生成り、角にrankとスート。2〜10の中央にはrankと同じ個数のスート記号を一般的なトランプの対称配置で並べる（角の記号は個数に含めない）。下半分の記号は180度回転する。Aだけ中央に大きな記号1個。J/Q/Kは中央に大きな英字とスートを表示し、数字札・Aと明確に区別する。♥♦は赤、♠♣は濃紺。JOKERは文字JOKER／WILD CARDとオリジナルの単純な星記号。絵札画像は不要。カード裏はCSSの幾何学模様。HOLDは文字と金色枠で明示し、色だけに依存しない。

推奨レイアウト値: 本体最大幅1160px、カード間隔14px、PCのカード高さ約220px、カード縦横比約1.39。見た目の近似に使い、固定寸法で可読性を犠牲にしない。狭い画面では隙間・文字を調整し、操作ボタンを2列化する。主要なカード情報と操作が切れないこと。

|操作|有効条件|
|---|---|
|− / ＋ / MAX|ready/lost、BET境界では該当ボタン無効|
|DEAL|ready/lostかつ残高十分|
|DRAW（DEALと同じボタン）|hold|
|カードHOLD/RELEASE|hold|
|DOUBLE|wonかつ安全整数上限内|
|COLLECT|won|
|HIGH / LOW|doubleのみ表示・有効|
|NEW CREDIT|ready/lostかつCREDIT=0のみ表示|
|SOUND ON/OFF|全状態|

doubleでは左から2番目に基準カードを公開、4番目に次のカードを裏表示し、各ラベルを表示。他3枚は裏表示。判定後は基準と次の2枚を公開し、勝敗メッセージとWINを表示する。

補完仕様: ダブルの公開カードと勝敗メッセージは、サウンド切替や無関係な再描画で通常手札へ戻さず、次のDOUBLE、COLLECT、DEALまで保持する。現行版の一時DOM上書き方式をそのまま再現せず、doubleResultを使って描画する。

メッセージ例: ready「BETを決めて DEAL」、hold「残したいカードをHOLD → DRAW」、won「役名／JOKER ×2／COLLECT または DOUBLE」、lost「NO WIN」、double「HIGH / LOWを選択」。同rankの場合は「同じ数字・敗北」と明示する。

## 12. 操作・アクセシビリティ

マウスで全操作可能。SPACEはDEAL/DRAW、数字1〜5（数字列・テンキー）は左から対応HOLD／RELEASE。ボタンにフォーカスが残っていてもショートカットを優先。SPACEと数字キーの既定動作を抑止して二重発火を防ぎ、キーリピートは操作しない。Ctrl/Alt/Meta同時入力、IME変換中、入力欄・編集可能領域ではショートカットを発動しない。

カードはbuttonとしてTab移動・Enter操作可能。SPACEは常にDEAL/DRAWに割り当て、HOLDには数字キーまたはEnterを使う。aria-labelにrank・スート・HOLD操作、aria-pressedにHOLD状態。サウンド切替にもaria-pressed。メッセージはrole=status／aria-live=polite。キーボードフォーカス枠を表示。無効ボタンはdisabled。CREDIT等は読める文字で表示し、桁区切りを付ける。

## 13. Sound

追加のキーボード割当: D=DOUBLE、A=COLLECT、W=HIGH、S=LOW。D/Aはwonで有効な該当ボタンに従い、W/Sはdoubleでのみ有効。大小文字不問。各ボタンにキーを表示し、キーリピート・修飾キー・IME変換・入力領域の除外はSPACE等と同じ。

Web Audio APIで作る電子音のみ。初期ON、音声コンテキストは最初のユーザー操作時に生成・resume。API非対応、ミュート、再生拒否がゲーム処理を妨げない。

|イベント|周波数列 Hz|
|---|---|
|BET|400|
|DEAL / DOUBLE開始|260,390,520|
|HOLD/RELEASE|660|
|DRAW|330,440|
|WIN|523,659,784,1047|
|DOUBLE勝利|659,784,1047,1319|
|DOUBLE敗北|220,165,110|
|同rank敗北|220,165,110|
|COLLECT / NEW CREDIT|784,659,523|

現行の音色を再現するなら矩形波、各音開始間隔0.095秒、音長0.09秒、ゲイン0.035から0.001へ0.085秒で減衰。正確な音色は任意だが、外部音源を使わずON/OFFを備えること。無効操作では音を鳴らさない。

## 14. モジュール・依存関係

```text
Card → Deck
PayTable + JokerRule + Card → HandEvaluator
Deck → DoubleDown
Deck + HandEvaluator + DoubleDown → GameState
GameState + PayTable + Sound → UI
```

Card、Deck、PayTable、JokerRule、HandEvaluator、DoubleDown、GameStateはwindow/documentを参照しない。UIで役・配当・残高を独自計算しない。

```text
package.json
index.html / style.css
src/card.js / deck.js / pay-table.js / joker-rule.js
src/hand-evaluator.js / double-down.js / game-state.js
src/ui.js / sound.js
scripts/build.mjs / server.mjs
test/game.test.js / ui.test.js / standalone.test.js
PLAY.html / start-game.cmd / README.md
dist/（生成物）
```

重要API: `card(rank,suit)`、`joker()`、`validateHand(hand)`、`new Deck({includeJoker=true,random?})`、`deck.draw()`、`evaluateHand(hand)`、`payout(bet,result)`。payoutのbetは整数1〜40以外ならエラー。

## 15. ビルド・起動の実装条件

distにはindex.html、style.css、必要なsrcファイルをコピー。単体版は依存順にモジュールを結合し、CSSとスクリプトをHTMLへ埋め込む。単体版に外部JS/CSS、import、ファイル取得fetch、CDN依存を残さない。単純な文字列置換を使う場合は、変更後にも結合結果を実行するテストを必須とする。正式なバンドラーへの置換は可。

開発サーバーはローカルアドレスに限定。拡張子ごとに適切なContent-Type、不存在は404、公開フォルダー外のパスは拒否。既にポート使用中なら説明を出し、ゲームを削除しない。PLAY.htmlはこの問題と独立して遊べる。

## 16. HandEvaluator必須テストベクトル

表記: rank数字＋S/H/D/C。X=JOKER。期待倍率はJOKER倍増済み。各行でid、multiplier、jokerUsedを照合。さらにBET7の配当が期待倍率×7になること。手札順序を変えても同じ役と倍率になること。

|手札|期待id|期待倍率|
|---|---|---:|
|10S 11S 12S 13S 14S|naturalRoyal|500|
|5H 6H 7H 8H 9H|straightFlush|40|
|7S 7H 7D 7C 2S|fourKind|14|
|7S 7H 7D 2C 2S|fullHouse|6|
|2H 5H 7H 11H 13H|flush|4|
|2S 3H 4D 5C 6S|straight|3|
|14S 2H 3D 4C 5S|straight|3|
|10S 11H 12D 13C 14S|straight|3|
|7S 7H 7D 2C 4S|threeKind|1|
|7S 7H 2D 2C 4S|twoPair|1|
|7S 7H 2D 3C 4S|onePair|0|
|2S 4H 7D 9C 13S|highCard|0|
|7S 7H 7D 7C X|fiveKind|200|
|10S 11S 12S 13S X|straightFlush|80|
|14S 2S 3S 4S X|straightFlush|80|
|5S 6S 8S 9S X|straightFlush|80|
|7S 7H 7D 2C X|fourKind|28|
|7S 7H 2D 2C X|fullHouse|12|
|2H 5H 9H 13H X|flush|8|
|2S 3H 4D 5C X|straight|6|
|14S 2H 3D 4C X|straight|6|
|10S 11H 13D 14C X|straight|6|
|7S 7H 2D 4C X|threeKind|2|
|2S 5H 9D 13C X|onePair|0|
|12S 13H 14D 2C 3S|highCard|0|
|2S 2H 3D 4C 5S|onePair|0|
|14S 14H 2D 3C X|threeKind|2|
|2S 2H 3S 3H X|fullHouse|12|

追加境界テスト: 全4スートのNatural Royal、JOKERが各配列位置にある場合、Aの循環不可、評価前後で入力不変、重複通常カード、不正rank/suit、手札4枚/6枚、JOKER2枚、BET0/41/小数の拒否。JOKERなしFive of a Kindを重複実カードで作るテストは無効入力として拒否する。

## 17. GameState・DoubleDown・UI受入条件

固定デッキを注入してランダムな成否に依存しないテストにする。

|ID|手順・期待結果|
|---|---|
|G01|CREDIT1000/BET40→DEALで960。hold中に再DEALしても追加控除しない|
|G02|ロイヤル5枚を全HOLD→DRAWでWIN20000、CREDIT960。COLLECTで20960、WIN0。再COLLECTで不変|
|G03|10SをHOLD、残り4枚交換。固定山札2C/3C/4C/5Cを使い、10Sがそのまま残る|
|G04|HOLD0枚なら全交換、5枚なら全保持。2回目のDRAWは無効|
|G05|BET変更はready/lostだけ。上限40、下限1、NaN/Infinityは無視|
|G06|CREDIT20/BET40のDEALは無効、手札・WIN・残高が変わらない|
|G07|JOKERを捨てた最終手札に倍増なし。HOLDしたJOKERを使う最終役は倍増|
|D01|基準rank2〜14×次rank2〜14×HIGH/LOW全338通りを判定。同rankは敗北|
|D02|WIN25で勝利50、敗北・同rank0。start前・二重playはエラー|
|D03|各回基準8、WIN500→HIGHでA→1000、次にLOWで2→2000、次にHIGHで8→0。CREDITは変わらない|
|D04|double中COLLECT・DEAL不可。guess連打で二重精算されない|
|D05|負WIN、0、非整数、不正choice、安全整数上限を検証。canDoubleがfalseの時DOUBLE開始不可|
|U01|DEAL→カードHOLD/解除→DRAW→COLLECTまたは負け→次DEALまで全ボタンで操作|
|U02|当たりからDOUBLE→HIGH/LOW→勝利／敗北／同rank敗北→再挑戦またはCOLLECT|
|U03|キーボードのSPACE、1〜5、フォーカス中Enter/Spaceが二重発火しない|
|U04|サウンド切替で状態・金額・ダブル公開結果が変化しない|
|U05|CREDIT0でNEW CREDIT→1000、BET維持、手札消去。賞金がある間は表示しない|
|B01|PLAY.htmlをfile://から開き、サーバーを停止したまま全ゲーム進行が動く|
|B02|distをHTTP配信し全JS/CSSが200、コンソールに実行エラーなし|
|B03|PC 1366×768、狭幅390px、文字拡大200%で必須情報・操作に到達でき、重なり・横切れなし|
|B04|音声ON/OFF、初回操作、音声API非対応でも進行可能|

軽量DOM代替のテストはUI接続の確認であり、ブラウザー表示や音声の実確認の代用とは扱わない。

## 18. 再実装の手順・完了条件

1. 既存ファイルと作業指示を確認し、既存データを保持した専用フォルダーを用意。
2. Card、PayTable、Deckを作成。
3. 通常HandEvaluator、JokerRule、配当を作成し、第16節のテストを通す。
4. DoubleDown、GameStateと会計・状態遷移テストを作成。
5. UIとSoundを接続。画面から直接ゲームを始められるようにする。
6. server、build、PLAY.html、Windows起動ファイルを作成。
7. build→testを実行。単体版も実行検証し、見つかった問題を修正。
8. 第17節のブラウザー操作・表示を確認。環境制限がある場合は未確認項目と具体的理由を記録し、成功したと報告しない。
9. READMEと成果物一覧を完成。任意機能やホスティング失敗を理由にゲームを未完成にしない。

完了条件は必須ルール実装、全自動テスト成功、ビルド成功、単体版生成、操作可能なゲーム進行、README完成。ブラウザー確認が不能なら実装・自動検証の完了と実ブラウザー未確認を分けて報告する。単なる設計案・コード例では完了しない。

## 19. 仕様の根拠・現状・未確認事項

ユーザー指定: 53枚、5枚ドロー1回、配当表、JOKER倍増、BET1〜40、初期1000、HOLD、DOUBLE/COLLECT、ロジック分離、効果音、テスト。

本プロジェクトの選択: 基準カード比較HIGH/LOW、同rank敗北、ダブルごとの新規52枚、オリジナル名称・画面・電子音、キーボード操作、NEW CREDIT、状態保存なし、サーバー不要の単体版。実機のダブル方式・上限・演出は一次資料で確認していない。仕様書に含めたからといって実機仕様の裏付けにはならない。

現行実装では37件の自動テスト、ビルド、ローカルHTTP応答の成功記録がある。実ブラウザーの表示・音声確認は環境のlocalhostブロックにより未完了。Sitesは登録のみでデプロイ未完了。この文書は公開成功や実ブラウザー動作保証を主張しない。

再実装用の補完条件は、通常ゲームの安全整数上限、ダブル結果の描画保持、詳細なブラウザー受入テスト。この文書の規定に従って実装し、現行版の未確認挙動や一時DOM描画の癖をバグ互換として再現しない。

別途資料が得られた場合は本書の版を更新し、特にDoubleDownルールを変更する。未確認の実機仕様を推測で既存ルールに上書きしない。

## 20. 任意の将来改善

実機資料に基づくダブル方式差し替え、カード配布アニメーション、ローカルゲーム履歴、HOLD戦略解析。現版の必須範囲に含めない。


## 入力方式（2026-10-04更新）

マウス／タッチだけで全操作可能。カードをクリック／タップしてHOLDを反転し、表示中のボタンを押して進行する。タッチ操作にはホバーやキーボードを要求しない。スマホでは操作ボタンを2列にし、各操作ボタンは最低44pxのタッチ領域を用意する。

テンキーのみ: 1〜5=HOLD/RELEASE、0またはテンキーEnter=DEAL/DRAW、6=DOUBLE、4=COLLECT、8=HIGH、2=LOW（通常ゲームの2・4はHOLD）、+=BET増、−=BET減、＊=MAX、／=サウンド、．=NEW CREDIT（残高0のとき）。Num Lock OFFでもKeyboardEvent.codeのNumpad識別を使う。長押し、修飾キー併用、IME変換中、入力欄操作中はゲーム操作しない。

テンキーなし: 数字列0〜9で同じ操作。Space=DEAL/DRAW、D=DOUBLE、A=COLLECT、W=HIGH、S=LOWも使用可能。BET増は+または=、減は−。MAXは*（通常Shift+8）、サウンドは/、再開は.。Shiftは記号入力のため許可する。

操作一覧を画面内に表示する。状態により無効なボタンのキーボード操作も無効。テンキーEnterはフォーカスボタンの標準Enter処理ではなくDEAL/DRAWに割り当てる。


互換操作としてC=COLLECT、H=HIGH、L=LOWも維持する。主表示はW/S/A/D。


BET変更可能なready/lostではW=BET＋1、S=BET−1。doubleではW=HIGH、S=LOW。hold/wonではW/SによるBET変更は不可。DはDOUBLE専用とし、MAX BETは画面ボタンまたは*。長押しリピートは無効。


最新の操作優先規定: DキーとSpaceは同じ主操作。ready/lostではDEAL、holdではDRAW、wonではDOUBLE、doubleでは無効（H/L選択はW/Sまたは8/2）。0・テンキーEnterは従来どおりDEAL/DRAW、6はDOUBLE。DをMAXへは割り当てない。以前のD専用・Space専用記述より本規定を優先する。

