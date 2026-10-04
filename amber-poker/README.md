# AMBER POKER

1980〜90年代のメダルゲーム風の、オリジナル5枚ドロービデオポーカー。SIGMA「JOKER'S DOUBLE」を参考テーマにしていますが、実機の画像・ロゴ・カード・フォント・音源は使用していません。換金・購入・オンライン機能はありません。

## 起動方法

**最も簡単な起動:** `PLAY.html` をブラウザーで開いてください。Windowsでは `start-game.cmd` をダブルクリックしても同じ単体版が開きます。全CSS・JavaScriptを内蔵しており、Node.jsやサーバーは不要です。ZIPは先に展開してください。開発用の `index.html` は以下のHTTPサーバーで使用します。

Node.js 20以上をインストールし、このフォルダーで以下を実行します。依存パッケージのインストールは不要です。

```sh
npm start
```

ブラウザーで http://127.0.0.1:4173 を開いてください。終了はターミナルで Ctrl+C。開発用 `index.html` はES Modulesを使うためHTTPサーバーが必要です。単体版 `PLAY.html` は直接開けます。

## 操作

初期CREDITは1000。BETは1〜40、単位1。−／＋／MAXで選び、DEAL時にBETを差し引きます。各カードをクリックしてHOLDを切り替え、DRAWでHOLDしていないカードだけ1回交換します。最初に配ったカードは山札に戻しません。カードはゲームごとに53枚をFisher–Yatesでシャッフルし、ブラウザーの暗号乱数を利用します。

当たりはWINに表示され、COLLECTで初めてCREDITに加算されます。DOUBLEで獲得前のWIN全額を賭けられます。負けたら次のDEALへ進みます。CREDIT不足ならBETを下げてください。CREDITが0ならNEW CREDITで1000に戻せます。リロードでも初期化され、保存はしません。

SPACEはDEAL／DRAW、1〜5（数字列・テンキー）は左から対応カードのHOLD／RELEASE。ボタンにフォーカスが残っていても利用できます。長押しの連続操作は無効です。Enterはフォーカスしたボタンを操作します。SOUND ON/OFFでWeb Audio生成の電子音を切り替えます。

## 役と配当

追加キーボード操作: D=DOUBLE、A=COLLECT、ダブル中はW=HIGH／S=LOW。大小文字を問わず、該当操作が有効な状態だけ反応します。長押し、修飾キー併用、IME変換中の操作は無効です。

|役|通常倍率|JOKER使用倍率|
|---|---:|---:|
|Natural Royal Flush|500|成立しない|
|Five of a Kind|100（通常52枚では成立しない）|200|
|Straight Flush|40|80|
|Four of a Kind|14|28|
|Full House|6|12|
|Flush|4|8|
|Straight|3|6|
|Three of a Kind|1|2|
|Two Pair|1|2（最適化時はFull House以上に昇格）|
|One Pair / High Card|0|0|

WIN = BET × 表の適用倍率。Natural Royal FlushはJOKERなしの同一スート10-J-Q-K-Aのみ。AはA-2-3-4-5と10-J-Q-K-Aの両方で使用できますが、Q-K-A-2-3等の循環は認めません。

## JOKERルール

53枚中1枚のJOKERをワイルド扱いとし、52種類の代替カードを評価して上表で最も高い役を選びます。代替カードの重複を許可することでFive of a Kindも成立します。JOKER入りのロイヤル形はStraight Flush（80倍）です。JOKERを含む最終手札の有効な役は通常配当の2倍。One Pair以下は0です。初回配布にJOKERがあっても交換で捨てた場合は倍増しません。

## DOUBLE DOWNルール

DOUBLEを選ぶとJOKERなしの新規52枚デッキから基準カードを1枚公開します。そのカードを見てH=HIGHまたはL=LOWを選ぶと、同じ山札から次のカードを引いて数字を比較します。

- HIGH: 次の数字が基準より高いと勝利。
- LOW: 次の数字が基準より低いと勝利。
- 同じ数字は敗北。8の特別扱いや引き分けはありません。
- Aは最大、スートは比較しません。勝利はWIN×2、敗北はWIN=0。CREDITから追加控除しません。
- 勝利後は再度DOUBLEまたはCOLLECT。再挑戦ごとに新規デッキと基準カードを使います。
- 同じ比較内でカードを山札に戻しません。基準と次カードが同rank・別スートになることはあります。

DoubleDown.start()で基準カードを返し、play(win,choice)で {referenceCard,card,outcome,win} を返します。playはstart後1回だけ許可します。

比較方式と同rank敗北はユーザー指定の更新ルールです。シグマのハイローダブルを記述した実機所有者資料と整合しますが、対象機種の全仕様の再現ではありません。JOKER除外、独立デッキ、ボーナスなし等は本プロジェクトの選択です。
## 確認できた仕様と推測・変更した仕様

