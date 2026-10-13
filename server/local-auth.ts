import {env,requestContext} from './context';
import {settings} from './config';
import argon2 from 'argon2';
import {createHmac,pbkdf2Sync,timingSafeEqual} from 'node:crypto';
import {headers} from './context';
import {all,one,commit,revision,statement,insert,audit,id,now,database,type Row} from './repository';
export const COOKIE='monja_session';
let dummyHash:Promise<string>|undefined;
const FAILURE='ログインIDまたはパスワードが正しくないか、一時的に利用できません。';
const ADMIN='System Administrator';
const publicFields='u.id AS id,a.login_id,a.normalized_login_id,a.exempt_from_account_lockout,a.failed_login_count,a.locked_until,a.login_id_updated_at,a.login_id_updated_by,a.primary_company_id,a.department_id,u.display_name,u.role,u.active,u.email,u.created_at,u.last_login';
export function normalizeLogin(value:any){if(typeof value!=='string')throw Error('ログインIDは必須です');const v=value.trim().toLowerCase();if(!/^[a-z0-9._-]{3,64}$/.test(v))throw Error('ログインIDは半角英数字・ハイフン・アンダースコア・ピリオドの3〜64文字で入力してください');return v;}
export function checkPassword(p:any){if(typeof p!=='string'||p.length<12||p.length>128||/[\x00-\x1f\x7f]/.test(p))throw Error('パスワードは制御文字を含まない12〜128文字で入力してください');}
const hex=(b:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(v:string){return createHmac('sha256',settings().secret).update(v).digest('hex');}
export function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
export async function passwordHash(password:string){return argon2.hash(password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});}
export async function passwordMatches(password:any,hash:any){
 if(typeof password!=='string'||password.length>128||typeof hash!=='string')return false;
 if(hash.startsWith('$argon2id$')){const params=hash.match(/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/);if(!params||Number(params[1])<8192||Number(params[1])>262144||Number(params[2])<1||Number(params[2])>10||Number(params[3])<1||Number(params[3])>8)return false;try{return await argon2.verify(hash,password);}catch{return false;}}
 const parts=hash.split('$');if(parts.length!==4||parts[0]!=='pbkdf2-sha256-pepper'||parts[1]!=='100000'||!/^[a-f0-9]{32}$/.test(parts[2])||!/^[a-f0-9]{64}$/.test(parts[3])||!settings().sitesPepper)return false;
 const pre=createHmac('sha256',settings().sitesPepper).update(password).digest();const computed=pbkdf2Sync(pre,parts[2],100000,32,'sha256');return timingSafeEqual(computed,Buffer.from(parts[3],'hex'));
}
export async function ensureLocalAuth(){if(!await one("SELECT a.user_id FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.exempt_from_account_lockout=1 AND u.role='System Administrator' AND u.active=1"))throw Error('初期管理者が未設定です。npm run db:seed を実行してください');}
export async function authAudit(actor:string,op:string,before:any,after:any,result='success'){
 await database().prepare('INSERT INTO audit_logs(id,company_id,asset_id,operation,actor,date,before_json,after_json,reason,result) VALUES(?,NULL,NULL,?,?,?,?,?,?,?)').bind(id(),op,actor,now(),JSON.stringify(before??null),JSON.stringify(after??null),'アプリ認証・ユーザー管理',result).run();
}
export async function limitIP(ip:string){
 const bucket=Math.floor(Date.now()/60000),key=await digest('ip:'+ip);
 const r={count:await database().consumeRate(key,bucket)};
 if((r?.count??0)>20){await authAudit('ANONYMOUS','LOGIN_RATE_LIMIT',null,{ip_hash:key},'failed');throw Error('RATE_LIMIT: 時間を空けて再試行してください');}
 await database().prepare('DELETE FROM auth_rate_limits WHERE bucket<?').bind(bucket-1440).run();return key;
}
export async function login(loginID:any,password:any,ip:string,bootstrapCode?:string){await ensureLocalAuth();const ipHash=await limitIP(ip);let normalized='';try{normalized=normalizeLogin(loginID);}catch{}
 const row=await one('SELECT a.*,u.active,u.role FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.normalized_login_id=?',normalized);
 dummyHash??=passwordHash(randomToken());let valid=await passwordMatches(password,row?.password_hash??await dummyHash);
 if(row?.must_change_password&&row.password_hash.startsWith('$argon2id$')&&row.login_id===settings().initialLogin&&requestContext.getStore()?.local!==true)valid=false;
 const expired=!!row?.locked_until&&Date.parse(row.locked_until)<=Date.now();
 if(row&&expired){await database().prepare('UPDATE auth_accounts SET failed_login_count=0,locked_until=NULL WHERE user_id=? AND locked_until=?').bind(row.user_id,row.locked_until).run();await authAudit(row.user_id,'ACCOUNT_UNLOCK',null,{automatic:true});}
 if(!row||!row.active||(!row.exempt_from_account_lockout&&row.locked_until&&!expired)||!valid){
  if(row&&row.active&&(!row.locked_until||expired||row.exempt_from_account_lockout)){
   const until=new Date(Date.now()+15*60000).toISOString();
   await database().prepare('UPDATE auth_accounts SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN exempt_from_account_lockout=0 AND failed_login_count+1>=5 THEN ? ELSE NULL END WHERE user_id=? AND session_version=?').bind(until,row.user_id,row.session_version).run();const failed=await one('SELECT failed_login_count,locked_until FROM auth_accounts WHERE user_id=?',row.user_id);
   if(failed?.failed_login_count===5&&failed.locked_until)await authAudit(row.user_id,'ACCOUNT_LOCK',null,{locked_until:failed.locked_until});
  }
  await authAudit(row?.user_id??'ANONYMOUS','LOGIN_FAILED',null,{login_id:normalized,ip_hash:ipHash},'failed');throw Error('UNAUTHENTICATED: '+FAILURE);
 }
 if(!row.password_hash.startsWith('$argon2id$')){const upgraded=await passwordHash(password);const changed=await database().prepare('UPDATE auth_accounts SET password_hash=? WHERE user_id=? AND password_hash=? AND session_version=?').bind(upgraded,row.user_id,row.password_hash,row.session_version).run();if(!changed.meta.changes)throw Error('UNAUTHENTICATED: '+FAILURE);row.password_hash=upgraded;}
 const token=randomToken(),tokenHash=await digest(token),at=now(),expires=new Date(Date.now()+settings().absoluteHours*3600000).toISOString();
 const result=await database().batch([
  database().prepare('UPDATE auth_accounts SET failed_login_count=0,locked_until=NULL WHERE user_id=? AND session_version=? AND password_hash=? AND (exempt_from_account_lockout=1 OR locked_until IS NULL OR locked_until<=?)').bind(row.user_id,row.session_version,row.password_hash,at),
  database().prepare('INSERT INTO auth_sessions(token_hash,user_id,version,created_at,expires_at) SELECT ?,a.user_id,a.session_version,?,? FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND a.session_version=? AND a.password_hash=? AND u.active=1 AND a.normalized_login_id=? AND (a.exempt_from_account_lockout=1 OR a.locked_until IS NULL OR a.locked_until<=?)').bind(tokenHash,at,expires,row.user_id,row.session_version,row.password_hash,normalized,at),
  database().prepare('UPDATE users SET last_login=? WHERE id=?').bind(at,row.user_id)
 ]);
 if(!result[1].meta.changes)throw Error('UNAUTHENTICATED: '+FAILURE);
 await authAudit(row.user_id,'LOGIN',null,{login_id:row.login_id,ip_hash:ipHash});
 await database().prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(at).run();
 return {token,must_change_password:!!row.must_change_password};
}
export async function sessionIdentity(allowPasswordChange=false){const h=await headers();const token=h.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))throw Error('UNAUTHENTICATED: ログインしてください');
 const user=await one(`SELECT ${publicFields},a.must_change_password,s.token_hash FROM auth_sessions s JOIN auth_accounts a ON a.user_id=s.user_id JOIN users u ON u.id=a.user_id WHERE s.token_hash=? AND s.version=a.session_version AND s.expires_at>? AND s.last_seen_at>?`,await digest(token),now(),new Date(Date.now()-settings().idleMinutes*60000).toISOString());if(!user||!user.active)throw Error('UNAUTHENTICATED: ログインしてください');await database().prepare('UPDATE auth_sessions SET last_seen_at=? WHERE token_hash=?').bind(now(),user.token_hash).run();if(user.must_change_password&&!allowPasswordChange)throw Error('UNAUTHENTICATED: パスワード変更が必要です');return user;
}
export async function logout(){try{const u=await sessionIdentity(true);await database().prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(u.token_hash).run();await authAudit(u.id,'LOGOUT',null,null);}catch{} }
export async function reauthenticate(user:Row,password:any,ip:string){await limitIP(ip);const a=await one('SELECT * FROM auth_accounts WHERE user_id=?',user.id);if(!await passwordMatches(password,a?.password_hash)){await authAudit(user.id,'REAUTH_FAILED',null,null,'failed');throw Error('再認証に失敗しました');}return a!;}
export async function changePassword(old:any,next:any,ip:string){const u=await sessionIdentity(true);const expected=await revision();const a=await reauthenticate(u,old,ip);checkPassword(next);if(await passwordMatches(next,a.password_hash))throw Error('新しいパスワードを設定してください');const hash=await passwordHash(next);await commit(expected,t=>[statement('UPDATE auth_accounts SET password_hash=?,must_change_password=0,session_version=session_version+1,failed_login_count=0,locked_until=NULL WHERE user_id=? AND password_hash=?',[hash,u.id,a.password_hash],t),statement('DELETE FROM auth_sessions WHERE user_id=?',[u.id],t),statement('DELETE FROM auth_reset_tokens WHERE user_id=?',[u.id],t),audit(null,u.id,'PASSWORD_CHANGE',null,{user_id:u.id,sessions_revoked:true},'本人によるパスワード変更',t)]);}
export async function managedUsers(){return all(`SELECT ${publicFields} FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id ORDER BY u.created_at`);}
export async function manageUser(actor:Row,p:Row,ip:string){
 if(actor.role!==ADMIN)throw Error('FORBIDDEN: システム管理者のみ操作できます');await requireAuthRevision(p.revision);await reauthenticate(actor,p.password,ip);
 const roles=[ADMIN,'Company Administrator','Accounting Manager','Accounting User','Viewer','Auditor'];if(!roles.includes(p.role))throw Error('権限ロールが不正です');const normalized=normalizeLogin(p.login_id);const display=String(p.display_name??'').trim();if(!display||display.length>200)throw Error('表示名は1〜200文字です');if(![0,1].includes(p.active))throw Error('有効状態が不正です');
 const old=p.user_id?await one('SELECT * FROM users WHERE id=?',p.user_id):undefined;if(p.user_id&&!old)throw Error('ユーザーがありません');const account=old?await one('SELECT * FROM auth_accounts WHERE user_id=?',old.id):undefined;
 const duplicate=await one('SELECT user_id FROM auth_accounts WHERE normalized_login_id=?',normalized);if(duplicate&&duplicate.user_id!==old?.id)throw Error('ログインIDが重複しています');
 if(account?.exempt_from_account_lockout&&(p.role!==ADMIN||!p.active))throw Error('ロック例外を別の有効なシステム管理者へ移管してから変更してください');
 const cid=p.company_id||null,dep=p.department_id||null;if(cid&&!await one('SELECT id FROM companies WHERE id=?',cid))throw Error('会社がありません');if(dep&&!await one('SELECT id FROM departments WHERE id=? AND company_id=?',dep,cid))throw Error('部門が対象会社に属していません');if(p.role!==ADMIN&&!cid)throw Error('所属会社を選択してください');
 const uid=old?.id??id(),renamed=!!account&&account.normalized_login_id!==normalized;let hash=account?.password_hash;
 if(!account){checkPassword(p.initial_password);hash=await passwordHash(p.initial_password);}
 const at=now();const result=await commit(p.revision,t=>[
  ...(old?[statement('UPDATE users SET display_name=?,role=?,active=? WHERE id=?',[display,p.role===ADMIN?ADMIN:'Member',p.active,uid],t)]:[insert('users',{id:uid,email:'local-'+uid+'@internal.invalid',identity_id:null,display_name:display,role:p.role===ADMIN?ADMIN:'Member',active:p.active,created_at:at,last_login:null},t)]),
  ...(account?[statement('UPDATE auth_accounts SET login_id=?,normalized_login_id=?,primary_company_id=?,department_id=?,session_version=session_version+1,login_id_updated_at=CASE WHEN normalized_login_id<>? THEN ? ELSE login_id_updated_at END,login_id_updated_by=CASE WHEN normalized_login_id<>? THEN ? ELSE login_id_updated_by END WHERE user_id=?',[normalized,normalized,cid,dep,normalized,at,normalized,actor.id,uid],t)]:[insert('auth_accounts',{user_id:uid,login_id:normalized,normalized_login_id:normalized,password_hash:hash,exempt_from_account_lockout:0,failed_login_count:0,locked_until:null,session_version:1,must_change_password:1,login_id_updated_at:at,login_id_updated_by:actor.id,primary_company_id:cid,department_id:dep},t)]),
  statement('DELETE FROM auth_sessions WHERE user_id=?',[uid],t),statement('DELETE FROM auth_reset_tokens WHERE user_id=?',[uid],t),
  ...(p.role===ADMIN?[statement('DELETE FROM user_company_permissions WHERE user_id=?',[uid],t)]:[statement('DELETE FROM user_company_permissions WHERE user_id=? AND company_id=?',[uid,cid],t),insert('user_company_permissions',{id:id(),user_id:uid,company_id:cid,role:p.role},t)]),
  audit(cid,actor.id,renamed?'LOGIN_ID_CHANGE':'USER_UPDATE',old?{user_id:uid,login_id:account?.login_id,display_name:old.display_name,role:old.role,active:old.active}:null,{user_id:uid,login_id:normalized,display_name:display,role:p.role,active:p.active,company_id:cid,department_id:dep,sessions_revoked:true},'再認証済みユーザー管理',t)
 ]);return {revision:result,user_id:uid,self_changed:uid===actor.id};
}
export async function transferExemption(actor:Row,target:string,password:any,expected:number,ip:string){if(actor.role!==ADMIN)throw Error('FORBIDDEN: システム管理者のみ操作できます');await requireAuthRevision(expected);await reauthenticate(actor,password,ip);const next=await one('SELECT u.*,a.user_id FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=? AND u.active=1 AND u.role=?',target,ADMIN);if(!next)throw Error('有効なシステム管理者を選択してください');const old=await one('SELECT user_id FROM auth_accounts WHERE exempt_from_account_lockout=1');await commit(expected,t=>[statement('UPDATE auth_accounts SET exempt_from_account_lockout=0 WHERE exempt_from_account_lockout=1',[],t),statement('UPDATE auth_accounts SET exempt_from_account_lockout=1,failed_login_count=0,locked_until=NULL WHERE user_id=?',[target],t),audit(null,actor.id,'LOCKOUT_EXEMPTION_CHANGE',{user_id:old?.user_id},{user_id:target},'管理者の再認証による例外移管',t)]);}
export async function unlockAccount(actor:Row,target:string,password:any,expected:number,ip:string){if(actor.role!==ADMIN)throw Error('FORBIDDEN: 管理者のみ操作できます');await requireAuthRevision(expected);await reauthenticate(actor,password,ip);await commit(expected,t=>[statement('UPDATE auth_accounts SET failed_login_count=0,locked_until=NULL WHERE user_id=?',[target],t),audit(null,actor.id,'ACCOUNT_UNLOCK',null,{user_id:target},'再認証済み管理者による解除',t)]);}
export async function issueReset(actor:Row,target:string,password:any,expected:number,ip:string){if(actor.role!==ADMIN)throw Error('FORBIDDEN: 管理者のみ操作できます');await requireAuthRevision(expected);await reauthenticate(actor,password,ip);const u=await one('SELECT a.user_id,u.active FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=?',target);if(!u?.active)throw Error('有効なユーザーを選択してください');const token=randomToken(),hash=await digest(token);await commit(expected,t=>[statement('DELETE FROM auth_reset_tokens WHERE user_id=?',[target],t),insert('auth_reset_tokens',{token_hash:hash,user_id:target,expires_at:new Date(Date.now()+30*60000).toISOString()},t),statement('UPDATE auth_accounts SET session_version=session_version+1 WHERE user_id=?',[target],t),statement('DELETE FROM auth_sessions WHERE user_id=?',[target],t),audit(null,actor.id,'PASSWORD_RESET_ISSUED',null,{user_id:target,expires_minutes:30},'再認証済み管理者のリセット発行',t)]);return {token};}
export async function completeReset(token:any,password:any,ip:string){await limitIP(ip);checkPassword(password);if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('リセット情報が無効か期限切れです');const tokenHash=await digest(token),r=await one('SELECT r.*,u.active FROM auth_reset_tokens r JOIN users u ON u.id=r.user_id WHERE token_hash=? AND expires_at>?',tokenHash,now());if(!r?.active)throw Error('リセット情報が無効か期限切れです');const hash=await passwordHash(password);const result=await database().batch([
 database().prepare('UPDATE auth_accounts SET password_hash=?,must_change_password=0,session_version=session_version+1,failed_login_count=0,locked_until=NULL WHERE user_id=? AND EXISTS(SELECT 1 FROM auth_reset_tokens WHERE token_hash=? AND expires_at>?)').bind(hash,r.user_id,tokenHash,now()),
 database().prepare('DELETE FROM auth_reset_tokens WHERE token_hash=?').bind(tokenHash),
 database().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(r.user_id)
 ]);if(!result[0].meta.changes)throw Error('リセット情報が無効か期限切れです');await authAudit(r.user_id,'PASSWORD_RESET_COMPLETE',null,{user_id:r.user_id,sessions_revoked:true});}
