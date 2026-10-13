import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sql from 'mssql';
import catalog from '../domain/catalog.json' with {type:'json'};
import {connect} from '../server/sqlserver';
import {setDatabase} from '../server/context';
import {settings} from '../server/config';
import {validateAuthBackup} from '../server/local-auth';
import {balanced} from '../domain/posting';
const file=process.argv[2],apply=process.argv.includes('--apply');if(!file)throw Error('Usage: npm run import:sites -- backup.json [--apply]');
const parsed=JSON.parse(await readFile(file,'utf8'));if(parsed.complete===false)throw Error('Partial source exports cannot be imported');
const {integrity,...core}=parsed;const hash=createHash('sha256').update(JSON.stringify(core)).digest('hex');if(integrity?.hash!==hash)throw Error('Backup integrity check failed');if(![1,2].includes(parsed.schemaVersion))throw Error('Unsupported source schema');
const data=structuredClone(parsed.entityData);const tables=Object.keys(catalog).filter(t=>!['global_counters','mutation_locks'].includes(t));if(Object.keys(data).sort().join()!==tables.slice().sort().join())throw Error('Entity set mismatch');
if(parsed.schemaVersion===1)for(const b of data.asset_books??[])for(const key of ['legacy_tail_start','legacy_rule_start','legacy_intangible'])b[key]??=null;
let total=0;for(const table of tables){if(!Array.isArray(data[table])||data[table].length!==parsed.recordCounts[table])throw Error('Record count mismatch: '+table);const ids=new Set();const meta=(catalog as any)[table];for(const row of data[table]){if(typeof row.id!=='string'||ids.has(row.id))throw Error('Duplicate or missing ID');ids.add(row.id);if(Object.keys(row).sort().join()!==meta.columns.slice().sort().join())throw Error('Column mismatch: '+table);for(const [k,type] of Object.entries(meta.types)){const v=row[k];if(v!==null&&((type==='integer'&&!Number.isSafeInteger(v))||(type==='text'&&typeof v!=='string')))throw Error('Invalid type: '+table+'.'+k);}for(const fk of meta.foreignKeys)if(row[fk.column]&&!data[fk.table].some((r:any)=>r.id===row[fk.column]))throw Error('Invalid reference: '+table+'.'+fk.column);}total+=data[table].length;}
for(const h of data.journal_headers)balanced(data.journal_lines.filter((l:any)=>l.header_id===h.id));for(const r of data.depreciation_results)if(r.opening-r.amount!==r.closing||r.closing<0)throw Error('Depreciation result balance mismatch');
const accounts=parsed.authentication?.accounts??[];if(!accounts.length)throw Error('Source authentication missing. Export the current Sites JSON backup; do not recreate user IDs');validateAuthBackup(accounts,data.users,data.companies,data.departments);
const legacy=accounts.filter((a:any)=>a.password_hash.startsWith('pbkdf2'));const warnings=legacy.length&&!settings().sitesPepper?['Legacy password hashes require SITES_AUTH_PEPPER. Otherwise perform an OS-authorized admin:reset after import. UUIDs will remain unchanged.']:[];
const report={sourceSchema:parsed.schemaVersion,counts:parsed.recordCounts,authenticationAccounts:accounts.length,totals:{cost:data.assets.reduce((n:number,a:any)=>n+a.cost,0),journalHeaders:data.journal_headers.length,assets:data.assets.length},warnings,mode:apply?'apply':'preview'};
await mkdir('reports',{recursive:true});await writeFile('reports/import-preview.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!apply)process.exit(0);
const db=await connect();setDatabase(db);const t=new sql.Transaction(db.pool);await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
try{
 await new sql.Request(t).query("DECLARE @r int;EXEC @r=sp_getapplock @Resource=N'MONJA_FIXED_ASSET_MIGRATION',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000;IF @r<0 THROW 51001,'Migration lock failed',1;");
 for(const table of [...tables,'auth_accounts']){const r=await new sql.Request(t).query('SELECT COUNT(*) n FROM dbo.['+table+']');if(r.recordset[0].n)throw Error('Import requires empty business tables. Do not seed before importing. Non-empty target was preserved.');}
 for(const table of tables)for(const row of data[table]){const keys=Object.keys(row);await db.execute(db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>row[k])),t);}
 for(const a of accounts)await db.execute(db.prepare(`INSERT INTO auth_accounts (${Object.keys(a).join(',')}) VALUES (${Object.keys(a).map(()=>'?').join(',')})`).bind(...Object.values(a)),t);
 await db.execute(db.prepare("INSERT INTO mutation_locks(id,company_id,token,version) VALUES('system',NULL,'import',0)"),t);
 for(const table of tables){const got=await new sql.Request(t).query('SELECT COUNT(*) n FROM dbo.['+table+']');if(got.recordset[0].n!==data[table].length)throw Error('Post-import count mismatch: '+table);}
 await t.commit();console.log('Import committed; all UUIDs and historical records preserved.');
}catch(e){await t.rollback().catch(()=>{});throw e;}finally{await db.pool.close();}
