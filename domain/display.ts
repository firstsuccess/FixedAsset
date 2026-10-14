export const tablePageSizes=[20,50,100,200,300,400,500] as const;
export const defaultTablePageSize=100;
export function validTablePageSize(value:unknown):value is number {
 return typeof value==='number' && tablePageSizes.some(size=>size===value);
}
