import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
const api=await import('./fussball-baden-retained-archive.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const E=process.env.FUSSBALL_RETAINED_ARCHIVE_EVIDENCE,prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
test('retained archive private API has no capture/current/clock/locator authority',async()=>{
 assert.equal(typeof api.readFussballBadenRetainedArchive,'function');assert.equal(typeof api.getFussballBadenRetainedArchive,'function')
 for(const proof of [{},{kind:'authenticated-baden-retained-archive'},{archiveOnly:true}])assert.throws(()=>api.getFussballBadenRetainedArchive(proof),/PRIVATE_CAPABILITY/)
 for(const key of ['now','clock','archiveRunId','sourceRunId','currentProof','allowExpired','files','parser','priorRequests']){let calls=0;await assert.rejects(api.readFussballBadenRetainedArchive({github:()=>{calls++},[key]:true}),/INPUT/);assert.equal(calls,0)}
 const d=api.fussballBadenRetainedArchiveDescriptor();assert.equal(d.runId,'40761564810');assert.equal(d.currentAuthority,false);assert.equal(d.freshAdjacencyValidated,false);d.runId='1';assert.equal(api.fussballBadenRetainedArchiveDescriptor().runId,'40761564810')
 assert.equal(Object.hasOwn(api,'captureFussballBadenRetainedArchive'),false)
})
function retained(){
 const pins=JSON.parse(readFileSync(new URL('./fussball-baden-completed-stages.json',import.meta.url))),r7=join(E,'baden-v7-pr582-20261028-attempt1/observation'),v6=join(E,'baden-v6-4e1e7caa-20261028-readonly-observation1'),de77root=join(E,'german-v6-root-detached-parent-input-20261028/parents'),load=(root,p)=>JSON.parse(readFileSync(join(root,p))),responses=new Map(),calls=[],controls={}
 const set=(path,value)=>responses.set(prefix+path,value),parent=(run,jobs,artifact,zip)=>{set('actions/runs/'+run.id,run);set(`actions/runs/${run.id}/attempts/1/jobs?per_page=100&page=1`,jobs);set('actions/artifacts/'+artifact.id,artifact);set('actions/artifacts/'+artifact.id+'/zip',zip)}
 parent(load(r7,'terminal-run.json'),load(r7,'terminal-jobs.json'),load(r7,'archive-metadata.json'),readFileSync(join(r7,'archive.zip')))
 const inv=load(r7,'terminal-artifacts.json');set(`actions/runs/${pins.archive.run.id}/artifacts?per_page=100&page=1`,Array.isArray(inv)?{total_count:inv.length,artifacts:inv}:inv)
 set('actions/artifacts/'+pins.archiveAttestation.id,load(r7,'attestation-metadata.json'));set('actions/artifacts/'+pins.archiveAttestation.id+'/zip',readFileSync(join(r7,'attestation.zip')))
 const de77=load(de77root,'40641606028-archive.json');parent(de77.run,de77.jobs,de77.artifact,readFileSync(join(de77root,'40641606028-archive.zip')))
 parent(load(v6,'terminal-run.json'),load(v6,'terminal-jobs.json'),load(v6,'archive-metadata.json'),readFileSync(join(v6,'archive.zip')))
 return{pins,calls,controls,github:async(path,binary=false)=>{calls.push({path,binary});let v;if(path.startsWith(prefix+'contents/')){const [file,head]=path.slice((prefix+'contents/').length).split('?ref=');const b=execFileSync('git',['show',head+':'+file],{maxBuffer:16*1024*1024});v={type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}}else{assert.ok(responses.has(path),'genuine retained own-GH locator '+path);v=responses.get(path)}v=controls.change?.(path,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)}}
}
test('genuine archive replays all1106 originals/1014 attempts including failures after R9 expiry, without current authority',{skip:!E},async t=>{
 let provider=0;t.mock.method(globalThis,'fetch',()=>{provider++;throw Error('TEST ONLY provider forbidden')})
 const f=retained(),proof=await api.readFussballBadenRetainedArchive({github:f.github}),v=api.getFussballBadenRetainedArchive(proof)
 assert.equal(proof.kind,'authenticated-baden-retained-archive');assert.equal(v.source.archiveOnly,true);assert.equal(v.source.currentAuthority,false);assert.equal(v.source.freshAdjacencyValidated,false);assert.equal(v.source.requests,1014)
 assert.equal(v.originals.archive.manifest.documents.length,1106);assert.equal(v.originals.archive.result.coverage.fixtures,240);assert.equal(v.originals.archive.result.coverage.unscoredFixtures.total,0)
 assert.equal(v.originals.archive.result.coverage.completeReports+v.originals.archive.result.coverage.pendingReports+v.originals.archive.result.coverage.rejectedReports,237)
 assert.equal(v.source.archiveCreatedAt,v.originals.archive.manifest.createdAt);assert.equal(v.source.archiveCompletedAt,v.originals.archive.manifest.completedAt)
 assert.equal(v.certificate.cacheParents.length,2);assert.equal(v.certificate.cachedDocuments,94);assert.equal(v.certificate.networkDocuments,1012);assert.equal(v.certificate.failedAttempts,2)
 assert.equal(f.calls.some(x=>x.path.includes('40859714195')||x.path.includes('/12796721322')||x.path.includes('/12894726197')),false)
 const old=await import('./fussball-baden-completed-stages.mjs');assert.throws(()=>old.getFussballBadenCompletedStages(proof),/PRIVATE_CAPABILITY/);assert.throws(()=>api.getFussballBadenRetainedArchive({...proof}),/PRIVATE_CAPABILITY/)
 const parent=[...v.originals.cacheParents.values()][0],parentFirst=parent.files.get('manifest.json')[0];parent.files.get('manifest.json').fill(0);parent.manifest.createdAt='2035-01-01T00:00:00Z';
 const created=v.source.archiveCreatedAt,first=v.originals.archive.files.get('manifest.json')[0];v.source.archiveCreatedAt='2035-01-01T00:00:00Z';v.originals.archive.files.get('manifest.json').fill(0);v.certificate.cacheParents[0].run.head_sha='0'.repeat(40)
 const again=api.getFussballBadenRetainedArchive(proof);assert.equal(again.source.archiveCreatedAt,created);assert.equal(again.originals.archive.files.get('manifest.json')[0],first);assert.equal([...again.originals.cacheParents.values()][0].files.get('manifest.json')[0],parentFirst)
 assert.equal(provider,0);console.log(JSON.stringify({genuineArchiveReplay:true,documents:1106,requests:1014,failedAttempts:2,cacheOriginals:94,fixtures:240,played:237,currentAuthority:false,freshAdjacencyValidated:false,providerGETs:0,ownGitHubNetworkGETs:0,retainedAdapterReads:f.calls.length}))
})
test('genuine archive refuses foreign/missing/drifted metadata, runtime and original bytes before replay',{skip:!E},async()=>{
 for(const mode of ['run','jobs','artifact','artifactBranch','inventory','malformedInventory','attestation','zip','runtime','clock','captureWindow','parentMissing','parentJobs','late']){
  const f=retained();let reads=0;f.controls.change=(path,v)=>{
   if(path===prefix+'actions/runs/40761564810'){
    if(mode==='run')return{...v,head_sha:'0'.repeat(40)}
    if(mode==='clock')return{...v,updated_at:'2000-01-01T00:00:00Z'}
    if(mode==='late'&&++reads>1)return{...v,conclusion:'failure'}
   }
   if(mode==='captureWindow'&&path===prefix+'actions/runs/40761564810/attempts/1/jobs?per_page=100&page=1'){const changed=structuredClone(v);changed.jobs.find(j=>j.name==='archive-continuation').steps.find(s=>s.name==='Capture V7 fresh archive only after authenticated1952 spent history').completed_at='2000-01-01T00:00:00Z';return changed}
   if(mode==='parentMissing'&&path===prefix+'actions/artifacts/12796389857')throw Error('TEST_ONLY_MISSING_PARENT')
   if(mode==='parentJobs'&&path===prefix+'actions/runs/40694431918/attempts/1/jobs?per_page=100&page=1')return{total_count:1,jobs:[{}]}
   if(mode==='jobs'&&path===prefix+'actions/runs/40761564810/attempts/1/jobs?per_page=100&page=1')return{total_count:0,jobs:[]}
   if(mode==='artifact'&&path===prefix+'actions/artifacts/12855646437')return{...v,expired:true}
   if(mode==='artifactBranch'&&path===prefix+'actions/artifacts/12855646437')return{...v,workflow_run:{...v.workflow_run,head_branch:'foreign'}}
   if(mode==='malformedInventory'&&path===prefix+'actions/runs/40761564810/artifacts?per_page=100&page=1')return{total_count:2,artifacts:'xx'}
   if(mode==='inventory'&&path===prefix+'actions/runs/40761564810/artifacts?per_page=100&page=1')return{total_count:0,artifacts:[]}
   if(mode==='attestation'&&path===prefix+'actions/artifacts/12855951485')return{...v,digest:'sha256:'+'0'.repeat(64)}
   if(mode==='zip'&&path===prefix+'actions/artifacts/12855646437/zip')return Buffer.from('TEST ONLY tampered archive')
   if(mode==='runtime'&&path.startsWith(prefix+'contents/'))return{...v,content:Buffer.from('TEST ONLY changed producer').toString('base64')}
   return v
  };await assert.rejects(api.readFussballBadenRetainedArchive({github:f.github}),/BADEN_RETAINED_ARCHIVE_/)
 }
 await assert.rejects(api.readFussballBadenRetainedArchive({github:()=>{throw Error('TEST_ONLY_SECRET')}}),e=>!e.message.includes('SECRET'))
})
