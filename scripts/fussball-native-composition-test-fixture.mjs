// TEST ONLY: isolated module evaluation, synthetic authenticated source metadata
// and reviewed catalog. This never mints a production capability, and does not
// claim that the V6 archive, GitHub execution or native preparation has succeeded.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {normalizeFussballReport,parseFussballLeagueCode,fussballPlayerKey} from './fussball-import.mjs'
import {validateFussballFixture} from './fussball-season.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup,razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {zaprtje} from './odtis-kode.mjs'
export function zip(files){const root=mkdtempSync(join(tmpdir(),'baden-TEST-ONLY-zip-'));try{for(const [p,b]of files)writeFileSync(join(root,p),b);execFileSync('zip',['-q','-0','bundle.zip',...files.keys()],{cwd:root});return readFileSync(join(root,'bundle.zip'))}finally{rmSync(root,{recursive:true,force:true})}}
export const hash=b=>createHash('sha256').update(b).digest('hex')
export const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
export const digest=v=>hash(canonical(v)),json=v=>Buffer.from(JSON.stringify(v)+'\n')
export const derivedHead='a'.repeat(40),derivedRunId='40659999999',sourceReplayRunId='40649999999'
const read=f=>readFileSync(new URL('./vzorci/'+f,import.meta.url))
const catalogPath=new URL('./policies/fussball-baden-native-composition.json',import.meta.url)
function add(stage,url,kind,bytes){
 bytes=Buffer.from(bytes);const old=stage.manifest.documents.find(d=>d.url===url);if(old)return old
 const sha256=hash(bytes),file=`documents/${sha256}.${kind==='font'?'woff':kind==='css'?'css':'html'}`,d={url,kind,bytes:bytes.length,sha256,status:200,contentType:kind==='font'?'font/woff':kind==='css'?'text/css':'text/html',capturedAt:stage.manifest.createdAt,file,origin:'network',originalReceipt:{testOnlySyntheticReceipt:true,url,sha256}}
 stage.manifest.documents.push(d);stage.files.set(file,bytes);return d
}
function sourceFixture(r){const e=r.cardEnvelope;return {id:e.matchId,zapisnikId:e.reportId,url:e.sourceUrl,krog:e.round,datum:e.date,ura:e.time,domaci:e.homeName,gostje:e.awayName,rezultat:structuredClone(e.score)}}
function originals(stage,main,lineup,fonts,id){
 const info=inspectFussballPage(main,{kind:'report',matchId:id}),all=[...new Set([...info.fontIds,...inspectFussballLineup(lineup)])].sort(),rows=[]
 rows.push(add(stage,info.url,'report',main));rows.push(add(stage,info.lineupUrl,'lineup',lineup))
 for(const fontId of all){if(!fonts[fontId])continue;const url=`https://www.fussball.de/export.fontface/-/format/woff/id/${fontId}/type/font`,css=`@font-face { font-family: font-${fontId}; src: url('//www.fussball.de/export.fontface/-/format/woff/id/${fontId}/type/font') format('woff'), url('//www.fussball.de/export.fontface/-/format/ttf/id/${fontId}/type/font') format('truetype'); } .results-c-${fontId} { font-family: font-${fontId} !important; }`;rows.push(add(stage,info.cssTemplate.replace('%ID%',fontId),'css',css));rows.push(add(stage,url,'font',fonts[fontId].bytes))}
 for(const [fontId,font]of Object.entries(fonts))add(stage,`https://www.fussball.de/export.fontface/-/format/woff/id/${fontId}/type/font`,'font',font.bytes)
 return {rows,all}
}
const descriptor=d=>({url:d.url,kind:d.kind,sha256:d.sha256,byteLength:d.bytes,file:d.file,metadataSha256:digest(d),metadata:structuredClone(d)})
export function partitionFixture(){
 const c=JSON.parse(readFileSync(catalogPath)),stages={};c.sourceRunId=sourceReplayRunId;c.sourceHead='b'.repeat(40);c.status='FINALIZED';c.firstFantasyPlayedOn='2026-10-31';c.clubDescriptors=[]
 for(const s of c.seasons){s.reviews=[];const createdAt=new Date(Date.now()-60000).toISOString();stages[s.stage]={manifest:{success:true,error:null,createdAt,options:{reportLimit:null},documents:[]},files:new Map(),result:{version:1,activationEligible:false,scope:{provider:'fussball',staffel:s.staffel,season:s.season,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+s.staffel,asOfDate:'2026-10-28',cardPolicy:'community-v1'},schedule:{staffel:s.staffel,season:s.season,rounds:Array.from({length:9},(_,i)=>i+1),fixtures:[]},reports:[],pendingReports:[],rejectedReports:[],cardEnvelopes:[]}}}
 const current=stages.current,archive=stages.archive,m=JSON.parse(read('de-fussball-zapisnik.json')),fonts=Object.fromEntries(Object.entries(m.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}])),id='031EQBPLF4000000VS5489BTVUS470OH'
 const main=read('de-fussball-ilvesheim-main.html').toString(),lineup=read('de-fussball-ilvesheim-lineup.html').toString(),complete=razberiFantasyZapisnik(main,lineup,{fonts,id,lineupId:id,season:'2026/27',cardPolicy:'community-v1'})
 originals(current,main,lineup,fonts,id);const f=sourceFixture(complete);current.result.schedule.fixtures.push(f);current.result.reports.push({fixture:structuredClone(f),result:complete})
 const w=JSON.parse(read('de-fussball-community/provenance.json')),redFonts=Object.fromEntries(Object.entries(w.fonts).map(([id,f])=>[id,{bytes:read('de-fussball-community/'+f.file),sha256:f.sha256}])),redMain=read('de-fussball-community/report.html').toString(),redLineup=read('de-fussball-community/lineup.html').toString(),pending=razberiFantasyZapisnik(redMain,redLineup,{fonts:redFonts,id:w.matchId,lineupId:w.matchId,season:w.season,cardPolicy:'community-v1'})
 originals(current,redMain,redLineup,redFonts,w.matchId);const p=sourceFixture(pending);current.result.schedule.fixtures.push(p);current.result.pendingReports.push({fixture:structuredClone(p),result:pending})
 const badId='031EQBPLZZ000000VS5489BTVUS470OH',badMain=main.replaceAll(id,badId),badLineup=lineup.replace(/href="https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+"/,'href="#"'),badFixture={...f,id:badId,zapisnikId:'de-fussball-'+badId,url:f.url.replace(id,badId)}
 const bad=originals(current,badMain,badLineup,fonts,badId);let error;try{razberiFantasyZapisnik(badMain,badLineup,{fonts,id:badId,lineupId:badId,season:'2026/27',cardPolicy:'community-v1'})}catch(e){error=e}
 if(!error)throw Error('TEST ONLY rejection fixture must actually fail strict parser')
 current.result.schedule.fixtures.push(badFixture);current.result.rejectedReports.push({fixture:structuredClone(badFixture),code:error.code,reason:error.message})
 c.seasons[0].reviews.push({kind:'reviewed-known-result-unavailable',fixture:structuredClone(badFixture),sourceCompetitionId:c.seasons[0].staffel+':2026/27',season:'2026/27',defect:{code:error.code,reason:error.message,kind:'anonymous-starters'},documents:bad.rows.map(descriptor),sourceRawSha256:hash(badMain),observedFontIds:bad.all,missingObservedFonts:bad.all.filter(id=>!fonts[id]).map(id=>({id,missing:['css','font']}))})
 const futureId='031EQBPLIO000000VS5489BTVUS470OH',future={...f,id:futureId,zapisnikId:'de-fussball-'+futureId,url:'https://www.fussball.de/spiel/-/spiel/'+futureId,krog:9,datum:'2026-10-31',rezultat:null};current.result.schedule.fixtures.push(future)
 const adminId='02TNBSVDG0000000VS5489BUVSSD35NB',admin={id:adminId,zapisnikId:'de-fussball-'+adminId,url:'https://www.fussball.de/spiel/-/spiel/'+adminId,krog:1,datum:'2025-06-01',ura:'14:00',domaci:'TEST ONLY archive A',gostje:'TEST ONLY archive B',rezultat:null,administrativeResult:{schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:[{domaci:0,gostje:3},{domaci:3,gostje:0}]}}
 archive.result.schedule.fixtures=[admin];archive.result.administrativeFixtures=[{fixture:structuredClone(admin),code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED',reason:'Administrative result retained without ordinary played statistics'}]
 const round=add(archive,archive.result.scope.seedUrl,'round','TEST ONLY synthetic authenticated round body - not genuine archive source')
 c.seasons[1].reviews.push({kind:'reviewed-unknown-administrative-result',fixture:structuredClone(admin),sourceCompetitionId:c.seasons[1].staffel+':2025/26',season:'2025/26',defect:{code:archive.result.administrativeFixtures[0].code,reason:archive.result.administrativeFixtures[0].reason,kind:'administrative-final-result-unknown'},documents:[descriptor(round)],sourceRawSha256:null,observedFontIds:[],missingObservedFonts:[]})
 for(const s of c.seasons)for(const e of s.reviews){e.approvalReference=c.approval.reference;e.resultKnown=e.kind==='reviewed-known-result-unavailable';e.retainedBundleSha256=digest(e.documents)}
 const proof={version:1,kind:'authenticated-completed-fussball-v7-source',source:{sourceRunId:c.sourceRunId,sourceHead:c.sourceHead,captureCodeSha256:c.captureCodeSha256,currentCreatedAt:current.manifest.createdAt,currentFreshUntil:new Date(Date.parse(current.manifest.createdAt)+24*3600_000).toISOString(),nativeEligible:false,activationEligible:false,artifacts:{current:{digest:'sha256:'+'d'.repeat(64)},archive:{digest:'sha256:'+'e'.repeat(64)}}},sourceOnly:true,nativeAdmission:false,activationEligible:false}
 const state={proof,originals:{stages}},fxt={catalog:c,state,sourceReads:0,sourceCertificate:{testOnly:true},proof}
 fxt.repin=()=>{
  c.clubDescriptors=[]
  for(const s of c.seasons){const stage=stages[s.stage],r=stage.result,fixtures=r.schedule.fixtures,ordinary=fixtures.filter(f=>f.rezultat!==null),unscored=fixtures.filter(f=>f.rezultat===null&&!Object.hasOwn(f,'administrativeResult'));r.cardEnvelopes=[...r.reports,...r.pendingReports].map(e=>e.result.cardEnvelope)
   r.coverage={expectedRounds:r.schedule.rounds.length,capturedRounds:r.schedule.rounds.length,fixtures:fixtures.length,playedFixtures:ordinary.length,attemptedReports:ordinary.length,completeReports:r.reports.length,pendingReports:r.pendingReports.length,rejectedReports:r.rejectedReports.length,...(r.administrativeFixtures?{administrativeFixtures:r.administrativeFixtures.length}:{}),sampled:false,unscoredFixtures:{total:unscored.length,past:unscored.filter(f=>f.datum<r.scope.asOfDate).length,current:unscored.filter(f=>f.datum===r.scope.asOfDate).length,future:unscored.filter(f=>f.datum>r.scope.asOfDate).length,unknownDate:0}}
   stage.files.set('result.json',json(r));stage.manifest.resultSha256=hash(stage.files.get('result.json'));s.resultSha256=stage.manifest.resultSha256;s.fixtureInventorySha256=digest(fixtures);s.rejectionsSha256=digest(r.rejectedReports);s.administrativeSha256=digest(r.administrativeFixtures??[])
   for(const name of new Set(fixtures.flatMap(f=>[f.domaci,f.gostje])))c.clubDescriptors.push({sourceCompetitionId:s.staffel+':'+s.season,season:s.season,name})
  }
 };fxt.repin();return fxt
}
export function isolatedComposition(f){
 const path=new URL('./fussball-native-composition.mjs',import.meta.url),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {partitionFussballNativeSource,buildFussballNativeComposition,validateFussballNativeCatalog,produceFussballNativeComposition,loadFussballNativeComposition,getFussballNativeComposition,reauthenticateFussballNativeComposition,reviewedEntry};'
 const getReplay=proof=>{if(proof!==f.proof)throw Error('TEST ONLY reader-issued capability required');return {...f.state,certificate:structuredClone(f.sourceCertificate)}},readSource=async input=>{if(Object.keys(input).sort().join(',')!=='frozenDirectory,github,sourceRunId,v6FrozenDirectory'||input.sourceRunId!==sourceReplayRunId||(input.frozenDirectory!=='TEST-ONLY-frozen'||input.v6FrozenDirectory!=='TEST-ONLY-4e'))throw Error('TEST ONLY exact source reader input required');f.sourceReads++;if(f.sourceFailure)throw Error('TEST ONLY source replay failed');return f.proof}
 const localRead=(url,...args)=>url instanceof URL&&url.href===catalogPath.href?json(f.catalog):readFileSync(url,...args)
 return new Function('readFileSync','writeFileSync','mkdirSync','mkdtempSync','rmSync','join','tmpdir','execFileSync','createHash','isDeepStrictEqual','readFussballCompletedSourceV7','getFussballCompletedSourceV7','fussballArchiveV7CodeSha256','zaprtje','normalizeFussballReport','parseFussballLeagueCode','fussballPlayerKey','validateFussballCardEnvelope','inspectFussballPage','fussballFontUrl','inspectFussballLineup','razberiFantasyZapisnik','validateFussballFixture',code)(localRead,writeFileSync,mkdirSync,mkdtempSync,rmSync,join,tmpdir,execFileSync,createHash,isDeepStrictEqual,readSource,getReplay,()=>f.catalog.captureCodeSha256,zaprtje,normalizeFussballReport,parseFussballLeagueCode,fussballPlayerKey,validateFussballCardEnvelope,inspectFussballPage,fussballFontUrl,inspectFussballLineup,razberiFantasyZapisnik,validateFussballFixture)
}
export async function hostedDerivedFixture(t){
 const f=partitionFixture();f.api=isolatedComposition(f);f.root=mkdtempSync(join(tmpdir(),'baden-derived-TEST-ONLY-'));t.after(()=>rmSync(f.root,{recursive:true,force:true}));f.calls=[];f.controls={}
 const now=Date.now(),stamp=n=>new Date(n).toISOString(),created=stamp(now-60000),repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`
 f.run={id:Number(derivedRunId),run_attempt:1,head_sha:derivedHead,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/replay-fussball-native-composition.yml',repository:{full_name:repo},head_repository:{full_name:repo},status:'in_progress',conclusion:null,created_at:created,updated_at:created};f.main={name:'main',commit:{sha:derivedHead}}
 f.github=async(path,binary=false)=>{f.calls.push({path,binary});let v
  if(path===prefix+'branches/main')v=f.main
  else if(path.startsWith(prefix+'contents/')){const file=path.slice((prefix+'contents/').length).split('?')[0],b=file==='scripts/policies/fussball-baden-native-composition.json'?json(f.catalog):readFileSync(new URL('../'+file,import.meta.url));v={type:'file',path:file,encoding:'base64',size:b.length,content:b.toString('base64')}}
  else if(path===prefix+`actions/runs/${derivedRunId}`)v=f.run
  else if(path===prefix+`actions/runs/${derivedRunId}/attempts/1/jobs?per_page=100&page=1`)v=f.jobs
  else if(path===prefix+`actions/runs/${derivedRunId}/artifacts?per_page=100&page=1`)v=f.inventory
  else if(path===prefix+'actions/artifacts/401')v=f.artifact
  else if(path===prefix+'actions/artifacts/401/zip'&&binary)v=Buffer.from(f.zipBytes)
  else throw Error('TEST ONLY outside derived GET scope')
  v=f.controls.change?.(path,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }
 f.produceInput={derivedRunId,derivedHead,sourceRunId:sourceReplayRunId,frozenDirectory:'TEST-ONLY-frozen',v6FrozenDirectory:'TEST-ONLY-4e',github:f.github,directory:join(f.root,'output')}
 f.certificate=await f.api.produceFussballNativeComposition(f.produceInput)
 f.files=new Map(['composition.json','pack.json'].map(n=>[n,readFileSync(join(f.root,'output',n))]))
 const ct=Date.parse(f.certificate.createdAt),end=Date.now();f.run.status='completed';f.run.conclusion='success';f.run.updated_at=stamp(end)
 const step=(name,start,finish)=>({name,status:'completed',conclusion:'success',started_at:stamp(start),completed_at:stamp(finish)})
 f.jobs={total_count:1,jobs:[{id:501,name:'derive',run_id:Number(derivedRunId),run_attempt:1,head_sha:derivedHead,status:'completed',conclusion:'success',started_at:created,completed_at:stamp(end),steps:[step('Validate exact reviewed main and first attempt',ct-5000,ct-2000),step('Authenticate source certificate and derive exact Baden partition',ct-1000,ct),step('Preserve derived Baden composition proof',ct,end)]}]}
 f.artifact={id:401,name:`fussball-native-composition-${derivedRunId}`,expired:false,created_at:stamp(ct),updated_at:stamp(end),workflow_run:{id:Number(derivedRunId),head_sha:derivedHead,head_branch:'main'}}
 f.refresh=()=>{f.zipBytes=zip(f.files);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest='sha256:'+hash(f.zipBytes);f.inventory={total_count:1,artifacts:[f.artifact]}}
 f.recertify=change=>{const c=JSON.parse(f.files.get('composition.json'));change(c);f.files.set('composition.json',json(c));f.refresh()};f.refresh();return f
}

// TEST ONLY: source-host structure test. Offline replay and ZIP decoders are
// stubs here, explicitly not proof of an actual source execution or archive.
export async function syntheticCompletedSourceFixture(){
 // Explicit TEST ONLY old-V6 fingerprint context. Current W/V7 code MUST fail
 // the production V6 inventory guard; these stubs test hosted structure only.
 const oldArchiveCode='8b1c4befedca7fc3e92a946b792a32e0ec166a33e870a9e47262211318554301',oldCaptureCode='9f779baf8822fe2c6cf64e3213eadc7612a9911ad826d8cc2965f7fbb517b864'
 const real=await import('./fussball-archive-v6.mjs'),artifacts=await import('./dfb-artifacts.mjs'),actions=await import('./fussball-archive-v6-actions.mjs')
 const sourceRunId='40658888888',head='e'.repeat(40),repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`,created=Date.now()-20000,stamp=n=>new Date(created+n).toISOString()
 const run={id:Number(sourceRunId),run_attempt:1,status:'completed',conclusion:'success',head_sha:head,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/preveri-fussball-dopolni.yml',repository:{full_name:repo},head_repository:{full_name:repo},created_at:stamp(0),updated_at:stamp(15000)}
 const names=['Validate exact archive-only V6 scope and1838 spent budget','Focused offline archive continuation checks',actions.V6_FROZEN_AUTH_STEP,'Exercise genuine retained originals offline before source','Share host pacing with older nightly and bulk readers',actions.V6_ARCHIVE_SOURCE_STEP,'Reauthenticate detached originals and replay archive with no network','Preserve V6 archive originals and all counted attempts','Preserve source-only attestation separately from immutable historical parents']
 const step=(name,i)=>({name,status:'completed',conclusion:'success',started_at:stamp(1000+i*1000),completed_at:stamp(2000+i*1000)})
 const job={id:9001,run_id:run.id,run_attempt:1,head_sha:head,name:'archive-continuation',status:'completed',conclusion:'success',started_at:stamp(0),completed_at:stamp(15000),steps:names.map(step)}
 const jobs={total_count:4,jobs:[...['capture','archive','handoff'].map((name,i)=>({id:9010+i,run_id:run.id,run_attempt:1,head_sha:head,name,status:'completed',conclusion:'skipped',steps:[]})),job]}
 const archiveZip=Buffer.from('TEST ONLY ZIP decoder stub'),artifact={id:9020,name:`fussball-season-archive-v6-${sourceRunId}`,expired:false,size_in_bytes:archiveZip.length,digest:'sha256:'+hash(archiveZip),workflow_run:{id:run.id,head_sha:head,head_branch:'main'},created_at:stamp(8000),updated_at:stamp(9000)}
 const att={...artifact,id:9021,name:`fussball-archive-v6-source-attestation-${sourceRunId}`,created_at:stamp(9000),updated_at:stamp(10000)},inventory={total_count:2,artifacts:[artifact,att]},policy=real.reviewedFussballArchiveV6()
 const archiveFiles=new Map([['manifest.json',json({createdAt:stamp(6000),completedAt:stamp(7000)})],['result.json',json({TEST_ONLY:true})]]),currentFiles=new Map([['manifest.json',json({TEST_ONLY:true})],['result.json',json({TEST_ONLY:true})]])
 const f={run,jobs,artifact,inventory,archiveZip,controls:{},calls:[],replays:0}
 const codePath=new URL('./fussball-completed-source-v6.mjs',import.meta.url),code=readFileSync(codePath,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(codePath.href)).replace(/\bexport /g,'')+'\nreturn {readFussballCompletedSourceV6,getFussballCompletedSourceV6,reauthenticateFussballCompletedSourceV6,fussballCompletedV6RuntimeInventory};'
 const verify=async()=>{f.replays++;if(f.controls.failedReplay)throw Error('TEST ONLY independent source replay failure');return {verified:true,nativeAdmission:false,cumulativeRequests:1841,requests:3,codeSha256:oldArchiveCode}}
 f.api=new Function('readFileSync','mkdtempSync','mkdirSync','writeFileSync','rmSync','join','dirname','tmpdir','same','zaprtje','sha256','unpackFussballV6Archive','unpackFussballV6Parent','fussballCaptureCodeSha256','reviewedFussballArchiveV6','fussballArchiveV6CodeSha256','assertFussballV6CurrentFresh','verifyFussballArchiveV6','V6_FROZEN_AUTH_STEP','V6_ARCHIVE_SOURCE_STEP',code)(readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,join,p=>p.slice(0,p.lastIndexOf('/')),tmpdir,isDeepStrictEqual,zaprtje,artifacts.sha256,()=>new Map(archiveFiles),()=>new Map(currentFiles),()=>f.controls.changedRuntime?'0'.repeat(64):oldCaptureCode,real.reviewedFussballArchiveV6,()=>oldArchiveCode,real.assertFussballV6CurrentFresh,verify,actions.V6_FROZEN_AUTH_STEP,actions.V6_ARCHIVE_SOURCE_STEP)
 f.github=async(path,binary=false)=>{f.calls.push(path);let v;const p=path.slice(prefix.length)
  if(!path.startsWith(prefix))throw Error('TEST ONLY wrong repo')
  if(p===`actions/runs/${sourceRunId}`)v=run
  else if(p===`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100`)v=jobs
  else if(p===`actions/runs/${sourceRunId}/artifacts?per_page=100`)v=inventory
  else if(p===`actions/artifacts/${artifact.id}`)v=artifact
  else if(p===`actions/artifacts/${artifact.id}/zip`)v=Buffer.from(archiveZip)
  else if(p.startsWith('contents/')){const file=p.slice(9).split('?')[0],b=readFileSync(new URL('../'+file,import.meta.url));v={type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}}
  else if(p===`actions/runs/${policy.sourceRunId}`)v={TEST_ONLY:'raw old run delegated to stub replay'}
  else if(p===`actions/runs/${policy.sourceRunId}/attempts/1/jobs?per_page=100`)v={TEST_ONLY:'raw old jobs delegated to stub replay'}
  else if(p===`actions/artifacts/${policy.current.artifactId}`)v={id:Number(policy.current.artifactId),digest:policy.current.artifactSha256}
  else if(p===`actions/artifacts/${policy.archive.artifactId}`)v={id:Number(policy.archive.artifactId),digest:policy.archive.artifactSha256}
  else if(p.endsWith('/zip')&&binary)v=Buffer.from('TEST ONLY original parent ZIP delegated to stub replay')
  else throw Error('TEST ONLY unexpected source GET '+path)
  v=f.controls.change?.(path,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }
 f.input={sourceRunId,frozenDirectory:'TEST-ONLY-frozen',github:f.github};return f
}
