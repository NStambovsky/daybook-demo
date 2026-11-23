import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {request} from 'node:https';
import assert from 'node:assert/strict';
const baby = (await import('./package.json', {with:{type:'json'}})).default.name.startsWith('baby');
const port=baby?8790:8791,origin=`https://127.0.0.1:${port}`;
const password=randomBytes(24).toString('hex'),secret=randomBytes(32).toString('hex');
const vars=new URL('./.dev.vars',import.meta.url);
let child,created=false,logs="";
function run(args){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:'ignore'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(Error(`Local Wrangler operation failed (${c})`)))})}
function send(path,method='GET',body,cookie){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):undefined;const req=request(origin+path,{method,rejectUnauthorized:false,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{let value;try{value=JSON.parse(text)}catch{value=text}resolve({status:res.statusCode,body:value,cookie:res.headers['set-cookie']?.[0]?.split(';')[0]})})});req.on('error',reject);if(data)req.write(data);req.end()})}
try{
 // Exclusive creation protects any existing developer secrets. Local simulator only.
 await writeFile(vars,`APP_PASSWORD="${password}"\nSESSION_SECRET="${secret}"\n`,{flag:'wx',mode:0o600});created=true;
 await run(['d1','execute','DB','--local','--file','schema.sql']);
 child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local-protocol','https','--port',String(port)],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);
 const listPath=baby?'/api/entries':'/api/source-data';
 let ready=false;for(let i=0;i<90;i++){try{if((await send(listPath)).status===401){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}
 assert.ok(ready,'Local Worker did not become ready');
 const login=baby?'/login':'/api/login';assert.equal((await send(login,'POST',{password:'incorrect-test-password'})).status,401);
 const auth=await send(login,'POST',{password});assert.equal(auth.status,200);assert.ok(auth.cookie);const cookie=auth.cookie;
 let id;
 if(baby){
  const entry={type:'note',note:'Disposable local smoke test',occurredAt:new Date().toISOString()};
  const saved=await send('/api/entries','POST',entry,cookie);assert.equal(saved.status,201);id=saved.body.entry.id;
  assert.ok((await send(listPath,'GET',null,cookie)).body.entries.some(e=>e.id===id));
  assert.equal((await send('/api/entries/'+id,'PUT',{...entry,note:'Updated local smoke test'},cookie)).status,200);
  assert.equal((await send('/api/entries/'+id,'DELETE',null,cookie)).status,200);
 }else{
  id=randomUUID();const entry={id,type:'food',name:'Disposable local smoke test',date:'2026-11-23',calories:100};
  const save=(entry,baseVersion,deleted=false)=>send('/api/entries','POST',{entry,baseVersion,deleted,mutationId:randomUUID()},cookie);
  const saved=await save(entry,0);assert.equal(saved.status,200);assert.equal(saved.body.entry._version,1);
  assert.ok((await send(listPath,'GET',null,cookie)).body.entries.some(e=>e.id===id));
  assert.equal((await save({...entry,calories:200},1)).status,200);
  assert.equal((await save({...entry,calories:300},1)).status,409);
  assert.equal((await save(entry,2,true)).status,200);
  assert.equal((await send('/api/estimate','POST',{description:'Test food'},cookie)).status,503);
 }
 assert.equal((await send(listPath,'GET',null,cookie)).body.entries.some(e=>e.id===id),false);
 console.log('PASS: local password gate, wrong password, login, create/read/update/delete, and isolation.');
}catch(error){if(error.code==='EEXIST')console.error('Refusing to overwrite an existing .dev.vars. Use a clean checkout for the smoke test.');else {console.error(error.message);if(logs)console.error(logs.replaceAll(password,'[test password]').replaceAll(secret,'[test session secret]').slice(-7000));}process.exitCode=1}
finally{if(child){child.kill('SIGTERM');await new Promise(r=>setTimeout(r,500))}if(created)await unlink(vars)}
