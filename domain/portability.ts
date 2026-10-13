export interface Repository<T>{findById(id:string):Promise<T|null>;save(record:T,expectedVersion:number):Promise<void>}
export interface Company {id:string;code:string;name:string;kind:'corporate'|'individual';fiscal_end_month:number;version:number}
export interface Asset {id:string;company_id:string;number:string;name:string;category:string;acquisition_date:string;service_date:string;cost:number;tax:number;ancillary:number;version:number}
export interface DepreciationResult {id:string;run_id:string;asset_book_id:string;month:string;status:'calculated'|'confirmed'|'cancelled';opening:number;amount:number;accumulated:number;closing:number;annual_amount:number;revised_basis:number;snapshot_json:string}
export interface JournalHeader {id:string;company_id:string;run_id:string;date:string;type:string;description:string;status:string}
export interface JournalLine {id:string;header_id:string;account:string;debit:number;credit:number;department:string|null}
export interface PortableBackup {schemaVersion:1|2;applicationVersion:string;exportTimestamp:string;entityData:Record<string,Record<string,unknown>[]>;recordCounts:Record<string,number>;integrity:{algorithm:'SHA-256';hash:string}}
