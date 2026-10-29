import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {partitionFixture} from './fussball-native-composition-test-fixture.mjs'
import {validateFussballNativeCatalog,getFussballNativeCompositionSource,readFussballNativeCompositionSource} from './fussball-native-composition.mjs'
const kind='baden-fussball-completed-stages-native-catalog',sourceKind='authenticated-fussball-baden-completed-stages-source',code='f9eeb9ecff417b24a599038ee1d0aa9f4c8fd09f8b47cdd71a6c79fb9e823dca'
test('explicit mixed completed-stage catalog DATA remains distinct from whole successful pair/V7',()=>{const f=partitionFixture(),c={...structuredClone(f.catalog),kind,sourceRunId:'40859714195',sourceHead:'f3669300087c5f8df926a599d86f03b1269215c5',captureCodeSha256:code};assert.equal(validateFussballNativeCatalog(c).kind,kind);for(const bad of [{...c,captureCodeSha256:f.catalog.captureCodeSha256},{...c,sourceRunId:'1'},{...c,sourceHead:'0'.repeat(40)}])assert.throws(()=>validateFussballNativeCatalog(bad),/source scope|source tuple/);assert.equal(JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url))).kind,'baden-fussball-native-catalog')})
test('new source seam reaches genuine mixed issuer and refuses copied flags before IO',async()=>{assert.throws(()=>getFussballNativeCompositionSource({kind:sourceKind,sourceOnly:true}),/PRIVATE_CAPABILITY/);let calls=0;await assert.rejects(readFussballNativeCompositionSource({sourceRunId:'40859714195',frozenDirectory:'compatibility-unused',v6FrozenDirectory:'compatibility-unused',github:()=>{calls++}}),/compiled source run/);assert.equal(calls,0)})
import * as fs from 'node:fs'
import {join} from 'node:path'
import {nativeRuntimeFixture} from './fussball-native-runtime-test-fixture.mjs'
import {fussballNativeOriginalResultBytes} from './fussball-native-role-replay.mjs'
import {BADEN_SLUG,BADEN_CURRENT,BADEN_CARDS} from './lib/fussball-native-history-policy.mjs'
test('TEST ONLY mixed durable seed keeps current commitment and original historical archive JSON separately',async t=>{
 const competition={id:77001,country_id:66,country_code:'DE',slug:BADEN_SLUG,source:'fussball-public',source_league_code:BADEN_CURRENT,source_policy:BADEN_CARDS,date_only_deadline_policy:null,active:false},f=nativeRuntimeFixture(t,competition,{completedStages:true})
 assert.equal(f.f.catalog.kind,kind)
 f.controls.replay=async({files,stage})=>{assert.equal(stage,'current');const original=f.f.state.originals.stages.current;assert.deepEqual(files,original.files);fussballNativeOriginalResultBytes({...original,files});return {result:structuredClone(original.result)}}
 const context=await f.context(),directory=join(f.directory,'mixed-seed');await f.api.seedFussballNativeRuntime({context,competition,directory});assert.equal(f.calls.filter(x=>x==='pure-stage-replay').length,1);assert.equal(fs.existsSync(join(directory,'current/result.json')),false);assert.equal(fs.existsSync(join(directory,'current/result-commitment.json')),true);assert.equal(fs.existsSync(join(directory,'archive/result.json')),true);assert.equal(fs.existsSync(join(directory,'archive/result-commitment.json')),false)
 await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,composition:f.token,directory});f.observed.active=true;const loaded=await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory});assert.equal(f.api.getFussballNativeRuntimeContext(loaded.context,competition).pack.source.kind,'authenticated-fussball-baden-completed-stages-source')
})
