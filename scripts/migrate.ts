import sql from 'mssql';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {connect} from '../server/sqlserver';
import {settings} from '../server/config';
import {setDatabase} from '../server/context';
const c=settings(),db=await connect();setDatabase(db);
const text=await readFile(new URL('../sql/001-initial.sql',import.meta.url),'utf8');const checksum=createHash('sha256').update(text).digest('hex');
const t=new sql.Transaction(db.pool);await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
try{
 const lock=await new sql.Request(t).query("DECLARE @r int; EXEC @r=sp_getapplock @Resource=N'MONJA_FIXED_ASSET_MIGRATION',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; IF @r<0 THROW 51001,'Migration lock failed',1;");
 const meta=await new sql.Request(t).query("SELECT OBJECT_ID(N'dbo.monja_schema_migrations') AS id");
 if(!meta.recordset[0].id){const existing=await new sql.Request(t).query("SELECT COUNT(*) AS n FROM sys.tables WHERE is_ms_shipped=0");if(existing.recordset[0].n)throw Error('Target DB contains unrecognized tables; no changes made');await new sql.Request(t).query('CREATE TABLE dbo.monja_schema_migrations(version int PRIMARY KEY,checksum nvarchar(64) NOT NULL,applied_at datetimeoffset(3) NOT NULL)');}
 const known=await new sql.Request(t).query('SELECT checksum FROM dbo.monja_schema_migrations WHERE version=1');if(known.recordset.length){if(known.recordset[0].checksum!==checksum)throw Error('Applied migration checksum mismatch; create a new migration');}
 else{await new sql.Request(t).batch(text);await new sql.Request(t).input('checksum',sql.NVarChar(64),checksum).query('INSERT INTO dbo.monja_schema_migrations VALUES(1,@checksum,SYSDATETIMEOFFSET())');}
 await t.commit();console.log('Schema ready:',c.database);
}catch(e){await t.rollback().catch(()=>{});throw e;}
await db.pool.close();
