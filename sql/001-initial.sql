-- MONJA FIXED ASSET SYSTEM; run only in the dedicated database.
SET XACT_ABORT ON;
IF LOWER(DB_NAME())=N'accounting' THROW 51000, 'accounting database is forbidden', 1;
CREATE TABLE dbo.[account_codes] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[accounting_periods] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [start_date] nvarchar(100) NULL,
 [end_date] nvarchar(100) NULL,
 [status] nvarchar(100) NULL
);
CREATE TABLE dbo.[asset_books] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [kind] nvarchar(100) NULL,
 [method] nvarchar(100) NULL,
 [rate] nvarchar(100) NULL,
 [guarantee] nvarchar(100) NULL,
 [revised_rate] nvarchar(100) NULL,
 [account] nvarchar(100) NULL,
 [expense_account] nvarchar(100) NULL,
 [accumulated_account] nvarchar(100) NULL,
 [rounding] nvarchar(100) NULL,
 [start_month] nvarchar(100) NULL,
 [legacy_tail_start] nvarchar(7) NULL,
 [legacy_rule_start] nvarchar(7) NULL,
 [legacy_intangible] int NULL,
 [cost] decimal(19,0) NULL,
 [life] int NULL,
 [residual] decimal(19,0) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[asset_capital_expenditures] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [child_asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [reason] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[asset_categories] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [default_method] nvarchar(100) NULL,
 [account_code] nvarchar(100) NULL,
 [depreciable] int NULL,
 [intangible] int NULL
);
CREATE TABLE dbo.[asset_disposals] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [type] nvarchar(100) NULL,
 [reason] nvarchar(max) NULL,
 [proceeds] decimal(19,0) NULL,
 [book_value] decimal(19,0) NULL,
 [gain_loss] decimal(19,0) NULL
);
CREATE TABLE dbo.[asset_impairments] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_book_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [reason] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[asset_locations] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[asset_movements] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [type] nvarchar(100) NULL,
 [date] date NULL,
 [reason] nvarchar(max) NULL,
 [before_json] nvarchar(max) NULL,
 [after_json] nvarchar(max) NULL,
 [created_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [approved_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [created_at] datetimeoffset(3) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[asset_opening_balances] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_book_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [as_of] date NULL,
 [accumulated] decimal(19,0) NULL,
 [impairment] decimal(19,0) NULL,
 [balance] int NULL,
 [revised_basis] decimal(19,0) NULL
);
CREATE TABLE dbo.[assets] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [number] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [category] nvarchar(100) NULL,
 [acquisition_date] date NULL,
 [service_date] date NULL,
 [status] nvarchar(100) NULL,
 [notes] nvarchar(max) NULL,
 [supplier] nvarchar(400) NULL,
 [manufacturer] nvarchar(400) NULL,
 [model] nvarchar(400) NULL,
 [serial] nvarchar(400) NULL,
 [manager] nvarchar(400) NULL,
 [created_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [created_at] datetimeoffset(3) NULL,
 [updated_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [updated_at] datetimeoffset(3) NULL,
 [department_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [location_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [cost] decimal(19,0) NULL,
 [tax] decimal(19,0) NULL,
 [ancillary] decimal(19,0) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[audit_logs] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [operation] nvarchar(100) NULL,
 [actor] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] datetimeoffset(3) NULL,
 [before_json] nvarchar(max) NULL,
 [after_json] nvarchar(max) NULL,
 [reason] nvarchar(max) NULL,
 [result] nvarchar(100) NULL
);
CREATE TABLE dbo.[auth_accounts] (
 [user_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [login_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
 [normalized_login_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
 [password_hash] nvarchar(max) NOT NULL,
 [exempt_from_account_lockout] int NOT NULL DEFAULT 0,
 [failed_login_count] int NOT NULL DEFAULT 0,
 [locked_until] datetimeoffset(3) NULL,
 [session_version] int NOT NULL DEFAULT 1,
 [must_change_password] int NOT NULL DEFAULT 1,
 [login_id_updated_at] datetimeoffset(3) NULL,
 [login_id_updated_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [primary_company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [department_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL
);
CREATE TABLE dbo.[auth_rate_limits] (
 [ip_hash] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [bucket] int NOT NULL,
 [count] int NOT NULL
);
CREATE TABLE dbo.[auth_reset_tokens] (
 [token_hash] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [user_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
 [expires_at] datetimeoffset(3) NOT NULL
);
CREATE TABLE dbo.[auth_sessions] (
 [token_hash] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [user_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
 [version] int NOT NULL,
 [created_at] datetimeoffset(3) NOT NULL,
 [expires_at] datetimeoffset(3) NOT NULL,
 [last_seen_at] datetimeoffset(3) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
CREATE TABLE dbo.[backup_history] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] datetimeoffset(3) NULL,
 [actor] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [status] nvarchar(100) NULL,
 [details_json] nvarchar(max) NULL,
 [count] int NULL
);
CREATE TABLE dbo.[companies] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [kind] nvarchar(100) NULL,
 [created_at] datetimeoffset(3) NULL,
 [version] int NULL,
 [fiscal_end_month] int NULL
);
CREATE TABLE dbo.[company_settings] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [effective_from] nvarchar(100) NULL,
 [settings_json] nvarchar(max) NULL,
 [created_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [created_at] datetimeoffset(3) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[global_counters] (
 [key] nvarchar(100) NOT NULL PRIMARY KEY,
 [value] decimal(19,0) NOT NULL DEFAULT 0
);
CREATE TABLE dbo.[departments] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[depreciation_methods] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [valid_from] date NULL,
 [valid_to] date NULL,
 [source_url] nvarchar(400) NULL,
 [enabled] int NULL
);
CREATE TABLE dbo.[depreciation_period_closings] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [run_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [month] nvarchar(7) NULL,
 [status] nvarchar(100) NULL,
 [confirmed_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [confirmed_at] datetimeoffset(3) NULL,
 [cancelled_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [cancelled_at] datetimeoffset(3) NULL,
 [reason] nvarchar(max) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[depreciation_rate_master] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [method] nvarchar(100) NULL,
 [rate] nvarchar(100) NULL,
 [guarantee] nvarchar(100) NULL,
 [revised_rate] nvarchar(100) NULL,
 [valid_from] date NULL,
 [valid_to] date NULL,
 [source_url] nvarchar(400) NULL,
 [master_version] nvarchar(100) NULL,
 [life] int NULL
);
CREATE TABLE dbo.[depreciation_results] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [run_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_book_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [month] nvarchar(7) NULL,
 [status] nvarchar(100) NULL,
 [snapshot_json] nvarchar(max) NULL,
 [opening] decimal(19,0) NULL,
 [amount] decimal(19,0) NULL,
 [accumulated] decimal(19,0) NULL,
 [closing] decimal(19,0) NULL,
 [annual_amount] int NULL,
 [revised_basis] decimal(19,0) NULL
);
CREATE TABLE dbo.[depreciation_runs] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [month] nvarchar(7) NULL,
 [status] nvarchar(100) NULL,
 [created_by] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [created_at] datetimeoffset(3) NULL,
 [snapshot_json] nvarchar(max) NULL,
 [revision] int NULL
);
CREATE TABLE dbo.[depreciation_schedules] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [asset_book_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [fiscal_start] nvarchar(100) NULL,
 [month] nvarchar(7) NULL,
 [settings_json] nvarchar(max) NULL,
 [annual_amount] int NULL,
 [monthly_amount] int NULL,
 [revised_basis] decimal(19,0) NULL
);
CREATE TABLE dbo.[goodwill_records] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[import_jobs] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] datetimeoffset(3) NULL,
 [actor] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [status] nvarchar(100) NULL,
 [details_json] nvarchar(max) NULL,
 [count] int NULL
);
CREATE TABLE dbo.[journal_export_history] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] datetimeoffset(3) NULL,
 [actor] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [status] nvarchar(100) NULL,
 [details_json] nvarchar(max) NULL,
 [count] int NULL
);
CREATE TABLE dbo.[journal_headers] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [run_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [type] nvarchar(100) NULL,
 [description] nvarchar(max) NULL,
 [status] nvarchar(100) NULL,
 [created_at] datetimeoffset(3) NULL
);
CREATE TABLE dbo.[journal_lines] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [header_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [account] nvarchar(100) NULL,
 [department] nvarchar(100) NULL,
 [debit] decimal(19,0) NULL,
 [credit] decimal(19,0) NULL
);
CREATE TABLE dbo.[legacy_archive] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [table_name] nvarchar(100) NULL,
 [row_json] nvarchar(max) NULL,
 [archived_at] datetimeoffset(3) NULL,
 [reason] nvarchar(max) NULL
);
CREATE TABLE dbo.[lump_sum_depreciation_groups] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[mutation_locks] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [token] nvarchar(100) NULL,
 [version] int NULL
);
CREATE TABLE dbo.[negative_goodwill_records] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[property_tax_records] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[roles] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [name] nvarchar(400) NULL,
 [description] nvarchar(max) NULL
);
CREATE TABLE dbo.[small_asset_treatments] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[system_parameters] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [key] nvarchar(100) NULL,
 [value_json] nvarchar(max) NULL,
 [valid_from] date NULL,
 [valid_to] date NULL,
 [source_url] nvarchar(400) NULL
);
CREATE TABLE dbo.[tax_adjustments] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [asset_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [date] date NULL,
 [treatment] nvarchar(100) NULL,
 [source_url] nvarchar(400) NULL,
 [details_json] nvarchar(max) NULL,
 [amount] decimal(19,0) NULL
);
CREATE TABLE dbo.[useful_life_master] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [category] nvarchar(100) NULL,
 [structure] nvarchar(400) NULL,
 [purpose] nvarchar(400) NULL,
 [detail] nvarchar(400) NULL,
 [valid_from] date NULL,
 [valid_to] date NULL,
 [source_url] nvarchar(400) NULL,
 [legal_basis] nvarchar(max) NULL,
 [master_version] nvarchar(100) NULL,
 [life] int NULL
);
CREATE TABLE dbo.[user_company_permissions] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [user_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [role] nvarchar(100) NULL
);
CREATE TABLE dbo.[users] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [identity_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [email] nvarchar(400) NULL,
 [display_name] nvarchar(400) NULL,
 [role] nvarchar(100) NULL,
 [created_at] datetimeoffset(3) NULL,
 [last_login] datetimeoffset(3) NULL,
 [active] int NULL
);
CREATE TABLE dbo.[vendors] (
 [id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
 [company_id] nvarchar(64) COLLATE Latin1_General_100_BIN2 NULL,
 [code] nvarchar(100) NULL,
 [name] nvarchar(400) NULL,
 [version] int NULL
);
ALTER TABLE dbo.[account_codes] ADD CONSTRAINT [account_codes_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[accounting_periods] ADD CONSTRAINT [accounting_periods_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[asset_books] ADD CONSTRAINT [asset_books_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[asset_capital_expenditures] ADD CONSTRAINT [asset_capital_expenditures_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[asset_capital_expenditures] ADD CONSTRAINT [asset_capital_expenditures_child_asset_id_assets_id_fk] FOREIGN KEY ([child_asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[asset_disposals] ADD CONSTRAINT [asset_disposals_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[asset_impairments] ADD CONSTRAINT [asset_impairments_asset_book_id_asset_books_id_fk] FOREIGN KEY ([asset_book_id]) REFERENCES dbo.[asset_books] ([id]);
ALTER TABLE dbo.[asset_locations] ADD CONSTRAINT [asset_locations_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[asset_movements] ADD CONSTRAINT [asset_movements_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[asset_movements] ADD CONSTRAINT [asset_movements_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[asset_opening_balances] ADD CONSTRAINT [asset_opening_balances_asset_book_id_asset_books_id_fk] FOREIGN KEY ([asset_book_id]) REFERENCES dbo.[asset_books] ([id]);
ALTER TABLE dbo.[assets] ADD CONSTRAINT [assets_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[assets] ADD CONSTRAINT [assets_department_id_departments_id_fk] FOREIGN KEY ([department_id]) REFERENCES dbo.[departments] ([id]);
ALTER TABLE dbo.[assets] ADD CONSTRAINT [assets_location_id_asset_locations_id_fk] FOREIGN KEY ([location_id]) REFERENCES dbo.[asset_locations] ([id]);
ALTER TABLE dbo.[audit_logs] ADD CONSTRAINT [audit_logs_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[backup_history] ADD CONSTRAINT [backup_history_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[company_settings] ADD CONSTRAINT [company_settings_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[departments] ADD CONSTRAINT [departments_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[depreciation_period_closings] ADD CONSTRAINT [depreciation_period_closings_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[depreciation_period_closings] ADD CONSTRAINT [depreciation_period_closings_run_id_depreciation_runs_id_fk] FOREIGN KEY ([run_id]) REFERENCES dbo.[depreciation_runs] ([id]);
ALTER TABLE dbo.[depreciation_results] ADD CONSTRAINT [depreciation_results_run_id_depreciation_runs_id_fk] FOREIGN KEY ([run_id]) REFERENCES dbo.[depreciation_runs] ([id]);
ALTER TABLE dbo.[depreciation_results] ADD CONSTRAINT [depreciation_results_asset_book_id_asset_books_id_fk] FOREIGN KEY ([asset_book_id]) REFERENCES dbo.[asset_books] ([id]);
ALTER TABLE dbo.[depreciation_runs] ADD CONSTRAINT [depreciation_runs_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[depreciation_schedules] ADD CONSTRAINT [depreciation_schedules_asset_book_id_asset_books_id_fk] FOREIGN KEY ([asset_book_id]) REFERENCES dbo.[asset_books] ([id]);
ALTER TABLE dbo.[goodwill_records] ADD CONSTRAINT [goodwill_records_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[goodwill_records] ADD CONSTRAINT [goodwill_records_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[import_jobs] ADD CONSTRAINT [import_jobs_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[journal_export_history] ADD CONSTRAINT [journal_export_history_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[journal_headers] ADD CONSTRAINT [journal_headers_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[journal_headers] ADD CONSTRAINT [journal_headers_run_id_depreciation_runs_id_fk] FOREIGN KEY ([run_id]) REFERENCES dbo.[depreciation_runs] ([id]);
ALTER TABLE dbo.[journal_lines] ADD CONSTRAINT [journal_lines_header_id_journal_headers_id_fk] FOREIGN KEY ([header_id]) REFERENCES dbo.[journal_headers] ([id]);
ALTER TABLE dbo.[journal_lines] ADD CONSTRAINT [journal_lines_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[lump_sum_depreciation_groups] ADD CONSTRAINT [lump_sum_depreciation_groups_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[lump_sum_depreciation_groups] ADD CONSTRAINT [lump_sum_depreciation_groups_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[mutation_locks] ADD CONSTRAINT [mutation_locks_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[negative_goodwill_records] ADD CONSTRAINT [negative_goodwill_records_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[negative_goodwill_records] ADD CONSTRAINT [negative_goodwill_records_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[property_tax_records] ADD CONSTRAINT [property_tax_records_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[property_tax_records] ADD CONSTRAINT [property_tax_records_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[small_asset_treatments] ADD CONSTRAINT [small_asset_treatments_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[small_asset_treatments] ADD CONSTRAINT [small_asset_treatments_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[tax_adjustments] ADD CONSTRAINT [tax_adjustments_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[tax_adjustments] ADD CONSTRAINT [tax_adjustments_asset_id_assets_id_fk] FOREIGN KEY ([asset_id]) REFERENCES dbo.[assets] ([id]);
ALTER TABLE dbo.[user_company_permissions] ADD CONSTRAINT [user_company_permissions_user_id_users_id_fk] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]);
ALTER TABLE dbo.[user_company_permissions] ADD CONSTRAINT [user_company_permissions_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
ALTER TABLE dbo.[vendors] ADD CONSTRAINT [vendors_company_id_companies_id_fk] FOREIGN KEY ([company_id]) REFERENCES dbo.[companies] ([id]);
CREATE UNIQUE INDEX [account_codes_business_key] ON dbo.[account_codes] ([company_id],[code]);
CREATE UNIQUE INDEX [asset_books_business_key] ON dbo.[asset_books] ([asset_id],[kind]);
CREATE UNIQUE INDEX [asset_categories_business_key] ON dbo.[asset_categories] ([code]);
CREATE UNIQUE INDEX [asset_locations_business_key] ON dbo.[asset_locations] ([company_id],[code]);
CREATE UNIQUE INDEX [asset_opening_balances_business_key] ON dbo.[asset_opening_balances] ([asset_book_id]);
CREATE UNIQUE INDEX [assets_business_key] ON dbo.[assets] ([company_id],[number]);
CREATE UNIQUE INDEX [auth_login_unique] ON dbo.[auth_accounts] ([normalized_login_id]);
CREATE UNIQUE INDEX [auth_single_lockout_exempt] ON dbo.[auth_accounts] ([exempt_from_account_lockout]) WHERE exempt_from_account_lockout=1;
CREATE UNIQUE INDEX [companies_business_key] ON dbo.[companies] ([code]);
CREATE UNIQUE INDEX [departments_business_key] ON dbo.[departments] ([company_id],[code]);
CREATE UNIQUE INDEX [depreciation_methods_business_key] ON dbo.[depreciation_methods] ([code]);
CREATE UNIQUE INDEX [depreciation_period_closings_business_key] ON dbo.[depreciation_period_closings] ([company_id],[month]);
CREATE UNIQUE INDEX [depreciation_rate_master_business_key] ON dbo.[depreciation_rate_master] ([method],[life],[valid_from]);
CREATE UNIQUE INDEX [depreciation_results_business_key] ON dbo.[depreciation_results] ([run_id],[asset_book_id]);
CREATE UNIQUE INDEX [journal_headers_business_key] ON dbo.[journal_headers] ([company_id],[run_id],[type]);
CREATE UNIQUE INDEX [mutation_locks_business_key] ON dbo.[mutation_locks] ([company_id]);
CREATE UNIQUE INDEX [roles_business_key] ON dbo.[roles] ([name]);
CREATE UNIQUE INDEX [system_parameters_business_key] ON dbo.[system_parameters] ([key],[valid_from]);
CREATE UNIQUE INDEX [user_company_permissions_business_key] ON dbo.[user_company_permissions] ([user_id],[company_id]);
CREATE UNIQUE INDEX [users_business_key] ON dbo.[users] ([email]);
CREATE UNIQUE INDEX [vendors_business_key] ON dbo.[vendors] ([company_id],[code]);
ALTER TABLE dbo.[auth_accounts] ADD CONSTRAINT [auth_accounts_user_fk] FOREIGN KEY(user_id) REFERENCES dbo.users(id);
ALTER TABLE dbo.[auth_sessions] ADD CONSTRAINT [auth_sessions_user_fk] FOREIGN KEY(user_id) REFERENCES dbo.users(id);
ALTER TABLE dbo.[auth_reset_tokens] ADD CONSTRAINT [auth_reset_tokens_user_fk] FOREIGN KEY(user_id) REFERENCES dbo.users(id);
ALTER TABLE dbo.auth_accounts ADD CONSTRAINT auth_exempt_boolean CHECK(exempt_from_account_lockout IN (0,1));
ALTER TABLE dbo.auth_accounts ADD CONSTRAINT auth_must_change_boolean CHECK(must_change_password IN (0,1));
CREATE INDEX auth_sessions_user ON dbo.auth_sessions(user_id);
EXEC(N'CREATE TRIGGER dbo.auth_exempt_guard ON dbo.auth_accounts AFTER INSERT,UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN dbo.users u ON u.id=i.user_id WHERE i.exempt_from_account_lockout=1 AND (u.id IS NULL OR u.active<>1 OR u.role<>N''System Administrator'')) THROW 51002,''Invalid lockout exception administrator'',1; END');
EXEC(N'CREATE TRIGGER dbo.auth_exempt_user_guard ON dbo.users AFTER UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.auth_accounts a ON a.user_id=i.id WHERE a.exempt_from_account_lockout=1 AND (i.active<>1 OR i.role<>N''System Administrator'')) THROW 51003,''Transfer exemption before disabling administrator'',1; END');
