const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
export function normalizeEntry(input){
 if(!input||!['food','workout'].includes(input.type)||typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id))throw Error('Invalid entry.');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>1000)throw Error('Enter an activity or food name.');
 if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||isNaN(Date.parse(input.date+'T12:00:00Z'))||new Date(input.date+'T12:00:00Z').toISOString().slice(0,10)!==input.date)throw Error('Choose a valid date.');
 const number=(v,optional=false,max=10000)=>{if(v==null&&optional)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Invalid numeric value.');return v};
 const e={id:input.id,type:input.type,name:input.name.trim(),date:input.date,description:String(input.description||'').slice(0,800),sample:false,readOnly:false,source:typeof input.source==='string'?input.source.slice(0,80):'Daybook'};
 if(input.type==='food'){e.calories=number(input.calories);e.meal=['Food','Breakfast','Lunch','Dinner','Snack'].includes(input.meal)?input.meal:'Food';for(const k of ['protein','carbs','fat'])e[k]=number(input[k],true,2000)}
 else {e.minutes=number(input.minutes,false,1440);if(e.minutes<=0)throw Error('Duration must be greater than zero.');e.calories=number(input.calories,true)}
 if(input.estimate&&typeof input.estimate.assumptions==='string'){const est=input.estimate;e.estimate={calories:number(est.calories),low:number(est.low),high:number(est.high),assumptions:est.assumptions.slice(0,500)}}
 return e;
}
export async function readState(env){
 const results=await env.DB.batch([env.DB.prepare('SELECT payload,version,updated_at FROM entries WHERE deleted=0 ORDER BY id'),env.DB.prepare('SELECT key,value FROM meta'),env.DB.prepare('SELECT COALESCE(MAX(seq),0) AS revision FROM revisions')]);
 const entries=results[0].results.map(r=>({...JSON.parse(r.payload),_version:r.version,updatedAt:r.updated_at,readOnly:false}));
 const meta=Object.fromEntries(results[1].results.map(r=>[r.key,JSON.parse(r.value)]));
 return {source:{...meta.source,mode:'cloud',foodCount:entries.filter(e=>e.type==='food').length,workoutCount:entries.filter(e=>e.type==='workout').length},entries,revision:results[2].results[0].revision,backup:meta.backup||null};
}
export async function dataRequest(request,env){
 const path=new URL(request.url).pathname;
 if(!env.DB)return reply({error:'Shared storage is not configured yet.'},503);
 if(path==='/api/source-data'&&request.method==='GET')return reply(await readState(env));
 if(path==='/api/revision'&&request.method==='GET'){const row=await env.DB.prepare('SELECT COALESCE(MAX(seq),0) AS revision FROM revisions').first();const backup=await env.DB.prepare("SELECT value FROM meta WHERE key='backup'").first();return reply({...row,backup:backup?JSON.parse(backup.value):null})}
 if(path!=='/api/entries')return null;
 if(request.method!=='POST')return reply({error:'Use POST.'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
 let body,entry;
 try{const raw=await request.text();if(raw.length>16000)throw Error('Entry too large.');body=JSON.parse(raw);entry=normalizeEntry(body.entry);if(!Number.isSafeInteger(body.baseVersion)||body.baseVersion<0||typeof body.mutationId!=='string'||!/^[a-zA-Z0-9_-]{10,100}$/.test(body.mutationId)||typeof body.deleted!=='boolean')throw Error('Invalid change.')}catch(error){return reply({error:error.message},400)}
 const payload=JSON.stringify(entry),now=new Date().toISOString();
 const write=body.baseVersion===0
 ?env.DB.prepare('INSERT OR IGNORE INTO entries(id,payload,version,deleted,updated_at,last_mutation) VALUES(?,?,1,?,?,?)').bind(entry.id,payload,Number(body.deleted),now,body.mutationId)
 :env.DB.prepare('UPDATE entries SET payload=?,version=version+1,deleted=?,updated_at=?,last_mutation=? WHERE id=? AND version=?').bind(payload,Number(body.deleted),now,body.mutationId,entry.id,body.baseVersion);
 const results=await env.DB.batch([write,env.DB.prepare('INSERT INTO revisions(entry_id) SELECT ? WHERE changes()>0').bind(entry.id),env.DB.prepare('SELECT payload,version,deleted,updated_at,last_mutation FROM entries WHERE id=?').bind(entry.id)]);
 const current=results[2].results[0];
 if(!current||current.last_mutation!==body.mutationId)return reply({error:'This entry changed on another device. Your version is saved locally for review.',conflict:true,current:current?{...JSON.parse(current.payload),_version:current.version,deleted:!!current.deleted}:null},409);
 return reply({ok:true,entry:{...JSON.parse(current.payload),_version:current.version,updatedAt:current.updated_at,readOnly:false},deleted:!!current.deleted});
}
export async function backupRequest(request,env){
 const path=new URL(request.url).pathname;if(!['/api/backup','/api/backup-status'].includes(path))return null;
 if(!env.BACKUP_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.BACKUP_TOKEN)return reply({error:'Unauthorized.'},401);
 if(path==='/api/backup'&&request.method==='GET'){const data=await readState(env);return reply({schemaVersion:1,count:data.entries.length,entries:data.entries,revision:data.revision,exportedAt:new Date().toISOString()})}
 if(path==='/api/backup-status'&&request.method==='POST'){
  const text=await request.text();if(text.length>4000)return reply({error:'Too large.'},400);let b;try{b=JSON.parse(text);if(!['success','failed'].includes(b.status)||typeof b.message!=='string')throw Error()}catch{return reply({error:'Invalid status.'},400)}
  const old=await env.DB.prepare("SELECT value FROM meta WHERE key='backup'").first();const previous=old?JSON.parse(old.value):{};
  const status={...previous,lastAttempt:new Date().toISOString(),status:b.status,message:b.message.slice(0,500)};
  if(b.status==='success'){if(!Number.isInteger(b.count)||b.count<0||!Number.isInteger(b.revision))return reply({error:'Invalid backup count.'},400);Object.assign(status,{lastSuccess:status.lastAttempt,count:b.count,revision:b.revision})}
  await env.DB.prepare("INSERT INTO meta(key,value) VALUES('backup',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(status)).run();return reply({ok:true});
 }
 return reply({error:'Method not allowed.'},405);
}
