import assert from 'node:assert/strict';
import {test} from 'node:test';
import {schedule,disposalSchedule} from '../domain/engine.ts';
import {lumpSumSchedules} from '../domain/lump-sum.ts';
const settings={first_month:'2026-04',rounding:'floor',tax_rounding:'floor',adjustment:'year_end',adjustment_month:3,posting:'indirect'};
const book={id:'one',asset_id:'asset-one',kind:'tax',cost:180000,life:3,method:'lumpSum3',residual:0,rounding:'floor',start_month:'2026-10'};
const sum=rows=>rows.reduce((n,r)=>n+r.amount,0);
test('一括償却: 期中取得も初年度1/3、3年度で残高0・36か月定額法と区別',()=>{
 const rows=schedule(book,3,settings,'2029-04');assert.equal(sum(rows.filter(r=>r.month<='2027-03')),60000);assert.equal(rows.find(r=>r.month==='2026-10').amount,10000);assert.equal(sum(rows.filter(r=>r.month>='2027-04'&&r.month<='2028-03')),60000);assert.equal(sum(rows),180000);assert.equal(rows.find(r=>r.month==='2029-03').closing,0);assert.equal(rows.at(-1).amount,0);
 const march=schedule({...book,start_month:'2027-03'},3,settings,'2027-03');assert.equal(march[0].amount,60000);
});
test('一括償却: 同じ年度は合算して円未満処理・3年度目で全額調整',()=>{
 for(const kind of ['accounting','tax'])for(const rounding of ['floor','round','ceil']){const books=[{...book,id:'a',kind,rounding,cost:100001},{...book,id:'b',kind,rounding,cost:100001,start_month:'2027-03'}];const group=lumpSumSchedules(books,3,settings,'2029-03');const first=[...group.values()].flat().filter(r=>r.month<='2027-03');const expected=kind==='tax'||rounding!=='ceil'?66667:66668;assert.equal(sum(first),expected);assert.equal(sum([...group.values()].flat()),200002);assert([...group.values()].every(rows=>rows.at(-1).closing===0&&rows.every(r=>r.amount>=0&&r.closing>=0)));}
});
test('一括償却: 後月資産追加でも確定済み前月の金額・残高を変えない',()=>{
 const first={...book,cost:100001},second={...book,id:'two',asset_id:'two',cost:100001,start_month:'2027-01'};
 const before=lumpSumSchedules([first],3,settings,'2026-12').get(first.id),after=lumpSumSchedules([first,second],3,settings,'2026-12').get(first.id);
 assert.deepEqual(before.map(({annual_amount,...row})=>row),after.map(({annual_amount,...row})=>row));
});
test('一括償却: 少額・複数資産・各端数処理で合計と非負残高を保証',()=>{
 for(const cost of [1,2,4,35,100001,199999])for(const kind of ['tax','accounting'])for(const rounding of ['floor','round','ceil']){const books=Array.from({length:4},(_,i)=>({...book,id:'b'+i,kind,rounding,cost,start_month:i%2?'2027-03':'2026-04'}));const result=lumpSumSchedules(books,3,settings,'2029-03');assert.equal(sum([...result.values()].flat()),cost*4);assert([...result.values()].every(rows=>rows.every(r=>r.amount>=0&&r.closing>=0)&&rows.at(-1).closing===0));}
});
test('一括償却: 個人は暦年・税務端数切上げ、3年目調整',()=>{
 const rows=schedule({...book,cost:100001,start_month:'2026-12'},12,{...settings,company_kind:'individual'},'2028-12');assert.equal(rows[0].amount,33334);assert.equal(sum(rows.filter(r=>r.month.startsWith('2027'))),33334);assert.equal(sum(rows.filter(r=>r.month.startsWith('2028'))),33333);assert.equal(rows.at(-1).closing,0);
});
test('一括償却: 決算月末の初期残高と同一グループ累計額を検証',()=>{
 const migrated={...book,start_month:'2025-10'};const opening={as_of:'2026-03-31',accumulated:60000,balance:120000,revised_basis:0,impairment:0};const rows=lumpSumSchedules([migrated],3,settings,'2028-03',{one:opening},true).get('one');assert.equal(sum(rows),120000);assert.equal(rows[0].opening,120000);assert.equal(rows.at(-1).closing,0);
 assert.throws(()=>lumpSumSchedules([migrated],3,settings,'2027-03',{one:{...opening,as_of:'2026-05-31'}},true),/決算月末/);
 assert.throws(()=>lumpSumSchedules([migrated],3,settings,'2027-03',{one:{...opening,accumulated:1,balance:179999}},true),/初期累計額/);
 assert.throws(()=>schedule({...book,cost:200000},3,settings,'2027-03'),/20万円/);
});
test('一括償却: 除却月も通常の配賦を維持して残額を一括費用化しない',()=>{
 const normal=schedule(book,3,settings,'2026-12');assert.deepEqual(disposalSchedule(book,3,settings,'2026-12'),normal);assert.equal(normal.at(-1).closing,150000);
});
