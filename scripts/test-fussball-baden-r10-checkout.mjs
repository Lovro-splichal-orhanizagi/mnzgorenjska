import test from 'node:test'
import assert from 'node:assert/strict'
import {readBadenR10CiCheckout} from './fussball-baden-r10-checkout.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',head='a'.repeat(40),merge='b'.repeat(40),base='c'.repeat(40),tree='d'.repeat(40),time='2026-10-30T10:00:00Z',end='2026-10-30T10:00:01Z'
const run={id:1,run_attempt:1,head_sha:head,event:'pull_request',path:'.github/workflows/ci.yml',repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[{number:2}],referenced_workflows:[]}
const job={id:2,name:'Tipi, build, izris',run_id:1,run_attempt:1,head_sha:head,status:'completed',steps:[{number:1,name:'Run actions/checkout@v4',status:'completed',conclusion:'success',started_at:time,completed_at:end},{number:2,name:'Run actions/setup-node@v4',status:'completed',started_at:end}]}
const log=Buffer.from([`##[group]Run actions/checkout@v4`,`  repository: ${repo}`,`Syncing repository: ${repo}`,`[command]/usr/bin/git remote add origin https://github.com/${repo}`,`[command]/usr/bin/git -c protocol.version=2 fetch --prune --no-recurse-submodules origin +${merge}:refs/remotes/pull/2/merge`,`[command]/usr/bin/git checkout --progress --force refs/remotes/pull/2/merge`,`[command]/usr/bin/git log -1 --format=%H`,merge,`##[group]Run actions/setup-node@v4`].map((l,i)=>`${i===8?end:time} ${l}`).join('\n'))
const commit={sha:merge,tree:{sha:tree},parents:[{sha:base},{sha:head}]}
function fixture(mutate=(p,v)=>v){return {run:structuredClone(run),jobs:{total_count:1,jobs:[structuredClone(job)]},github:async p=>mutate(p,p.endsWith('/logs')?Buffer.from(log):structuredClone(commit))}}
test('actual primary checkout log binds historical PR merge and immutable parents, never mutable pull refs',async()=>{
 const calls=[],f=fixture();const gh=f.github;f.github=async p=>{calls.push(p);return gh(p)};const v=await readBadenR10CiCheckout(f);assert.equal(v.checkoutHead,merge);assert.deepEqual(v.parents,[base,head]);assert.equal(calls.length,2);assert.ok(calls.every(p=>!p.includes('/pulls/')));const historical=fixture();historical.run.pull_requests=[];assert.equal((await readBadenR10CiCheckout(historical)).checkoutHead,merge)
})
test('wrong checkout, reusable workflow, duplicate checkout, foreign origin and unrelated parents hold',async()=>{
 for(const mode of ['checkout','reusable','multiple','foreign','parents','job']){
  const f=fixture((p,v)=>p.endsWith('/logs')?mode==='checkout'?Buffer.from(v.toString().replace(merge+'\n',base+'\n')):mode==='multiple'?Buffer.concat([v,Buffer.from('\n'+time+' ##[group]Run actions/checkout@v4')]):mode==='foreign'?Buffer.from(v.toString().replaceAll(repo,'evil/repo')):v:mode==='parents'?{...v,parents:[{sha:base},{sha:base}]}:v)
  if(mode==='reusable')f.run.referenced_workflows=[{sha:base,ref:'refs/pull/2/merge',path:repo+'/.github/workflows/preveri-nova-vira.yml@'+base}]
  if(mode==='job')f.jobs.jobs[0].head_sha=base
  await assert.rejects(readBadenR10CiCheckout(f),/BADEN_CHECKOUT_/)
 }
})
