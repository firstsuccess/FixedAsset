import assert from 'node:assert/strict';
import {test} from 'node:test';
import {companyDataReady} from '../client/workspace-state.ts';

test('会社登録後・再ログイン時は会社一覧だけでは業務画面を表示しない',()=>{
 const base={companies:[{id:'first-company'}],initialized:true};
 assert.equal(companyDataReady(base,'first-company'),false);
 const loaded={...base,company:{id:'first-company'},assets:[],closings:[],settings:{},masters:{}};
 assert.equal(companyDataReady(loaded,'first-company'),true);
 assert.equal(companyDataReady(loaded,''),false);
 assert.equal(companyDataReady(loaded,'second-company'),false);
 assert.equal(companyDataReady({...loaded,assets:undefined},'first-company'),false);
});
