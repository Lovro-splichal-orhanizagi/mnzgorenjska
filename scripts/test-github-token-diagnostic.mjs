import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'

const root=dirname(fileURLToPath(import.meta.url)),script=resolve(root,'diagnose-github-token.mjs')
const head='a'.repeat(40)
const identity={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/codex-github-token-diagnostic-e925-20261030',GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229',GITHUB_TRIGGERING_ACTOR:'nejcar20',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_SHA:head,EXPECTED_SHA:head,GH_TOKEN:'synthetic-token-must-not-escape'}
const rate=remaining=>JSON.stringify({resources:{core:{limit:5000,remaining,reset:1,used:5000-remaining}}})
const release=JSON.stringify({id:416653899,tag_name:'fcf-inventory-staging-v1',draft:true})
const asset=JSON.stringify({id:690671037,name:'fixed-private-asset',state:'uploaded',size:17582,digest:'sha256:e9b7d58e47239cd6d19109e43af49e4980b62b6339d21a1879c5b2a7fdb72a51'})
function execute(scenario,mutate={}){
 const dir=mkdtempSync(join(tmpdir(),'github-token-diag-')),bin=join(dir,'gh')
 const fake=`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync('calls.txt',JSON.stringify(args)+'\\n');
const scenario=process.env.TEST_SCENARIO;const ep=args[3];
if(scenario==='quota-zero')process.stdout.write(${JSON.stringify(rate(0))});
else if(ep==='rate_limit')process.stdout.write(${JSON.stringify(rate(4))});
else if(ep.endsWith('/releases/416653899')){if(scenario==='release-403'){process.stderr.write('HTTP 403 secret-token-and-private-message');process.exit(1)}process.stdout.write(${JSON.stringify(release)})}
else if(ep.endsWith('/releases/assets/690671037')&&args.some(a=>a.includes('application/vnd.github+json')))process.stdout.write(${JSON.stringify(asset)});
else if(ep.endsWith('/releases/assets/690671037'))process.stdout.write('synthetic-body');
else{process.stderr.write('unexpected fixed-path invocation');process.exit(2)}
`
 writeFileSync(bin,fake);chmodSync(bin,0o700)
 try{
  const env={...process.env,...identity,PATH:`${dir}:${process.env.PATH}`,TEST_SCENARIO:scenario,...mutate}
  const stdout=execFileSync(process.execPath,[script],{cwd:dir,env,encoding:'utf8',maxBuffer:1024*1024})
  const callFile=join(dir,'calls.txt')
  return {dir,stdout,json:JSON.parse(readFileSync(join(dir,'github-token-diagnostic.json'),'utf8')),calls:existsSync(callFile)?readFileSync(callFile,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):[]}
 }catch(error){rmSync(dir,{recursive:true,force:true});throw error}
}
try{
 const zero=execute('quota-zero')
 assert.equal(zero.json.core.remaining,0);assert.equal(zero.json.failure.category,'primary_rate_limit');assert.equal(zero.calls.length,1)
 const denied=execute('release-403')
 assert.equal(denied.json.failure.category,'forbidden_or_secondary_limit');assert.equal(denied.json.failure.status,403);assert.equal(denied.calls.length,2)
 assert.doesNotMatch(JSON.stringify(denied.json)+denied.stdout,/secret-token|private-message|synthetic-token/)
 assert.deepEqual(denied.calls.map(c=>c[3]),['rate_limit','repos/Lovro-splichal-orhanizagi/mnzgorenjska/releases/416653899'])
 const bounded=execute('bounded')
 assert.equal(bounded.calls.length,4);assert.equal(bounded.json.failure.category,'asset_digest_mismatch');assert.equal(bounded.json.apiCalls.length,4)
 assert.deepEqual(bounded.calls.map(c=>c[1]),Array(4).fill('--method'))
 assert.equal(bounded.calls[3][3],'repos/Lovro-splichal-orhanizagi/mnzgorenjska/releases/assets/690671037')
 assert.doesNotMatch(JSON.stringify(bounded.json)+bounded.stdout,/synthetic-body|synthetic-token/)
 const gated=execute('quota-zero',{GITHUB_ACTOR_ID:'0'})
 assert.equal(gated.json.failure.category,'gate_failed');assert.equal(gated.calls.length,0)
 process.stdout.write('4 synthetic diagnostic cases passed; fixed GET calls only\n')
 for(const item of [zero,denied,bounded,gated])rmSync(item.dir,{recursive:true,force:true})
}catch(error){process.stderr.write('synthetic diagnostic test failed\n');throw error}