export function sessionCookie(token:string){const c=settings();return `${COOKIE}=${token}; Path=${c.basePath}; HttpOnly; ${c.secure?'Secure; ':''}SameSite=Strict; Max-Age=${token?c.absoluteHours*3600:0}`;}

export function validateAuthBackup(accounts:any,users:Row[],companies:Row[],departments:Row[]){
 if(!Array.isArray(accounts)||accounts.length>10000)throw Error('認証バックアップが不正です');
 const fields=['user_id','login_id','normalized_login_id','password_hash','exempt_from_account_lockout','failed_login_count','locked_until','session_version','must_change_password','login_id_updated_at','login_id_updated_by','primary_company_id','department_id'].sort().join();
 const seen=new Set(),ids=new Set();let exemptions=0;
 for(const a of accounts){if(!a||Object.keys(a).sort().join()!==fields)throw Error('認証バックアップの項目が不正です');const u=users.find(u=>u.id===a.user_id);if(!u||ids.has(a.user_id))throw Error('認証ユーザーの参照が不正です');ids.add(a.user_id);if(a.login_id!==normalizeLogin(a.login_id)||a.normalized_login_id!==a.login_id||seen.has(a.login_id))throw Error('認証ログインIDが不正・重複しています');seen.add(a.login_id);
 if(typeof a.password_hash!=='string'||(!/^pbkdf2-sha256-pepper\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(a.password_hash)&&!/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/.test(a.password_hash)))throw Error('パスワードハッシュ形式が不正です');
 if(![0,1].includes(a.exempt_from_account_lockout)||![0,1].includes(a.must_change_password)||!Number.isSafeInteger(a.failed_login_count)||a.failed_login_count<0||!Number.isSafeInteger(a.session_version)||a.session_version<1)throw Error('認証状態が不正です');
 if(a.exempt_from_account_lockout){exemptions++;if(u.role!==ADMIN||!u.active)throw Error('ロック例外の管理者が無効です');}
 if(a.primary_company_id&&!companies.some(c=>c.id===a.primary_company_id))throw Error('所属会社がありません');if(a.department_id&&!departments.some(d=>d.id===a.department_id&&d.company_id===a.primary_company_id))throw Error('所属部門が不正です');
 for(const k of ['locked_until','login_id_updated_at'])if(a[k]!==null&&(typeof a[k]!=='string'||!Number.isFinite(Date.parse(a[k]))))throw Error('認証日時が不正です');if(a.login_id_updated_by!==null&&typeof a.login_id_updated_by!=='string')throw Error('変更者IDが不正です');
 }
 if(exemptions!==1)throw Error('有効なロック例外管理者が1名必要です');
}

export async function requestIP(){return requestContext.getStore()?.ip??'unknown';}

export async function requireAuthRevision(expected:any){if(!Number.isSafeInteger(expected)||expected!==await revision())throw Error('CONFLICT: 別の操作で更新されています。画面を再読込してください');}
