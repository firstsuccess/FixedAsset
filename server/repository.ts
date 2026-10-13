import {env} from './context';
import type {SqlServerDatabase} from './sqlserver';
export type Row=Record<string,any>;
export function database(){if(!env.DB)throw Error('共有データベースが接続されていません');return env.DB as SqlServerDatabase;}
export async function all(sql:string,...values:unknown[]):Promise<Row[]>{return (await database().prepare(sql).bind(...values).all()).results as Row[];}
export async function one(sql:string,...values:unknown[]):Promise<Row|undefined>{return (await all(sql,...values))[0];}
export function id(){return crypto.randomUUID();}
export function now(){return new Date().toISOString();}
export function insert(table:string,row:Row,token?:string){const keys=Object.keys(row);return database().prepare(`INSERT INTO ${table} (${keys.join(',')}) SELECT ${keys.map(()=>'?').join(',')}${token?' WHERE EXISTS (SELECT 1 FROM mutation_locks WHERE id=\'system\' AND token=?)':''}`).bind(...keys.map(k=>row[k]??null),...(token?[token]:[]));}
export function statement(sql:string,values:unknown[],token:string){return database().prepare(sql+" AND EXISTS (SELECT 1 FROM mutation_locks WHERE id='system' AND token=?)").bind(...values.map(v=>v??null),token);}
export async function revision(){return (await one("SELECT version FROM mutation_locks WHERE id='system'"))?.version??0;}
export async function commit(expected:number,build:(token:string)=>D1PreparedStatement[]){const token=id();const results=await database().batch([database().prepare("UPDATE mutation_locks SET version=version+1,token=? WHERE id='system' AND version=?").bind(token,expected),...build(token)]);if(!results[0].meta.changes)throw Error('CONFLICT: 別の操作で更新されています。画面を再読込してください');return expected+1;}
export function audit(company:string|null,actor:string,operation:string,before:unknown,after:unknown,reason:string,token:string,asset?:string){return insert('audit_logs',{id:id(),company_id:company,asset_id:asset??null,actor,operation,date:now(),before_json:JSON.stringify(before??null),after_json:JSON.stringify(after??null),reason,result:'success'},token);}
