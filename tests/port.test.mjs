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
 }finally{await new Promise(resolve=>server.close(resolve));}
});
