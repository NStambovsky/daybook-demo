const PREFIX='daybook-pending-v2:',CACHE='daybook-cloud-v2',MIGRATED='daybook-migrated-v2';
export class SyncStore {
 constructor(changed){this.changed=changed;this.data={entries:[],source:null,backup:null,revision:-1};this.error='';this.ready=false;try{const cached=JSON.parse(localStorage.getItem(CACHE));if(cached?.entries)this.data=cached}catch{} }
 pending(){return Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).map(k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}}).filter(Boolean)}
 entries(){const entries=new Map(this.data.entries.map(e=>[e.id,e]));for(const op of this.pending()){if(op.deleted)entries.delete(op.entry.id);else entries.set(op.entry.id,{...op.entry,_version:op.baseVersion,_pending:true})}return [...entries.values()]}
 save(entry,deleted=false,baseVersion=entry._version||0){
  if(localStorage.getItem(PREFIX+entry.id))throw Error('This entry is still waiting to sync. Reconnect before editing it again.');
  const op={entry,deleted,baseVersion,mutationId:crypto.randomUUID()};
  localStorage.setItem(PREFIX+entry.id,JSON.stringify(op));this.changed();void this.flush();return true;
 }
 async request(path,options={}){const response=await fetch(path,{cache:'no-store',...options,signal:AbortSignal.timeout(20000)});if(response.status===401)throw Error('Please sign in again. Your pending entries are kept on this device.');const body=await response.json();return {response,body}}
 async refresh(){
  const {response,body}=await this.request('/api/source-data');if(!response.ok||body.source?.mode!=='cloud')throw Error('Shared storage is unavailable. Pending entries stay on this device.');
  this.data=body;this.ready=true;try{localStorage.setItem(CACHE,JSON.stringify(body))}catch{/* Queue is stored separately; a full cache is optional. */}
  this.changed();
 }
 migrate(){
  if(localStorage.getItem(MIGRATED))return;
  const old=JSON.parse(localStorage.getItem('daybook-demo-v1')||'{"entries":[]}');
  for(const e of old.entries||[]){if(e.sample||this.data.entries.some(row=>row.id===e.id)||localStorage.getItem(PREFIX+e.id))continue;localStorage.setItem(PREFIX+e.id,JSON.stringify({entry:e,deleted:false,baseVersion:0,mutationId:crypto.randomUUID()}));}
  localStorage.setItem(MIGRATED,'yes'); // Keep the old log as a recovery copy.
 }
 async flush(){
  if(this.running)return;this.running=true;
  const drain=async()=>{
   try{
    if(!navigator.onLine)throw Error('Offline. Pending entries will sync when you reconnect.');
    if(!this.ready)await this.refresh();
    this.migrate();
    for(const op of this.pending()){
     if(op.conflict||op.error)continue;
     const {response,body}=await this.request('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(op)});
     if(response.status===409){op.conflict=body.current||{_version:0,deleted:true};localStorage.setItem(PREFIX+op.entry.id,JSON.stringify(op));continue}
     if(response.status===400){op.error=body.error;localStorage.setItem(PREFIX+op.entry.id,JSON.stringify(op));continue}
     if(!response.ok)throw Error(body.error||'Sync unavailable. Your pending entries are kept.');
     this.data.entries=this.data.entries.filter(e=>e.id!==op.entry.id);if(!body.deleted)this.data.entries.push(body.entry);
     // Persist the acknowledged copy before removing the retry, if cache storage is available.
     try{localStorage.setItem(CACHE,JSON.stringify(this.data))}catch{}
     localStorage.removeItem(PREFIX+op.entry.id);this.changed();
    }
    await this.refresh();this.error='';
   }catch(error){this.error=error.message||'Sync unavailable. Pending entries are kept on this device.'}
   finally{this.changed()}
  };
  try{if(navigator.locks)await navigator.locks.request('daybook-sync',drain);else await drain()}finally{this.running=false}
 }
 async resolve(id,keepMine){
  const key=PREFIX+id,op=JSON.parse(localStorage.getItem(key)||'null');if(!op)return;
  if(keepMine){if(!op.conflict)throw Error(op.error||'Please export this pending entry for recovery.');op.baseVersion=op.conflict._version;op.mutationId=crypto.randomUUID();delete op.conflict;delete op.error;localStorage.setItem(key,JSON.stringify(op))}
  else localStorage.removeItem(key);
  await this.flush();
 }
 async poll(){if(document.hidden)return;if(this.pending().some(op=>!op.conflict&&!op.error)||!this.ready||this.error){await this.flush();return}try{const {response,body}=await this.request('/api/revision');if(!response.ok)throw Error(body.error||'Could not check for updates.');if(body.revision!==this.data.revision||JSON.stringify(body.backup)!==JSON.stringify(this.data.backup))await this.refresh();this.error='';this.changed()}catch(e){this.error=e.message;this.changed()}}
}
