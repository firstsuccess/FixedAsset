import {sessionIdentity} from './local-auth';
import {one,all,commit,revision,statement,audit,now} from './repository';
export const OWNER_EMAIL='admin1@local.invalid';
export async function identity(){const {token_hash,...u}=await sessionIdentity();return u;}
export async function authorize(user:any,companyId:string,level='read'){if(user.role==='System Administrator')return;const p=await one('SELECT role FROM user_company_permissions WHERE user_id=? AND company_id=?',user.id,companyId);if(!p)throw Error('FORBIDDEN: この会社を参照する権限がありません');const roles:Record<string,string[]>={read:['Company Administrator','Accounting Manager','Accounting User','Viewer','Auditor'],write:['Company Administrator','Accounting Manager','Accounting User'],close:['Company Administrator','Accounting Manager'],admin:['Company Administrator']};if(!(roles[level]??[]).includes(p.role))throw Error('FORBIDDEN: 操作権限がありません');}
export function systemAdmin(user:any){if(user.role!=='System Administrator')throw Error('FORBIDDEN: システム管理者のみ操作できます');}
export async function visibleCompanies(user:any){return user.role==='System Administrator'?all('SELECT * FROM companies ORDER BY code'):all('SELECT c.* FROM companies c JOIN user_company_permissions p ON c.id=p.company_id WHERE p.user_id=? ORDER BY c.code',user.id);}
