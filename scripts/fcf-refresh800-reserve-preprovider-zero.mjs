// Exactly one reviewed failed reserve epoch. Own-GitHub evidence only; no source,
// claim, counter override, current capture, native or activation authority.
import {readFileSync} from 'node:fs'
import {readFcfDraftAsset} from './fcf-inventory-github.mjs'
import {readFcfFrozenContentBytes} from './fcf-frozen-content-bytes.mjs'
import {fcfRefresh800Pages,fcfRefresh800RunProjection,fcfRefresh800JobsSha256} from './fcf-refresh800-ledger.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,jsonBytes,rawSha256,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const raw=readFileSync(new URL('./fcf-refresh800-reserve-preprovider-zero-pins.json',import.meta.url)),pins=JSON.parse(raw),states=new WeakMap(),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',need=(v,m)=>{if(!v)throw Error('FCF_REFRESH800_RESERVE_ZERO_HOLD: '+m)},same=(a,b)=>hash(a)===hash(b)
need(rawSha256(raw)==='38b6ed6b4c1fc02a27018b4f3e6ddc76dec88a68082b0b47bc6ace7dce236348'&&pins.schemaVersion===1&&pins.kind==='refresh800-reserve-preprovider-zero'&&pins.status==='REVIEWED_EXACT_RUN_ONLY'&&pins.run.id===40992533637&&pins.run.head_sha==='e925dcbcd8b087dd3f6ec4c58a7cc07e515ae75d'&&pins.run.run_attempt===1,'exact reviewed witness pins')
function jobProjection(jobs){return jobs.map(j=>({...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),steps:j.steps?.map(s=>Object.fromEntries(['number','name','status','conclusion','started_at','completed_at'].filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]])))}))}
async function terminal(github){
 const listed=await fcfRefresh800Pages(github,'actions/workflows/uvoz-fcf-zgodovina.yml/runs?','workflow_runs'),matching=listed.filter(r=>r.id===pins.run.id);need(matching.length===1,'known reviewed failed execution missing; HOLD')
 const run=await github(repo+'actions/runs/40992533637'),jobs=await fcfRefresh800Pages(github,'actions/runs/40992533637/attempts/1/jobs?','jobs'),artifacts=await fcfRefresh800Pages(github,'actions/runs/40992533637/artifacts?','artifacts')
 need(same(fcfRefresh800RunProjection(matching[0]),pins.run)&&same(fcfRefresh800RunProjection(run),pins.run)&&same(jobProjection(jobs),pins.jobProjection),'exact listed/detail root/main/attempt1 failed reserve and complete step graph')
 need(artifacts.length===0,'exact empty artifact inventory corroboration; never infer zero from absence')
 return{run:fcfRefresh800RunProjection(run),jobsSha256:fcfRefresh800JobsSha256(jobs)}
}
export async function readFcfRefresh800ReservePreproviderZero(input){
 exactKeys(input,['github','prior'],'reserve zero input');exactKeys(input.prior,['actualSourceGETs','lastSourceEndedUTC','historySha256','probeAttempts'],'reserve zero prior');need(typeof input.github==='function'&&same(input.prior,pins.prior),'actual unchanged reviewed301/history/last-clock/probe1 ancestry')
 const {github}=input,before=await terminal(github),bytes=await readFcfDraftAsset({id:pins.approvalAssetId,digest:'sha256:'+pins.approvalSha256,github,maximumBytes:8388608}),a=jsonBytes(bytes,'exact reserve root approval')
 need(a.kind==='fcf-refresh800-root-approval'&&a.plan.sourceCommit===pins.run.head_sha&&a.plan.priorSourceGETs===301&&same(a.runtimeFiles,pins.runtimeFiles)&&same(Object.fromEntries(Object.keys(pins.prior).map(k=>[k,a.plan.ledgerBinding[k]])),pins.prior),'fixed root approval/epoch/runtime/prior binding')
 const bodies=new Map();for(const row of [...pins.runtimeFiles,...pins.testFiles]){if(bodies.has(row.path)){need(rawSha256(bodies.get(row.path))===row.sha256,'duplicate frozen path hash');continue}bodies.set(row.path,await readFcfFrozenContentBytes({github,path:row.path,commit:pins.run.head_sha,expectedSha256:row.sha256}))}
 need(same(await terminal(github),before),'late reviewed terminal metadata drift')
 const proof=Object.freeze({kind:'fcf-refresh800-private-reserve-preprovider-zero'});states.set(proof,frozenJSON({kind:pins.kind,runId:String(pins.run.id),sourceHead:pins.run.head_sha,priorSourceGETs:301,newSourceGETs:0,actualSourceGETs:301,lastSourceEndedUTC:input.prior.lastSourceEndedUTC,probeAttempts:input.prior.probeAttempts,lastSourceEndedUTCAdvanced:false,firstSourceUTC:null,currentCapture:null,documents:[],witnessSha256:rawSha256(raw),approvalSha256:pins.approvalSha256,historyRecord:{kind:pins.kind,run:before.run,jobsSha256:before.jobsSha256},sourceOnly:true,currentGlobalCounterAuthority:false,admissible:false,nativeAdmission:false,activationEligible:false}));return proof
}
export function getFcfRefresh800ReservePreproviderZero(proof){const s=states.get(proof);need(s,'private exact reviewed reserve zero proof');return frozenJSON(structuredClone(s))}
