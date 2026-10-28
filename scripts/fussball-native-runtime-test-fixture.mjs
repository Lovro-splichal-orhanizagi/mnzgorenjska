// TEST ONLY shared constructor extracted from the reviewed runtime tests. It evaluates
// the actual runtime with isolated private brands and retained report originals;
// synthetic catalog/native IDs never mint production source/native authority.
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {partitionFixture,isolatedComposition,json,digest,hash} from './fussball-native-composition-test-fixture.mjs'
import * as policy from './lib/fussball-native-history-policy.mjs'
import * as seasonApi from './fussball-season.mjs'
import * as nativeImport from './fussball-import.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
const runtimePath=new URL('./fussball-native-runtime.mjs',import.meta.url)
export function nativeRuntimeFixture(t,competition){
 const f=partitionFixture(),candidate=GERMANY_BULK_CANDIDATES.find(c=>c.slug===policy.BADEN_SLUG)
 for(const stage of Object.values(f.state.originals.stages)){const scope=stage.result.scope,seedUrl=scope.season==='2026/27'?candidate.seedUrl:candidate.archives[0].seedUrl;scope.seedUrl=seedUrl;stage.manifest.options={...stage.manifest.options,staffel:scope.staffel,season:scope.season,seedUrl}}
 f.repin();for(const stage of Object.values(f.state.originals.stages))stage.files.set('manifest.json',json(stage.manifest))
 const composition=isolatedComposition(f),pack=composition.buildFussballNativeComposition(f.proof),compiledPolicy=policy.projectBadenHistoricalPolicy(f.catalog),token=Object.freeze({TEST_ONLY:true}),controls={},calls=[]
 const fixtures=pack.seasons.flatMap(s=>s.fixtures.map(x=>({sourceCompetitionId:s.code,season:s.season,sourceMatchId:x.id,reportId:x.zapisnikId,sourceUrl:x.url,round:x.krog,date:x.datum,time:x.ura,homeName:x.domaci,awayName:x.gostje,homeSourceClubId:policy.badenClubKey(s.code,s.season,x.domaci),awaySourceClubId:policy.badenClubKey(s.code,s.season,x.gostje),score:x.rezultat,administrativeResult:x.administrativeResult??null,unavailable:s.unavailable.some(e=>e.sourceMatchId===x.id)})))
 const manifest={version:1,slug:policy.BADEN_SLUG,currentCode:policy.BADEN_CURRENT,archiveCode:policy.BADEN_ARCHIVE,policy:compiledPolicy,derivedPackSha256:pack.derivedPackSha256,sourceCertificateSha256:pack.sourceCertificateSha256,firstFantasyPlayedOn:pack.firstFantasyPlayedOn,fixtures}
 const bindings=fixtures.map((x,n)=>({fixture:x,sourceCompetitionId:x.sourceCompetitionId,sourceMatchId:x.sourceMatchId,matchId:88000+n,roundId:99000+n,homeTeamId:66001,awayTeamId:66002}))
 const markers=compiledPolicy.entries.map(e=>{const b=bindings.find(b=>b.sourceMatchId===e.sourceMatchId),{rawSha256,reasonCode,...fixture}=e;return {...Object.fromEntries(['matchId','roundId','homeTeamId','awayTeamId'].map(k=>[k,b[k]])),sourceMatchId:e.sourceMatchId,reportId:'de-fussball-'+e.sourceMatchId,fixture,rawSha256,policyId:compiledPolicy.id,policySha256:digest(compiledPolicy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,voteCount:0}})
 const observed={kind:'baden-bound-installed-runtime',competitionId:competition.id,active:false,manifest,manifestSha256:digest(manifest),bindings,bindingSha256:digest(bindings),history:{installed:true,policyId:compiledPolicy.id,policySha256:digest(compiledPolicy),firstFantasyPlayedOn:manifest.firstFantasyPlayedOn,markers},cards:{installed:true,enabled:true,source_policy:policy.BADEN_CARDS,current_code:policy.BADEN_CURRENT,archive_codes:[policy.BADEN_ARCHIVE]},policySha256:digest(compiledPolicy),markerInventorySha256:digest(markers),firstFantasyPlayedOn:manifest.firstFantasyPlayedOn,openingRoundId:99003,registrationEligible:false,activationEligible:false}
 const db={async rpc(name,args){calls.push(name);assert.equal(name,'get_fussball_historical_runtime');assert.equal(args.p_competition_id,competition.id);if(controls.dbFailure)return {error:{message:'TEST ONLY missing binding'}};const data=structuredClone(observed);controls.mutate?.(data);return {data}}}
 const get=p=>{if(p!==token||controls.expired)throw Error('TEST ONLY private fresh source required');return {pack:structuredClone(pack),sourceProof:f.proof}}
 const reauth=async p=>{calls.push('source');get(p);return token}
 const session=(read,parsers,options)=>{
  const real=seasonApi.createFussballParserSession(read,parsers,options),source=pack.seasons.find(s=>s.season===options.season),staffel=source.code.split(':')[0],rounds=Array.from({length:Math.max(...source.fixtures.map(f=>f.krog))},(_,i)=>i+1)
  return {...real,async round(html,{url}){
   const retained=controls.roundSchedules?.get(html)
   if(!retained)assert.equal(html,'TEST ONLY synthetic full schedule')
   const round=Number(url.match(/\/spieltag\/(\d+)\//)?.[1]??rounds[0]),fixtures=structuredClone(retained??source.fixtures)
   if(!retained)controls.scheduleMutation?.(fixtures)
   return {info:{url},parsed:{sezona:source.season,krog:round,krogi:rounds.map(krog=>({krog,url:`https://www.fussball.de/spieltag/-/spieltag/${krog}/staffel/${staffel}`,izbran:krog===round})),tekme:fixtures.filter(f=>f.krog===round),prestavljene:[]}}
  }}
 }
 const localRead=(url,...args)=>url instanceof URL&&url.href.endsWith('/policies/fussball-baden-native-composition.json')?json(f.catalog):fs.readFileSync(url,...args)
 const code=fs.readFileSync(runtimePath,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(runtimePath.href)).replace(/\bexport /g,'')+'\nreturn {isBadenNativeCompetition,loadFussballNativeImportContext,getFussballNativeRuntimeContext,reauthenticateFussballNativeRuntimeContext,bindFussballHistoricalSchedule,loadPreparedFussballNativePack,collectFussballNativeRuntime,seedFussballNativeRuntime,loadFussballNativeRuntimeSeed,captureFussballNativeRuntimeDirectory,loadFussballNativeRuntimeCapture};'
 // TEST ONLY advancing clock removes waits while retaining the REAL capture
 // client's pending callback, pacing, network receipts, cache and outcomes.
 const TestDate=class extends Date{constructor(...args){super(...(args.length?args:[controls.clock??Date.now()]))}static now(){return controls.clock??Date.now()}}
 const deps={Date:TestDate,createHash,same,readFileSync:localRead,writeFileSync:fs.writeFileSync,appendFileSync:fs.appendFileSync,mkdirSync:fs.mkdirSync,lstatSync:fs.lstatSync,join,GERMANY_BULK_CANDIDATES,getFussballNativePreparation:()=>{throw Error('TEST ONLY cold receipt forbidden after imports')},reauthenticateFussballNativePreparation:async()=>{throw Error('TEST ONLY private cold receipt required')},getFussballNativeComposition:get,reauthenticateFussballNativeComposition:reauth,validateFussballNativeCatalog:composition.validateFussballNativeCatalog,getFussballCompletedSourceV7:p=>{assert.equal(p,f.proof);return f.state},createFussballParserSession:session,assembleFussballSchedule:seasonApi.assembleFussballSchedule,validateFussballFixture:seasonApi.validateFussballFixture,createFussballCaptureClient:opts=>createFussballCaptureClient({...opts,now:opts.now??(()=>TestDate.now()),sleep:opts.sleep??(async ms=>{controls.clock=TestDate.now()+ms})}),...nativeImport,validateFussballCardEnvelope,...policy,compiledBadenHistoricalPolicy:()=>compiledPolicy}
 const api=new Function(...Object.keys(deps),code)(...Object.values(deps))
 const directory=fs.mkdtempSync(join(tmpdir(),'baden-runtime-TEST-ONLY-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}))
 async function context(){return (await api.loadFussballNativeImportContext({competition,composition:token,db})).installedHistoricalMarkers}
 function client(code){const source=pack.seasons.find(s=>s.code===code),stage=f.state.originals.stages[source.inventory.scope.stage],requests=[];return {requests,async read(url,kind){requests.push({url,kind});if(kind==='round')return {bytes:Buffer.from('TEST ONLY synthetic full schedule'),capturedAt:new Date().toISOString()};const d=stage.manifest.documents.find(d=>d.url===url);assert.ok(d,'TEST ONLY original source missing: '+url);return {...d,bytes:stage.files.get(d.file)}}}}
 function sourceResponse(url){if(url.includes('/spieltag/'))return new Response('TEST ONLY synthetic full schedule',{headers:{'content-type':'text/html'}});for(const stage of Object.values(f.state.originals.stages)){const d=stage.manifest.documents.find(d=>d.url===url);if(d)return new Response(stage.files.get(d.file),{headers:{'content-type':d.contentType}})}throw Error('TEST ONLY unexpected network route: '+url)}
 return {api,f,pack,observed,controls,calls,db,token,context,client,directory,sourceResponse}
}
export function isolatedTestModule(file,deps,names){
 const path=new URL(file,import.meta.url),body=fs.readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {'+names.join(',')+'};'
 const entries=Object.entries(deps).filter(([name])=>name!=='default')
 return new Function(...entries.map(([name])=>name),body)(...entries.map(([,value])=>value))
}
