import * as lifecycle from '../server/company-lifecycle.ts';
import {csv as buildCSV,parseCSV} from '../domain/csv.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {loadConfig,setTestConfig} from '../server/config.ts';
import {compileQuery} from '../server/sqlserver.ts';
import {requestContext,setDatabase} from '../server/context.ts';
import {MemoryDatabase} from './memory-db.mjs';
import * as a from '../server/local-auth.ts';
import * as s from '../server/service.ts';
import * as r from '../server/repository.ts';
const configuration={NODE_ENV:'development',HOST:'127.0.0.1',PORT:'3001',PUBLIC_BASE_URL:'http://localhost:3001',BASE_PATH:'/',DB_NAME:'fixed-asset',DB_PASSWORD:'fixture-db-only',SESSION_SECRET:'fixture-session-secret-that-is-long-enough-123'};setTestConfig(loadConfig(configuration));
const db=new MemoryDatabase();setDatabase(db);let uid,cid,asset,token;
const context=t=>requestContext.enterWith({headers:new Headers(t?{cookie:a.COOKIE+'='+t}:{}),ip:'127.0.0.1',local:true});context();
const action=async p=>s.dispatch({company_id:cid,revision:await r.revision(),...p});
test('環境設定: accounting拒否・秘密値検証・ポート変更・TLS/プロキシ制御',()=>{
 assert.throws(()=>loadConfig({...configuration,DB_NAME:'accounting'}),/forbidden/);assert.throws(()=>loadConfig({...configuration,SESSION_SECRET:'CHANGE_TO_LONG_RANDOM_SECRET'}));assert.throws(()=>loadConfig({...configuration,NODE_ENV:'production',COOKIE_SECURE:'false'}));assert.equal(loadConfig({...configuration,PORT:'3099'}).port,3099);assert.equal(loadConfig({...configuration,BASE_PATH:'/fixed-asset'}).basePath,'/fixed-asset/');assert.throws(()=>loadConfig({...configuration,DB_INSTANCE:'SQLEXPRESS',DB_PORT:'1433'}));
});
test('SQL Server方言: TOP・Unicode・予約語・パラメーター・未対応SQLの拒否',()=>{
 const q=compileQuery("SELECT * FROM users WHERE email=? AND display_name='contains ?' ORDER BY created_at DESC LIMIT 1",['a@b']);assert.match(q.text,/SELECT TOP \(1\)/);assert.match(q.text,/\[users\]/);assert.match(q.text,/email\]=@p0/);assert.match(q.text,/N'contains \?'/);assert.throws(()=>compileQuery('SELECT ?',[1,2]),/parameter/);assert.throws(()=>compileQuery('INSERT INTO users VALUES(?) ON CONFLICT DO NOTHING',[1]),/Unsupported/);
 const ddl=readFileSync(new URL('../sql/001-initial.sql',import.meta.url),'utf8');assert.match(ddl,/decimal\(19,0\)/);assert.match(ddl,/auth_single_lockout_exempt/);assert.match(ddl,/auth_accounts_user_fk/);assert(!/DROP TABLE|TRUNCATE TABLE|DROP DATABASE/.test(ddl));
});
test('Windows独自認証: Argon2id・初回変更・UUID・一般ロック・admin例外・IP制限',async()=>{
 await s.initialize({id:r.id(),email:'admin1@local.invalid',display_name:'管理者',role:'System Administrator',bootstrap:true,provisioned:true});await s.ensureLegacyMasters();uid=(await r.one("SELECT id FROM users WHERE role='System Administrator'")).id;
 await db.batch([r.insert('auth_accounts',{user_id:uid,login_id:'admin1',normalized_login_id:'admin1',password_hash:await a.passwordHash('password'),exempt_from_account_lockout:1,failed_login_count:0,locked_until:null,session_version:1,must_change_password:1,login_id_updated_at:r.now(),login_id_updated_by:'SYSTEM',primary_company_id:null,department_id:null})]);
 assert.match((await r.one('SELECT password_hash FROM auth_accounts WHERE user_id=?',uid)).password_hash,/^\$argon2id\$/);const initial=await a.login('admin1','password','ip-login');context(initial.token);await assert.rejects(()=>a.sessionIdentity(),/変更/);await a.changePassword('password','new-admin-password-123','ip-password');await assert.rejects(()=>a.sessionIdentity(),/UNAUTHENTICATED/);token=(await a.login('admin1','new-admin-password-123','ip-login')).token;context(token);assert.equal((await a.sessionIdentity()).id,uid);
 for(let i=0;i<6;i++)await assert.rejects(()=>a.login('admin1','bad','fail-'+i),/UNAUTHENTICATED/);assert.equal((await r.one('SELECT locked_until FROM auth_accounts WHERE user_id=?',uid)).locked_until,null);
 for(let i=0;i<20;i++)await a.limitIP('same-ip');await assert.rejects(()=>a.limitIP('same-ip'),/RATE_LIMIT/);
});
test('固定資産業務: 登録・月次計算/確定・仕訳借貸・CSV・確定保護',async()=>{
 context(token);await action({action:'company',code:'WIN',name:'Windows隔離テスト',kind:'corporate',first_month:'2026-04',fiscal_end_month:3});cid=(await s.getState()).companies[0].id;
 await action({action:'asset',number:'A1',name:'設備',category:'器具及び備品',cost:1000000,tax_amount:0,acquisition_date:'2026-04-01',service_date:'2026-04-01',accounting:{method:'straight',life:8,residual:1,cost:1000000},tax:{method:'declining200',life:8,residual:1,cost:800000}});asset=(await s.getState(cid)).assets[0].id;
 await action({action:'calculate',month:'2026-04'});let run=(await s.runData(cid,'2026-04')).run;await action({action:'review',run_id:run.id});await action({action:'confirm',run_id:run.id});await action({action:'journal',month:'2026-04'});const j=await s.journals(cid);assert.equal(j.lines.reduce((n,l)=>n+l.debit-l.credit,0),0);assert((await action({action:'export',entity:'assets'})).includes('tax_cost'));const balances=await s.balances(cid,'2026-04-30');assert.equal(balances.rows.find(b=>b.kind==='accounting').balance,989584);await assert.rejects(()=>action({action:'asset',id:asset,version:1,number:'A1',name:'変更',category:'器具及び備品',cost:900000,tax_amount:0,acquisition_date:'2026-04-01',service_date:'2026-04-01',accounting:{method:'straight',life:8,residual:1,cost:900000},tax:{method:'declining200',life:8,residual:1,cost:800000}}),/確定/);
});
test('確定後でも未確定月に供用する資産は修正でき、確定月への遡及は拒否する',async()=>{
 context(token);
 const future={action:'asset',number:'FUTURE',name:'未供用設備',category:'器具及び備品',cost:200000,tax_amount:0,acquisition_date:'2026-05-01',service_date:'2026-05-16',accounting:{method:'straight',life:5,residual:1},tax:{method:'straight',life:5,residual:1}};
 await action(future);let row=(await s.getState(cid)).assets.find(a=>a.number==='FUTURE');
 await action({...future,id:row.id,version:row.version,name:'変更済設備',cost:300000});
 row=(await s.getState(cid)).assets.find(a=>a.id===row.id);assert.equal(row.name,'変更済設備');assert.equal(row.cost,300000);
 await assert.rejects(()=>action({...future,id:row.id,version:row.version,acquisition_date:'2026-04-01',service_date:'2026-04-30'}),/確定/);
 const confirmed=(await s.getState(cid)).assets.find(a=>a.id===asset);
 await assert.rejects(()=>action({...future,id:confirmed.id,version:confirmed.version,number:confirmed.number}),/確定/);
 assert.equal((await s.getState(cid)).assets.find(a=>a.id===row.id).cost,300000);
});

