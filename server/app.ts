import express from 'express';
import helmet from 'helmet';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {settings} from './config';
import type {SqlServerDatabase} from './sqlserver';
import {requestContext,setDatabase} from './context';
import * as auth from './local-auth';
import * as business from './service';
export function createApplication(db:SqlServerDatabase,c=settings()){setDatabase(db);
const app=express();app.disable('x-powered-by');if(c.trustProxy)app.set('trust proxy',c.proxyAddresses);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:","blob:"],connectSrc:["'self'"],frameAncestors:["'none'"]}},strictTransportSecurity:c.secure?{maxAge:31536000,includeSubDomains:false}:false}));
app.use(express.json({limit:'12mb'}));app.use((req,res,next)=>{const h=new Headers();for(const [k,v] of Object.entries(req.headers))if(v)h.set(k,Array.isArray(v)?v.join(','):v);const ip=req.ip??req.socket.remoteAddress??'unknown';const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);requestContext.run({headers:h,ip,local},next);});
const router=express.Router();
router.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.use((req,_res,next)=>{if(req.method==='POST'){if(req.get('origin')!==c.origin)return next(Error('FORBIDDEN: 同一Siteから操作してください'));if(!req.is('application/json'))return next(Error('JSON形式が必要です'));}next();});
router.get('/health',async(_req,res)=>{await db.prepare('SELECT 1 AS ready').first();res.json({status:'ok',application:c.name,version:'1.0.0'});});
router.get('/api/config',(_req,res)=>res.json({name:c.name,nameEN:c.nameEN,basePath:c.basePath,timezone:c.timezone}));
router.get('/api/auth',async(_req,res)=>{try{const u=await auth.sessionIdentity(true);res.json({user:{id:u.id,login_id:u.login_id,display_name:u.display_name,role:u.role,must_change_password:!!u.must_change_password}});}catch{res.status(401).json({user:null});}});
router.post('/api/auth',async(req,res)=>{const p=req.body,ip=requestContext.getStore()!.ip;let result:any={},cookie:string|undefined;
 if(JSON.stringify(p).length>8192)throw Error('入力サイズが大きすぎます');
 if(p.action==='login'){const r=await auth.login(p.login_id,p.password,ip);cookie=auth.sessionCookie(r.token);result={must_change_password:r.must_change_password};}
 else if(p.action==='logout'){await auth.logout();cookie=auth.sessionCookie('');}
 else if(p.action==='change-password'){await auth.changePassword(p.password,p.new_password,ip);cookie=auth.sessionCookie('');}
 else if(p.action==='reset-complete'){await auth.completeReset(p.token,p.new_password,ip);cookie=auth.sessionCookie('');}
 else{const u=await auth.sessionIdentity();if(p.action==='user-save'){result=await auth.manageUser(u,p,ip);if(result.self_changed)cookie=auth.sessionCookie('');}else if(p.action==='exemption-transfer')await auth.transferExemption(u,p.user_id,p.password,p.revision,ip);else if(p.action==='unlock')await auth.unlockAccount(u,p.user_id,p.password,p.revision,ip);else if(p.action==='reset-issue'){result=await auth.issueReset(u,p.user_id,p.password,p.revision,ip);if(p.user_id===u.id)cookie=auth.sessionCookie('');}else throw Error('操作が不正です');}
 if(cookie)res.set('Set-Cookie',cookie);res.json({result});
});
router.get('/api/fam',async(req,res)=>{const cid=String(req.query.company??''),type=req.query.type,month=String(req.query.month??''),asOf=String(req.query.as_of??'');let result;if(type==='masters')result=await business.masterData();else if(type==='preview')result=await business.preview(cid,month);else if(type==='run')result=await business.runData(cid,month);else if(type==='balances')result=await business.balances(cid,asOf);else if(type==='schedule')result=await business.scheduleData(cid,month,String(req.query.to??month));else if(type==='journals')result=await business.journals(cid);else if(type==='logs')result=await business.logs(cid);else result=await business.getState(cid||undefined);res.json(result);});
router.post('/api/fam',async(req,res)=>res.json({result:await business.dispatch(req.body)}));
router.get('/api/counters',async(_req,res)=>res.json({access:(await db.prepare("SELECT value FROM global_counters WHERE key='access'").first())?.value??0}));
router.post('/api/counters',async(req,res)=>{if(req.body.type!=='access')throw Error('操作が不正です');res.json({access:await db.incrementCounter('access')});});
const project=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
router.use(express.static(path.join(project,'dist','client'),{index:false}));
router.get('/{*path}',(_req,res)=>res.sendFile(path.join(project,'dist','client','index.html')));
app.use(c.basePath==='/'?'/':c.basePath.slice(0,-1),router);
app.use(async(err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{const m=String(err?.message??'処理に失敗しました');const status=m.startsWith('UNAUTHENTICATED')?401:m.startsWith('FORBIDDEN')?403:m.startsWith('CONFLICT')?409:m.startsWith('RATE_LIMIT')?429:400;try{await auth.authAudit('ANONYMOUS','API_FAILED',null,{status,message:err.code?'database_error':m},'failed');}catch{}if(status===429)res.set('Retry-After','60');res.status(status).json({error:err.code?'データベース処理に失敗しました。設定・制約を確認してください。':m.replace(/^(UNAUTHENTICATED|RATE_LIMIT): /,'')});});
return app;
}
