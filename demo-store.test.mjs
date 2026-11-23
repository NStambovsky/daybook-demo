import test from 'node:test';
import assert from 'node:assert/strict';
import {DemoStore} from './demo-store.mjs';
test('diary edits are isolated, resettable, and independent of returned copies',()=>{
 const a=new DemoStore(),b=new DemoStore();
 const before=a.entries().length,entry={id:'test-note',type:'food',name:'Fictional test food',date:'2026-11-23',calories:100};
 a.save(entry);assert.equal(a.entries().length,before+1);assert.equal(b.entries().some(e=>e.id===entry.id),false);
 entry.name='Changed outside';assert.equal(a.entries().find(e=>e.id==='test-note').name,'Fictional test food');
 const copy=a.entries();copy.length=0;assert.equal(a.entries().length,before+1);
 a.save({...entry,calories:200});assert.equal(a.entries().find(e=>e.id===entry.id).calories,200);
 a.save(entry,true);assert.equal(a.entries().length,before);
 assert.equal(new DemoStore().entries().some(e=>e.id===entry.id),false);
});
test('invalid food and movement amounts are rejected',()=>{
 const store=new DemoStore();
 for(const value of [-1,NaN,Infinity])assert.throws(()=>store.save({id:'bad',name:'Invalid',type:'food',date:'2026-11-23',calories:value}));
 assert.throws(()=>store.save({id:'bad',name:'Invalid',type:'workout',date:'2026-11-23',minutes:0}));
});