test('全画面の表示件数: 初期値100・7選択肢の永続化・権限・CSV全件出力',async()=>{
 context(token);assert.equal((await s.getState()).tablePageSize,100);
 const original=await r.one('SELECT * FROM assets WHERE id=?',asset);
 const extra=Array.from({length:110},(_,i)=>({...original,id:r.id(),number:'PAGE-'+String(i).padStart(3,'0'),name:'表示件数テスト'+i}));await db.batch(extra.map(row=>r.insert('assets',row)));
 const before=await action({action:'export',entity:'assets'});assert(before.includes('PAGE-109'));assert.equal(before.trim().split('\r\n').length,113);
 for(const page_size of [20,50,100,200,300,400,500]){await s.dispatch({action:'table-display-settings',page_size,revision:await r.revision()});assert.equal((await s.getState()).tablePageSize,page_size);assert.equal((await s.getState(cid)).tablePageSize,page_size);assert.equal(await action({action:'export',entity:'assets'}),before);}
 await assert.rejects(async()=>s.dispatch({action:'table-display-settings',page_size:25,revision:await r.revision()}),/表示件数/);
 await assert.rejects(async()=>s.saveTableDisplay({role:'Viewer'},{page_size:20,revision:await r.revision()}),/FORBIDDEN/);
 assert.equal((await s.getState()).tablePageSize,500);
 await s.dispatch({action:'table-display-settings',page_size:100,revision:await r.revision()});
 await db.batch(extra.map(row=>db.prepare('DELETE FROM assets WHERE id=?').bind(row.id)));
});

