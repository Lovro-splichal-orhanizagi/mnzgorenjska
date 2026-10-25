import {execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {atomicCheckpoint} from './provider-league-batch.mjs'
export function admitSeedCache({inventory,expectedSha,runId,runAttempt}){
 if(!/^[a-f0-9]{40}$/.test(expectedSha??'')||! /^[1-9]\d*$/.test(runId??'')||runAttempt!=='1')throw Error('Exact first-attempt seed-cache scope required.')
 const key=`zapisniki-DE-bulk-${runId}-${runAttempt}`
 if(!Array.isArray(inventory?.actions_caches)||inventory.total_count!==inventory.actions_caches.length||inventory.total_count>100)throw Error('Incomplete seed-cache inventory.')
 const rows=inventory.actions_caches.filter(c=>c.key===key&&c.ref==='refs/heads/main')
 if(rows.length!==1||!Number.isSafeInteger(rows[0].id)||rows[0].id<=0||!Number.isSafeInteger(rows[0].size_in_bytes)||rows[0].size_in_bytes<=0||typeof rows[0].version!=='string'||!rows[0].version)throw Error('Verified initial seed cache was not durably uploaded; activation refused.')
 return {version:1,expected_sha:expectedSha,run_id:runId,persisted:true,cache:{id:rows[0].id,key,ref:rows[0].ref,version:rows[0].version,size_in_bytes:rows[0].size_in_bytes}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const {GITHUB_REPOSITORY,GITHUB_RUN_ID,GITHUB_RUN_ATTEMPT,EXPECTED_SHA}=process.env
  if(GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||! /^[1-9]\d*$/.test(GITHUB_RUN_ID??'')||GITHUB_RUN_ATTEMPT!=='1')throw Error('Exact Actions cache scope required.')
  const query=new URLSearchParams({key:`zapisniki-DE-bulk-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`,ref:'refs/heads/main',per_page:'100'})
  const inventory=JSON.parse(execFileSync('gh',['api',`repos/${GITHUB_REPOSITORY}/actions/caches?${query}`],{encoding:'utf8',timeout:30000}))
  const receipt=admitSeedCache({inventory,expectedSha:EXPECTED_SHA,runId:GITHUB_RUN_ID,runAttempt:GITHUB_RUN_ATTEMPT})
  atomicCheckpoint('release/pl-de-bulk/seed-cache-receipt.json',receipt)
 }catch(error){console.error(error.message);process.exitCode=1}
}
