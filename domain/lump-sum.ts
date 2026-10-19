import {monthNumber,monthString,roundFraction,type Book,type Opening,type Settings,type Monthly} from './engine';
export function fiscalStart(month:string,endMonth:number){const n=monthNumber(month);return n-((n%12+1-endMonth-1+12)%12);}
export function validateLumpBook(book:Book){if(!Number.isSafeInteger(book.cost)||book.cost<1||book.cost>=200000)throw Error('一括償却資産の取得価額は20万円未満です');if(book.life!==3||book.residual!==0)throw Error('一括償却資産は3年・残存簿価0円です');}
export function lumpAnnualRounding(book:Book,settings:Settings){return book.kind==='tax'?(settings.company_kind==='individual'?'ceil':'floor'):book.rounding;}
// One fiscal-year pool per book kind. Pool rounding is reconciled only in the fiscal
// year-end month, so adding a later-service asset cannot rewrite earlier months.
export function lumpSumSchedules(books:Book[],fiscalEnd:number,settings:Settings,toMonth:string,openings:Record<string,Opening|undefined>={},strictOpeningTotals=false){
 if(!Number.isInteger(fiscalEnd)||fiscalEnd<1||fiscalEnd>12||settings.company_kind==='individual'&&fiscalEnd!==12)throw Error('一括償却資産の決算月が不正です');
 if(new Set(books.map(book=>book.id)).size!==books.length)throw Error('一括償却簿のIDが重複しています');
 const output=new Map<string,Monthly[]>(),groups=new Map<string,Book[]>();const end=monthNumber(toMonth);
 for(const book of books){validateLumpBook(book);const key=book.kind+':'+fiscalStart(book.start_month,fiscalEnd);const group=groups.get(key)??[];group.push(book);groups.set(key,group);output.set(book.id,[]);}
 for(const group of groups.values()){
  group.sort((a,b)=>b.start_month.localeCompare(a.start_month)||a.id.localeCompare(b.id));
  const cohort=fiscalStart(group[0].start_month,fiscalEnd),total=group.reduce((n,b)=>n+b.cost,0);if(!Number.isSafeInteger(total))throw Error('一括償却グループの金額が計算上限を超えています');
  const annualMode=lumpAnnualRounding(group[0],settings),annualLimit=roundFraction(BigInt(total),3n,annualMode);
  if(group.some(book=>lumpAnnualRounding(book,settings)!==annualMode))throw Error('一括償却グループの端数設定を統一してください');
  for(const book of group){const opening=openings[book.id];if(opening){const n=monthNumber(opening.as_of.slice(0,7));const last=new Date(Date.UTC(Math.floor(n/12),n%12+1,0)).toISOString().slice(0,10);if(opening.as_of!==last)throw Error('一括償却資産の初期残高は月末日を指定してください');}}
  const starts=group.filter(b=>openings[b.id]).map(b=>monthNumber(openings[b.id]!.as_of.slice(0,7))+1);
  if(new Set(starts).size>1)throw Error('同じ一括償却グループの初期残高基準日を統一してください');
  const start=starts[0]??cohort;if(starts.length&&start<cohort+12)throw Error('一括償却資産の初期残高は供用年度の決算月末以降です');
  if(starts.length&&start!==fiscalStart(monthString(start),fiscalEnd))throw Error('一括償却資産の初期残高は決算月末基準です');
  const states=new Map<string,{balance:number;accumulated:number}>();
  for(const book of group){const opening=openings[book.id];if(opening){if(opening.impairment||opening.revised_basis||opening.balance+opening.accumulated!==book.cost||opening.balance<0||opening.accumulated<0||!Number.isSafeInteger(opening.balance)||!Number.isSafeInteger(opening.accumulated))throw Error('一括償却資産の初期残高が不正です');}else if(starts.length&&monthNumber(book.start_month)<start)throw Error('同じ供用年度の一括償却資産には全件の初期残高が必要です');states.set(book.id,{balance:opening?.balance??book.cost,accumulated:opening?.accumulated??0});}
  const elapsed=Math.max(0,Math.floor((start-cohort)/12));
  const openingAccumulated=[...states.values()].reduce((n,s)=>n+s.accumulated,0);
  if(strictOpeningTotals&&starts.length&&openingAccumulated!==(elapsed>=3?total:Math.min(total,annualLimit*elapsed)))throw Error('一括償却グループの初期累計額が経過年数・3年均等償却額と一致しません');
  if(elapsed>=3&&[...states.values()].some(s=>s.balance!==0))throw Error('3年経過済みの一括償却資産の残高は0円です');
  if(end-start>2400)throw Error('照会期間が長すぎます');
  for(let cursor=start;cursor<=end;cursor+=12){
   const year=Math.floor((cursor-cohort)/12),yearEnd=cursor+11;
   const plans=group.map(book=>{const state=states.get(book.id)!;const active=Math.max(cursor,monthNumber(book.start_month));const months=Array.from({length:Math.max(0,yearEnd-active+1)},(_,i)=>monthString(active+i));const amount=year<0||year>=3?0:year===2?state.balance:Math.min(state.balance,roundFraction(BigInt(book.cost),3n,annualMode));const base=months.length?Math.floor(amount/months.length):0;const values=months.map((_,i)=>i===months.length-1?amount-base*(months.length-1):base);return {book,months,values,amount};});
   const remaining=[...states.values()].reduce((n,s)=>n+s.balance,0),target=year>=3?0:year===2?remaining:Math.min(remaining,annualLimit);
   let correction=target-plans.reduce((n,p)=>n+p.amount,0);
   for(const plan of plans){if(!correction||!plan.values.length)continue;const last=plan.values.length-1;const delta=correction>0?Math.min(correction,states.get(plan.book.id)!.balance-plan.amount):-Math.min(-correction,plan.values[last]);plan.values[last]+=delta;plan.amount+=delta;correction-=delta;}
   if(correction)throw Error('一括償却グループの端数配賦ができません');
   for(const plan of plans){const state=states.get(plan.book.id)!;for(let i=0;i<plan.months.length;i++){const before=state.balance,amount=plan.values[i];state.balance-=amount;state.accumulated+=amount;if(state.balance<0||amount<0)throw Error('一括償却資産の配賦額が不正です');if(monthNumber(plan.months[i])<=end)output.get(plan.book.id)!.push({month:plan.months[i],opening:before,amount,accumulated:state.accumulated,closing:state.balance,annual_amount:plan.amount,revised_basis:0});}}
  }
 }
 return output;
}
