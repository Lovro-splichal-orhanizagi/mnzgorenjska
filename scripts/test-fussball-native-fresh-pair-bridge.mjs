import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import * as api from './fussball-native-composition.mjs'
import {fussballNativeOriginalResultBytes as project,replayFussballNativeRoles} from './fussball-native-role-replay.mjs'
import {partitionFixture,isolatedComposition} from './fussball-native-composition-test-fixture.mjs'
const freshKind='baden-fussball-fresh-pair-native-catalog',freshSourceKind='authenticated-fussball-baden-fresh-pair-source',freshCode='f9eeb9ecff417b24a599038ee1d0aa9f4c8fd09f8b47cdd71a6c79fb9e823dca'
test('native catalog DATA accepts only explicit oldV7 or freshPAIR kind with its actual fingerprint',()=>{
 const f=partitionFixture(),old=f.catalog,fresh={...structuredClone(old),kind:freshKind,captureCodeSha256:freshCode}
 assert.equal(api.validateFussballNativeCatalog(old).kind,'baden-fussball-native-catalog')
 assert.equal(api.validateFussballNativeCatalog(fresh).kind,freshKind)
 for(const bad of [{...fresh,kind:old.kind},{...old,kind:freshKind},{...fresh,kind:'unknown-source-family'},{...fresh,captureCodeSha256:'f'.repeat(64)}])assert.throws(()=>api.validateFussballNativeCatalog(bad),/source scope|source family/)
})
test('native source seam calls real private freshPAIR getter and rejects copied/serialized data',async()=>{
 assert.equal(typeof api.getFussballNativeCompositionSource,'function');assert.equal(typeof api.readFussballNativeCompositionSource,'function')
 for(const p of [{kind:freshSourceKind},{kind:freshSourceKind,source:{nativeEligible:true}},JSON.parse(JSON.stringify({kind:freshSourceKind,sourceOnly:true}))])assert.throws(()=>api.getFussballNativeCompositionSource(p),/reader-issued fresh paired/)
 for(const key of ['catalog','loader','clock','allowFreshPair']){let calls=0;await assert.rejects(api.readFussballNativeCompositionSource({sourceRunId:'99999999999',frozenDirectory:'unused',v6FrozenDirectory:'unused',github:async()=>{calls++},[key]:true}),/closed/);assert.equal(calls,0)}
})
test('unchanged compiled old catalog refuses substituting a new source run before source GET',async()=>{
 const compiled=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)));assert.equal(compiled.kind,'baden-fussball-native-catalog');assert.notEqual(compiled.captureCodeSha256,freshCode)
 let calls=0;await assert.rejects(api.readFussballNativeCompositionSource({sourceRunId:'99999999999',frozenDirectory:'unused',v6FrozenDirectory:'unused',github:async()=>{calls++}}),/compiled source run/);assert.equal(calls,0)
})
test('old TEST ONLY private source partition retains original five-way behavior and byte hashes',()=>{
 const f=partitionFixture(),before=Buffer.from(f.state.originals.stages.current.files.get('result.json')),pack=isolatedComposition(f).buildFussballNativeComposition(f.proof)
 assert.deepEqual(pack.seasons[0].inventory.counts,{'unplayed':1,'complete':1,'community-pending':1,'reviewed-known-result-unavailable':1,'reviewed-unknown-administrative-result':0})
 assert.equal(pack.source.kind,'authenticated-completed-fussball-v7-source');assert.equal(pack.captureCodeSha256,f.catalog.captureCodeSha256);assert.equal(pack.nativeAdmission,false);assert.equal(pack.activationEligible,false);assert.deepEqual(f.state.originals.stages.current.files.get('result.json'),before)
})
test('fresh semantic commitment returns derived bytes without fabricating original result.json and refuses changes',()=>{
 const hash=b=>createHash('sha256').update(b).digest('hex'),json=x=>Buffer.from(JSON.stringify(x)+'\n')
 const result={scope:{provider:'fussball'},coverage:{fixtures:1},activationEligible:false},raw=json(result),commitment={version:1,kind:'fussball-full-semantic-result-commitment',resultSha256:hash(raw),semanticBytes:raw.length,scope:result.scope,coverage:result.coverage,sourceOnly:true,nativeAdmission:false,activationEligible:false},leaf=json(commitment),stage={manifest:{version:8,protocol:'baden-fresh-paired-transports-v1',resultSha256:hash(raw),resultCommitmentSha256:hash(leaf)},result,files:new Map([['result-commitment.json',leaf]])}
 assert.deepEqual(project(stage),raw);assert.equal(stage.files.has('result.json'),false);assert.equal(stage.files.size,1)
 for(const mutate of [s=>{s.result.coverage.fixtures++},s=>{s.manifest.resultCommitmentSha256='0'.repeat(64)},s=>{s.manifest.version=7},s=>{const c=JSON.parse(s.files.get('result-commitment.json'));c.nativeAdmission=true;const b=json(c);s.files.set('result-commitment.json',b);s.manifest.resultCommitmentSha256=hash(b)},s=>{const c=JSON.parse(s.files.get('result-commitment.json'));c.extra=true;const b=json(c);s.files.set('result-commitment.json',b);s.manifest.resultCommitmentSha256=hash(b)}]){const bad={manifest:structuredClone(stage.manifest),result:structuredClone(stage.result),files:new Map(stage.files)};mutate(bad);assert.throws(()=>project(bad),/fresh|commitment/)}
 const legacy={files:new Map([['result.json',Buffer.from('ORIGINAL')]])};assert.equal(project(legacy),legacy.files.get('result.json'))
})

test('pure native role replay accepts fresh commitments with original maps unchanged and keeps old effective partition',()=>{
 const f=partitionFixture(),stages=f.state.originals.stages,old=replayFussballNativeRoles(stages)
 for(const stage of Object.values(stages)){
  const raw=stage.files.get('result.json'),commitment={version:1,kind:'fussball-full-semantic-result-commitment',resultSha256:stage.manifest.resultSha256,semanticBytes:raw.length,scope:stage.result.scope,coverage:stage.result.coverage,sourceOnly:true,nativeAdmission:false,activationEligible:false},leaf=Buffer.from(JSON.stringify(commitment)+'\n')
  stage.files.delete('result.json');stage.files.set('result-commitment.json',leaf);Object.assign(stage.manifest,{version:8,protocol:'baden-fresh-paired-transports-v1',resultCommitmentSha256:createHash('sha256').update(leaf).digest('hex')})
 }
 assert.deepEqual(replayFussballNativeRoles(stages),old)
 for(const stage of Object.values(stages))assert.equal(stage.files.has('result.json'),false)
 stages.archive.result.coverage.fixtures++
 assert.throws(()=>replayFussballNativeRoles(stages),/semantic commitment/)
})