test('マスタ変更: コード固定・分類表示名・年数保護・会社間権限・計算ルール維持',async()=>{
 context(token);const admin=await a.sessionIdentity();
 const balancesBefore=await s.balances(cid,'2026-04-30');
 await action({action:'master',table:'departments',code:'EDIT',name:'旧部門'});const dep=await r.one('SELECT * FROM departments WHERE company_id=? AND code=?',cid,'EDIT');
 await action({action:'master',table:'departments',id:dep.id,code:dep.code,name:'新部門'});assert.equal((await r.one('SELECT * FROM departments WHERE id=?',dep.id)).name,'新部門');
 await assert.rejects(()=>action({action:'master',table:'departments',id:dep.id,code:'CHANGED',name:'変更'}),/コード/);
 await assert.rejects(()=>s.saveMaster(admin,'other-company',{table:'departments',id:dep.id,code:dep.code,name:'変更',revision:0}),/マスタがありません/);
 const category=(await s.masterData()).categories.find(c=>c.name==='器具及び備品');
 await action({action:'master',table:'asset_categories',id:category.id,code:category.code,name:'器具・備品（表示変更）',base_category:category.base_category});
 assert.equal((await s.masterData()).categories.find(c=>c.id===category.id).display_name,'器具・備品（表示変更）');assert.equal((await r.one('SELECT * FROM assets WHERE id=?',asset)).category,'器具及び備品');
 assert.deepEqual(await s.balances(cid,'2026-04-30'),balancesBefore);
 await action({action:'master',table:'asset_categories',code:'CUSTOM-LAND',name:'追加土地分類',base_category:'土地'});
 const added=(await s.masterData()).categories.find(c=>c.code==='CUSTOM-LAND');assert.equal(added.base_category,'土地');
 await assert.rejects(()=>action({action:'asset',number:'LAND-TEST',name:'土地ルール確認',category:added.name,cost:1000000,acquisition_date:'2026-05-01',service_date:'2026-05-01',accounting:{method:'straight',life:5},tax:{method:'straight',life:5}}),/償却対象外/);
 await assert.rejects(()=>action({action:'master',table:'asset_categories',id:added.id,code:added.code,name:'追加土地',base_category:'器具及び備品'}),/計算ルール/);
 await action({action:'master',table:'useful_life_master',category:category.name,life:5,structure:'追加名称',purpose:'用途',detail:'細目',source_url:'テスト資料',legal_basis:'テスト根拠'});
 const life=(await s.masterData()).lives.find(l=>l.structure==='追加名称');
 await action({action:'master',table:'useful_life_master',...life,structure:'名称変更'});
 assert.equal((await r.one('SELECT * FROM useful_life_master WHERE id=?',life.id)).structure,'名称変更');
 await assert.rejects(()=>action({action:'master',table:'useful_life_master',...life,life:6}),/耐用年数/);
 await assert.rejects(()=>s.saveMaster({role:'Viewer'},cid,{table:'asset_categories'}),/FORBIDDEN/);
});

