import test from 'node:test'
import assert from 'node:assert/strict'
import {assertFcfRefresh800JobGraph,getFcfRefresh800Execution} from './fcf-refresh800-execution.mjs'
const run={id:123,head_sha:'a'.repeat(40),run_attempt:1,status:'in_progress'},capture={name:'Capture fixed240 refresh800 originals',number:1,status:'in_progress',conclusion:null,started_at:'2026-10-29T20:00:00Z'},job={id:456,run_id:123,head_sha:run.head_sha,run_attempt:1,name:'refresh800-capture',status:'in_progress',conclusion:null,steps:[capture]}
test('only closed exact capture graph can be excluded from its own pre-GET history',()=>{assertFcfRefresh800JobGraph({run,jobs:[job],terminal:false,expectedJobNames:['refresh800-capture']});for(const jobs of [[job,{...job,id:789,name:'missing-inventory-g1'}],[{...job,steps:[{...capture,name:'other source'}]}],[{...job,run_attempt:2}],[{...job,steps:[]}],[{...job,steps:[capture,{...capture,number:2}]}]])assert.throws(()=>assertFcfRefresh800JobGraph({run,jobs,terminal:false,expectedJobNames:['refresh800-capture']}),/REFRESH800/);assert.throws(()=>getFcfRefresh800Execution({runId:'123'}),/reader-issued/)})

import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {authenticateFcfRefresh800Epoch} from './fcf-refresh800-execution.mjs'
import {FCF_REFRESH800_PROFILE,fcfRefresh800Target} from './fcf-refresh800-contract.mjs'
import {fcfRefresh800RuntimeFiles} from './fcf-refresh800-runtime.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {rawSha256} from './fcf-missing-inventory-artifact.mjs'
import {epochFixture} from './fcf-refresh800-test-fixture.mjs'
test('epoch authenticates exact approval/runtime/claim without comparing later consumer CI',async()=>{const f=epochFixture(),e=await authenticateFcfRefresh800Epoch(f);assert.equal(e.plan.priorSourceGETs,301);assert.equal(e.plan.plannedCumulativeSourceGETs,541);assert.ok(f.calls.every(p=>!p.includes('branches/main')));assert.equal(e.claimBinding.claimRef.length>0,true)})
test('changed raw root approval, wrong reserved execution, missing runtime and mutable tag protection HOLD',async()=>{for(const kind of ['asset','run','runtime','ruleset']){const f=epochFixture(),original=f.github;f.github=async(p,b)=>{const x=await original(p,b);if(kind==='asset'&&p.endsWith('releases/assets/1'))return Buffer.concat([x,Buffer.from(' ')]);if(kind==='runtime'&&p.includes('contents/scripts/fcf-refresh800-capture.mjs'))return {...x,content:Buffer.from('changed').toString('base64')};if(kind==='ruleset'&&p.endsWith('rulesets/42'))return {...x,bypass_actors:[{actor_id:1}]};return x};if(kind==='run')f.run={...f.run,run_attempt:2};await assert.rejects(authenticateFcfRefresh800Epoch(f))}})

test('only exact skipped expression aliases normalize under authenticated refresh epoch',()=>{const alias={id:789,run_id:123,head_sha:run.head_sha,run_attempt:1,name:'inputs.mode',status:'completed',conclusion:'skipped',steps:[]};assertFcfRefresh800JobGraph({run,jobs:[job,alias],terminal:false,expectedJobNames:['refresh800-capture','missing-inventory']});assert.throws(()=>assertFcfRefresh800JobGraph({run,jobs:[job,{...alias,status:'in_progress',conclusion:null}],terminal:false,expectedJobNames:['refresh800-capture','missing-inventory']}),/REFRESH800/)})
