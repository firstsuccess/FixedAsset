import {createHmac} from 'node:crypto';
import {settings} from './config';
import {all,one,id,now,insert,statement,commit,audit,revision,type Row} from './repository';
import {systemAdmin} from './auth';
import {reauthenticate,requestIP} from './local-auth';
import {companyArchiveKey,isCompanyArchived} from './company-status';
import catalog from '../domain/catalog.json' with {type:'json'};
const schema=catalog as Record<string,{columns:string[];foreignKeys:{column:string;table:string}[]}>;
const protectedTables=new Set(['users','roles','asset_categories','useful_life_master','depreciation_methods','depreciation_rate_master','system_parameters','global_counters','legacy_archive']);
function reason(value:any){const text=String(value??'').trim();if(!text||text.length>200)throw Error('処理理由を1〜200文字で入力してください');return text;}
async function company(company:string){const row=await one('SELECT * FROM companies WHERE id=?',company);if(!row)throw Error('会社がありません');return row;}
export async function archiveCompany(user:Row,p:any){systemAdmin(user);const c=await company(p.target_company);if(await isCompanyArchived(c.id))throw Error('既にアーカイブ済みです');const why=reason(p.reason);const metadata={archived_at:now(),archived_by:user.id,reason:why};return commit(p.revision,t=>[insert('system_parameters',{id:id(),key:companyArchiveKey(c.id),value_json:JSON.stringify(metadata),valid_from:null,valid_to:null,source_url:'application-company-lifecycle'},t),audit(null,user.id,'ARCHIVE_COMPANY',null,{company_id:c.id},why,t)]);}
export async function restoreCompany(user:Row,p:any){systemAdmin(user);const c=await company(p.target_company);if(!await isCompanyArchived(c.id))throw Error('この会社はアーカイブされていません');const why=reason(p.reason);return commit(p.revision,t=>[statement('DELETE FROM system_parameters WHERE key=?',[companyArchiveKey(c.id)],t),audit(null,user.id,'RESTORE_COMPANY',{company_id:c.id},{active:true},why,t)]);}
type Scope={where:string;values:string[]};
function references(table:string){return table==='audit_logs'?[...schema[table].foreignKeys,{column:'asset_id',table:'assets'}]:schema[table].foreignKeys;}
function scopes(company:string){
 const result=new Map<string,Scope|null>();
 function build(table:string):Scope|null{if(result.has(table))return result.get(table)!;if(protectedTables.has(table)){result.set(table,null);return null;}if(table==='companies'){const scope={where:'id=?',values:[company]};result.set(table,scope);return scope;}const terms:string[]=[],values:string[]=[];for(const fk of references(table)){const parent=build(fk.table);if(parent){terms.push(`${fk.column} IN (SELECT id FROM ${fk.table} WHERE ${parent.where})`);values.push(...parent.values);}}const scope=terms.length?{where:'('+terms.join(' OR ')+')'+(table==='mutation_locks'?" AND id<>'system'":''),values}:null;result.set(table,scope);return scope;}
 for(const table of Object.keys(schema))build(table);
 return result;
}
function deletionOrder(selected:Map<string,Scope|null>){const visited=new Set<string>(),ordered:string[]=[];function visit(table:string){if(visited.has(table)||!selected.get(table))return;visited.add(table);for(const fk of references(table))visit(fk.table);ordered.push(table);}for(const table of selected.keys())visit(table);return ordered.reverse();}
async function deletionData(companyId:string){
 const selected=scopes(companyId),rows=new Map<string,Row[]>();
 for(const [table,scope] of selected){if(!scope)continue;const fields=[...new Set(['id',...references(table).map(fk=>fk.column)])];rows.set(table,await all(`SELECT ${fields.join(',')} FROM ${table} WHERE ${scope.where}`,...scope.values));}
 const ids=new Map([...rows].map(([table,list])=>[table,new Set(list.map(row=>row.id))]));
 for(const [table,list] of rows)for(const row of list)for(const fk of references(table)){if(!selected.get(fk.table)||row[fk.column]==null)continue;if(!ids.get(fk.table)?.has(row[fk.column]))throw Error('会社外の関連データを検出しました。安全のため削除を中止しました: '+table);}
 return {selected,counts:Object.fromEntries([...rows].map(([table,list])=>[table,list.length]))};
}
function reviewToken(user:string,company:string,version:number,counts:Record<string,number>){return createHmac('sha256',settings().secret).update(JSON.stringify({user,company,version,counts})).digest('hex');}
export async function previewCompanyDelete(user:Row,p:any){systemAdmin(user);const c=await company(p.target_company);if(!await isCompanyArchived(c.id))throw Error('物理削除はアーカイブ済み会社のみ可能です');const version=await revision();if(p.revision!==version)throw Error('CONFLICT: 画面を再読み込みしてください');const data=await deletionData(c.id);if(version!==await revision())throw Error('CONFLICT: 削除対象確認中に更新されました');const affected=await all('SELECT user_id FROM auth_accounts WHERE primary_company_id=? OR department_id IN (SELECT id FROM departments WHERE company_id=?)',c.id,c.id);return {company:{id:c.id,code:c.code,name:c.name},counts:data.counts,detached_accounts:affected.length,revision:version,review_token:reviewToken(user.id,c.id,version,data.counts)};}
export async function deleteArchivedCompany(user:Row,p:any){
 systemAdmin(user);const check=await previewCompanyDelete(user,p);const why=reason(p.reason);
 if(p.confirmation!=='DELETE '+check.company.code)throw Error('会社コードを含む削除確認文を入力してください');if(p.reviewed!==true||p.backup_confirmed!==true||p.review_token!==check.review_token)throw Error('削除対象のレビューとバックアップ確認が必要です');
 await reauthenticate(user,p.password,await requestIP());
 const data=await deletionData(check.company.id),dep='SELECT id FROM departments WHERE company_id=?';
 const version=await commit(p.revision,t=>[
  statement(`UPDATE auth_accounts SET primary_company_id=CASE WHEN primary_company_id=? THEN NULL ELSE primary_company_id END,department_id=CASE WHEN department_id IN (${dep}) THEN NULL ELSE department_id END WHERE (primary_company_id=? OR department_id IN (${dep}))`,[check.company.id,check.company.id,check.company.id,check.company.id],t),
  statement("UPDATE mutation_locks SET company_id=NULL WHERE id='system' AND company_id=?",[check.company.id],t),
  ...deletionOrder(data.selected).map(table=>{const scope=data.selected.get(table)!;return statement(`DELETE FROM ${table} WHERE ${scope.where}`,scope.values,t);}),
  statement('DELETE FROM system_parameters WHERE key=?',[companyArchiveKey(check.company.id)],t),
  statement('DELETE FROM system_parameters WHERE key=?',['account-defaults:'+check.company.id],t),
  audit(null,user.id,'DELETE_ARCHIVED_COMPANY',{company_id:check.company.id,counts:check.counts},{deleted:true},why,t)
 ]);
 return {revision:version,deleted_company:check.company.id,counts:check.counts};
}
