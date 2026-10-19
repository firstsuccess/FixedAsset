import {ensureLumpSumMasters} from './service';
import {setDatabase} from './context';
import {connect} from './sqlserver';
import {settings} from './config';
import {createApplication} from './app';
const c=settings(),db=await connect();setDatabase(db);await ensureLumpSumMasters();const app=createApplication(db,c);
const server=app.listen(c.port,c.host,()=>console.log(`${c.name}: ${c.publicURL}${c.basePath==='/'?'/':c.basePath}`));
const shutdown=()=>server.close(()=>{db.pool.close().finally(()=>process.exit(0));});process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
