export const accountFields=['account','expense_account','accumulated_account'] as const;
export type AccountDefaults=Record<string,Record<string,Record<string,string>>>;
export function resolveAccountDefaults(saved:AccountDefaults,categoryId:string,assetAccount:string){
 const result:Record<string,Record<string,string>>={};
 for(const kind of ['accounting','tax'])result[kind]={account:assetAccount,expense_account:'6100',accumulated_account:'1590',...saved['*']?.[kind],...saved[categoryId]?.[kind]};
 return result;
}
