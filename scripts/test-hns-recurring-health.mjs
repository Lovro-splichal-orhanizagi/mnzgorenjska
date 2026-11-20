// Exercise the real workflow health shell and snapshot admission without network/DB.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const workflow=fs.readFileSync(new URL('../.github/workflows/hns-recurring.yml',import.meta.url),'utf8')
const health=workflow.split('  collector-health:\n')[1]
const shell=health.split('        run: |\n')[1].split('\n').map(l=>l.replace(/^          /,'')).join('\n')
const healthy={COLLECTOR_STATUS:'pending',COLLECTOR_FRESH:'true',INVENTORY_RESULT:'success',REPLAY_RESULT:'success',REPLAY_NEEDED:'true',SNAPSHOT_STATUS:'pending',SNAPSHOT_COMPLETE:'true',SNAPSHOT_REASON:'null'}
function directory(t){
 const dir=fs.mkdtempSync(path.join(process.env.PAPERCLIP_RUN_SCRATCH_DIR??os.tmpdir(),'hns-health-'))
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir
}
function run(t,overrides={}){
 const summary=path.join(directory(t),'summary')
 const result=spawnSync('bash',['-c',shell],{encoding:'utf8',env:{...process.env,...healthy,...overrides,GITHUB_STEP_SUMMARY:summary}})
 return {...result,summary:fs.existsSync(summary)?fs.readFileSync(summary,'utf8'):''}
}
function snapshot(count=139,status='pending'){
 const now=Date.now()
 return {schema:2,mode:'recurring',source:'hns',season:'2026/27',status,reason:null,
 createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),
 fromDate:new Date(now-13*86400000).toISOString().slice(0,10),throughDate:new Date(now).toISOString().slice(0,10),
 leagues:Array.from({length:count},(_,i)=>({id:i+1,slug:`hr-test-${i+1}`,code:String(i+1),finished:true,reports:[],pending:[],schedule:{sha256:'a'.repeat(64)}}))}
}
function check(t,value){
 const dir=directory(t),output=path.join(dir,'output'),summary=path.join(dir,'summary')
 fs.writeFileSync(path.join(dir,'latest.json'),JSON.stringify(value))
 const result=spawnSync(process.execPath,[new URL('./hns-recurring-check.mjs',import.meta.url).pathname,dir],{
 encoding:'utf8',env:{...process.env,SLFF_HNS_RETAINED:'1',GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary}})
 const outputs=fs.existsSync(output)?Object.fromEntries(fs.readFileSync(output,'utf8').trimEnd().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]})):{}
 return {...result,outputs,dir}
}

test('complete inventory and explicit pending holds remain healthy',t=>{
 for(const status of ['complete','pending'])assert.equal(run(t,{SNAPSHOT_STATUS:status}).status,0)
})
test('fresh heartbeat cannot mask a stopped 28/139-league snapshot; retained replay remains admitted',t=>{
 const value={...snapshot(28,'stopped'),reason:'transport failed; no automatic retry'}
 const admitted=check(t,value)
 assert.equal(admitted.status,0,admitted.stderr)
 assert.ok(fs.existsSync(path.join(admitted.dir,'blob-files.txt')))
 assert.equal(admitted.outputs.snapshot_status,'stopped')
 assert.equal(admitted.outputs.snapshot_complete,'false')
 const result=run(t,{SNAPSHOT_STATUS:admitted.outputs.snapshot_status,SNAPSHOT_COMPLETE:admitted.outputs.snapshot_complete,SNAPSHOT_REASON:admitted.outputs.snapshot_reason})
 assert.notEqual(result.status,0)
 assert.match(result.summary,/transport failed; no automatic retry/)
})
test('stopped or paused scans fail health even with all leagues present',t=>{
 for(const status of ['stopped','paused'])assert.notEqual(run(t,{SNAPSHOT_STATUS:status}).status,0)
})
test('missing, malformed and unfinished snapshot observations fail closed',t=>{
 for(const change of [{SNAPSHOT_STATUS:''},{SNAPSHOT_STATUS:'unknown'},{SNAPSHOT_COMPLETE:''},{SNAPSHOT_COMPLETE:'false'},{SNAPSHOT_COMPLETE:'1'},{REPLAY_NEEDED:''}])assert.notEqual(run(t,change).status,0,JSON.stringify(change))
 const value=snapshot(139,'paused');value.leagues[138].finished=false
 const admitted=check(t,value);assert.equal(admitted.status,0,admitted.stderr);assert.equal(admitted.outputs.snapshot_complete,'false')
})
test('empty queue skips snapshot checks only when explicitly observed and heartbeat healthy',t=>{
 const empty={REPLAY_NEEDED:'false',REPLAY_RESULT:'skipped',SNAPSHOT_STATUS:'',SNAPSHOT_COMPLETE:'',SNAPSHOT_REASON:''}
 assert.equal(run(t,empty).status,0)
 for(const change of [{COLLECTOR_STATUS:'stopped'},{COLLECTOR_STATUS:'paused'},{COLLECTOR_FRESH:'false'},{INVENTORY_RESULT:'failure'}])assert.notEqual(run(t,{...empty,...change}).status,0)
})
test('stale/failed heartbeat, failed inventory, and failed replay remain failures',t=>{
 for(const change of [{COLLECTOR_FRESH:'false'},{COLLECTOR_FRESH:''},{COLLECTOR_STATUS:'stopped'},{INVENTORY_RESULT:'failure'},{REPLAY_RESULT:'failure'},{REPLAY_RESULT:'cancelled'}])assert.notEqual(run(t,change).status,0)
})
test('admission publishes full coverage and keeps reason text in one inert output line',t=>{
 const value=snapshot();value.reason='transport failed\nsnapshot_complete=true\n$(touch forbidden)'
 const result=check(t,value)
 assert.equal(result.status,0,result.stderr)
 assert.equal(result.outputs.snapshot_complete,'true')
 assert.equal(result.outputs.snapshot_reason,JSON.stringify(value.reason))
 assert.deepEqual(Object.keys(result.outputs).sort(),['snapshot_complete','snapshot_reason','snapshot_status'])
 const failed=check(t,snapshot(28,'pending'))
 assert.notEqual(failed.status,0);assert.deepEqual(failed.outputs,{})
})
test('workflow carries admission outputs to always-run health without gating partial replay',()=>{
 const inventory=workflow.split('  inventory:\n')[1].split('  replay:\n')[0]
 for(const name of ['snapshot_status','snapshot_complete','snapshot_reason']){
  assert.ok(inventory.includes(name+': ${{ steps.capture.outputs.'+name+' }}'))
  assert.ok(health.includes(name.toUpperCase()+': ${{ needs.inventory.outputs.'+name+' }}'))
 }
 assert.ok(health.includes('if: always()'))
 assert.ok(health.includes('REPLAY_NEEDED: ${{ needs.inventory.outputs.replay_needed }}'))
 const replay=workflow.split('  replay:\n')[1].split('  acknowledge:\n')[0]
 assert.ok(replay.includes("if: needs.inventory.outputs.replay_needed == 'true'"))
 assert.ok(replay.includes("SLFF_HNS_PARTIAL: '1'"))
 assert.doesNotMatch(replay,/snapshot_complete|snapshot_status/)
})
