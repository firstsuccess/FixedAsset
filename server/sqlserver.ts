import sql from 'mssql';
import schema from '../sql/source-schema.json' with {type:'json'};
import {settings} from './config';
const identifiers=new Set(Object.entries(schema.tables).flatMap(([name,t])=>[name,...Object.keys(t.columns)]));
export function compileQuery(input:string,values:any[]){
 // Only application-owned SQL passes this boundary. Quote known schema identifiers and replace placeholders outside string literals.
 let text=input,limit=text.match(/\s+LIMIT\s+(\d+)\s*$/i);if(limit){text=text.slice(0,limit.index);text=text.replace(/^\s*SELECT\s+/i,`SELECT TOP (${Number(limit[1])}) `);}
 if(/\b(?:ON\s+CONFLICT|RETURNING|PRAGMA|DROP\s+DATABASE|USE\s+accounting)\b/i.test(text))throw Error('Unsupported SQL dialect; use a dedicated SQL Server repository operation');
 let index=0;const output=text.replace(/'(?:''|[^'])*'|\?|\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,part=>part.startsWith("'")?"N"+part:part==='?'?'@p'+index++:identifiers.has(part)?'['+part+']':part);
 if(index!==values.length)throw Error('SQL parameter count mismatch');return {text:output,values};
}
export class Prepared{
 constructor(public owner:SqlServerDatabase,public query:string,public values:any[]=[]){ }
 bind(...values:any[]){return new Prepared(this.owner,this.query,values);}
 async all(){return this.owner.execute(this);}
 async first<T=any>(){return (await this.all()).results[0] as T|undefined;}
 async run(){return this.all();}
}
export class SqlServerDatabase{
 constructor(public pool:sql.ConnectionPool){ }
 prepare(query:string){return new Prepared(this,query);}
 async execute(p:Prepared,transaction?:sql.Transaction){const q=compileQuery(p.query,p.values);const request=transaction?new sql.Request(transaction):this.pool.request();
 q.values.forEach((v,i)=>{if(v===undefined)v=null;if(typeof v==='number'){if(!Number.isSafeInteger(v))throw Error('Unsafe numeric parameter');request.input('p'+i,sql.Decimal(19,0),v);}else if(typeof v==='bigint'){request.input('p'+i,sql.Decimal(19,0),v.toString());}else request.input('p'+i,sql.NVarChar(sql.MAX),v===null?null:String(v));});
 const r=await request.query(q.text);const records=(r.recordset??[]).map(row=>{const out={...row};for(const [key,v] of Object.entries(out)){if(v instanceof Date){const type=(r.recordset as any)?.columns?.[key]?.type;out[key]=type===sql.Date?v.toISOString().slice(0,10):v.toISOString();}else if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('Database amount exceeds exact integer range');}return out;});return {results:records,meta:{changes:r.rowsAffected.reduce((n,x)=>n+x,0)}};
 }
 async batch(statements:Prepared[]){const t=new sql.Transaction(this.pool);await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);try{const results=[];for(const p of statements)results.push(await this.execute(p,t));await t.commit();return results;}catch(e){await t.rollback().catch(()=>{});throw e;}}
 async consumeRate(ipHash:string,bucket:number){const t=new sql.Transaction(this.pool);await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);try{let r=await new sql.Request(t).input('ip',sql.NVarChar(64),ipHash).input('bucket',sql.Int,bucket).query('UPDATE dbo.auth_rate_limits WITH (UPDLOCK,HOLDLOCK) SET [count]=CASE WHEN bucket=@bucket THEN [count]+1 ELSE 1 END,bucket=@bucket WHERE ip_hash=@ip; IF @@ROWCOUNT=0 INSERT INTO dbo.auth_rate_limits(ip_hash,bucket,[count]) VALUES(@ip,@bucket,1); SELECT [count] FROM dbo.auth_rate_limits WHERE ip_hash=@ip;');await t.commit();return r.recordset[0].count;}catch(e){await t.rollback().catch(()=>{});throw e;}}
 async incrementCounter(key:string){const t=new sql.Transaction(this.pool);await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);try{const r=await new sql.Request(t).input('key',sql.NVarChar(64),key).query('UPDATE dbo.global_counters WITH (UPDLOCK,HOLDLOCK) SET value=value+1 WHERE [key]=@key; IF @@ROWCOUNT=0 INSERT INTO dbo.global_counters([key],value) VALUES(@key,1); SELECT value FROM dbo.global_counters WHERE [key]=@key;');await t.commit();return r.recordset[0].value;}catch(e){await t.rollback().catch(()=>{});throw e;}}
}
let singleton:SqlServerDatabase|undefined;
export async function connect(){if(singleton)return singleton;const c=settings();const pool=await new sql.ConnectionPool(c.db).connect();const current=await pool.request().query('SELECT DB_NAME() AS name');if(current.recordset[0].name.toLowerCase()!==c.database.toLowerCase()||current.recordset[0].name.toLowerCase()==='accounting'){await pool.close();throw Error('Wrong database; connection refused');}return singleton=new SqlServerDatabase(pool);}
