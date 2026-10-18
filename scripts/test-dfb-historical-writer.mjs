import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {syntheticHistoricalPacket} from './dfb-historical-test-fixture.mjs'
import {loadApprovedDocuments} from './dfb-offline.mjs'
import {loadHistoricalStatisticsImportContext} from './lib/historical-statistics-import.mjs'
import {viraZa} from './viri/index.mjs'
import {databaseCheck,sha,kanonicniNastopi} from './vklopi-dfb-regijo.mjs'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
const api=await import('./uvozi-dfb-regijo.mjs').catch(()=>({}))
let root,packet,oldEnv
before(async()=>{root=mkdtempSync(join(tmpdir(),'dfb-writer-TEST-ONLY-'));packet=await syntheticHistoricalPacket(root);oldEnv=Object.fromEntries(['GITHUB_ACTIONS','GITHUB_REPOSITORY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SERVER_READY'].map(k=>[k,process.env[k]]));Object.assign(process.env,{GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',SUPABASE_URL:'https://dfb-unit-test.invalid',SUPABASE_SERVICE_ROLE_KEY:'UNIT-TEST-NOT-A-CREDENTIAL'});delete process.env.SERVER_READY})
after(()=>{for(const[k,v]of Object.entries(oldEnv??{}))if(v===undefined)delete process.env[k];else process.env[k]=v;if(root)rmSync(root,{recursive:true,force:true})})
function binding(){const p=getHistoricalStatisticsPolicy(packet.manifest.slug);return {installed:true,policyId:p.id,policySha256:packet.manifest.statisticsPolicy.sha256,firstFantasyPlayedOn:packet.manifest.statisticsPolicy.firstFantasyPlayedOn,markers:p.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return{sourceMatchId:e.sourceMatchId,reportId:'de-dfb-'+e.sourceMatchId,fixture:{...fixture,season:p.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:p.id,policySha256:packet.manifest.statisticsPolicy.sha256,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
function transport(events,{bootstrapFailure=false}={}){return async(input,options={})=>{const url=new URL(input);assert.equal(url.origin,'https://dfb-unit-test.invalid');if(url.pathname==='/rest/v1/competitions'){events.push('target');return Response.json([{id:1114,slug:packet.manifest.slug,active:false,source:'dfb',source_policy:null,source_league_code:'regionalliga-suedwest/2026-2027',rok_pomak_ur:6}])}const body=JSON.parse(options.body);assert.equal(body.p_manifest,packet.raw);assert.equal(body.p_sha256,packet.approvedSha);if(url.pathname.endsWith('/prepare_dfb_historical_statistics')){events.push('bootstrap');return bootstrapFailure?Response.json({message:'refused exact header'},{status:400}):Response.json({prepared:true,unavailableHistoricalCount:2,prvi_krog:3,firstFantasyPlayedOn:'2026-10-23',manifestSha256:packet.approvedSha})}assert(url.pathname.endsWith('/varen_vklop_dfb_regije'));assert.equal(body.p_aktiviraj,false);events.push('full-preflight');return Response.json({preverjeno:true,slug:packet.manifest.slug,vklopljena:false})}}
test('closed v3 packet bootstraps before unchanged normal import and separate full preflight',async()=>{
 assert.equal(typeof api.importApprovedDfbRegion,'function')
 const events=[],documents=loadApprovedDocuments(packet.raw,packet.approvedSha,[packet.archiveDir,packet.currentDir]),c={id:1114,slug:packet.manifest.slug,source:'dfb',source_policy:packet.manifest.statisticsPolicy.id},context=await loadHistoricalStatisticsImportContext({rpc:async()=>({data:binding(),error:null})},c),provider=viraZa(context.competition,{installedHistoricalMarkers:context.installedHistoricalMarkers})
 const forbidden=new Set(getHistoricalStatisticsPolicy(c.slug).entries.map(e=>e.sourceUrl)),read=async url=>{assert(!forbidden.has(url),'installed raw report must not be fetched');assert(documents.has(url),'closed capture required');return documents.get(url)}
 const run=async(command,args,options)=>{assert.equal(command,process.execPath);assert(args.includes('--import'));assert.equal(options.env.SLFF_DFB_MANIFEST,packet.file);assert.equal(options.env.SLFF_DFB_APPROVED_SHA,packet.approvedSha);assert(events.includes('bootstrap'));const script=args.find(a=>/scripts\/(uvoz-zapisnikov|uvoz-razporeda|lazni-vratarji|ugani-pozicije|ovrednoti-igralce)\.mjs$/.test(a)),kind=script.split('/').at(-1).slice(0,-4);events.push(kind+(args.includes('--liga')?':archive':''));if(kind==='uvoz-zapisnikov'){const i=args.includes('--liga')?0:1,reports=await provider.zapisniki(packet.manifest.seasons[i].code,read);assert.equal(reports.length,i?18:304);for(const r of reports){const f=packet.manifest.seasons[i].fixtures.find(f=>f.id===r.id);assert.deepEqual(kanonicniNastopi(r.z),f.appearances)}}if(kind==='uvoz-razporeda')assert.equal((await provider.razporedVseStrani('regionalliga-suedwest/2026-2027',read)).flatMap(r=>r.tekme).length,306)}
 const out=await api.importApprovedDfbRegion(packet,{run,fetchFn:transport(events)});assert.equal(out.vklopljena,false)
 assert.deepEqual(events,['target','bootstrap','uvoz-zapisnikov:archive','uvoz-razporeda','uvoz-zapisnikov','lazni-vratarji','ugani-pozicije','ovrednoti-igralce','full-preflight'])
})
test('bootstrap refusal cannot reach normal import or full release',async()=>{const events=[];await assert.rejects(()=>api.importApprovedDfbRegion(packet,{run(){throw Error('normal writer forbidden')},fetchFn:transport(events,{bootstrapFailure:true})}),/bootstrap|header|refus/i);assert.deepEqual(events,['target','bootstrap'])})
test('tampered canonical packet and changed raw documents refuse before first DB request',async()=>{
 const events=[],m=structuredClone(packet.manifest);m.seasons[0].fixtures.find(f=>f.statisticsStatus==='available').appearances[0].minutes_played--;const raw=JSON.stringify(m)+'\n',file=join(root,'TEST-ONLY-TAMPER.json');writeFileSync(file,raw)
 await assert.rejects(()=>api.importApprovedDfbRegion({...packet,file,approvedSha:sha(raw)},{run(){throw Error('writer forbidden')},fetchFn(){events.push('unexpected');throw Error('DB forbidden')}}),/differs from full offline replay/);assert.deepEqual(events,[])
 const index=JSON.parse(readFileSync(join(packet.archiveDir,'prenosi.json'))),source=join(packet.archiveDir,index[0].file),original=readFileSync(source);writeFileSync(source,'changed')
 try{await assert.rejects(()=>api.importApprovedDfbRegion(packet,{fetchFn(){throw Error('DB forbidden')}}),/SHA/)}finally{writeFileSync(source,original)}
})
test('database manifest transport keeps exact numeric spelling and whitespace as text',async()=>{
 const raw=packet.raw.replace('{','{\n "TEST_ONLY_NUMBER":8.10,'),approvedSha=sha(raw);let calls=0
 await databaseCheck(raw,approvedSha,false,{fetchFn:async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.p_manifest,raw);assert(body.p_manifest.includes('8.10'));assert.equal(body.p_sha256,approvedSha);return Response.json({preverjeno:true,slug:packet.manifest.slug,vklopljena:false})}});assert.equal(calls,1)
 await assert.rejects(()=>databaseCheck(raw,approvedSha,true,{fetchFn(){throw Error('activation request forbidden')}}),/server deployment/)
})
