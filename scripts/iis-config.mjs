import 'dotenv/config';
import {writeFile,mkdir} from 'node:fs/promises';
const port=Number(process.env.PORT),prefix=process.env.BASE_PATH??'/';if(!Number.isInteger(port)||port<1||port>65535)throw Error('Set PORT in .env');
if(prefix!=='/')throw Error('This template targets BASE_PATH=/; use a dedicated host until the path deployment is validated');
await mkdir('iis',{recursive:true});
await writeFile('iis/web.config',`<?xml version="1.0" encoding="utf-8"?>
<configuration><system.webServer>
 <rewrite><rules><rule name="MONJA assets proxy" stopProcessing="true"><match url="(.*)"/><serverVariables><set name="HTTP_X_FORWARDED_PROTO" value="https"/><set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}"/></serverVariables><action type="Rewrite" url="http://127.0.0.1:${port}/{R:1}"/></rule></rules></rewrite>
 <security><requestFiltering><requestLimits maxAllowedContentLength="12582912"/></requestFiltering></security>
</system.webServer></configuration>`);
console.log('iis/web.config generated from PORT. IIS was not modified.');
