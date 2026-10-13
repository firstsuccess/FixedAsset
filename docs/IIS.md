# 将来のIIS / HTTPS構成

今回IISやWindows証明書ストアは操作していません。Node.jsはHTTP待受、TLS終端はIISです。Node.jsで証明書を読み込んだり443を占有する処理はありません。

推奨する最初の配置は独立ホスト名＋BASE_PATH=/です。

1. IISにURL RewriteとApplication Request Routing（ARR）を用意します。
2. ARRのサーバーレベルのEnable proxyを有効にします。
3. 固定資産専用のサイト/ホストバインドを作成します。既存会計帳簿のIISサイト・ポート3000への転送ルールは変更しません。
4. IIS ManagerのServer Certificatesで自己署名証明書を作成するか、ホスト名に合うSAN付き証明書を運用者が作成・取り込みます。自己署名証明書の信頼登録は接続する各端末で必要です。証明書の名前・有効期限を確認します。
5. 固定資産用ホストへHTTPS/443をバインドします。
6. .envで PUBLIC_BASE_URL=https://assets.example.com、TRUST_PROXY=true、TRUSTED_PROXY_ADDRESSES=loopback、COOKIE_SECURE=true、NODE_ENV=production、HOST=127.0.0.1 とします。Node待受ポートはPORTです。
7. `npm run iis:config` を実行すると、そのPORTを埋め込んだ `iis/web.config` を生成します。テンプレートのHTTP_X_FORWARDED_PROTO/HTTP_X_FORWARDED_HOSTをIISのAllowed Server Variablesに追加し、ARRで元Hostを保持する設定を確認します。
8. Nodeを起動し、ログイン、Cookie、CSRF、リダイレクト、CSVアップロード/ダウンロードをHTTPSで検証します。

web.configは.envを直接読むものではありません。PORT変更時はテンプレートを再生成します。TLS終端後の転送は http://127.0.0.1:PORT です。

任意の接続元が送るX-Forwarded-For/Proto/Hostを無条件に信頼しません。TRUST_PROXYはbooleanで有効化し、信頼先はループバック/明示したアドレスに限定します。IPレート制限にはExpressがこの信頼設定から導いたreq.ipを使います。CSRFのOriginは設定済みPUBLIC_BASE_URLのOriginと照合します。

パス方式 https://example.com/fixed-asset/ は将来対応の設定です。BASE_PATH=/fixed-asset/ としてビルドし直し、API・静的ファイル・Cookie Path・リダイレクトとIISルールを一緒に検証する必要があります。今回の自動生成テンプレートはルート方式だけを受け付け、未検証のパス用ルールを生成しません。

Windowsサービス化・本番公開・証明書の実登録は後日作業です。

参考（公式）:
https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/reverse-proxy-with-url-rewrite-v2-and-application-request-routing
