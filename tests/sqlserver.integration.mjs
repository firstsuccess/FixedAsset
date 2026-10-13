import {test} from 'node:test';
import assert from 'node:assert/strict';
import {settings} from '../server/config.ts';
import {connect} from '../server/sqlserver.ts';
const enabled=process.env.RUN_SQL_SERVER_TESTS==='true';
test('SQL Server実機: 接続・型・パラメーター・ロールバック・専用DB', {skip:!enabled},async()=>{
 const c=settings();if(!c.database.toLowerCase().includes('test'))throw Error('Use an isolated test database with test in its name');const db=await connect();try{
 const v=await db.prepare('SELECT ? AS value').bind(123456789012).first();assert.equal(v.value,123456789012);
 const marker='integration-'+crypto.randomUUID();await assert.rejects(()=>db.batch([db.prepare("INSERT INTO global_counters([key],value) VALUES(?,1)").bind(marker),db.prepare('SELECT 1/0 AS broken') ]));assert.equal(await db.prepare('SELECT value FROM global_counters WHERE key=?').bind(marker).first(),undefined);
 const DBName=await db.pool.request().query('SELECT DB_NAME() AS name');assert.equal(DBName.recordset[0].name,c.database);assert.notEqual(DBName.recordset[0].name.toLowerCase(),'accounting');
 }finally{await db.pool.close();}
});
