日本語・English・简体中文

# FixedAsset — もんじゃ固定資産管理


日本の企業向けのオープンソース固定資産管理システムです。資産台帳、会計・税務それぞれの減価償却、のれんの償却、月次処理、仕訳出力を一つのWebアプリで管理します。

高額な年間利用料がかかる固定資産管理システムに対し、オープンソースという選択肢を提供することを目指し、継続的に機能を改善しています。

## 主な機能

- 資産の登録・検索・修正、分類・部門・使用場所の管理。
- 会計簿・税務簿ごとの取得価額、償却方法、耐用年数、勘定科目の設定。
- 定額法、200％・250％定率法、旧制度の標準計算、のれん償却、即時費用化、一括償却資産の3年均等償却。
- 月次償却の計算・確認・確定・取消、残高照会、全部売却・除却・部門移動。
- 取得・償却・処分仕訳、出力履歴、CSV取込のプレビュー・新規登録・更新。
- 会社別設定、マスタ管理、会社別の権限、パスワード認証、監査ログ。

## 技術構成

React / TypeScript / Vite、Node.js / Express、Microsoft SQL Serverを使用しています。Node.jsは24系（`>=24 <25`）が対象です。画面は日本語を中心に一部英語を併記しています。READMEの翻訳は画面全体の多言語対応を意味しません。

## 導入・起動

Windows 11 / Windows Server、Node.js 24系、TCP接続可能なSQL Serverを前提とします。先に本アプリ専用の空のデータベースを用意してください。

```powershell
Copy-Item .env.sample .env
notepad .env
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

`.env`でDB接続先・認証情報・`SESSION_SECRET`を設定します。名前付きインスタンスでは`DB_PORT`、固定ポート接続では`DB_INSTANCE`を空欄にしてください。

既定のアクセス先は`http://localhost:3001/`です。新規初期化後はlocalhostから`admin1` / `password`でログインし、初回にパスワードを変更します。

既存Sitesデータを移行する場合は`db:seed`を実行せず、[移行手順](docs/MIGRATION.md)に従ってください。

## 開発時の確認

```powershell
npm run check
npm test
npm run build
```

## 対応範囲

段階的に開発しています。少額資産特例の自動判定、旧制度の一部条件、一部売却・除却、資本的支出、減損、償却資産税、帳票拡充などは継続開発の対象です。一括償却の適用条件と制限は[一括償却資産](docs/LUMP_SUM.md)を参照してください。

[実装状況](docs/STATUS.md)と[検証報告](docs/FINAL-REPORT.md)は作成時点の記録です。後から追加された機能は個別資料と現在の実装も確認してください。

## 関連資料

- [Windows導入・起動](docs/WINDOWS.md)
- [SQL Server設定](docs/SQLSERVER.md)
- [データ移行](docs/MIGRATION.md)
- [IIS構成](docs/IIS.md)
- [勘定科目の初期設定](docs/ACCOUNT_DEFAULTS.md)
- [会社のアーカイブ](docs/COMPANY_ARCHIVE.md)

## ライセンス

[GNU General Public License v3.0](LICENSE)

---

# FixedAsset — MONJA FIXED ASSET SYSTEM


An open-source fixed asset management system for businesses in Japan. Manage asset registers, separate accounting and tax depreciation, goodwill amortization, monthly processing, and journal exports in one web application.

The project aims to offer an open-source alternative to fixed asset systems with high annual subscription fees and continues to improve its features.

## Features

- Register, search, and update assets; manage categories, departments, and locations.
- Configure acquisition cost, depreciation method, useful life, and account codes separately for accounting and tax books.
- Straight-line and 200% / 250% declining-balance depreciation, standard legacy-rule calculations, goodwill amortization, immediate expensing, and three-year pooled depreciation under Japanese rules.
- Calculate, review, finalize, and reverse monthly depreciation; inspect balances; process full asset sales, disposals, and department transfers.
- Acquisition, depreciation, and disposal journals, export history, and CSV import previews for creating or updating records.
- Company settings, master data, company-specific permissions, password authentication, and audit logs.

## Technology

Built with React, TypeScript, Vite, Node.js, Express, and Microsoft SQL Server. Requires Node.js 24 (`>=24 <25`). The interface is primarily Japanese with some English labels. Translated READMEs do not imply a fully multilingual interface.

## Setup

The documented environment is Windows 11 / Windows Server, Node.js 24, and SQL Server accessible over TCP. Create an empty database dedicated to this application first.

