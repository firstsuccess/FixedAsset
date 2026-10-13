# SQL Server設定

対象はMicrosoft SQL Serverの専用 `[fixed-asset]` です。`accounting` の変更は禁止です。

- SQL Server Configuration ManagerでTCP/IPを有効にします。既定例は1433ですが、実サーバーの固定ポートをDB_PORTに設定してください。サービス再起動が必要な場合、既存accountingの利用時間を考慮して運用者が実施します。このソースの導入ツールはサービス再起動を実行しません。
- SQL認証を使う場合は対象サーバーでSQLログインを用意します。.envのDB_USERはsaにも別ログインにも対応します。アプリ運用には専用DBの必要権限のみのログインを推奨します。スキーマ作成は別の管理者資格情報で実行できます。
- DB名にはハイフンがあるためSSMSの識別子は `[fixed-asset]` とします。
- DB_ENCRYPT=true / DB_TRUST_SERVER_CERTIFICATE=false が初期設定です。SQL Server証明書が自己署名で信頼されていない場合は、運用者が証明書をWindowsに信頼登録するか、開発環境でのみDB_TRUST_SERVER_CERTIFICATE=trueを明示してください。IISのWeb用証明書とSQL Serverの接続証明書は別のものです。
- 名前付きインスタンスを使う場合、DB_PORTを空欄にしてDB_INSTANCEを指定します。固定ポートを使う場合はDB_INSTANCEを空欄にします。
- スキーママイグレーションはsp_getapplockで排他し、履歴とSHA-256を記録します。未認識テーブルがあるDBへ初回スキーマを重ねません。適用済SQLの改変は拒否します。
- 金額はdecimal(19,0)、日本語はnvarchar、時刻はdatetimeoffset(3)、業務日はdate。不変IDはnvarchar(64)で元UUID/旧キーを保持します。アプリは正確な整数円の範囲を検証し、DomainはBigInt有理数演算を再利用します。
- 複数ステートメントはSERIALIZABLEトランザクションで処理します。月次確定・復元・権限変更等にCAS世代チェックを併用します。
- JSON復元はアプリ管理者の再認証＋確認が必要です。SQL Serverネイティブ .bak はDBA向けの運用バックアップで、JSONバックアップとは別です。`sql/native-backup.sql` は手動例です。
- ネイティブ復元はSQL Server運用者がオフラインで実施します。FILELISTONLY、復元対象DB、論理ファイル名・物理ファイル配置を事前確認してください。accountingへRESTOREやWITH REPLACEを実行しないでください。
