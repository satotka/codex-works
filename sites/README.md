# 公開版ソース

2026-10-11（日本時間）にSitesの最新保存版と公開成功したデプロイを確認し、専用Gitの該当コミットから取得しました。各アプリの追跡ファイルは元ソースとバイト単位で一致します。元コミットと履歴は `site-source/<app>` ブランチにも保持しています。

| アプリ | 最新版の作業場所 | Sites版 | 元コミット | 公開URL |
| --- | --- | --- | --- | --- |
| PLAY LAB | `play-lab/` | v1 | `6261b5c4cab8a6febc10dfa2b54d69c344ccf535` | https://play-lab-takaa-1004.satotka.chatgpt.site |
| AMBER POKER | `amber-poker/` | v42 | `61863a733012bc7257dd666543a26675ede6605f` | https://amber-poker.satotka.chatgpt.site |
| AMBER DERBY | `amber-derby/` | v1 | `451e4501b00c814e6a00daf2a7ba70ee02e57f65` | https://amber-derby.satotka.chatgpt.site |
| AMBER BETWEEN | `amber-between/` | v9 | `76eb2b0a8817670356a5db2ef88ada8284fa63ec` | https://amber-between.satotka.chatgpt.site |

`SOURCE-MANIFEST.json` にSite ID、元ツリーSHA、全45ファイルのGit blob SHAを記録しています。各アプリの `.openai/hosting.json` は元のSite IDを保持しています。GitHubへの保存はSitesへの自動公開を設定するものではありません。この保存作業ではSitesのソース変更・再公開・アクセス権変更を行っていません。

## メンテナンス

各アプリのフォルダを作業ルートにしてください。既存のルート `dist/`、`.openai/`、旧 `amber-poker/` は今回変更していません。POKERの同梱README/AGENTSは過去の更新履歴も含む元ソースそのままです。そこにある旧monorepoパスは、この配置では `sites/amber-poker/` と読み替えてください。

- PLAY LAB: ビルド不要の静的アプリ。`dist/` をHTTPサーバーで配信します。`node --check dist/app.js` で構文確認できます。
- AMBER POKER: Node.js 20以上。`npm run build` の後に `npm test`。生成された `dist/` を配信するか `PLAY.html` を直接開きます。`dist/` は元ソースでもGit管理対象外で、ビルドで再生成します。
- AMBER DERBY: ビルド不要。`npm test` でエンジン・UIを確認し、`dist/` を配信します。
- AMBER BETWEEN: ビルド不要の `dist/` を配信。`npm run check && npm run build && npm test` で構文・オフライン版生成・エンジン/UIを確認。`PLAY.html` を直接開いてオフラインでも遊べます。

今回の確認結果: PLAY LABのJavaScript構文確認成功、POKERのビルド成功・7テストファイル成功、DERBYの2テストファイル成功。3アプリの全追跡ファイルの内容・モードを照合しました。実ブラウザーでの表示・音声確認は実施していません。

元コミットは `git switch --detach <元コミット>` で調査できます。その場合は単独アプリがリポジトリ直下に配置されるため、継続作業は通常の `main` の `sites/<app>/` で行ってください。

2026-10-11更新: AMBER POKER v36を公開。MIN=BET 0、MAX=全額BET設定とし、全額設定後の−1／−10／MIN操作を可能にしました。ビルド・7テストファイル成功。POKERのマニフェストをv36に更新しました。元ソースブランチはv35保存時点の履歴です（v36の元コミットはSites専用Gitに保存）。実ブラウザー確認は未実施です。

2026-10-11更新: AMBER POKER v37でBETボタン上の＋／−／＊キー割り当て表示を削除。遊び方の説明とキー操作は維持。ビルド・7テストファイル成功。

2026-10-12更新: AMBER BETWEEN v1を新規作成し、独立したSitesへ所有者限定でデプロイ成功。Notion「Amber Betweenの作成」の10種類の配当とDEAL→DRAW→5枚から1枚選択、LEFT/RIGHTのダブルダウン（同値は自動配り直し）を実装。未記載部分の解釈・調査記録は `amber-between/SPEC.md`。構文確認、オフライン版生成、エンジン/UIの2テストファイルが成功。実ブラウザーでの表示・音声確認は未実施。専用Sites Gitと同じ12ファイルを `sites/amber-between/` に保存し、元履歴を `site-source/amber-between` に保持。従来の3アプリのSitesは変更していません。

AMBER BETWEENのGitHub保存ではGH007（非公開メール保護）への対応として、`site-source/amber-between` を元ソースと同一ツリー・匿名メールのコミットで保存しています。元の公開コミットはSites専用Gitに保持し、GitHub側のコミットはマニフェストの `github_source_commit` に記録しています。

2026-10-12更新: AMBER BETWEEN v2でBET下限を1枚に変更。1〜10枚でDEAL可能、残り1〜2枚でも続行でき、無料補充は総残高0枚の時のみ。保存検証・遊び方・オフライン版も更新。構文確認・ビルド・エンジン/UIの2テストファイル成功、独立Sitesへのデプロイ成功。

2026-10-12更新: AMBER BETWEEN v3でCOLLECTを左、DOUBLEを右に変更し、A/D・4/6キーと画面の位置を統一。オフライン版を再生成、既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v4でボタン内にCOLLECT A/4・DOUBLE D/6を表示。構文確認・オフライン版生成・既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v5でPAIR W/O SPREADをユーザー指定に変更。SPREAD 0で選択カードが端とペアになると×1（6/7なら6または7）。基準2枚がペアでも異なる数字を選んだらNO WIN。スリーカードを優先。POSSIBLE HAND・遊び方・仕様書・オフライン版も更新。構文確認と既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v6でCOLLECT・DOUBLEのボタン内キー説明を改行し、操作名の下にA/4・D/6を表示。構文確認・オフライン版生成・既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v7でDRAWボタン内も改行し、操作名の下にD/6を表示。構文確認・オフライン版生成・既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v8で中間DRAW操作を省略。DEALで基準2枚と裏向き5枚を配り、そのまま1枚選択へ進む。旧DEAL直後の保存状態も山札・残高を維持して選択へ移行。遊び方・仕様書・オフライン版も更新。構文確認・既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12更新: AMBER BETWEEN v9でCOLLECT=S/2、DOUBLE=W/8、ダブル中LEFT=A/4・RIGHT=D/6へ変更。ボタン内キー表示と遊び方を更新。通常/テンキー・選択中の数字キー優先を自動検証。構文確認・オフライン版生成・既存2テストファイル成功、Sitesデプロイ成功。

2026-10-12同期: AMBER POKERのSites v38〜v42がGitHub未反映だったため、5版を個別コミットで保存。High/Low勝利カードのBASE引継ぎ、COLLECTの左配置、カード移動アニメーション、状態/結果/ガイドの配置、HOLDカード位置を反映。最新v42の全追跡ファイル・モードは専用Sites Gitと一致。ビルド・8テストファイル成功。Sitesの再公開は行っていません。
