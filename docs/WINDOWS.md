# Windows導入・起動

Windows 11 / Windows Server、Node.js 24 LTS x64、TCP接続可能なMicrosoft SQL Serverを前提とします。Windows実機での起動確認は未実施です。

ZIPを `C:\monja-fixed-asset` 等の専用フォルダーへ展開し、`package.json` がある階層へ移動してください。会計帳簿のフォルダーへ展開しないでください。

```powershell
cd C:\monja-fixed-asset
Copy-Item .env.sample .env
notepad .env
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

`db:migrate` の前にSSMSで専用DBを用意します。`.env` のDB設定は実サーバーに合わせます。SESSION_SECRET/DB_PASSWORDはサンプル値から変更してください。自己署名SQL接続証明書の扱いはSQLSERVER.mdに記載しています。

**Sites実データを移行する場合はdb:seedを実行せず、スキーマ適用後にimport:sitesのプレビュー/適用を実行します。** 詳細はREADME.md。

新規DB初期設定後は、`http://localhost:3001/` にadmin1 / passwordで入り、本人が新しいパスワードに変更します。以後の起動で初期パスワードへ戻す処理はありません。

PORTは.envで変更可能です。会計帳簿の3000とは別のポートを選びます。変更したPORTとPUBLIC_BASE_URLを一致させてください。プロセスは別であり、既存会計帳簿を停止する手順はありません。

Ctrl+Cで本アプリだけを停止します。Windowsサービス化、IIS設定、自己署名証明書の登録は後日です。

ソースの変更時はnpm run check、npm test、npm run buildで確認します。Argon2のWindows用ネイティブモジュールはnpm ci時にWindows版が選ばれます。配布ZIPにLinuxのnode_modulesを同梱していません。
