// TEST ONLY retained own-code/API DATA. No production import or transport.
import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
export function retainedRefresh800ReserveZeroFixture(){return JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/fcf-refresh800-reserve-zero-e925.json.gz',import.meta.url))))}
export function freezeRefresh800PreReserveTestEpoch(root){
 const old=retainedRefresh800ReserveZeroFixture().runtime['scripts/fcf-refresh800-ledger.mjs'];if(createHash('sha256').update(old).digest('hex')!=='04397841533e9a604a13ec13da49f621c4ca454cab90e0ea3cb54fe39a42e08a')throw Error('TEST ONLY exact frozen e925 pre409925 ledger differs');writeFileSync(join(root,'scripts/fcf-refresh800-ledger.mjs'),old)
}
// Adds this real retained historical epoch to TEST ONLY composed GitHub fixtures.
// Release container metadata remains synthetic; actual approval/source bytes are pinned.
export function withRetainedRefresh800ReserveZeroGithub(original){
 const f=retainedRefresh800ReserveZeroFixture(),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/';return async(path,binary=false)=>{
  if(path===repo+'actions/workflows/uvoz-fcf-zgodovina.yml/runs?per_page=100&page=1'){const r=await original(path,binary);if(r.workflow_runs.some(x=>x.id===f.run.id))throw Error('TEST ONLY duplicate retained run');return {...r,total_count:r.total_count+1,workflow_runs:[...r.workflow_runs,f.run]}}
  if(path===repo+'actions/runs/40992533637')return structuredClone(f.run)
  if(path===repo+'actions/runs/40992533637/attempts/1/jobs?per_page=100&page=1')return {total_count:f.jobs.length,jobs:structuredClone(f.jobs)}
  if(path===repo+'actions/runs/40992533637/artifacts?per_page=100&page=1')return {total_count:0,artifacts:[]}
  if(path===repo+'releases?per_page=100&page=1')return [{id:2,tag_name:'fcf-inventory-staging-v1',draft:true}]
  if(path===repo+'releases/2/assets?per_page=100&page=1'){let rows=[];try{rows=await original(path,binary)}catch{}return [...rows,{id:690671037,state:'uploaded',size:Buffer.byteLength(f.approvalText)}]}
  if(path===repo+'releases/assets/690671037')return Buffer.from(f.approvalText)
  if(path.startsWith(repo+'contents/')&&path.endsWith('?ref=e925dcbcd8b087dd3f6ec4c58a7cc07e515ae75d')){const p=path.slice((repo+'contents/').length).split('?')[0],body=Buffer.from(f.runtime[p]);return {type:'file',path:p,encoding:'base64',size:body.length,content:body.toString('base64')}}
  return original(path,binary)
 }
}
