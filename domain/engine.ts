// Node.js-compatible: no framework, browser, or Sites imports.
import {legacySchedule,legacyAnnual} from './legacy';
import rates from './rates.json' with { type: 'json' };
export type Rounding = 'floor'|'round'|'ceil';
export type Method = 'straight'|'declining200'|'declining250'|'none'|'goodwill'|'immediate'|'oldStraight'|'oldDeclining';
export type Book = {id:string;asset_id:string;kind:string;cost:number;life:number;method:Method;residual:number;rounding:Rounding;start_month:string;rate?:string;guarantee?:string;revised_rate?:string;legacy_tail_start?:string|null;legacy_rule_start?:string|null;legacy_intangible?:number|null};
export type Opening = {as_of:string;accumulated:number;impairment:number;balance:number;revised_basis:number};
export type Settings = {first_month:string;rounding:Rounding;tax_rounding:Rounding;adjustment:'year_end'|'last'|'specified';adjustment_month:number;posting:'direct'|'indirect'};
export type Monthly = {month:string;opening:number;amount:number;accumulated:number;closing:number;annual_amount:number;revised_basis:number};
export function monthNumber(v:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))throw Error('年月の形式が不正です');return Number(v.slice(0,4))*12+Number(v.slice(5))-1;}
export function monthString(n:number){return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;}
export function roundFraction(n:bigint,d:bigint,mode:Rounding):number{if(d<=0n)throw Error('分母が不正です');const sign=n<0n?-1n:1n;const a=n*sign;let q=a/d;const r=a%d;if(mode==='floor'&&sign<0n&&r)q++;if(mode==='ceil'&&sign>0n&&r)q++;if(mode==='round'&&r*2n>=d)q++;const result=Number(q*sign);if(!Number.isSafeInteger(result))throw Error('計算可能金額を超えています');return result;}
function frac(s:string){if(!/^\d+(\.\d+)?$/.test(s))throw Error('率が不正です');let[a,b='']=s.split('.');return {n:BigInt(a+b),d:10n**BigInt(b.length)};}
export function multiply(amount:number,rate:string,months=12,mode:Rounding='floor'){const r=frac(rate);return roundFraction(BigInt(amount)*r.n*BigInt(months),r.d*12n,mode);}
export function officialRate(method:string,life:number){const r=(rates as Record<string,Record<string,string>>)[String(life)];if(!r)throw Error('公式確認済み償却率は耐用年数2〜50年です');return {rate:r[method],guarantee:r['guarantee'+method.replace('declining','')],revised_rate:r['revised'+method.replace('declining','')]};}
export function annual(book:Book,opening:number,months:number,revisedBasis=0){
 if(book.method==='oldStraight'||book.method==='oldDeclining')return {amount:legacyAnnual(book,opening,months,opening<=book.cost-roundFraction(BigInt(book.cost)*95n,100n,'floor')&&!book.legacy_intangible),revisedBasis:0};
 if(book.method==='none')return{amount:0,revisedBasis};
 const remaining=Math.max(0,opening-book.residual);if(!remaining)return{amount:0,revisedBasis};
 let amount=0;
 if(book.method==='immediate')amount=remaining;
 else if(book.method==='goodwill')amount=roundFraction(BigInt(book.cost)*BigInt(months),BigInt(book.life)*12n,book.rounding);
 else {
  const rate=officialRate(book.method,book.life);let basis=book.cost,selected=rate.rate;
  if(book.method.startsWith('declining')){
   const r=frac(rate.rate),g=frac(rate.guarantee);
   if(!revisedBasis && BigInt(opening)*r.n*g.d < BigInt(book.cost)*g.n*r.d)revisedBasis=opening;
   basis=revisedBasis||opening;selected=revisedBasis?rate.revised_rate:rate.rate;
  }
  amount=multiply(basis,selected,months,book.rounding);
 }
 return {amount:Math.min(remaining,amount),revisedBasis};
}
export function allocate(total:number,months:string[],mode:Rounding,adjustMonth:string){if(!months.length)return[];let idx=months.indexOf(adjustMonth);if(idx<0)idx=months.length-1;const base=roundFraction(BigInt(total),BigInt(months.length),mode);const values=months.map(()=>base);values[idx]+=total-base*months.length;if(values.some(x=>x<0)){// tiny annual amount: preserve sum and nonnegative expense
 return months.map((_,i)=>i===idx?total:0);
}return values;}
export function schedule(book:Book,fiscalEnd:number,settings:Settings,toMonth:string,opening?:Opening):Monthly[]{
 if(book.method==='oldStraight'||book.method==='oldDeclining')return legacySchedule(book,fiscalEnd,settings,toMonth,opening);
 if(opening&&book.method.startsWith('declining')){if(opening.revised_basis&&(opening.revised_basis<opening.balance||opening.revised_basis>book.cost))throw Error('改定取得価額は初期残高以上・取得価額以下です');if(!opening.revised_basis&&annual(book,opening.balance,12,0).revisedBasis)throw Error('初期残高の定率法切替状態を確認し、改定取得価額を入力してください');}const end=monthNumber(toMonth);const service=monthNumber(book.start_month);const start=opening?monthNumber(opening.as_of.slice(0,7))+1:service;
 if(end<start)return[];if(end-start>2400)throw Error('照会期間が長すぎます');
 let balance=opening?.balance??book.cost,acc=opening?.accumulated??0,revised=opening?.revised_basis??0;
 const rows:Monthly[]=[];let cursor=start;
 while(cursor<=end){
  const m=cursor%12+1;const yearEnd=cursor+((fiscalEnd-m+12)%12);const fyStart=yearEnd-11;
  if(opening&&cursor>fyStart&&book.method.startsWith('declining'))throw Error('定率法の初期残高は決算月末を基準に登録してください');
  const activeStart=Math.max(fyStart,service,start);const months=Array.from({length:yearEnd-activeStart+1},(_,i)=>monthString(activeStart+i));
  const goodwillEnd=service+book.life*12-1;
  const duration=book.method==='goodwill'?Math.min(months.length,Math.max(0,goodwillEnd-activeStart+1)):months.length;
  const result=annual(book,balance,duration,revised);if(book.method==='goodwill'&&duration>0&&activeStart+duration-1===goodwillEnd)result.amount=Math.max(0,balance-book.residual);revised=result.revisedBasis;
  let adjust=monthString(yearEnd);if(settings.adjustment==='specified'){const match=months.find(x=>Number(x.slice(5))===settings.adjustment_month);if(match)adjust=match;}
  const activeMonths=months.slice(0,duration);
  const values=book.method==='immediate'?months.map((_,i)=>i===0?result.amount:0):[...allocate(result.amount,activeMonths,book.rounding,adjust),...months.slice(duration).map(()=>0)];
  for(let i=0;i<months.length;i++){
   const amount=values[i],before=balance;balance-=amount;acc+=amount;
   if(monthNumber(months[i])<=end)rows.push({month:months[i],opening:before,amount,accumulated:acc,closing:balance,annual_amount:result.amount,revised_basis:revised});
  }
  cursor=yearEnd+1;
 }
 return rows;
}
export const enabledMethods=[{code:'straight',name:'定額法'},{code:'declining200',name:'200％定率法'},{code:'declining250',name:'250％定率法'},{code:'oldStraight',name:'旧定額法（標準資産）'},{code:'oldDeclining',name:'旧定率法（標準資産）'},{code:'none',name:'償却対象外'},{code:'goodwill',name:'のれん（会計のみ）'},{code:'immediate',name:'10万円未満の即時費用化'}];
// Preserve the monthly allocations before a disposal, then reconcile the disposal month
// to the prorated annual limit. This never rewrites a confirmed earlier month.
export function disposalSchedule(book:Book,fiscalEnd:number,settings:Settings,disposalMonth:string,opening?:Opening):Monthly[]{
 const rows=schedule(book,fiscalEnd,settings,disposalMonth,opening);const last=rows.at(-1);if(!last)return rows;
 const end=monthNumber(disposalMonth),fyStart=end-((end%12+1-fiscalEnd-1+12)%12);
 const yearRows=rows.filter(r=>monthNumber(r.month)>=fyStart);const first=yearRows[0];
 const target=book.method.startsWith('old')?legacyAnnual(book,first.opening,yearRows.length,!book.legacy_intangible&&first.opening<=book.cost-roundFraction(BigInt(book.cost)*95n,100n,'floor')&&fyStart>=monthNumber(book.legacy_rule_start??'2007-04')):annual(book,first.opening,yearRows.length,first.revised_basis).amount;
 const prior=yearRows.slice(0,-1).reduce((n,r)=>n+r.amount,0);const adjustment=target-prior;
 last.amount=adjustment;last.accumulated=first.accumulated-first.amount+target;last.closing=last.opening-adjustment;
 for(const row of yearRows)row.annual_amount=target;
 return rows;
}
