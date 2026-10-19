import {all,one,id,insert,statement,commit,audit} from './repository';
import {authorize} from './auth';
import {accountFields,type AccountDefaults} from '../domain/account-defaults';
export async function readAccountDefaults(cid:string):Promise<AccountDefaults>{const row=await one('SELECT * FROM system_parameters WHERE key=?','account-defaults:'+cid);return row?JSON.parse(row.value_json):{};}
export async function saveAccountDefaults(user:any,cid:string,p:any){
 await authorize(user,cid,'admin');
 const categories=await all('SELECT id FROM asset_categories'),accounts=await all('SELECT code FROM account_codes WHERE company_id=?',cid);
 if(!p.defaults||typeof p.defaults!=='object'||Array.isArray(p.defaults))throw Error('勘定科目デフォルトが不正です');
 const value:AccountDefaults={};
 for(const [category,books] of Object.entries(p.defaults)){
  if(category!=='*'&&!categories.some(c=>c.id===category))throw Error('資産分類が不正です');
  if(!books||typeof books!=='object'||Array.isArray(books))throw Error('償却簿の設定が不正です');
  value[category]={};
  for(const [kind,fields] of Object.entries(books)){
   if(!['accounting','tax'].includes(kind)||!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('償却簿の設定が不正です');
   value[category][kind]={};
   for(const [field,code] of Object.entries(fields)){
    if(!(accountFields as readonly string[]).includes(field)||typeof code!=='string'||!accounts.some(a=>a.code===code))throw Error('勘定科目は選択中の会社マスタから指定してください');
    value[category][kind][field]=code;
   }
  }
 }
 const key='account-defaults:'+cid,old=await one('SELECT * FROM system_parameters WHERE key=?',key);
 return commit(p.revision,t=>[old?statement('UPDATE system_parameters SET value_json=? WHERE id=?',[JSON.stringify(value),old.id],t):insert('system_parameters',{id:id(),key,value_json:JSON.stringify(value),valid_from:null,valid_to:null,source_url:'application-account-defaults'},t),audit(cid,user.id,'ACCOUNT_DEFAULTS',old?JSON.parse(old.value_json):{},value,'新規資産の勘定科目デフォルト変更',t)]);
}
