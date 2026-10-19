import {connect} from '../server/sqlserver';
import {setDatabase} from '../server/context';
import {settings} from '../server/config';
import {initialize,ensureLegacyMasters,ensureLumpSumMasters} from '../server/service';
import {all,one,id,now,insert,database} from '../server/repository';
import {normalizeLogin,passwordHash} from '../server/local-auth';
const db=await connect();setDatabase(db);const c=settings();
try{
 if(!await one("SELECT id FROM system_parameters WHERE key='initialized'")){if((await all('SELECT id FROM users')).length)throw Error('Partial seed detected; inspect before reseeding');await initialize({id:id(),email:'admin1@local.invalid',display_name:'管理者',role:'System Administrator',bootstrap:true,provisioned:true});}
 await ensureLegacyMasters();await ensureLumpSumMasters();
 if(!(await all('SELECT user_id FROM auth_accounts')).length){const admins=await all("SELECT * FROM users WHERE role='System Administrator' AND active=1");if(admins.length!==1)throw Error('Select exactly one existing active administrator before initial authentication seed');const login=normalizeLogin(c.initialLogin);await database().batch([insert('auth_accounts',{user_id:admins[0].id,login_id:login,normalized_login_id:login,password_hash:await passwordHash('password'),exempt_from_account_lockout:1,failed_login_count:0,locked_until:null,session_version:1,must_change_password:1,login_id_updated_at:now(),login_id_updated_by:'SYSTEM',primary_company_id:null,department_id:null})]);console.log('Initial administrator prepared. Change the initial password from localhost before network publication.');}
 else console.log('Existing authentication preserved; no passwords were overwritten.');
 console.log('Standard masters ready.');
}finally{await db.pool.close();}
