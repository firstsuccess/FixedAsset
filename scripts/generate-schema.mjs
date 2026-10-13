import {readFileSync,writeFileSync} from 'node:fs';
const snapshot=JSON.parse(readFileSync('sql/source-schema.json','utf8'));
const q=v=>'['+v.replaceAll(']',']]')+']';
const money=new Set(['cost','tax','ancillary','residual','accumulated','impairment','revised_basis','amount','opening','closing','proceeds','book_value','gain_loss','debit','credit','value']);
const dateNames=new Set(['acquisition_date','service_date','as_of','valid_from','valid_to','legacy_tail_start','legacy_rule_start']);
const timestampNames=new Set(['created_at','updated_at','last_login','confirmed_at','cancelled_at','archived_at','login_id_updated_at','expires_at','locked_until']);
const eventTables=new Set(['audit_logs','backup_history','import_jobs','journal_export_history']);
function type(table,c){if(c.type==='integer')return money.has(c.name)?'decimal(19,0)':'int';if(c.name==='date')return eventTables.has(table)?'datetimeoffset(3)':'date';if(dateNames.has(c.name))return c.name.startsWith('legacy_')?'nvarchar(7)':'date';if(timestampNames.has(c.name))return 'datetimeoffset(3)';if(c.name.endsWith('_json')||['notes','description','reason','legal_basis','password_hash'].includes(c.name))return 'nvarchar(max)';if(c.name==='normalized_login_id')return 'nvarchar(64) COLLATE Latin1_General_100_BIN2';if(c.name==='month')return 'nvarchar(7)';if(c.name==='id'||c.name.endsWith('_id')||['actor','created_by','updated_by','approved_by','confirmed_by','cancelled_by','token_hash','ip_hash','login_id_updated_by','identity_id'].includes(c.name))return 'nvarchar(64) COLLATE Latin1_General_100_BIN2';if(c.name==='login_id')return 'nvarchar(64) COLLATE Latin1_General_100_BIN2';if(['email','source_url','name','display_name','detail','purpose','structure','supplier','manufacturer','model','serial','manager'].includes(c.name))return 'nvarchar(400)';return 'nvarchar(100)';}
let out="-- MONJA FIXED ASSET SYSTEM; run only in the dedicated database.\nSET XACT_ABORT ON;\nIF LOWER(DB_NAME())=N'accounting' THROW 51000, 'accounting database is forbidden', 1;\n";
for(const [name,t] of Object.entries(snapshot.tables)){
 const cols=Object.values(t.columns).map(c=>q(c.name)+' '+type(name,c)+(c.notNull?' NOT NULL':' NULL')+(c.default!==undefined?' DEFAULT '+c.default:'')+(c.primaryKey?' PRIMARY KEY':''));if(name==='auth_sessions')cols.push('[last_seen_at] datetimeoffset(3) NOT NULL DEFAULT SYSDATETIMEOFFSET()');
 out+='CREATE TABLE dbo.'+q(name)+' (\n '+cols.join(',\n ')+ '\n);\n';
}
for(const [name,t] of Object.entries(snapshot.tables))for(const fk of Object.values(t.foreignKeys))out+='ALTER TABLE dbo.'+q(name)+' ADD CONSTRAINT '+q(fk.name)+' FOREIGN KEY ('+fk.columnsFrom.map(q).join(',')+') REFERENCES dbo.'+q(fk.tableTo)+' ('+fk.columnsTo.map(q).join(',')+');\n';
for(const [name,t] of Object.entries(snapshot.tables))for(const index of Object.values(t.indexes)){
 const where=index.name==='auth_single_lockout_exempt'?' WHERE exempt_from_account_lockout=1':'';
 out+='CREATE '+(index.isUnique?'UNIQUE ':'')+'INDEX '+q(index.name)+' ON dbo.'+q(name)+' ('+index.columns.map(q).join(',')+')'+where+';\n';
}
// Logical authentication references are backed by native FK constraints in the Windows schema.
for(const table of ['auth_accounts','auth_sessions','auth_reset_tokens'])out+='ALTER TABLE dbo.'+q(table)+' ADD CONSTRAINT '+q(table+'_user_fk')+' FOREIGN KEY(user_id) REFERENCES dbo.users(id);\n';
out+='ALTER TABLE dbo.auth_accounts ADD CONSTRAINT auth_exempt_boolean CHECK(exempt_from_account_lockout IN (0,1));\nALTER TABLE dbo.auth_accounts ADD CONSTRAINT auth_must_change_boolean CHECK(must_change_password IN (0,1));\n';
out+='CREATE INDEX auth_sessions_user ON dbo.auth_sessions(user_id);\n';

const accountTrigger="CREATE TRIGGER dbo.auth_exempt_guard ON dbo.auth_accounts AFTER INSERT,UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN dbo.users u ON u.id=i.user_id WHERE i.exempt_from_account_lockout=1 AND (u.id IS NULL OR u.active<>1 OR u.role<>N'System Administrator')) THROW 51002,'Invalid lockout exception administrator',1; END";
const userTrigger="CREATE TRIGGER dbo.auth_exempt_user_guard ON dbo.users AFTER UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.auth_accounts a ON a.user_id=i.id WHERE a.exempt_from_account_lockout=1 AND (i.active<>1 OR i.role<>N'System Administrator')) THROW 51003,'Transfer exemption before disabling administrator',1; END";
for(const trigger of [accountTrigger,userTrigger])out+="EXEC(N'"+trigger.replaceAll("'","''")+"');\n";
writeFileSync('sql/001-initial.sql',out);
