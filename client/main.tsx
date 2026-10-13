import React from 'react';
import {createRoot} from 'react-dom/client';
import Workspace from './workspace';
import AuthPanel from './auth-panel';
import './globals.css';
declare const __BASE_PATH__:string;
declare const __APP_NAME__:string;
declare const __APP_NAME_EN__:string;
const prefix=__BASE_PATH__.replace(/\/$/,'');
const originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>originalFetch(typeof input==='string'&&input.startsWith('/api/')?prefix+input:input,init);
// Existing same-origin routes use configured paths; all redirects and links are updated at source-build time.
function App(){const [u,setU]=React.useState<any>(undefined),[error,setError]=React.useState('');React.useEffect(()=>{document.title=__APP_NAME__+' / '+__APP_NAME_EN__;fetch('/api/auth').then(r=>r.json()).then(d=>setU(d.user)).catch(()=>setError('サーバーへ接続できません'));},[]);if(error)return <main className="login"><h1>{error}</h1></main>;if(u===undefined)return <div className="loading">読み込み中…</div>;if(!u)return <AuthPanel/>;if(u.must_change_password)return <AuthPanel changeRequired/>;if(location.pathname===prefix+'/password')return <AuthPanel changeOnly/>;return <Workspace/>;}
createRoot(document.getElementById('root')!).render(<App/>);