test('CSV移行と全期間処理: レビュー・初期残高・順次確定・取消・出力済み保護',async()=>{
 context(token);const user=await a.sessionIdentity();await action({action:'company',code:'MIGRATE',name:'移行テスト会社',kind:'corporate',first_month:'2026-04',fiscal_end_month:3});const company=(await s.getState()).companies.find(c=>c.code==='MIGRATE').id;
 const headers=parseCSV(s.migrationTemplate())[0];
 const item={number:'M1',name:'移行設備',category:'器具及び備品',acquisition_date:'2025/04/01',service_date:'2025/04/01',cost:'1000000',tax:'0',ancillary:'0',accounting_method:'straight',accounting_life:'5',accounting_residual:'1',tax_method:'straight',tax_life:'5',tax_residual:'1',accounting_opening_as_of:'2026/03/31',accounting_opening_accumulated:'120000',tax_opening_as_of:'2026/03/31',tax_opening_accumulated:'200000'};
 const content=buildCSV([headers,headers.map(h=>item[h]??'')]);
 const payload={csv:content,mode:'new'};const review=await s.importPreview(user,company,payload);assert.equal(review.counts.new,1);assert.equal((await s.getState(company)).assets.length,0);
 await assert.rejects(()=>s.importCommit(user,company,{...payload,revision:review.revision}),/レビュー/);
 await assert.rejects(()=>s.importCommit(user,company,{...payload,csv:content.replace('移行設備','改変'),revision:review.revision,reviewed:true,review_token:review.review_token}),/レビュー/);
 await s.importCommit(user,company,{...payload,revision:review.revision,reviewed:true,review_token:review.review_token});
 const state=await s.getState(company);assert.equal(state.assets[0].service_date,'2025-04-01');assert.equal(state.openings.find(o=>o.asset_book_id===state.books.find(b=>b.kind==='accounting').id).balance,880000);
 const duplicates=await s.importPreview(user,company,{mode:'upsert',csv:buildCSV([headers,headers.map(h=>item[h]??''),headers.map(h=>item[h]??'')])});assert.equal(duplicates.counts.duplicate,1);
 const badCSV=buildCSV([headers,headers.map(h=>h==='number'?'M2':item[h]??''),headers.map(h=>h==='number'?'M3':h==='cost'?'-1':item[h]??'')]);const bad=await s.importPreview(user,company,{csv:badCSV,mode:'new'});assert.equal(bad.counts.error,1);await assert.rejects(()=>s.importCommit(user,company,{csv:badCSV,mode:'new',revision:bad.revision,review_token:bad.review_token,reviewed:true}),/エラー/);assert.equal((await s.getState(company)).assets.length,1);
 let plan=await s.bulkPeriodPlan(user,company,{mode:'confirm',until:'2026-06',revision:await r.revision()});assert.deepEqual(plan.months,['2026-04','2026-05','2026-06']);
 await assert.rejects(()=>s.bulkPeriodConfirm(user,company,{month:'2026-04',until:'2026-06',revision:plan.revision,reason:'移行'}),/レビュー/);
 let current=await s.bulkPeriodConfirm(user,company,{month:'2026-04',until:'2026-06',revision:plan.revision,reason:'移行',reviewed:true});
 await assert.rejects(()=>s.bulkPeriodConfirm(user,company,{month:'2026-05',until:'2026-06',revision:current.revision-1,reason:'移行',reviewed:true}),/CONFLICT/);
 plan=await s.bulkPeriodPlan(user,company,{mode:'confirm',until:'2026-06',revision:await r.revision()});assert.deepEqual(plan.months,['2026-05','2026-06']);
 for(const month of plan.months)current=await s.bulkPeriodConfirm(user,company,{month,until:'2026-06',revision:await r.revision(),reason:'移行',reviewed:true});
 const april=(await s.runData(company,'2026-04')).rows.find(x=>x.kind==='accounting'),may=(await s.runData(company,'2026-05')).rows.find(x=>x.kind==='accounting');assert.equal(may.opening,april.closing);assert.equal((await s.getState(company)).closings.filter(c=>c.status==='confirmed').length,3);
 await s.generateJournal(user,company,{month:'2026-04',revision:await r.revision()});const journal=(await s.journals(company)).headers[0];
 await r.commit(await r.revision(),t=>[r.statement("UPDATE journal_headers SET status='exported' WHERE id=?",[journal.id],t)]);
 await assert.rejects(async()=>s.bulkPeriodCancel(user,company,{revision:await r.revision(),reason:'移行修正',confirmation:'全期間確定取消'}),/出力済み/);
 assert.equal((await s.getState(company)).closings.filter(c=>c.status==='confirmed').length,3);
 await r.commit(await r.revision(),t=>[r.statement("UPDATE journal_headers SET status='generated' WHERE id=?",[journal.id],t)]);
 const cancelled=await s.bulkPeriodCancel(user,company,{revision:await r.revision(),reason:'移行修正',confirmation:'全期間確定取消'});assert.equal(cancelled.count,3);assert.equal((await s.journals(company)).headers[0].status,'cancelled');assert.equal((await s.getState(company)).closings.filter(c=>c.status==='confirmed').length,0);assert.equal((await s.getState(cid)).closings[0].status,'confirmed');
 const recheck=await s.importPreview(user,company,{csv:content.replace('移行設備','変更設備'),mode:'update'});await s.importCommit(user,company,{csv:content.replace('移行設備','変更設備'),mode:'update',revision:recheck.revision,review_token:recheck.review_token,reviewed:true});
 for(const month of ['2026-04','2026-05','2026-06'])await s.bulkPeriodConfirm(user,company,{month,until:'2026-06',revision:await r.revision(),reason:'再確定',reviewed:true});assert.equal((await s.runData(company,'2026-06')).rows[0].status,'confirmed');
 await assert.rejects(async()=>s.bulkPeriodPlan({id:'outsider',role:'Viewer'},company,{mode:'cancel',revision:await r.revision()}),/FORBIDDEN/);
});

