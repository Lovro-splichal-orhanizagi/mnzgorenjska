import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as paths from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {deflateRawSync} from 'node:zlib'
import {isDeepStrictEqual as same} from 'node:util'
import {nativeFixture,isolateR10} from './fussball-baden-r10-m2-test-fixture.mjs'
import * as season from './fussball-season.mjs'
import * as importer from './fussball-import.mjs'
import * as roles from './viri/fussball-native-role-parser.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import * as retry from './lib/fussball-v4-retry.mjs'
import * as contract from './fussball-baden-r10-refresh-contract.mjs'
import {R10_PREFIX,R10_REPOSITORY} from './fussball-baden-r10-contract.mjs'
import {inspectBadenR10AttemptJournals} from './fussball-baden-r10-foundation.mjs'
import {BADEN_CURRENT} from './lib/fussball-native-history-policy.mjs'
const sha=contract.refreshSha
import {refreshFixture as fixture} from './fussball-baden-r10-refresh-test-fixture.mjs'
test('TEST ONLY real native refresh uses private5000 remainder after source24h and independently authenticates/replays new originals',async t=>{const f=await fixture(t,{fail:'connect'}),lease=await f.prepare();f.setCapture();const result=await f.api.captureBadenR10Refresh({lease}).catch(e=>{e.message+=' '+JSON.stringify(JSON.parse(fs.readFileSync(paths.join(f.directory,'native-runtime.json'))).error);throw e});assert.equal(result.provenance.priorRequests,4800);assert.equal(result.provenance.requests,f.fetches);assert.ok(result.provenance.requests>1);const files=fs.readFileSync(paths.join(f.directory,'native-runtime.json')),m=JSON.parse(files);assert.equal(m.maximumRequests,200);assert.equal(m.snapshot.attempts[0].status,'failed');assert.equal(m.currentCreatedAt,m.snapshot.attempts[0].startedAt);assert.notEqual(m.currentCreatedAt,m.originalCurrentCreatedAt);f.finish();const proof=await f.reader.readBadenR10RefreshAccounting({github:f.github,refreshRunId:f.runId,refreshHead:f.head}),a=f.reader.getBadenR10RefreshAccounting(proof);assert.equal(a.accounting.failedAttempts,1);assert.equal(a.accounting.requests,f.fetches);const context=await f.f.native.loadBadenR10ActiveSeed({directory:paths.join(f.directory,'seed'),github:f.github,db:f.f.db,competition:f.f.competition}),loaded=await f.api.loadBadenR10RefreshDirectory({context,competition:f.f.competition,directory:f.directory,github:f.github});assert.deepEqual(loaded,result);f.api.assertBadenR10CurrentBatch(loaded);assert.throws(()=>f.api.assertBadenR10CurrentBatch(structuredClone(loaded)),/PRIVATE_FRESH_CURRENT_BATCH/);f.advance(86400000);assert.throws(()=>f.api.assertBadenR10CurrentBatch(loaded),/PRIVATE_FRESH_CURRENT_BATCH/);await assert.rejects(f.api.captureBadenR10Refresh({lease}),/PRIVATE_LEASE/)})
test('TEST ONLY native refusal/partial/max remainder charge every actual attempt and never fall back to1000',async t=>{for(const options of [{fail:'403'},{fail:'partial'},{prior:4998}]){const f=await fixture(t,options),lease=await f.prepare();f.setCapture();await assert.rejects(f.api.captureBadenR10Refresh({lease}));const m=JSON.parse(fs.readFileSync(paths.join(f.directory,'native-runtime.json')));assert.equal(m.maximumRequests,5000-(options.prior??4800));assert.equal(m.cumulativeChargedRequests,m.priorRequests+f.fetches);assert.ok(f.fetches<=(options.prior?2:1));if(options.fail==='partial')assert.ok(m.partialBodies.length>0);f.finish(false);const p=await f.reader.readBadenR10RefreshAccounting({github:f.github,refreshRunId:f.runId,refreshHead:f.head}),s=f.reader.getBadenR10RefreshAccounting(p);assert.equal(s.accounting.requests,f.fetches);assert.equal(s.manifest.success,false)}})
test('TEST ONLY expired/copied native remainder and wrong actual phase stop before source; unknown metadata/journals HOLD',async t=>{const f=await fixture(t),lease=await f.prepare();await assert.rejects(f.api.captureBadenR10Refresh({lease:structuredClone(lease)}),/PRIVATE_LEASE/);await assert.rejects(f.api.captureBadenR10Refresh({lease}),/ACTUAL_PHASE/);assert.equal(f.fetches,0);const g=await fixture(t),valid=await g.prepare();g.setCapture();g.advance(60000);await assert.rejects(g.api.captureBadenR10Refresh({lease:valid}),/expired/);assert.equal(g.fetches,0)})
