import {AsyncLocalStorage} from 'node:async_hooks';
import {settings} from './config';
export const requestContext=new AsyncLocalStorage<{headers:Headers;ip:string;local:boolean}>();
export async function headers(){return requestContext.getStore()?.headers??new Headers();}
export const env=new Proxy({} as Record<string,any>,{get(_,name:string){if(name==='DB')return databaseInstance;const c=settings();return ({AUTH_PEPPER:c.sitesPepper,AUTH_INITIAL_PASSWORD_HASH:'not-a-valid-initial-hash',AUTH_BOOTSTRAP_CODE_HASH:undefined})[name as 'AUTH_PEPPER'];}});
let databaseInstance:any;
export function setDatabase(db:any){databaseInstance=db;}
