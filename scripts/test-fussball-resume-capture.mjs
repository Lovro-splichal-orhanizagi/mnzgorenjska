import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {collectFussballSeason} from './fussball-season.mjs'
import {razberiKrog} from './viri/fussball.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {captureFussballResumeDirectory,fussballPartialCaptureDocuments} from './fussball-resume-capture.mjs'
import {validateFussballSeasonPilot} from './fussball-season-pilot.mjs'

// Same authentic one-report season as test-fussball-capture-evidence.mjs.
function fixture(){
 const roundHtml=readFileSync(new URL('./vzorci/de-fussball-krog8.html',import.meta.url),'utf8')
 const mainHtml=readFileSync(new URL('./vzorci/de-fussball-ilvesheim-main.html',import.meta.url),'utf8')
 const lineupHtml=readFileSync(new URL('./vzorci/de-fussball-ilvesheim-lineup.html',import.meta.url),'utf8')
 const fontManifest=JSON.parse(readFileSync(new URL('./vzorci/de-fussball-zapisnik.json',import.meta.url),'utf8'))
 const fonts=Object.fromEntries(Object.entries(fontManifest.fonts).map(([id,font])=>[id,{bytes:readFileSync(new URL(`./vzorci/${font.file}`,import.meta.url)),sha256:font.sha256}]))
 const staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',matchId='031EQBPLF4000000VS5489BTVUS470OH'
 const seedUrl=fontManifest.provenance.roundUrl,lineupUrl=fontManifest.provenance.lineupUrl
 const baseSelector=razberiKrog(roundHtml,{fonts,staffel}).krogi.slice(0,8)
 const match=razberiKrog(roundHtml,{fonts,staffel}).tekme.find(row=>row.id===matchId)
 const cssFor=id=>`@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`
 const parsers={inspectPage:inspectFussballPage,fontUrl:fussballFontUrl,parseRound:(html,{fonts:roundFonts,staffel:scope,url})=>{
  const parsed=razberiKrog(html,{fonts:roundFonts,staffel:scope})
  const selected=Number(url.match(/\/spieltag\/(\d+)\/staffel\//)?.[1]??parsed.krog)
  return {...parsed,krog:selected,krogi:baseSelector.map(row=>({...row,izbran:row.krog===selected})),tekme:selected===8?[match]:[],prestavljene:[]}
 }}
 const fetchFn=async url=>{
  if(url===seedUrl||baseSelector.some(row=>row.url===url))return new Response(roundHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  if(url===match.url)return new Response(mainHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  if(url===lineupUrl)return new Response(lineupHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  const cssId=url.match(/\/export\.fontface\/-\/id\/([a-z0-9]{8})\/type\/css$/)?.[1]
  if(cssId)return new Response(cssFor(cssId),{headers:{'content-type':'text/css'}})
  const fontId=url.match(/\/export\.fontface\/-\/format\/woff\/id\/([a-z0-9]{8})\/type\/font$/)?.[1]
  if(fontId&&fonts[fontId])return new Response(fonts[fontId].bytes,{headers:{'content-type':'font/woff'}})
  throw Error(`unexpected fixture request: ${url}`)
 }
 return {options:{seedUrl,staffel,season:'2026/27',reportLimit:null,asOfDate:'2026-10-23',maxRequests:80},reportUrl:match.url,lineupUrl,fetchFn,collectFn:input=>collectFussballSeason(input,parsers)}
}

test('path B resume reuses originals of a transport-failed capture and replays as an ordinary capture',async t=>{
 const parent=mkdtempSync(join(tmpdir(),'slff-fussball-resume-'))
 try{
  let clock=Date.parse('2026-10-23T00:00:00.000Z')
  t.mock.method(Date,'now',()=>clock)
  t.mock.method(globalThis,'setTimeout',(callback,ms)=>{clock+=ms;queueMicrotask(callback);return 1})
  const {options,reportUrl,lineupUrl,fetchFn,collectFn}=fixture()
  const failed=join(parent,'failed'),resumed=join(parent,'resumed')
  await assert.rejects(captureFussballDirectory({directory:failed,options,collectFn,fetchFn:async url=>{if(url===lineupUrl)throw new TypeError('fetch failed');return fetchFn(url)}}),/fetch failed/)
  const calls=[]
  const m=await captureFussballResumeDirectory({directory:resumed,options,resumeDirectories:[failed],collectFn,fetchFn:async url=>{calls.push(url);return fetchFn(url)}})
  assert.equal(m.success,true);assert.equal(m.version,2)
  assert.ok(!calls.includes(reportUrl),'the saved report is not read again')
  assert.ok(calls.includes(lineupUrl),'the missing lineup is read')
  assert.ok(m.documents.some(d=>d.origin==='cache'&&d.kind==='report'))
  assert.equal(m.snapshot.requests,calls.length)
  const replay=await verifyFussballDirectory(resumed,{collectFn})
  assert.equal(replay.verified,true);assert.equal(replay.resultSha256,m.resultSha256)

  // A second failure can itself be resumed: cached originals keep their flat receipt.
  const chained=join(parent,'chained')
  const again=await captureFussballResumeDirectory({directory:chained,options,resumeDirectories:[failed],collectFn,fetchFn})
  assert.deepEqual(again.documents.filter(d=>d.origin==='cache').map(d=>d.originalReceipt),m.documents.filter(d=>d.origin==='cache').map(d=>d.originalReceipt))

  // A complete capture (refused by the import only for a newer migration) also resumes: no report is reread.
  const again2=[],fromComplete=await captureFussballResumeDirectory({directory:join(parent,'from-success'),options,resumeDirectories:[resumed],collectFn,fetchFn:async url=>{again2.push(url);return fetchFn(url)}})
  assert.equal(fromComplete.success,true);assert.ok(!again2.includes(reportUrl)&&!again2.includes(lineupUrl))
  assert.equal((await verifyFussballDirectory(join(parent,'from-success'),{collectFn})).verified,true)
  const config={...options,cardPolicy:undefined}
  assert.throws(()=>fussballPartialCaptureDocuments([failed],{...config,season:'2025/26'}),/scope/)
  assert.throws(()=>fussballPartialCaptureDocuments([failed],config,{now:Date.parse(JSON.parse(readFileSync(join(failed,'manifest.json'))).createdAt)+25*3600_000}),/24 hours/)
  const refused=join(parent,'refused')
  await assert.rejects(captureFussballDirectory({directory:refused,options,collectFn,fetchFn:async url=>url===lineupUrl?new Response('slow down',{status:429}):fetchFn(url)}),/429/)
  assert.throws(()=>fussballPartialCaptureDocuments([refused],config),/refusal/)
  // A transient gateway error (502/503/504) is resumable like a timeout; 403 is not.
  for(const status of [502,503,504]){
   const gw=join(parent,`gateway-${status}`)
   await assert.rejects(captureFussballDirectory({directory:gw,options,collectFn,fetchFn:async url=>url===lineupUrl?new Response('bad gateway',{status}):fetchFn(url)}),new RegExp(String(status)))
   assert.ok(fussballPartialCaptureDocuments([gw],config).some(d=>d.kind==='report'))
  }
  const forbidden=join(parent,'forbidden')
  await assert.rejects(captureFussballDirectory({directory:forbidden,options,collectFn,fetchFn:async url=>url===lineupUrl?new Response('no',{status:403}):fetchFn(url)}),/403/)
  assert.throws(()=>fussballPartialCaptureDocuments([forbidden],config),/refusal/)
  const fm=JSON.parse(readFileSync(join(failed,'manifest.json'))),report=fm.documents.find(d=>d.kind==='report')
  writeFileSync(join(failed,report.file),'changed')
  await assert.rejects(captureFussballResumeDirectory({directory:join(parent,'changed'),options,resumeDirectories:[failed],collectFn,fetchFn}),/bytes differ/)
 }finally{rmSync(parent,{recursive:true,force:true})}
})

test('resume runs are only for a current-only capture and must be distinct earlier runs',()=>{
 const sha='a'.repeat(40)
 const base={GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'41500000000',GITHUB_SHA:sha,EXPECTED_SHA:sha,
  SEED_URL:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G',STAFFEL:'03188V27L800000JVS5489BTVU7GTVLE-G',SEASON:'2026/27',MAX_REQUESTS:'815',REPORTS:'all',PRIOR_REQUESTS:'4185',TOTAL_REQUEST_CAP:'5000',ROLLOUT_CANDIDATE:'de-verbandsliga-baden'}
 assert.deepEqual(validateFussballSeasonPilot({...base,RESUME_RUNS:'41404256292,41415561101'},{headSha:sha}).resumeRuns,['41404256292','41415561101'])
 assert.equal(validateFussballSeasonPilot(base,{headSha:sha}).resumeRuns,undefined)
 for(const RESUME_RUNS of ['41404256292,41404256292','41500000000','x','1,2,3,4,5,6,7,8,9'])assert.throws(()=>validateFussballSeasonPilot({...base,RESUME_RUNS},{headSha:sha}))
 assert.throws(()=>validateFussballSeasonPilot({...base,ROLLOUT_CANDIDATE:'',RESUME_RUNS:'41404256292'},{headSha:sha}),/current-only/)
 assert.throws(()=>validateFussballSeasonPilot({...base,MAX_REQUESTS:'816',RESUME_RUNS:'41404256292'},{headSha:sha}),/budget/)
})

test('resume download admits only failed first-attempt main captures of the same scope with their artifact',async()=>{
 const {downloadFussballResumeRuns}=await import('./fussball-season-pilot.mjs')
 const sha='b'.repeat(40),repository='Lovro-splichal-orhanizagi/mnzgorenjska',staffel='03188V27L800000JVS5489BTVU7GTVLE-G'
 const e={GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repository}/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'41500000000',GITHUB_SHA:sha,EXPECTED_SHA:sha,
  SEED_URL:`https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/${staffel}`,STAFFEL:staffel,SEASON:'2026/27',MAX_REQUESTS:'815',REPORTS:'all',PRIOR_REQUESTS:'4185',TOTAL_REQUEST_CAP:'5000',ROLLOUT_CANDIDATE:'de-verbandsliga-baden',RESUME_RUNS:'41404256292'}
 const run={id:41404256292,path:'.github/workflows/preveri-fussball-sezono.yml',event:'workflow_dispatch',head_branch:'main',head_repository:{full_name:repository},run_attempt:1,status:'completed',conclusion:'failure',display_title:`FUSSBALL season ${staffel} 2026/27`}
 const artifacts={artifacts:[{name:'fussball-season-41404256292',expired:false,workflow_run:{id:41404256292}}]}
 const github=r=>async path=>path.endsWith('/artifacts?per_page=100')?artifacts:r
 const downloaded=[]
 assert.deepEqual(await downloadFussballResumeRuns(e,{headSha:sha,github:github(run),download:async id=>downloaded.push(id)}),['41404256292'])
 assert.deepEqual(downloaded,['41404256292'])
 for(const change of [{conclusion:'cancelled'},{path:'.github/workflows/preveri-fussball-dopolni.yml'},{run_attempt:2},{head_branch:'other'},{display_title:'FUSSBALL season X 2026/27'}])
  await assert.rejects(downloadFussballResumeRuns(e,{headSha:sha,github:github({...run,...change}),download:async()=>assert.fail('no download')}),/finished main capture/)
})
