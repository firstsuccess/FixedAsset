import readline from 'node:readline';
import {connect} from '../server/sqlserver';
import {setDatabase} from '../server/context';
import {one,commit,revision,statement,audit} from '../server/repository';
import {normalizeLogin,passwordHash,checkPassword} from '../server/local-auth';
// Only an OS operator holding .env/DB credentials can run this offline recovery tool.
function hidden(question:string):Promise<string>{return new Promise(resolve=>{const r=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});let hiding=false;const write=(r as any)._writeToOutput.bind(r);(r as any)._writeToOutput=(s:string)=>{if(!hiding)write(s);};r.question(question,v=>{r.close();process.stdout.write('\n');resolve(v);});hiding=true;});}
const login=normalizeLogin(process.argv[2]);const db=await connect();setDatabase(db);
try{const u=await one('SELECT a.user_id,u.role,u.active FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE normalized_login_id=?',login);if(!u||!u.active)throw Error('Active user not found');const password=process.env.NEW_ADMIN_PASSWORD??await hidden('New temporary password (hidden): ');checkPassword(password);const awaitHash=await passwordHash(password);await commit(await revision(),t=>[statement('UPDATE auth_accounts SET password_hash=?,must_change_password=1,session_version=session_version+1,failed_login_count=0,locked_until=NULL WHERE user_id=?',[awaitHash,u.user_id],t),statement('DELETE FROM auth_sessions WHERE user_id=?',[u.user_id],t),statement('DELETE FROM auth_reset_tokens WHERE user_id=?',[u.user_id],t),audit(null,'OS_OPERATOR','PASSWORD_RECOVERY',null,{user_id:u.user_id},'OS資格情報を持つ運用者による一時パスワード設定',t)]);
console.log('Temporary password set; user UUID preserved and sessions revoked.');}catch(e){throw e;}finally{await db.pool.close();}
