import {createHmac} from 'node:crypto';
import {settings} from './config';
export function importReviewToken(user:string,company:string,csv:string,mode:string,revision:number){
 return createHmac('sha256',settings().secret).update(JSON.stringify({user,company,csv,mode,revision})).digest('hex');
}