**この実装の確定仕様**はユーザー提供の要件（53枚、5枚ドロー、配当表、JOKER倍増、BET1〜40、初期1000）です。実機資料や一次資料による仕様確認はしていないため、これらを「実機で確認済み」とは扱いません。

**未確認・推測／オリジナル変更**は基準カード比較HIGH／LOW方式、ダブルごとの独立デッキ、キーボード操作、クレジット再開、画面配置、AMBER POKERという名称、電子音です。実機のダブル方式、引き分け処理、上限、配当差異、乱数特性、音・演出は未確認です。外部素材はコピーせず、カードは文字・スート記号・CSSで作成し、標準システムフォントを使用しています。

## 構成

```text
index.html / style.css   画面と筐体デザイン
PLAY.html               全素材内蔵の単体版（ビルドで生成）
src/card.js             Card、入力検証
src/deck.js             Deck、シャッフル
src/pay-table.js        PayTable
src/hand-evaluator.js   HandEvaluator、配当計算（UI非依存）
src/joker-rule.js       JokerRule（UI非依存）
src/double-down.js      DoubleDown（差し替え可能）
src/game-state.js       GameState、状態遷移・会計
src/ui.js               DOM表示・入力
src/sound.js            オリジナル電子音
scripts/                ローカルサーバー・静的ビルド
test/game.test.js       役・境界・デッキ・ゲーム進行のテスト
```

## テスト・ビルド

```sh
npm test
npm run build
```

Node.js標準のテストランナーを使用。全役、JOKER主要役、Aの上下端、飛び越し不可、重複カード、誤入力、JOKER倍増、HOLD交換、交換1回、COLLECT二重加算禁止、ダブル勝敗／同rank敗北／再挑戦、残高不足を検証します。JOKER入りTwo Pairは最良役選択によりFull Houseへ上がるので、独立した最終Two Pairにはなりません。Five of a KindはJOKERなしの実デッキで成立しません。

ビルドは外部依存なしで静的ファイルを `dist/` にコピーします。配信する際はHTTPサーバーの公開フォルダーを `dist/` に設定してください。

## 今後の改善

実機の信頼できる資料が得られた場合のダブルルール差し替え、カード配布アニメーション、ゲーム履歴、HOLD戦略解析。これらは現版には含めていません。

## 今回の検証結果

37件の自動テストが全件成功。静的ビルドと単体版生成が成功し、ローカルHTTP配信を確認しました。UIテストは軽量なDOM代替を使用した操作接続の検証です。単体版HTMLに内蔵したスクリプトも実行してDEAL／HOLD／DRAW／次ゲームの進行を検証しています。この作業環境の内蔵ブラウザーではlocalhost接続が `ERR_BLOCKED_BY_CLIENT` となったため、実ブラウザーでの表示、音声再生、レスポンシブ表示の目視確認は未実施です。


## 入力方式（2026-10-04更新）

マウス／タッチだけで全操作可能。カードをクリック／タップしてHOLDを反転し、表示中のボタンを押して進行する。タッチ操作にはホバーやキーボードを要求しない。スマホでは操作ボタンを2列にし、各操作ボタンは最低44pxのタッチ領域を用意する。

テンキーのみ: 1〜5=HOLD/RELEASE、0またはテンキーEnter=DEAL/DRAW、6=DOUBLE、4=COLLECT、8=HIGH、2=LOW（通常ゲームの2・4はHOLD）、+=BET増、−=BET減、＊=MAX、／=サウンド、．=NEW CREDIT（残高0のとき）。Num Lock OFFでもKeyboardEvent.codeのNumpad識別を使う。長押し、修飾キー併用、IME変換中、入力欄操作中はゲーム操作しない。

テンキーなし: 数字列0〜9で同じ操作。Space=DEAL/DRAW、D=DOUBLE、A=COLLECT、W=HIGH、S=LOWも使用可能。BET増は+または=、減は−。MAXは*（通常Shift+8）、サウンドは/、再開は.。Shiftは記号入力のため許可する。

操作一覧を画面内に表示する。状態により無効なボタンのキーボード操作も無効。テンキーEnterはフォーカスボタンの標準Enter処理ではなくDEAL/DRAWに割り当てる。


互換操作としてC=COLLECT、H=HIGH、L=LOWも維持する。主表示はW/S/A/D。


BET変更可能なready/lostではW=BET＋1、S=BET−1。doubleではW=HIGH、S=LOW。hold/wonではW/SによるBET変更は不可。DはDOUBLE専用とし、MAX BETは画面ボタンまたは*。長押しリピートは無効。


最新の操作優先規定: DキーとSpaceは同じ主操作。ready/lostではDEAL、holdではDRAW、wonではDOUBLE、doubleでは無効（H/L選択はW/Sまたは8/2）。0・テンキーEnterは従来どおりDEAL/DRAW、6はDOUBLE。DをMAXへは割り当てない。以前のD専用・Space専用記述より本規定を優先する。

