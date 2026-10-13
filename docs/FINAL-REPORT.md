# 納品・検証報告（2026-10-13）

1. 移行元: 既存Site公開Version7、ソース93ea59e79367bebf67b10ac9d5b33377931bb949。Sourceの所有関係/URL/DBは保持。Site再公開なし。
2. 実装済み範囲: STATUS.mdの移植・追加範囲。元Siteの正常なDomain/React/Applicationを再利用。
3. Windows移植: React/Vite、Express、mssql/Tedious、SQL Server schema45表＋履歴、Argon2id、Cookie/アイドルセッション、移行/復元/復旧CLI。
4. 未移植/未完成: 一括/少額の自動処理、高度異動、負ののれん/申告調整、全帳票、償却資産税等。STATUS.mdに列挙。
5. Node.js: サポート対象としてNode.js24系LTS、engines >=24 <25。Node標準APIを使用しWindows PowerShell/npmで操作。
6. SQL Server: fixed-asset専用。Unicode/decimal/date/datetimeoffset/FK/index/filtered unique index/transaction/CAS/schema履歴を実装。
7. .env.sample: HOST/PORT/DB全設定/POOL/TLS/セッション/将来IIS設定を作成。実パスワード・pepperなし。.envはgitignore。
8. 管理者: 新規seedでのみadmin1/password、初回変更・localhost制限。移行は元UUID/ハッシュを維持。再seedでパスワードを上書きしない。
9. 認証検証: 隔離DBでArgon2id・初回変更・旧セッション拒否・ロック例外/IP制限・ID変更/UUID/ハッシュ維持・例外移管・コードリセット・復元を検証。
10. 計算検証: 既存の国税庁公式例照合、月次配賦、端数、残存簿価、旧制度、処分/仕訳のDomainテスト18件をそのまま再利用。
11. データ移行: 完全Sites JSONのhash/Schema/count/type/reference/借貸を検証して空の専用DBへ適用するCLI。ネイティブ読取の長い監査ログは省略されるため、完全ログの代わりとして採用していない。実移行は未実施。
12. IIS: ARR/URL Rewrite・自己署名証明書・HTTPS終端・Cookie・信頼プロキシの手順とテンプレート。ルート方式のPORT生成スクリプトあり。実設定/パス配置は未検証。
13. テスト: 25件成功。TypeScript検査・Vite/Nodeビルド成功。HTTP API起動/health/Cookie/CSRF/未認証拒否を隔離メモリDBで検証。SQL Server実機テスト1件は接続先未提供でスキップ。Windows実機・ブラウザ・IISは未実施。
14. 出力: ソース・lockfile・設定例・SQL・CLI・テスト・導入資料・ビルド成果物をZIP。node_modules/.env/実データ/秘密鍵は除外。
15. 起動: WINDOWS.md / README.md。新規はmigrate→seed、移行はmigrate→import（seedなし）→build→start。
16. 会計帳簿影響: 既存accounting/3000/元Siteを変更・停止する操作を実行していない。DB_NAME=accountingを起動/CLIで拒否。
17. 次回: 隔離SQL Server実機確認、完全バックアップを取得して実データ移行、Windows/ブラウザ操作確認、元Site未完成業務の継続。

「全機能の完成」「SQL Server実機で正常稼働」「実データ移行済み」「IIS公開済み」とは判定していません。
