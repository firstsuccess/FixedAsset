import {all,one,id,now,insert,statement,commit,audit,type Row} from './repository';
import {authorize,systemAdmin} from './auth';
const companyTables=['departments','asset_locations','account_codes','vendors'];
function required(value:any,label:string,max=200){const s=String(value??'').trim();if(!s||s.length>max)throw Error(`${label}を1〜${max}文字で入力してください`);return s;}
function optional(value:any,max=200){const s=String(value??'').trim();if(s.length>max)throw Error(`入力は${max}文字以内です`);return s;}
export async function categoryMetadata(category:Row){const row=await one('SELECT * FROM system_parameters WHERE key=?','category-meta:'+category.id);return row?JSON.parse(row.value_json):{display_name:category.name,base_category:category.name};}
export async function maintainedCategories(){const rows=await all('SELECT * FROM asset_categories ORDER BY code');const metadata=await all('SELECT * FROM system_parameters');const map=new Map(metadata.map(row=>[row.key,row]));return rows.map(row=>{const meta=map.get('category-meta:'+row.id);return {...row,...(meta?JSON.parse(meta.value_json):{display_name:row.name,base_category:row.name})};});}
export async function maintainMaster(user:Row,cid:string,p:any){
 const table=String(p.table);
 if(companyTables.includes(table)){
  await authorize(user,cid,'admin');
  const old=p.id?await one(`SELECT * FROM ${table} WHERE id=? AND company_id=?`,p.id,cid):undefined;
  if(p.id&&!old)throw Error('マスタがありません');
  const code=required(p.code,'コード',100),name=required(p.name,'名称');
  if(old&&code!==old.code)throw Error('登録済みコードは変更できません。名称のみ変更できます');
  if(await one(`SELECT id FROM ${table} WHERE company_id=? AND code=? AND id<>?`,cid,code,old?.id??''))throw Error('同じコードが登録済みです');
  const row={id:old?.id??id(),company_id:cid,code,name,version:(old?.version??0)+1};
  return commit(p.revision,t=>[old?statement(`UPDATE ${table} SET name=?,version=? WHERE id=? AND company_id=?`,[name,row.version,row.id,cid],t):insert(table,row,t),audit(cid,user.id,old?'UPDATE_MASTER':'CREATE_MASTER',old??null,{table,...row},'会社別マスタの登録・名称変更',t)]);
 }
 systemAdmin(user);
 if(table==='asset_categories'){
  const old=p.id?await one('SELECT * FROM asset_categories WHERE id=?',p.id):undefined;if(p.id&&!old)throw Error('資産分類がありません');
  const code=required(p.code,'コード',100),display_name=required(p.name,'表示名称',100);
  if(old&&code!==old.code)throw Error('登録済みコードは変更できません');
  const meta=old?await categoryMetadata(old):null;
  if(old&&p.base_category!==meta!.base_category)throw Error('登録済み分類の計算ルールは変更できません');
  const base=await one('SELECT * FROM asset_categories WHERE name=?',required(p.base_category,'計算ルール'));if(!base)throw Error('計算ルールの分類がありません');
  const baseMeta=await categoryMetadata(base);
  if(await one('SELECT id FROM asset_categories WHERE code=? AND id<>?',code,old?.id??''))throw Error('同じコードが登録済みです');
  const categories=await maintainedCategories();if(categories.some(c=>c.id!==old?.id&&c.display_name===display_name))throw Error('同じ表示名称が登録済みです');
  if(!old&&await one('SELECT id FROM asset_categories WHERE name=?',display_name))throw Error('同じ分類識別名が登録済みです');
  const row=old??{id:id(),code,name:display_name,default_method:base.default_method,account_code:base.account_code,depreciable:base.depreciable,intangible:base.intangible};
  const key='category-meta:'+row.id,parameter=await one('SELECT * FROM system_parameters WHERE key=?',key);
  const next={display_name,base_category:meta?.base_category??baseMeta.base_category};
  return commit(p.revision,t=>[...(old?[]:[insert('asset_categories',row,t)]),parameter?statement('UPDATE system_parameters SET value_json=? WHERE id=?',[JSON.stringify(next),parameter.id],t):insert('system_parameters',{id:id(),key,value_json:JSON.stringify(next),valid_from:null,valid_to:null,source_url:'application-master-maintenance'},t),audit(null,user.id,old?'UPDATE_CATEGORY_LABEL':'CREATE_CATEGORY',old?{...old,...meta}:null,{...row,...next},'分類の識別名・計算ルールを維持して表示名称を管理',t)]);
 }
 if(table==='useful_life_master'){
  const old=p.id?await one('SELECT * FROM useful_life_master WHERE id=?',p.id):undefined;if(p.id&&!old)throw Error('耐用年数マスタがありません');
  const category=required(p.category,'分類',100),life=Number(p.life);if(!Number.isInteger(life)||life<1||life>100)throw Error('耐用年数は1〜100年の整数です');
  if(!await one('SELECT id FROM asset_categories WHERE name=?',category))throw Error('分類がありません');
  if(old&&(category!==old.category||life!==old.life))throw Error('登録済み分類・耐用年数は変更できません。別項目を追加してください');
  const row={id:old?.id??id(),category,life,structure:required(p.structure,'構造・名称'),purpose:optional(p.purpose),detail:optional(p.detail),source_url:required(p.source_url,'出典',400),legal_basis:required(p.legal_basis,'根拠'),master_version:old?.master_version??'USER-'+now().slice(0,10),valid_from:old?.valid_from??null,valid_to:old?.valid_to??null};
  return commit(p.revision,t=>[old?statement('UPDATE useful_life_master SET structure=?,purpose=?,detail=?,source_url=?,legal_basis=? WHERE id=?',[row.structure,row.purpose,row.detail,row.source_url,row.legal_basis,row.id],t):insert(table,row,t),audit(null,user.id,old?'UPDATE_LIFE_LABEL':'CREATE_LIFE',old??null,row,'耐用年数の名称・根拠管理（既存資産への自動反映なし）',t)]);
 }
 throw Error('対象マスタが不正です');
}