test('会社アーカイブ: 非表示・アクセス拒否・復帰・物理削除の保護と原子性',async()=>{
 context(token);const user=await a.sessionIdentity();await action({action:'company',code:'ARCHIVE',name:'アーカイブ対象',kind:'corporate',first_month:'2026-04',fiscal_end_month:3});const company=(await s.getState()).companies.find(c=>c.code==='ARCHIVE').id;
 await s.saveMaster(user,company,{table:'departments',code:'D',name:'部門',revision:await r.revision()});const department=await r.one('SELECT * FROM departments WHERE company_id=?',company);
 await s.saveAsset(user,company,{number:'ARC-1',name:'対象資産',category:'器具及び備品',acquisition_date:'2026-04-01',service_date:'2026-04-01',cost:1000000,department_id:department.id,accounting:{method:'straight',life:5,residual:1},tax:{method:'straight',life:5,residual:1},revision:await r.revision()});
 await s.bulkPeriodConfirm(user,company,{month:'2026-04',until:'2026-04',reason:'確認',reviewed:true,revision:await r.revision()});await s.generateJournal(user,company,{month:'2026-04',revision:await r.revision()});
 const owned=await s.getState(company),assetId=owned.assets[0].id,bookId=owned.books[0].id;
 const beforeOthers=await s.getState(cid),sharedTables=['asset_categories','useful_life_master','depreciation_methods','depreciation_rate_master','roles','users'];const sharedBefore=Object.fromEntries(await Promise.all(sharedTables.map(async table=>[table,await r.all('SELECT * FROM '+table)])));
 await assert.rejects(async()=>lifecycle.previewCompanyDelete(user,{target_company:company,revision:await r.revision()}),/アーカイブ済み/);
 await lifecycle.archiveCompany(user,{target_company:company,reason:'運用終了',revision:await r.revision()});const archived=await s.getState();assert(!archived.companies.some(c=>c.id===company));assert(archived.archived_companies.some(c=>c.id===company));
 await assert.rejects(()=>s.getState(company),/アーカイブ/);await assert.rejects(()=>s.exportCSV(user,company,{entity:'assets'}),/アーカイブ/);assert.equal((await r.all('SELECT * FROM assets WHERE company_id=?',company)).length,1);
 await lifecycle.restoreCompany(user,{target_company:company,reason:'本番復帰',revision:await r.revision()});assert((await s.getState()).companies.some(c=>c.id===company));assert.deepEqual((await s.getState(company)).assets,owned.assets);
 await lifecycle.archiveCompany(user,{target_company:company,reason:'物理削除準備',revision:await r.revision()});
 await db.batch([db.prepare('UPDATE auth_accounts SET primary_company_id=?,department_id=? WHERE user_id=?').bind(company,department.id,user.id)]);const preview=await lifecycle.previewCompanyDelete(user,{target_company:company,revision:await r.revision()});assert.equal(preview.detached_accounts,1);assert.equal(preview.counts.assets,1);assert.equal(preview.counts.asset_books,2);assert.equal(preview.counts.journal_headers,1);assert(!('asset_categories' in preview.counts));
 const payload={target_company:company,revision:preview.revision,reason:'移行後の削除',confirmation:'DELETE ARCHIVE',reviewed:true,backup_confirmed:true,review_token:preview.review_token,password:'new-admin-password-123'};
 await assert.rejects(()=>lifecycle.deleteArchivedCompany(user,{...payload,confirmation:'DELETE OTHER'}),/確認文/);await assert.rejects(()=>lifecycle.deleteArchivedCompany(user,{...payload,review_token:'wrong'}),/レビュー/);await assert.rejects(()=>lifecycle.deleteArchivedCompany({id:user.id,role:'Viewer'},payload),/FORBIDDEN/);
 db.db.exec("CREATE TRIGGER lifecycle_test_fail BEFORE DELETE ON assets WHEN OLD.company_id='"+company+"' BEGIN SELECT RAISE(ABORT,'injected deletion failure'); END");
 await assert.rejects(()=>lifecycle.deleteArchivedCompany(user,payload),/injected deletion failure/);assert(await r.one('SELECT id FROM companies WHERE id=?',company));assert(await r.one('SELECT id FROM asset_books WHERE id=?',bookId));assert.equal((await r.all('SELECT * FROM journal_headers WHERE company_id=?',company)).length,1);assert.equal((await r.one('SELECT * FROM auth_accounts WHERE user_id=?',user.id)).primary_company_id,company);db.db.exec('DROP TRIGGER lifecycle_test_fail');
 const conflictId=r.id();await db.batch([r.insert('asset_capital_expenditures',{id:conflictId,asset_id:assetId,child_asset_id:asset})]);await assert.rejects(async()=>lifecycle.previewCompanyDelete(user,{target_company:company,revision:await r.revision()}),/会社外/);await db.batch([db.prepare('DELETE FROM asset_capital_expenditures WHERE id=?').bind(conflictId)]);
 const foreignKeys=r.id();await db.batch([r.insert('asset_capital_expenditures',{id:foreignKeys,asset_id:assetId,child_asset_id:assetId}),r.insert('asset_impairments',{id:r.id(),asset_book_id:bookId}),r.insert('depreciation_schedules',{id:r.id(),asset_book_id:bookId})]);
 const updated=await lifecycle.previewCompanyDelete(user,{target_company:company,revision:await r.revision()});
 await lifecycle.deleteArchivedCompany(user,{...payload,revision:updated.revision,review_token:updated.review_token});
 assert.equal((await r.one('SELECT * FROM auth_accounts WHERE user_id=?',user.id)).primary_company_id,null);assert.equal((await r.one('SELECT * FROM auth_accounts WHERE user_id=?',user.id)).department_id,null);assert(!await r.one('SELECT * FROM companies WHERE id=?',company));assert(!await r.one('SELECT * FROM assets WHERE id=?',assetId));assert(!await r.one('SELECT * FROM asset_books WHERE id=?',bookId));assert(!await r.one('SELECT * FROM asset_capital_expenditures WHERE id=?',foreignKeys));assert(!(await s.getState()).archived_companies.some(c=>c.id===company));
 assert.deepEqual((await s.getState(cid)).assets,beforeOthers.assets);for(const table of sharedTables)assert.deepEqual(await r.all('SELECT * FROM '+table),sharedBefore[table]);assert(await r.one("SELECT id FROM audit_logs WHERE operation='DELETE_ARCHIVED_COMPANY'"));
});

