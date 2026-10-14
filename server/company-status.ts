import {all,one} from './repository';
export const companyArchiveKey=(company:string)=>'company-archive:'+company;
export async function isCompanyArchived(company:string){const row=await one('SELECT id FROM system_parameters WHERE key=?',companyArchiveKey(company));return !!row;}
export async function requireActiveCompany(company:string){if(await isCompanyArchived(company))throw Error('FORBIDDEN: この会社はアーカイブ中です。本番復帰後に利用してください');}
export async function archivedCompanyIds(){const rows=await all('SELECT key FROM system_parameters');return new Set(rows.filter(r=>r.key.startsWith('company-archive:')).map(r=>r.key.slice('company-archive:'.length)));}
