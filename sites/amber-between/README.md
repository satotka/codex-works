# AMBER BETWEEN

AMBERシリーズの独立したカードゲーム。作業場所は `sites/amber-between/`、ChatGPT Sitesも専用Siteとして管理する。

Notionの指定配当とDEAL→3枚で即判定、LEFT/RIGHTのダブルダウンを実装。ルールと未記載部分の解釈は [SPEC.md](SPEC.md) を参照。

依存パッケージ不要。Node.js 20以上で `npm run check && npm run build && npm test`。`dist/` がSites向け静的ソース、`PLAY.html` はCSS/JSを埋め込んだオフライン版（直接開けます）。ブラウザーの保存設定によってfile://の保存は使えないことがあります。

Sitesは専用の `.openai/hosting.json` のSite IDを維持してください。codex-worksのルートや他アプリのhosting設定を変更しないでください。Sitesへの同期はこのフォルダーだけを専用Gitへ送る構成です。検証結果・公開版情報は親の `sites/README.md` を参照。