```powershell
Copy-Item .env.sample .env
notepad .env
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Set database connection details, credentials, and `SESSION_SECRET` in `.env`. Leave `DB_PORT` empty for a named instance, or `DB_INSTANCE` empty for a fixed-port connection.

The default address is `http://localhost:3001/`. After initializing a new database, sign in from localhost with `admin1` / `password` and change the password on first login.

To migrate existing Sites data, skip `db:seed` and follow the [migration guide](docs/MIGRATION.md).

## Development checks

```powershell
npm run check
npm test
npm run build
```

## Scope

Development is ongoing. Planned work includes automatic eligibility checks for special small-asset treatment, some legacy-rule conditions, partial sales and disposals, capital improvements, impairment, Japanese depreciable asset tax, and additional reports. See [three-year pooled depreciation](docs/LUMP_SUM.md) for supported conditions and limitations.

[Implementation status](docs/STATUS.md) and the [verification report](docs/FINAL-REPORT.md) reflect the time they were written. For later additions, also consult feature-specific documents and the current implementation.

## Documentation

These guides are in Japanese:

- [Windows installation and startup](docs/WINDOWS.md)
- [SQL Server configuration](docs/SQLSERVER.md)
- [Data migration](docs/MIGRATION.md)
- [IIS configuration](docs/IIS.md)
- [Default account settings](docs/ACCOUNT_DEFAULTS.md)
- [Company archiving](docs/COMPANY_ARCHIVE.md)

## License

[GNU General Public License v3.0](LICENSE)

---

# FixedAsset — MONJA 固定资产管理系统


面向日本企业的开源固定资产管理系统。通过一个 Web 应用，统一管理固定资产台账、会计与税务折旧、商誉摊销、月度处理及会计分录导出。

本项目旨在为收取高额年费的固定资产管理系统提供开源替代方案，并持续改进功能。

## 主要功能

- 登记、搜索和修改资产，管理资产分类、部门及使用地点。
- 为会计账簿与税务账簿分别设置取得成本、折旧方法、使用年限及会计科目。
- 支持直线法、200% 与 250% 定率法、日本旧制度的标准计算、商誉摊销、一次性费用化，以及日本一括折旧资产的三年均等折旧。
- 月度折旧计算、审核、确认及撤销，余额查询，资产全部出售、报废及部门调拨。
- 生成资产取得、折旧及处置分录，记录导出历史，支持 CSV 导入预览、新增及更新。
- 公司设置、基础数据、按公司分配权限、密码认证及审计日志。

## 技术架构

采用 React、TypeScript、Vite、Node.js、Express 和 Microsoft SQL Server。要求使用 Node.js 24 系列（`>=24 <25`）。界面以日语为主，部分内容附有英语标注。README 的翻译不代表整个界面已支持多语言。

## 安装与启动

文档所述环境为 Windows 11 / Windows Server、Node.js 24，以及可通过 TCP 连接的 SQL Server。请先为本应用创建专用的空数据库。

```powershell
Copy-Item .env.sample .env
notepad .env
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

在 `.env` 中配置数据库连接、认证信息和 `SESSION_SECRET`。使用命名实例时，将 `DB_PORT` 留空；使用固定端口时，将 `DB_INSTANCE` 留空。

默认访问地址为 `http://localhost:3001/`。新数据库初始化后，从 localhost 使用 `admin1` / `password` 登录，并在首次登录时修改密码。

如需迁移现有 Sites 数据，请跳过 `db:seed`，按照[数据迁移指南](docs/MIGRATION.md)操作。

## 开发检查

```powershell
npm run check
npm test
npm run build
```

## 支持范围

本项目正在分阶段开发。少额资产税务特例的自动适用判断、部分旧制度条件、资产部分出售与报废、资本性支出、减值、日本折旧资产税及更多报表等仍属于后续开发范围。一括折旧的适用条件和限制请参阅[一括折旧资产](docs/LUMP_SUM.md)。

[实现状态](docs/STATUS.md)与[验证报告](docs/FINAL-REPORT.md)记录了编写时的情况。对于后续新增功能，请同时查阅专项文档和当前实现。

## 相关文档

以下指南以日语编写：

- [Windows 安装与启动](docs/WINDOWS.md)
- [SQL Server 配置](docs/SQLSERVER.md)
- [数据迁移](docs/MIGRATION.md)
- [IIS 配置](docs/IIS.md)
- [默认会计科目设置](docs/ACCOUNT_DEFAULTS.md)
- [公司归档](docs/COMPANY_ARCHIVE.md)

## 许可证

[GNU General Public License v3.0](LICENSE)
