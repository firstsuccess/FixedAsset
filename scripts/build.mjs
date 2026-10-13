import {build as viteBuild} from 'vite';
import react from '@vitejs/plugin-react';
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import 'dotenv/config';
const rawPrefix=process.env.BASE_PATH??'/';const prefix=rawPrefix==='/'?'/':'/'+rawPrefix.split('/').filter(Boolean).join('/')+'/';if(!prefix.startsWith('/'))throw Error('Invalid BASE_PATH');
await viteBuild({root:'client',base:prefix,plugins:[react()],build:{outDir:'../dist/client',emptyOutDir:true},define:{__BASE_PATH__:JSON.stringify(prefix),__APP_NAME__:JSON.stringify(process.env.APP_NAME??'もんじゃ固定資産管理'),__APP_NAME_EN__:JSON.stringify(process.env.APP_NAME_EN??'MONJA FIXED ASSET SYSTEM'),__APP_TIMEZONE__:JSON.stringify(process.env.APP_TIMEZONE??'Asia/Tokyo')}});
await mkdir('dist',{recursive:true});await build({entryPoints:['server/index.ts'],outfile:'dist/server.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
console.log('Standalone Node.js build ready.');
