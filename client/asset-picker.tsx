import {CategoryNamesContext,useTableDisplay} from './table-display';
import {useEffect,useState,useContext} from 'react';
type Asset=Record<string,any>;
export default function AssetPicker({assets,onSelect}:{assets:Asset[];onSelect:(asset:Asset)=>void}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 const {pageSize,printing}=useTableDisplay();useEffect(()=>setPage(0),[pageSize]);
 const categoryNames=useContext(CategoryNamesContext);
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const matches=assets.filter(a=>{const text=[a.number,a.name,categoryNames[a.category]??a.category,a.department_name,a.location_name,a.manager].join(' ').toLocaleLowerCase();return words.every(word=>text.includes(word));});
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.min(page,pages-1);
 return <div className="stack"><label className="field"><span>資産番号・名称・分類・部門・場所・管理責任者で検索</span><input autoFocus type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="例：パソコン 営業"/></label><p role="status">検索結果 {matches.length}件</p><div className="table-scroll"><table><thead><tr><th>資産番号</th><th>名称</th><th>分類</th><th>部門</th><th>供用開始日</th><th>選択</th></tr></thead><tbody>{(printing?matches:matches.slice(current*pageSize,(current+1)*pageSize)).map(a=><tr key={a.id}><td>{a.number}</td><td>{a.name}</td><td>{categoryNames[a.category]??a.category}</td><td>{a.department_name||'—'}</td><td>{a.service_date}</td><td><button type="button" className="secondary" onClick={()=>onSelect(a)}>変更する</button></td></tr>)}{!matches.length&&<tr><td colSpan={6}>該当する資産がありません。検索条件を変更してください。</td></tr>}</tbody></table></div><div className="pagination"><span>{matches.length?current*pageSize+1:0}–{Math.min((current+1)*pageSize,matches.length)} / {matches.length}件</span><div><button type="button" disabled={current===0} onClick={()=>setPage(current-1)}>前へ</button><span>{current+1} / {pages}</span><button type="button" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>次へ</button></div></div></div>;
}