test('ログインID変更: ハッシュ・操作者UUID維持・旧ID/セッション拒否',async()=>{
 context(token);const old=(await r.one('SELECT * FROM auth_accounts WHERE user_id=?',uid)).password_hash;await a.manageUser(await a.sessionIdentity(),{user_id:uid,login_id:' ADMINISTRATOR ',display_name:'管理者',role:'System Administrator',active:1,revision:await r.revision(),password:'new-admin-password-123'},'rename-ip');await assert.rejects(()=>a.sessionIdentity(),/UNAUTHENTICATED/);await assert.rejects(()=>a.login('admin1','new-admin-password-123','rename-ip'),/UNAUTHENTICATED/);token=(await a.login('administrator','new-admin-password-123','rename-ip')).token;context(token);assert.equal((await a.sessionIdentity()).id,uid);assert.equal((await r.one('SELECT * FROM auth_accounts WHERE user_id=?',uid)).password_hash,old);assert.equal((await r.one('SELECT * FROM auth_accounts WHERE user_id=?',uid)).exempt_from_account_lockout,1);
});
test('ユーザー・例外移管・リセット・復元セッション失効と権限',async()=>{
 context(token);const actor=await a.sessionIdentity();const payload={login_id:'admin2',display_name:'管理者2',role:'System Administrator',active:1,revision:await r.revision(),password:'new-admin-password-123',initial_password:'second-password-123'};const second=(await a.manageUser(actor,payload,'user-ip')).user_id;await a.transferExemption(actor,second,'new-admin-password-123',await r.revision(),'transfer-ip');assert.equal((await r.all('SELECT * FROM auth_accounts WHERE exempt_from_account_lockout=1')).length,1);await a.transferExemption(actor,uid,'new-admin-password-123',await r.revision(),'transfer-ip');
 const code=(await a.issueReset(actor,second,'new-admin-password-123',await r.revision(),'reset-ip')).token;await a.completeReset(code,'reset-password-123','reset-ip');await assert.rejects(()=>a.completeReset(code,'reset-password-456','reset-ip'),/無効/);
 const backup=await s.backup(actor);assert(backup.authentication.accounts.length===2);await s.restore(actor,{file:backup,hash:backup.integrity.hash,password:'new-admin-password-123',confirm:'全データを復元',revision:await r.revision()});await assert.rejects(()=>a.sessionIdentity(),/UNAUTHENTICATED/);token=(await a.login('administrator','new-admin-password-123','restore-ip')).token;context(token);
 const viewer=(await a.manageUser(await a.sessionIdentity(),{login_id:'viewer',display_name:'閲覧者',role:'Viewer',active:1,company_id:cid,initial_password:'viewer-password-123',password:'new-admin-password-123',revision:await r.revision()},'viewer-ip')).user_id;const vt=(await a.login('viewer','viewer-password-123','viewer-ip')).token;context(vt);await a.changePassword('viewer-password-123','viewer-new-password-123','viewer-ip');context((await a.login('viewer','viewer-new-password-123','viewer-ip')).token);await assert.rejects(()=>action({action:'master',table:'departments',code:'D',name:'不可'}),/FORBIDDEN/);context(token);
});
test('HTTP API: 起動・health・Cookie・CSRF・未認証データ保護',async()=>{
 const {createApplication}=await import('../server/app.ts');const app=createApplication(db,loadConfig(configuration));const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/api/fam')).status,401);assert.equal((await fetch(url+'/api/auth',{method:'POST',headers:{origin:'http://evil','content-type':'application/json'},body:'{"action":"login"}'})).status,403);const resp=await fetch(url+'/api/auth',{method:'POST',headers:{origin:'http://localhost:3001','content-type':'application/json'},body:JSON.stringify({action:'login',login_id:'administrator',password:'new-admin-password-123'})});assert.equal(resp.status,200);assert.match(resp.headers.get('set-cookie'),/HttpOnly/);assert(!resp.headers.get('set-cookie').includes('Secure;'));
 const config=await (await fetch(url+'/api/config')).json();assert.equal(config.features.companyLifecycle,true);
 const cookie=resp.headers.get('set-cookie').split(';')[0];const lifecycleRequest=async action=>{const response=await fetch(url+'/api/fam',{method:'POST',headers:{origin:'http://localhost:3001','content-type':'application/json',cookie},body:JSON.stringify({action,target_company:cid,revision:await r.revision(),reason:'HTTP操作テスト'})});const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body;};
 await lifecycleRequest('company-archive');const hidden=await (await fetch(url+'/api/fam',{headers:{cookie}})).json();assert.equal(hidden.companyLifecycleEnabled,true);assert(!hidden.companies.some(c=>c.id===cid));assert(hidden.archived_companies.some(c=>c.id===cid));await lifecycleRequest('company-restore');

 }finally{await new Promise(resolve=>server.close(resolve));}
});
