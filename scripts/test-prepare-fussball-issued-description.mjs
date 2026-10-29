import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import * as preparation from './prepare-fussball-native-history.mjs'
import * as history from './lib/fussball-native-history-policy.mjs'
import {hostedDerivedFixture,derivedHead,derivedRunId} from './fussball-native-composition-test-fixture.mjs'

// TEST ONLY: execute the actual preparation body with the existing tiny hosted
// fixture's real private composition issuer/getter; only remote/source IO is fake.
async function issuedFixture(t){
 const f=await hostedDerivedFixture(t),composition=await f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',v6FrozenDirectory:'TEST-ONLY-4e',github:f.github})
 const path=new URL('./prepare-fussball-native-history.mjs',import.meta.url),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {describeIssuedFussballNativePreparation,describeFussballNativePreparation};'
 const localRead=(url,...args)=>url.href.endsWith('/policies/fussball-baden-native-composition.json')?Buffer.from(JSON.stringify(f.catalog)):readFileSync(url,...args)
 const keys=['BADEN_CURRENT','BADEN_ARCHIVE','BADEN_SLUG','BADEN_CARDS','badenCanonical','projectBadenHistoricalPolicy','badenClubKey']
 const api=new Function('readFileSync','createHash','isDeepStrictEqual','getFussballNativeComposition','reauthenticateFussballNativeComposition','validateFussballNativeCatalog',...keys,code)(localRead,createHash,isDeepStrictEqual,f.api.getFussballNativeComposition,f.api.reauthenticateFussballNativeComposition,f.api.validateFussballNativeCatalog,...keys.map(k=>history[k]))
 return {f,composition,api}
}

test('issued description rejects public forged, copied and serialized capability data',()=>{
 assert.equal(typeof preparation.describeIssuedFussballNativePreparation,'function')
 for(const value of [{},{nativeImportEligible:true},{kind:'source-partition-verified-awaiting-native-preparation'},JSON.parse('{"catalogStatus":"FINALIZED"}')])assert.throws(()=>preparation.describeIssuedFussballNativePreparation(value),/reader-issued/)
})
test('issued description is synchronous canonical DATA with no new source replay; async description still reauthenticates',async t=>{
 const {f,composition,api}=await issuedFixture(t),reads=f.sourceReads,gets=f.calls.length
 const issued=api.describeIssuedFussballNativePreparation(composition)
 assert.equal(issued instanceof Promise,false);assert.equal(f.sourceReads,reads);assert.equal(f.calls.length,gets)
 assert.deepEqual(Object.keys(issued).sort(),['activationEligible','catalogStatus','manifest','nativeImportEligible','sha256'])
 assert.equal(issued.catalogStatus,'FINALIZED');assert.equal(issued.nativeImportEligible,false);assert.equal(issued.activationEligible,false);assert.equal(Object.isFrozen(issued),true)
 assert.equal(createHash('sha256').update(issued.manifest).digest('hex'),issued.sha256)
 assert.equal(JSON.parse(issued.manifest).currentFreshUntil,f.proof.source.currentFreshUntil)
 for(const copy of [{...composition},JSON.parse(JSON.stringify(composition))])assert.throws(()=>api.describeIssuedFussballNativePreparation(copy),/reader-issued/)
 const checked=await api.describeFussballNativePreparation(composition)
 assert.deepEqual(checked,issued);assert.equal(f.sourceReads,reads+2)
 f.controls.change=(path,v)=>path.endsWith('branches/main')?{name:'main',commit:{sha:'f'.repeat(40)}}:v
 await assert.rejects(api.describeFussballNativePreparation(composition),/main/)
})
test('async description retains source replay failure refusal after a synchronous description',async t=>{
 const {f,composition,api}=await issuedFixture(t)
 api.describeIssuedFussballNativePreparation(composition);f.sourceFailure=true
 await assert.rejects(api.describeFussballNativePreparation(composition),/source replay failed/)
})
test('issued and async description retain original 24h expiry with no caller override',async t=>{
 const {f,composition,api}=await issuedFixture(t)
 const created=new Date(Date.now()-25*3600_000).toISOString();f.proof.source.currentCreatedAt=created;f.proof.source.currentFreshUntil=new Date(Date.parse(created)+24*3600_000).toISOString()
 assert.throws(()=>api.describeIssuedFussballNativePreparation(composition,{requireFresh:false}),/freshness expired/)
 await assert.rejects(api.describeFussballNativePreparation(composition),/freshness expired/)
})
