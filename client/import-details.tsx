type Row=Record<string,any>;
const fields=[['number','資産番号'],['name','名称'],['category','分類'],['acquisition_date','取得日'],['service_date','供用開始日'],['cost','取得価額'],['tax','消費税'],['ancillary','付随費用'],['department_id','部門ID'],['location_id','場所ID'],['manager','責任者'],['supplier','取得先'],['manufacturer','メーカー'],['model','型式'],['serial','製造番号'],['notes','備考']];
const bookFields=[['cost','簿別取得価額'],['method','償却方法'],['life','耐用年数'],['residual','残存簿価'],['account','資産科目'],['expense_account','費用科目'],['accumulated_account','累計額科目'],['legacy_tail_start','旧制度5年均等開始月']];
export default function ImportDetails({result}:{result:Row}){
 if(!result.data)return <p>{result.error??'この行は登録対象外です。'}</p>;
 const before=result.before,after=result.data;const rows=fields.map(([key,label])=>({label,before:before?.row[key],after:after.row[key]}));
 for(const [kind,label] of [['accounting','会計'],['tax','税務']]){const old=before?.books.find((b:Row)=>b.kind===kind),next=after.books.find((b:Row)=>b.kind===kind);for(const [key,name] of bookFields)rows.push({label:label+' '+name,before:old?.[key],after:next?.[key]});const oldOpening=before?.openings.find((o:Row)=>o.asset_book_id===old?.id),newOpening=after.openings.find((o:Row)=>o.asset_book_id===next?.id);for(const [key,name] of [['as_of','初期残高基準日'],['accumulated','初期償却累計額'],['balance','初期帳簿価額'],['revised_basis','改定取得価額']])rows.push({label:label+' '+name,before:oldOpening?.[key],after:newOpening?.[key]});}
 return <details className="panel" open><summary>{result.number} の変更前後</summary><div className="table-scroll"><table><thead><tr><th>項目</th><th>変更前</th><th>登録・変更後</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}><td>{row.label}</td><td>{String(row.before??'—')}</td><td>{String(row.after??'—')}</td></tr>)}</tbody></table></div></details>;
}
