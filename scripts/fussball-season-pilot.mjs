// Optional hosted continuation. No database or activation authority; an explicit
// rollout selection may dispatch the separately gated native workflow.
import {readFileSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {validateFussballCaptureOptions,verifyFussballDirectory,captureFussballDirectory} from './fussball-capture-evidence.mjs'
import {fussballRoundScope} from './lib/fussball-capture.mjs'
import {extractFussballSeasonLinks,fussballArchiveSeedAlias} from './fussball-season-links.mjs'
import {GERMANY_BULK_CANDIDATES,validateGermanyCandidate} from './bulk-germany-source.mjs'
import {loadFussballImportCapture} from './fussball-import.mjs'
import {runFussballCaptureCli} from './zajemi-fussball-sezono.mjs'
const requireProof=(ok,message)=>{if(!ok)throw Error(`fussball season pilot: ${message}`)}
const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
function integer(value,min,max){
 requireProof(typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>=min&&Number(value)<=max,'invalid request budget')
 return Number(value)
}
function scope(options){
 const config=validateFussballCaptureOptions({...options,reportLimit:null})
 const route=fussballRoundScope(config.seedUrl)
 requireProof(route?.staffel===config.staffel,'invalid public seed scope')
 return {seedUrl:config.seedUrl,staffel:config.staffel,season:config.season,maxRequests:config.maxRequests}
}
export function validateFussballSeasonPilot(e,{headSha}={}){
 const maxRequests=integer(e.MAX_REQUESTS,1,3000)
 if(!e.ARCHIVE_JSON?.trim()){requireProof(!e.ROLLOUT_CANDIDATE,'rollout requires paired archive scope');return null}
 requireProof(e.GITHUB_REPOSITORY===repository&&e.GITHUB_REF==='refs/heads/main'&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_WORKFLOW_REF===`${repository}/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main`&&e.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d*$/.test(e.GITHUB_RUN_ID??''),'exact repository main dispatch and first attempt required')
 requireProof(/^[a-f0-9]{40}$/.test(e.EXPECTED_SHA??'')&&e.EXPECTED_SHA===e.GITHUB_SHA&&e.EXPECTED_SHA===headSha,'exact reviewed main SHA required')
 requireProof(e.REPORTS==='all','paired seasons require reports=all')
 const raw=JSON.parse(e.ARCHIVE_JSON)
 requireProof(raw&&typeof raw==='object'&&!Array.isArray(raw)&&['maxRequests,season,seedUrl,staffel','maxRequests,observedSeedUrl,season,seedUrl,staffel'].includes(Object.keys(raw).sort().join(',')),'exact archive tuple required')
 requireProof(Number.isInteger(raw.maxRequests)&&raw.maxRequests>=1&&raw.maxRequests<=3000,'invalid archive request budget')
 const current=scope({seedUrl:e.SEED_URL,staffel:e.STAFFEL,season:e.SEASON,maxRequests}),archive={...scope(raw),...(Object.hasOwn(raw,'observedSeedUrl')?{observedSeedUrl:raw.observedSeedUrl}:{})}
 const route=fussballRoundScope(archive.seedUrl)
 requireProof(route.round===null&&route.date===null&&archive.staffel!==current.staffel&&Number(archive.season.slice(0,4))+1===Number(current.season.slice(0,4)),'adjacent archive seed required')
 if(Object.hasOwn(raw,'observedSeedUrl')){requireProof(typeof raw.observedSeedUrl==='string'&&raw.observedSeedUrl!==raw.seedUrl,'distinct observed menu seed required');fussballArchiveSeedAlias(archive,current)}
 // Initial361 plus two retained GitHub identity probes stay on the ledger.
 const priorRequests=integer(e.PRIOR_REQUESTS,363,5000),totalRequestCap=integer(e.TOTAL_REQUEST_CAP,1,5000)
 requireProof(priorRequests+current.maxRequests+archive.maxRequests<=totalRequestCap,'cumulative reserved request budget exceeds cap')
 if(e.ROLLOUT_CANDIDATE){
  const candidates=GERMANY_BULK_CANDIDATES.filter(c=>c.slug===e.ROLLOUT_CANDIDATE)
  requireProof(candidates.length===1,'unknown reviewed rollout candidate')
  const c=validateGermanyCandidate(candidates[0]),a=c.archives[0]
  requireProof(c.archives.length===1&&c.source_league_code===`${current.staffel}:${current.season}`&&c.seedUrl===current.seedUrl&&a.code===`${archive.staffel}:${archive.season}`&&a.seedUrl===archive.seedUrl&&(a.observedSeedUrl??a.seedUrl)===(archive.observedSeedUrl??archive.seedUrl),'rollout candidate does not own the exact paired scopes')
 }
 return {current,archive,priorRequests,totalRequestCap,...(e.ROLLOUT_CANDIDATE?{rolloutCandidate:e.ROLLOUT_CANDIDATE}:{})}
}
export async function authorizeFussballSeasonArchive(directory,e,{headSha,collectFn}={}){
 const plan=validateFussballSeasonPilot(e,{headSha});requireProof(plan,'archive plan required')
 const verified=await verifyFussballDirectory(directory,{collectFn})
 const m=JSON.parse(readFileSync(join(directory,'manifest.json')))
 requireProof(m.version===1&&m.options.reportLimit===null&&Object.entries(plan.current).every(([k,v])=>m.options[k]===v),'fresh full current capture scope/budget differs')
 const seed=m.documents.find(d=>d.kind==='round'&&d.url===plan.current.seedUrl)
 requireProof(seed,'current original seed document required')
 // The offline verifier checked these exact content-addressed bytes. Discovery
 // accepts one live page-scoped selector, rejecting inert or duplicate menus.
 const links=extractFussballSeasonLinks(readFileSync(join(directory,seed.file),'utf8'),plan.current)
 requireProof(links.previous&&links.previous.seedUrl===(plan.archive.observedSeedUrl??plan.archive.seedUrl)&&['staffel','season'].every(k=>links.previous[k]===plan.archive[k]),'archive differs from observed adjacent live season link')
 const cumulativeReserved=plan.priorRequests+verified.requests+plan.archive.maxRequests
 requireProof(cumulativeReserved<=plan.totalRequestCap,'remaining cumulative request budget exceeded')
 return {...plan,currentRequests:verified.requests,cumulativeReserved}
}
export async function authorizeFussballRollout({currentDirectory,archiveDirectory,e,headSha,mainSha,now=Date.now()}={}, {loadCapture=loadFussballImportCapture,readManifest=directory=>JSON.parse(readFileSync(join(directory,'manifest.json')))}={}){
 const plan=validateFussballSeasonPilot(e,{headSha})
 requireProof(plan?.rolloutCandidate&&mainSha===e.EXPECTED_SHA,'explicit reviewed rollout selection and unchanged main required')
 for(const [directory,scope,current,version]of [[currentDirectory,plan.current,true,1],[archiveDirectory,plan.archive,false,3]]){
  const m=readManifest(directory)
  requireProof(m.version===version&&m.success===true&&m.options?.reportLimit===null&&['seedUrl','staffel','season'].every(k=>m.options[k]===scope[k]),'handoff capture version/scope/full intent differs')
  const batch=await loadCapture(directory,{staffel:scope.staffel,season:scope.season,current,now})
  requireProof(batch.provider==='fussball-public'&&batch.staffel===scope.staffel&&batch.season===scope.season&&batch.activationEligible===false&&batch.reports?.length>0&&batch.schedule?.length>0&&batch.identities?.length>0,'complete native source batch required before dispatch')
 }
 return ['workflow','run','uvoz-pl-de-paketa.yml','--repo',repository,'--ref','main','-f','country=DE','-f','expected_sha='+e.EXPECTED_SHA,'-f','audit_run='+e.GITHUB_RUN_ID,'-f','candidate='+plan.rolloutCandidate,'-f','max_requests=1']
}
async function main(args){
 const [mode,directory]=args
 requireProof((mode==='validate'&&args.length===1)||(['authorize','capture-archive'].includes(mode)&&args.length===2)||(mode==='handoff'&&args.length===3),'use validate, authorize DIRECTORY, capture-archive DIRECTORY or handoff CURRENT ARCHIVE')
 const e=process.env,headSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 if(mode==='validate'){console.log(JSON.stringify(validateFussballSeasonPilot(e,{headSha})));return}
 if(mode==='handoff'){
  const remoteMain=()=>execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{encoding:'utf8',timeout:30000}).split(/\s/)[0]
  const dispatch=await authorizeFussballRollout({currentDirectory:resolve(directory),archiveDirectory:resolve(args[2]),e,headSha,mainSha:remoteMain()})
  requireProof(remoteMain()===e.EXPECTED_SHA,'main changed after offline rollout verification')
  execFileSync('gh',dispatch,{stdio:'inherit',timeout:30000});return
 }
 const result=await authorizeFussballSeasonArchive(resolve(directory),e,{headSha})
 if(mode==='authorize'){
  // Only a successful capture and independent replay can emit this permission.
  if(e.GITHUB_OUTPUT)appendFileSync(e.GITHUB_OUTPUT,`archive_allowed=true\ncurrent_requests=${result.currentRequests}\n`)
  console.log(JSON.stringify(result));return
 }
 const a=result.archive
 let archiveParent
 if(a.observedSeedUrl){
  const m=JSON.parse(readFileSync(join(directory,'manifest.json'))),seed=m.documents.find(d=>d.kind==='round'&&d.url===result.current.seedUrl)
  const document=Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,seed[k]]))
  archiveParent={current:Object.fromEntries(['seedUrl','staffel','season'].map(k=>[k,result.current[k]])),observedSeedUrl:a.observedSeedUrl,document,bytes:readFileSync(join(directory,seed.file)),originalReceipt:{version:1,document,attempt:m.snapshot.attempts.find(attempt=>attempt.url===seed.url),capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}}
 }
 await captureFussballDirectory({directory:resolve('capture-archive'),options:{...a,reportLimit:null},archiveParent,onProgress:p=>console.log(JSON.stringify(p))})
 console.log(JSON.stringify(await runFussballCaptureCli(['verify','capture-archive'])))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1})
