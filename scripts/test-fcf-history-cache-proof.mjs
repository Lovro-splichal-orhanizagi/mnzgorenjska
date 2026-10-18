import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const proof=await import('./fcf-history-cache-proof.mjs').catch(()=>({}))
const commit='a'.repeat(40),runId='123',digest='sha256:'+'d'.repeat(64),now=Date.parse('2026-10-18T14:00:00Z'),key='zapisniki-ES-k1od1-39122610224-1'
const scopes=[['es-ct-segona-g1',783,4109388,4109627],['es-ct-tercera-g2',790,4116188,4116427],['es-ct-tercera-g9',797,4118349,4118588]]
const e=(type,children,props={})=>['$',type,null,{...props,children}]
function html(id,slug,round){
 const root={c:['','ca','competicio','acta',String(id)],headers:[e('section',e('div',[e('a','SYNTHETIC HOME',{href:'/ca/clubs/1/categories/2'}),e('div',[e('span','Pendent'),e('span','- - -')]),e('a','SYNTHETIC AWAY',{href:'/ca/clubs/3/categories/4'})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/',slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA','/',`GRUP ${slug.split('-g')[1]}`,'/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ','24.10.2026']),e('span',['Hora',': ','16.00 H'])]}
 return Buffer.from(`<!doctype html><title>Acta: SYNTHETIC TEST | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(root)+'\n')}])</script>`)
}
function fixture(){
 const files=new Map(),rows=[]
 for(const[slug,,start,end]of scopes)for(let id=start;id<=end;id++){
  const body=html(id,slug,Math.floor((id-start)/8)+1),name=`acta-${id}.html`;files.set(name,body)
  rows.push({id:String(id),url:`https://www.fcf.cat/ca/competicio/acta/${id}`,cachePath:`scripts/.predpomnilnik/fcf/${name}`,status:'found',artifactFile:name,byteCount:body.length,sha256:createHash('sha256').update(body).digest('hex'),cachedMtime:'2026-10-18T11:00:00.000Z'})
 }
 const manifest={schemaVersion:1,kind:'fcf-historical-cache',scopes:scopes.map(([competitionSlug,,start,end])=>({competitionSlug,sourceCode:`${start}-${end}`})),cache:{requestedKey:key,matchedKey:key,cacheHit:'true',restoreOutcome:'success',state:'available'},extraction:{commit,runId,runAttempt:'1'},sourceCaptureCommit:null,sourceFetchTime:null,freshness:'unverified-historical-cache',files:rows}
 files.set('manifest.json',Buffer.from(JSON.stringify(manifest)))
 const run={id:123,run_attempt:1,repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:'completed',conclusion:'success'}
 const jobs=[{id:456,run_id:123,run_attempt:1,head_sha:commit,name:'cache-export',status:'completed',conclusion:'success',steps:['Restore only the reviewed exact cache','Export only the three fixed blocks with original lineage','Retain authenticated bounded cache evidence'].map(name=>({name,status:'completed',conclusion:'success'}))}]
 return{files,manifest,run,jobs,runId,commit,artifact:{id:'789',digest,name:'fcf-history-cache-123-1',size:1234},now}
}
function read(f){assert.equal(typeof proof.readFcfHistoryCacheArtifact,'function','authenticated cache proof reader must exist');return proof.readFcfHistoryCacheArtifact(f)}
function edit(f,change){change(f.manifest);f.files.set('manifest.json',Buffer.from(JSON.stringify(f.manifest)))}
test('authenticated cache reader parses actual bytes with the existing FCF header parser and retains original timestamps',()=>{
 const f=fixture(),result=read(f)
 assert.equal(result.groups.length,3);assert.deepEqual(result.groups.map(g=>g.cache.length),[240,240,240])
 const r=result.groups[1].cache.find(x=>x.id==='4116314')
 assert.equal(r.header.krog,16);assert.equal(r.cacheMtimeUTC,'2026-10-18T11:00:00.000Z');assert.equal(r.lineage.artifactDigest,digest);assert.equal(r.lineage.commit,commit)
 assert.equal(r.lineage.runId,'123');assert.equal(r.lineage.jobId,'456');assert.equal(r.lineage.verified,true)
 assert.equal(result.sourceFetchTime,null)
})
for(const[name,mutate]of[
 ['mixed attempt job',f=>f.jobs[0].run_attempt=2],['missing job attempt',f=>delete f.jobs[0].run_attempt],['wrong workflow',f=>f.run.path='.github/workflows/ci.yml'],['wrong ref',f=>f.run.head_branch='feature'],['wrong commit',f=>f.run.head_sha='b'.repeat(40)],['failed export',f=>f.jobs[0].steps[1].conclusion='failure'],['duplicate job',f=>f.jobs.push({...f.jobs[0]})],['wrong artifact attempt',f=>f.artifact.name='fcf-history-cache-123-2'],
 ['fallback cache',f=>edit(f,m=>m.cache.matchedKey=key+'-fallback')],['forged capture time',f=>edit(f,m=>m.sourceFetchTime='2026-10-18T14:00:00Z')],['changed extraction commit',f=>edit(f,m=>m.extraction.commit='b'.repeat(40))],
 ['missing raw',f=>f.files.delete('acta-4116314.html')],['extra file',f=>f.files.set('extra.json',Buffer.from('{}'))],['duplicate descriptor',f=>edit(f,m=>m.files[1]={...m.files[0]})],['missing descriptor',f=>edit(f,m=>m.files.pop())],['changed bytes',f=>f.files.set('acta-4116314.html',Buffer.from('changed'))],['future original mtime',f=>edit(f,m=>m.files[1].cachedMtime='2099-01-01T00:00:00Z')],['foreign raw route',f=>{const body=html(4116315,'es-ct-tercera-g2',16);f.files.set('acta-4116314.html',body);edit(f,m=>Object.assign(m.files.find(x=>x.id==='4116314'),{byteCount:body.length,sha256:createHash('sha256').update(body).digest('hex')}))}],
])test(`authenticated cache proof refuses ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>read(f),/FCF_CACHE/)})
function inventoryFixture(){
 const f=fixture(),cacheProof=read(f),databaseInventory={capturedUTC:'2026-10-18T13:55:00Z',method:'explicitBEGIN_READ_ONLY_ROLLBACK',groups:scopes.map(([slug,id,start,end],i)=>({slug,id,active:false,source:'fcf',sourceLeagueCode:`${start}-${end}`,source_policy:null,sezona_koledarska:false,nativeImportedIDs:Array.from({length:[29,28,26][i]},(_,n)=>String(start+n))}))}
 for(const g of cacheProof.groups)for(const row of g.cache)if(databaseInventory.groups.find(x=>x.id===g.competitionId).nativeImportedIDs.includes(row.id))Object.assign(row.header,{izid:{domaci:0,gostje:0},zaprt:true})
 return{cacheProof,databaseInventory,sourceCommit:'b'.repeat(40),now}
}
test('compiler binds actual DB native inventory to authenticated parsed headers without invented season metadata',()=>{
 const f=inventoryFixture();assert.equal(typeof proof.compileFcfFinalAuditInventory,'function')
 const plan=proof.compileFcfFinalAuditInventory(f);assert.equal(plan.maximumSourceGETs,61)
 assert.deepEqual(plan.groups.map(g=>g.fetchIds.length),[19,20,22]);assert.equal(plan.sourceCommit,'b'.repeat(40))
})
for(const[name,mutate]of[
 ['missing calendar flag',f=>delete f.databaseInventory.groups[0].sezona_koledarska],['wrong competition key',f=>f.databaseInventory.groups[0].id=999],['wrong actual source code',f=>f.databaseInventory.groups[0].sourceLeagueCode='4109387-4109626'],['stale DB inventory',f=>f.databaseInventory.capturedUTC='2026-10-17T00:00:00Z'],['wrong policy',f=>f.databaseInventory.groups[0].source_policy='other'],['partial DB inventory',f=>f.databaseInventory.groups.pop()],
])test(`compiler refuses ${name} without source access`,()=>{const f=inventoryFixture();mutate(f);assert.equal(typeof proof.compileFcfFinalAuditInventory,'function');assert.throws(()=>proof.compileFcfFinalAuditInventory(f),/FCF_CACHE/)})
