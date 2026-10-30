import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'

const root=dirname(fileURLToPath(import.meta.url)),script=resolve(root,'diagnose-github-token.mjs')
const head='a'.repeat(40),repo='Lovro-splichal-orhanizagi/mnzgorenjska',repoPath=`repos/${repo}`
const productionTransportSha256='cf6141a446a64999d146dd5e8dae488eb671b58077c48258376850326bb17a56'
assert.equal(createHash('sha256').update(readFileSync(resolve(root,'fcf-inventory-github.mjs'))).digest('hex'),productionTransportSha256,'diagnostic uses exact frozen production transport source')
assert.equal(createHash('sha256').update(readFileSync(resolve(root,'fcf-missing-inventory-artifact.mjs'))).digest('hex'),'2c9a4c6bd74d6e331b9f5870b1e26068b795982b991507ab50031c5fb72aca59','production transport dependency is the reviewed exact source')
const identity={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/codex-github-token-diagnostic-e925-20261030',GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229',GITHUB_TRIGGERING_ACTOR:'nejcar20',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:repo,GITHUB_SHA:head,EXPECTED_SHA:head,GH_TOKEN:'synthetic-token-must-not-escape'}
const rate=remaining=>JSON.stringify({resources:{core:{limit:5000,remaining,reset:1,used:5000-remaining}}})
const release=JSON.stringify({id:416653899,tag_name:'fcf-inventory-staging-v1',draft:true,url:`https://api.github.com/${repoPath}/releases/416653899`,assets_url:`https://api.github.com/${repoPath}/releases/416653899/assets`})
const asset=JSON.stringify({id:690729624,name:'fcf-g9-r1-job-log-123509832634-f613e0376a17218c0776d325a979687ef281ae7bc9da341c9f2213186bdd189d.log',state:'uploaded',size:24884,digest:'sha256:f613e0376a17218c0776d325a979687ef281ae7bc9da341c9f2213186bdd189d',url:`https://api.github.com/${repoPath}/releases/assets/690729624`,browser_download_url:`https://github.com/${repo}/releases/download/untagged-54ad9eae4f3cb277779c/test.log`,uploader:{id:25134229}})
const noisyStderr='HTTP 404 https://objects.example/file?X-Amz-Signature=SIGNATURESECRET Authorization: Bearer ghp_SECRET123 token=APITOKENSECRET github_pat_SECRET456 refresh_token=REFRESHSECRET '+ 'a'.repeat(48)+' '+'Q'.repeat(48)+' EAGAIN write stdout resource temporarily unavailable broken pipe'
function execute(scenario,mutate={}){
 const dir=mkdtempSync(join(tmpdir(),'github-token-diag-')),bin=join(dir,'gh')
 const fake=`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);
if(args[0]==='--version'){process.stdout.write('gh version 2.99.1 (2026-10-01)\\nhttps://github.com/secret/version-token\\n');process.exit(0)}
if(args[0]==='api'&&args[1]==='--help'){process.stdout.write('gh api options: --allow-escape-sequences\\n');process.exit(0)}
fs.appendFileSync('calls.txt',JSON.stringify(args)+'\\n');
const scenario=process.env.TEST_SCENARIO;const ep=args[args.indexOf('--method')+2];
if(ep==='rate_limit')process.stdout.write(${JSON.stringify(rate(scenario==='quota-zero'?0:4))});
else if(ep==='${repoPath}/releases/416653899'){if(scenario==='release-403'){process.stderr.write('HTTP 403 token=synthetic-token Authorization: Bearer synthetic-token');process.exit(1)}process.stdout.write(${JSON.stringify(release)})}
else if(ep==='${repoPath}/releases/416653899/assets?per_page=100&page=1'){process.stdout.write(scenario==='missing-membership'?'[]':${JSON.stringify('['+asset+']')})}
else if(ep==='${repoPath}/releases/assets/690729624'){if(scenario==='raw-404'){process.stderr.write(${JSON.stringify(noisyStderr)});process.exit(1)}process.stdout.write('synthetic-body')}
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
 const realChild=execFileSync(process.execPath,['-e',"process.stdout.write(JSON.stringify({transport:'child-process-buffer',ok:true}))"],{encoding:null,stdio:['ignore','pipe','pipe']})
 assert.ok(Buffer.isBuffer(realChild),'encoding:null must return a Buffer from real execFileSync')
 assert.deepEqual(JSON.parse(realChild.toString('utf8')),{transport:'child-process-buffer',ok:true})
 const zero=execute('quota-zero')
 assert.equal(zero.json.core.remaining,0);assert.equal(zero.json.failure.category,'primary_rate_limit');assert.equal(zero.calls.length,1);assert.equal(zero.json.ghVersion,'gh version 2.99.1 (2026-10-01)')
 const denied=execute('release-403')
 assert.equal(denied.json.failure.category,'forbidden_or_secondary_limit');assert.equal(denied.json.failure.status,403);assert.equal(denied.calls.length,2);assert.equal(denied.json.apiCalls.at(-1).ghArgumentCount,4);assert.equal(denied.json.apiCalls.at(-1).acceptHeader,null)
 assert.doesNotMatch(JSON.stringify(denied.json)+denied.stdout,/synthetic-token|private-message/)
 const missing=execute('missing-membership')
 assert.equal(missing.json.failure.category,'archive_validation_failed');assert.equal(missing.calls.length,3);assert.equal(missing.calls.at(-1)[missing.calls.at(-1).indexOf('--method')+2],`${repoPath}/releases/416653899/assets?per_page=100&page=1`)
 const deniedAsset=execute('raw-404')
 assert.equal(deniedAsset.json.failure.category,'private_asset_or_not_found');assert.equal(deniedAsset.json.failure.status,404);assert.equal(deniedAsset.calls.length,4)
 const safeError=deniedAsset.json.apiCalls.at(-1)
 assert.equal(safeError.transport,'production-getFcfInventoryGithub');assert.equal(safeError.acceptHeader,'application/octet-stream');assert.equal(safeError.error.status,404)
 assert.doesNotMatch(JSON.stringify(deniedAsset.json)+deniedAsset.stdout,/SIGNATURESECRET|objects\.example|ghp_SECRET|github_pat_SECRET|APITOKENSECRET|REFRESHSECRET|X-Amz-Signature|resource temporarily unavailable|private-message/)
 const mismatch=execute('raw-mismatch')
 assert.equal(mismatch.json.failure.category,'archive_validation_failed');assert.equal(mismatch.calls.length,4);assert.equal(mismatch.json.apiCalls.at(-1).endpoint,`${repoPath}/releases/assets/690729624`)
 assert.equal(mismatch.json.apiCalls.at(-1).transport,'production-getFcfInventoryGithub')
 const rawCall=mismatch.calls.find(c=>c[c.indexOf('--method')+2]===`${repoPath}/releases/assets/690729624`)
 assert.ok(rawCall);assert.ok(rawCall.includes('--allow-escape-sequences'));assert.ok(rawCall.includes('Accept: application/octet-stream'))
 assert.equal(mismatch.json.archivedR1Log,undefined)
 for(const result of [missing,deniedAsset,mismatch])assert.ok(!result.calls.some(c=>String(c[3]).includes('/actions/jobs/123509832634/logs')))
 assert.doesNotMatch(JSON.stringify(mismatch.json)+mismatch.stdout,/synthetic-body|synthetic-token/)
 const gated=execute('quota-zero',{GITHUB_ACTOR_ID:'0'})
 assert.equal(gated.json.failure.category,'gate_failed');assert.equal(gated.calls.length,0)
 process.stdout.write('execFileSync Buffer contract and 6 synthetic diagnostic cases passed; stderr redaction/process metadata verified; fixed archive-reader routes only\n')
 for(const item of [zero,denied,missing,deniedAsset,mismatch,gated])rmSync(item.dir,{recursive:true,force:true})
}catch(error){process.stderr.write('synthetic diagnostic test failed\n');throw error}
