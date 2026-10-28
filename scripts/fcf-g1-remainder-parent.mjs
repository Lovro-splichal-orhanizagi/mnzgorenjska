// Fixed failed83 lineage only. Raw reuse is never admission or current-total
// authority. B/operator must authenticate any later links and its own execution.
import {readFileSync,realpathSync} from 'node:fs'
import {join,isAbsolute} from 'node:path'
import {execFileSync,spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createInterface} from 'node:readline'
const referenceURL=new URL('./fcf-g1-remainder-parent-reference.json',import.meta.url),referenceSHA='36083cb8f71038636e338238796d63f162ff6875beb3d1c2a866afad5e627c11'
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',states=new WeakMap(),sha=b=>createHash('sha256').update(b).digest('hex')
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)
const need=(ok,m)=>{if(!ok)throw Object.assign(Error('FCF_G1_REMAINDER_PARENT: '+m),{code:'FCF_G1_REMAINDER_PARENT_HOLD'})}
const closed=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',')
function reference(){const b=readFileSync(referenceURL);need(sha(b)===referenceSHA,'fixed reference body drift');return JSON.parse(b)}
function fresh(p){const now=Date.now(),start=Date.parse(p.firstSourceUTC),end=Date.parse(p.sourceFreshUntil);need(Number.isFinite(now)&&start<=now&&end===start+86400000&&now<=end,'real oldest-source clock expired or future; freshness HOLD')}
function frozen(directory,p){
 need(typeof directory==='string'&&isAbsolute(directory)&&realpathSync(directory)===directory,'real fixed frozen checkout required')
 need(process.versions.node.split('.')[0]==='22','reviewed Node22 verifier required')
 const git=args=>execFileSync('git',['-C',directory,...args],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024}).trim()
 need(git(['rev-parse','--show-toplevel'])===directory&&git(['rev-parse','HEAD'])===p.sourceCommit&&git(['status','--porcelain','--untracked-files=all'])==='','exact clean original3ed frozen verifier required')
 for(const [file,digest]of Object.entries(p.runtimeHashes))need(sha(readFileSync(join(directory,file)))===digest,'frozen relevant body drift: '+file)
}
function allowed(path,binary){
 if(typeof path!=='string'||!path.startsWith(repo))return false
 const p=path.slice(repo.length)
 return binary===/^actions\/artifacts\/[1-9]\d{0,19}\/zip$/.test(p)&&(/^actions\/runs\/[1-9]\d{0,19}(?:\/attempts\/1\/jobs\?per_page=100&page=[1-9]\d{0,2}|\/artifacts\?per_page=100&page=[1-9]\d{0,2})?$/.test(p)||/^actions\/artifacts\/[1-9]\d{0,19}(?:\/zip)?$/.test(p)||/^git\/(?:commits|trees|blobs)\/[a-f0-9]{40}$/.test(p)||/^git\/ref\/tags\/fcf-inventory-claim\/(?:g9-after-|six-after-|future-g9-after-|future-after-|g1-after-failed-)?[a-f0-9]{64}$/.test(p)||/^rulesets\/[1-9]\d{0,19}$/.test(p))
}
// The program is fixed, not a caller script/loader/clock. Imports resolve solely
// in the hash-checked original checkout. Network is denied except GET RPC to the
// caller's closed repository adapter; no credentials are inherited by the child.
const verifier=String.raw`
import {createInterface} from 'node:readline'
import {createHash} from 'node:crypto'
const lines=createInterface({input:process.stdin}),waiting=new Map();let sequence=0,seeded=false
const sha=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)
const need=(ok,m)=>{if(!ok)throw Error(m)},repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',sourceRuns=new Set()
const send=v=>process.stdout.write(JSON.stringify(v)+'\n')
const get=(path,binary=false)=>new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve:v=>{if(!binary&&/^actions\/runs\/[1-9]\d*$/.test(path.slice(repo.length))&&v?.path==='.github/workflows/uvoz-fcf-zgodovina.yml')sourceRuns.add(String(v.id));resolve(v)},reject,binary});send({type:'GET',id,path,binary})})
globalThis.fetch=async()=>{throw Error('football/native/unmediated network forbidden')}
async function authenticate({source,parentRecords:g,pins:p}){
 const [approval,claim,planApi,artifact,archive,admission]=await Promise.all(['fcf-future-source-approval','fcf-missing-inventory-claim','fcf-future-source-plan','fcf-missing-inventory-artifact','dfb-artifacts','fcf-future-source-admission'].map(n=>import('./scripts/'+n+'.mjs')))
 const run=await get(repo+'actions/runs/'+p.runId)
 need([run?.actor,run?.triggering_actor].every(a=>a?.login==='nejcar20'&&a.id===25134229&&a.type==='User')&&run.id===Number(p.runId)&&run.head_sha===p.sourceCommit&&run.head_branch==='main'&&run.path==='.github/workflows/uvoz-fcf-zgodovina.yml'&&run.event==='workflow_dispatch'&&run.run_attempt===1&&run.status==='completed'&&run.conclusion==='failure'&&run.repository?.full_name==='Lovro-splichal-orhanizagi/mnzgorenjska'&&run.head_repository?.full_name==='Lovro-splichal-orhanizagi/mnzgorenjska','exact actual failed run/root actors required')
 async function pages(s,key){const out=[];let total;for(let page=1;page<=100;page++){const r=await get(repo+s+'?per_page=100&page='+page);need(Number.isSafeInteger(r?.total_count)&&Array.isArray(r[key])&&r[key].length<=100&&(total===undefined||total===r.total_count),'complete stable metadata pages required');total=r.total_count;out.push(...r[key]);need(new Set(out.map(x=>x.id)).size===out.length,'duplicate metadata identity');if(out.length===total)return out;need(out.length<total&&r[key].length===100,'incomplete metadata pages')}throw Error('metadata page bound')}
 const jobs=await pages('actions/runs/'+p.runId+'/attempts/1/jobs','jobs'),inventory=await pages('actions/runs/'+p.runId+'/artifacts','artifacts')
 const projectedJobs=jobs.map(j=>({...Object.fromEntries(['id','name','run_id','run_attempt','head_sha','status','conclusion'].map(k=>[k,j[k]])),steps:j.steps?.map(s=>Object.fromEntries(['name','number','status','conclusion'].map(k=>[k,s[k]])))})).sort((a,b)=>a.id-b.id)
 need(canonical(projectedJobs)===canonical(p.jobs),'exact original completed job/step inventory required')
 need(inventory.length===4&&new Set(inventory.map(a=>a.name)).size===4,'exact four actual parent artifacts required')
 const records=new Map()
 for(const pin of p.artifacts){const listed=inventory.filter(a=>a.id===pin.id);need(listed.length===1&&listed[0].name===pin.name&&listed[0].digest===pin.digest&&listed[0].size_in_bytes===pin.size_in_bytes,'actual parent artifact inventory differs');const a=await get(repo+'actions/artifacts/'+pin.id),zipBytes=await get(repo+'actions/artifacts/'+pin.id+'/zip',true);need(a.id===pin.id&&a.digest===pin.digest&&a.size_in_bytes===pin.size_in_bytes&&zipBytes.length===pin.size_in_bytes&&'sha256:'+sha(zipBytes)===pin.digest,'immutable parent ZIP/metadata differs');archive.verifyArtifact(a,{runId:p.runId,commit:p.sourceCommit,name:pin.name});records.set(pin.name,{artifact:a,zipBytes,run,jobs})}
 function raw(expected){const r=records.get(expected.name);need(r&&String(r.artifact.id)===expected.artifactId&&r.artifact.digest===expected.artifactDigest,'exact actual artifact locator required');return {...r,expected}}
 const finalRaw=raw(g.finalReceipt)
 artifact.verifyInventoryExecution({...finalRaw,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:g.finalReceipt.name,runPhase:'inventory-record'})
 const finalBytes=artifact.readInventoryZip({...finalRaw,members:{'manifest.json':8*1024*1024}}).get('manifest.json'),finalManifest=artifact.jsonBytes(finalBytes,'original parent final')
 need(finalManifest.completedUTC===p.completedUTC&&Date.parse(finalManifest.completedUTC)<=Date.now(),'actual authenticated historical completion required')
 // Provisional historical clock is bound above to exact digest/job metadata and
 // authenticated again below by the unchanged final reader. Never source age.
 const archivalClock=Date.parse(finalManifest.completedUTC),staged=records.get('fcf-inventory-approval-'+p.runId+'-1'),approvalExpected={runId:p.runId,runAttempt:'1',sourceCommit:p.sourceCommit,jobId:String(jobs.find(j=>j.name==='missing-inventory-approval')?.id),artifactId:String(staged.artifact.id),artifactDigest:staged.artifact.digest,manifestSha256:p.approvalSha256,name:staged.artifact.name},approvalRaw={...staged,expected:approvalExpected}
 artifact.verifyInventoryExecution({...approvalRaw,jobName:'missing-inventory-approval',stepNames:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'],artifactName:approvalExpected.name,runPhase:'inventory-record'})
 const approvalBytes=artifact.readInventoryZip({...approvalRaw,members:{'manifest.json':8*1024*1024}}).get('manifest.json')
 need(sha(approvalBytes)===p.approvalSha256,'original approved bytes differ')
 const a=await approval.readFcfFutureSourceApproval({bytes:approvalBytes,sourceCommit:p.sourceCommit,github:get,now:archivalClock})
 need(canonical(a.history)===canonical(source)&&canonical(a.plan)===canonical(g.plan),'original source approval/history/plan differ')
 const prior=planApi.getFcfFutureSourcePlanAccounting(a.plan);need(prior.priorSourceGETs===60&&a.plan.historySha256==='1d41b14bb719da63f6e0c431186c1d34c234cad216f4ab292f962457ac8d58df','unchanged genuine prior60 required')
 const childPlan=planApi.validateFcfFutureSourcePlan({plan:a.plan,expectedPlanSha256:p.planSha256,now:archivalClock}),ref=await get(repo+'git/ref/'+p.claimRef.slice(5))
 need(ref.object?.sha===p.claimCommit&&ref.object?.type==='commit','actual protected original claim ref differs')
 const commit=await get(repo+'git/commits/'+p.claimCommit),tree=await get(repo+'git/trees/'+commit.tree.sha),entries=tree.tree?.filter(e=>e.path==='.fcf-inventory-claim.json');need(entries?.length===1,'exact claim entry required')
 const blob=await get(repo+'git/blobs/'+entries[0].sha),ruleset=await get(repo+'rulesets/25355545'),claimBytes=Buffer.from(blob.content,'base64');need(sha(claimBytes)===p.claimJsonSha256,'original claim bytes differ')
 const claimProof=claim.readFcfInventoryExecutionClaim({...g.claim,plan:a.plan,ref,claimCommit:{commit,tree,blob},claimBytes,rulesets:[ruleset],now:archivalClock}),consumption=claim.readFcfInventoryConsumptionArtifact({...raw(g.consumption),claimProof,now:archivalClock}),diagnosticRaw=raw(g.child.diagnostic),child=admission.readFcfFutureSourceDiagnosticChildArtifact({plan:a.plan,consumptionProof:consumption,diagnostic:diagnosticRaw,now:archivalClock}),final=admission.readFcfFutureSourceFinalReceipt({...finalRaw,plan:a.plan,claimProof,consumptionProof:consumption,childRecords:[child],now:archivalClock})
 need(final.priorSourceGETs===60&&final.newSourceGETs===23&&final.actualSourceGETs===83&&final.admissible===false&&child.status==='failed','actual failed83 accounting required')
 const files=archive.unpackVerifiedArchive(diagnosticRaw.zipBytes,diagnosticRaw.artifact.digest,'fcf-history'),manifest=artifact.jsonBytes(files.get('manifest.json'),'raw parent diagnostic'),documents=manifest.documents.filter(d=>d.receipt!==null)
 need(manifest.status==='failed'&&manifest.priorSourceGETs===60&&manifest.actualSourceGETs===23&&manifest.attempts.length===23&&documents.length===23&&manifest.firstSourceUTC===p.firstSourceUTC,'exact retained23 diagnostic descriptors required')
 const prefix=documents.map((d,i)=>{const expected=p.prefix[i],raw=files.get(d.artifactFile),r=d.receipt;need(d.id===expected.id&&sha(raw)===expected.sha256&&raw.length===expected.byteLength&&sha(canonical(r))===expected.receiptSha256,'raw prefix/body/original receipt differs');return {id:d.id,url:r.sourceUrl,base64:raw.toString('base64'),sha256:sha(raw),byteLength:raw.length,receipt:r,origin:{runId:p.runId,jobId:g.child.diagnostic.jobId,sourceCommit:p.sourceCommit,sequence:r.sequence}}})
 const ids=new Set();function collect(v){if(v&&typeof v==='object'){if(typeof v.runId==='string')ids.add(v.runId);Object.values(v).forEach(collect)}}collect({source,parentRecords:g})
 const accountedRunIds=[...sourceRuns].filter(id=>ids.has(id)).sort((a,b)=>Number(a)-Number(b));need(accountedRunIds.includes(p.runId),'actual current accounted run required')
 const ledger={version:1,kind:'fcf-g1-remainder-parent-ledger',priorLedgerSha256:a.plan.historySha256,priorSourceGETs:60,newSourceGETs:23,actualSourceGETs:83,maximumCumulativeSourceGETs:478,sourceCommit:p.sourceCommit,runId:p.runId,runAttempt:'1',conclusion:'failure',planSha256:p.planSha256,claim:{ref:p.claimRef,commit:p.claimCommit,jsonSha256:p.claimJsonSha256},artifacts:p.artifacts.map(({id,name,digest})=>({id,name,digest})),prefix:p.prefix,accountedRunIds}
 return {ledgerSha256:sha(canonical(ledger)),prefix,accountedRunIds}
}
lines.on('line',line=>{let m;try{m=JSON.parse(line)}catch{process.exitCode=1;lines.close();process.stdin.destroy();return}
 if(!seeded){seeded=true;authenticate(m).then(result=>process.stdout.write(JSON.stringify({type:'RESULT',result})+'\n',()=>{lines.close();process.stdin.destroy()})).catch(error=>process.stdout.write(JSON.stringify({type:'HOLD',message:String(error.message).slice(0,500)})+'\n',()=>{lines.close();process.stdin.destroy()}));return}
 const pending=waiting.get(m.id);if(!pending)return;waiting.delete(m.id);if(m.error)pending.reject(Error('repository GET unavailable'));else pending.resolve(pending.binary?Buffer.from(m.base64,'base64'):m.value)
})
`
function authenticateFrozen(input,p){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['--input-type=module','-e',verifier],{cwd:input.frozenDirectory,env:{PATH:process.env.PATH,NODE_NO_WARNINGS:'1'},stdio:['pipe','pipe','pipe']}),lines=createInterface({input:child.stdout});let done=false,result=null,error=null,count=0,total=0
 const finish=e=>{if(done)return;done=true;clearTimeout(timer);lines.close();if(e){child.kill();reject(e)}else resolve(result)}
 const timer=setTimeout(()=>finish(Error('FCF_G1_REMAINDER_PARENT: frozen authentication timeout; HOLD')),180000)
 child.stdin.on('error',()=>{});child.stderr.on('data',()=>{})
 lines.on('line',async line=>{if(done)return;try{total+=Buffer.byteLength(line);need(total<=200*1024*1024,'bounded frozen result stream required');const m=JSON.parse(line)
  if(m.type==='GET'){need(++count<=2048&&Number.isSafeInteger(m.id)&&allowed(m.path,m.binary),'closed frozen repository GET required');try{const v=await input.github(m.path,m.binary);if(done)return;if(m.binary){need(Buffer.isBuffer(v)&&v.length<=100*1024*1024,'bounded original ZIP required');child.stdin.write(JSON.stringify({id:m.id,base64:v.toString('base64')})+'\n')}else{const encoded=JSON.stringify(v);need(Buffer.byteLength(encoded)<=8*1024*1024,'bounded actual metadata required');child.stdin.write(JSON.stringify({id:m.id,value:v})+'\n')}}catch{if(!done)child.stdin.write(JSON.stringify({id:m.id,error:true})+'\n')}
  }else if(m.type==='RESULT'){need(!result,'one frozen result required');result=m.result}else if(m.type==='HOLD'){error=Error('FCF_G1_REMAINDER_PARENT: frozen reader refused: '+m.message)}else need(false,'unknown frozen protocol output')
 }catch(e){finish(e)}})
 child.on('error',finish);child.on('close',code=>{if(done)return;if(code!==0||error||!result)finish(error??Error('FCF_G1_REMAINDER_PARENT: incomplete frozen authentication'));else finish()})
 child.stdin.write(JSON.stringify({source:input.source,parentRecords:input.parentRecords,pins:p})+'\n')
})}
function copied(data){return {...structuredClone(Object.fromEntries(Object.entries(data).filter(([k])=>k!=='prefix'))),prefix:data.prefix.map(e=>({...structuredClone(Object.fromEntries(Object.entries(e).filter(([k])=>k!=='raw'))),raw:Buffer.from(e.raw)}))}}
export async function readFcfG1RemainderParent(input){
 need(closed(input,['source','parentRecords','frozenDirectory','github']),'closed parent input; no clocks/proofs/loaders/counters/lists')
 const p=reference();fresh(p);need(typeof input.github==='function'&&sha(canonical({source:input.source,parentRecords:input.parentRecords}))===p.sourceReferencesSha256,'fixed original source/history/plan references required')
 const seed={source:structuredClone(input.source),parentRecords:structuredClone(input.parentRecords),frozenDirectory:input.frozenDirectory,github:input.github};frozen(seed.frozenDirectory,p)
 const authenticated=await authenticateFrozen(seed,p);frozen(seed.frozenDirectory,p);fresh(p)
 need(/^[a-f0-9]{64}$/.test(authenticated.ledgerSha256)&&authenticated.prefix.length===23,'complete privately authenticated prefix required')
 const prefix=authenticated.prefix.map((e,i)=>{const pin=p.prefix[i],raw=Buffer.from(e.base64,'base64'),r=e.receipt,url='https://www.fcf.cat/ca/competicio/acta/'+String(4109388+i),now=Date.now();need(e.id===String(4109388+i)&&e.id===pin.id&&e.url===url&&sha(raw)===pin.sha256&&raw.length===pin.byteLength&&sha(canonical(r))===pin.receiptSha256&&r.sequence===61+i&&r.id===e.id&&r.targetSlug==='es-ct-segona-g1'&&r.method==='GET'&&r.sourceUrl===url&&r.responseURL===url&&r.redirected===false&&r.httpStatus===200&&r.bodyState==='complete'&&r.rawSha256===pin.sha256&&r.bytes===raw.length&&Date.parse(r.startedUTC)<=Date.parse(r.headersUTC)&&Date.parse(r.headersUTC)<=Date.parse(r.capturedUTC)&&Date.parse(r.capturedUTC)<=now,'exact complete canonical original receipt/body required');const {base64,...rest}=e;return {...rest,raw}})
 need(new Date(Math.min(...prefix.map(e=>Date.parse(e.receipt.startedUTC)))).toISOString()===p.firstSourceUTC,'oldest original clock differs')
 const data={version:1,kind:'fcf-g1-remainder-parent',targetSlug:'es-ct-segona-g1',competitionId:783,sourceCode:'4109388-4109627',season:'2026/27',accounting:{priorSourceGETs:83,maximumCumulativeSourceGETs:478,remainingSourceGETs:395},ledgerSha256:authenticated.ledgerSha256,firstSourceUTC:p.firstSourceUTC,sourceFreshUntil:p.sourceFreshUntil,prefix,remainingIds:Array.from({length:217},(_,i)=>String(4109411+i)),sourceReferences:{prior:structuredClone(seed.source),latest:structuredClone(seed.parentRecords),accountedRunIds:authenticated.accountedRunIds},admissible:false,nativeAdmission:false,activationEligible:false}
 const proof=Object.freeze({version:1,kind:data.kind,ledgerSha256:data.ledgerSha256,admissible:false,nativeAdmission:false,activationEligible:false});states.set(proof,{input:seed,data,held:false});return proof
}
export function getFcfG1RemainderParent(proof){const s=states.get(proof);need(s,'reader-issued remainder parent required');need(!s.held,'parent held after failed server reauthentication');fresh(s.data);return copied(s.data)}
export async function reauthenticateFcfG1RemainderParent(proof){const s=states.get(proof);need(s&&!s.held,'reader-issued unheld remainder parent required');fresh(s.data);try{const again=await readFcfG1RemainderParent(s.input);need(getFcfG1RemainderParent(again).ledgerSha256===s.data.ledgerSha256,'authenticated parent ledger drift');return again}catch(e){s.held=true;throw e}}
