// Optional source-only hosted continuation. No database or activation authority.
import {readFileSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {validateFussballCaptureOptions,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {fussballRoundScope} from './lib/fussball-capture.mjs'
import {extractFussballSeasonLinks} from './fussball-season-links.mjs'
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
 if(!e.ARCHIVE_JSON?.trim())return null
 requireProof(e.GITHUB_REPOSITORY===repository&&e.GITHUB_REF==='refs/heads/main'&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_WORKFLOW_REF===`${repository}/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main`&&e.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d*$/.test(e.GITHUB_RUN_ID??''),'exact repository main dispatch and first attempt required')
 requireProof(/^[a-f0-9]{40}$/.test(e.EXPECTED_SHA??'')&&e.EXPECTED_SHA===e.GITHUB_SHA&&e.EXPECTED_SHA===headSha,'exact reviewed main SHA required')
 requireProof(e.REPORTS==='all','paired seasons require reports=all')
 const raw=JSON.parse(e.ARCHIVE_JSON)
 requireProof(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).sort().join(',')==='maxRequests,season,seedUrl,staffel','exact archive tuple required')
 requireProof(Number.isInteger(raw.maxRequests)&&raw.maxRequests>=1&&raw.maxRequests<=3000,'invalid archive request budget')
 const current=scope({seedUrl:e.SEED_URL,staffel:e.STAFFEL,season:e.SEASON,maxRequests}),archive=scope(raw)
 const route=fussballRoundScope(archive.seedUrl)
 requireProof(route.round===null&&route.date===null&&archive.staffel!==current.staffel&&Number(archive.season.slice(0,4))+1===Number(current.season.slice(0,4)),'adjacent archive seed required')
 // The approved pilot has already spent 361 requests; never reset that ledger.
 const priorRequests=integer(e.PRIOR_REQUESTS,361,5000),totalRequestCap=integer(e.TOTAL_REQUEST_CAP,1,5000)
 requireProof(priorRequests+current.maxRequests+archive.maxRequests<=totalRequestCap,'cumulative reserved request budget exceeds cap')
 return {current,archive,priorRequests,totalRequestCap}
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
 requireProof(links.previous&&['seedUrl','staffel','season'].every(k=>links.previous[k]===plan.archive[k]),'archive differs from observed adjacent live season link')
 const cumulativeReserved=plan.priorRequests+verified.requests+plan.archive.maxRequests
 requireProof(cumulativeReserved<=plan.totalRequestCap,'remaining cumulative request budget exceeded')
 return {...plan,currentRequests:verified.requests,cumulativeReserved}
}
async function main(args){
 const [mode,directory]=args
 requireProof((mode==='validate'&&args.length===1)||(['authorize','capture-archive'].includes(mode)&&args.length===2),'use validate, authorize DIRECTORY or capture-archive DIRECTORY')
 const e=process.env,headSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 if(mode==='validate'){console.log(JSON.stringify(validateFussballSeasonPilot(e,{headSha})));return}
 const result=await authorizeFussballSeasonArchive(resolve(directory),e,{headSha})
 if(mode==='authorize'){
  // Only a successful capture and independent replay can emit this permission.
  if(e.GITHUB_OUTPUT)appendFileSync(e.GITHUB_OUTPUT,`archive_allowed=true\ncurrent_requests=${result.currentRequests}\n`)
  console.log(JSON.stringify(result));return
 }
 const a=result.archive
 await runFussballCaptureCli(['capture','--seed-url',a.seedUrl,'--staffel',a.staffel,'--season',a.season,'--max-requests',String(a.maxRequests),'--reports','all','--output','capture-archive'])
 console.log(JSON.stringify(await runFussballCaptureCli(['verify','capture-archive'])))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1})
