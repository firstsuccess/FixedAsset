import {createContext,useContext,useEffect,useState} from 'react';
import {flushSync} from 'react-dom';
import {defaultTablePageSize} from '../domain/display';
export const TablePageSizeContext=createContext(defaultTablePageSize);
export const CategoryNamesContext=createContext<Record<string,string>>({});
export function useTableDisplay(){
 const pageSize=useContext(TablePageSizeContext);
 const [printing,setPrinting]=useState(false);
 useEffect(()=>{const start=()=>flushSync(()=>setPrinting(true)),end=()=>setPrinting(false);window.addEventListener('beforeprint',start);window.addEventListener('afterprint',end);return()=>{window.removeEventListener('beforeprint',start);window.removeEventListener('afterprint',end);};},[]);
 return {pageSize,printing};
}
