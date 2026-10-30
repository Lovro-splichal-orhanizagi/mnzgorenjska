import {readFileSync,realpathSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {extractFussballSeasonLinks,fussballArchiveSeedAlias} from './fussball-season-links.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {fussballFreshPairProfile,fussballFreshPairRuntimeFiles} from './fussball-fresh-pair.mjs'
export const R10_REPOSITORY='Lovro-splichal-orhanizagi/mnzgorenjska',R10_PREFIX='repos/'+R10_REPOSITORY+'/',R10_WORKFLOW='.github/workflows/preveri-baden-r10-current.yml'
export const R10_BUDGET_STEP='Prepare private current-only budget lease',R10_CAPTURE_STEP='Capture fixed current only using private lease',R10_REPLAY_STEP='Replay and seal new current originals'
export const r10Need=(v,c)=>{if(!v)throw Object.assign(Error('BADEN_R10_CURRENT_'+c),{code:'BADEN_R10_CURRENT_'+c,dataHold:true})}
export const r10Closed=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join(',')===keys.slice().sort().join(',')
export const r10Sha=b=>createHash('sha256').update(b).digest('hex'),r10Json=v=>Buffer.from(JSON.stringify(v)+'\n')
export const r10Parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
export const r10Freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(r10Freeze);Object.freeze(v)}return v}
export const r10CopyFiles=f=>new Map([...f].map(([n,b])=>[n,Buffer.from(b)]))
export const R10_FLAGS=Object.freeze({sourceOnly:true,nativeAdmission:false,activationEligible:false})
export function fussballBadenR10CurrentProfile(){const p=fussballFreshPairProfile();return {version:10,protocol:'baden-r10-current-retained-r7-v1',repository:R10_REPOSITORY,workflow:R10_WORKFLOW,current:p.current,archive:p.archive,archiveObservedSeedUrl:p.archiveObservedSeedUrl,currentMaximum:780,archiveMaximum:0,totalRequestCap:5000,limits:{expanded:192*1024*1024,zip:100*1024*1024,metadata:16*1024*1024,semanticResult:256*1024*1024,partialBody:24*1024*1024,members:4096},...R10_FLAGS}}
const root=fileURLToPath(new URL('../',import.meta.url))
export function fussballBadenR10CurrentRuntimeFiles(){
 r10Need(realpathSync(process.cwd())===realpathSync(root),'CANONICAL_RUNTIME')
 const data=['scripts/fussball-baden-r10-accounting.json','scripts/fussball-baden-r10-exclusions.json','scripts/fussball-baden-r10-content-vectors.json','scripts/fussball-baden-r10-fcf-modes.json','scripts/fussball-baden-r10-nightly.json','scripts/fussball-baden-completed-stages.json','scripts/fussball-fresh-pair-history.json']
 return [...new Set([...fussballFreshPairRuntimeFiles(),...zaprtje('scripts/fussball-baden-r10-current.mjs'),...data,R10_WORKFLOW,'package.json','package-lock.json'])].sort()
}
export function fussballBadenR10CurrentRuntime(){const files=Object.fromEntries(fussballBadenR10CurrentRuntimeFiles().map(p=>[p,r10Sha(readFileSync(join(root,p)))]));return {files,codeSha256:r10Sha(r10Json(files))}}
export function r10Owner(a){return a?.id===25134229&&a.login==='nejcar20'&&a.type==='User'}
export function r10RunIdentity(run,head,id,terminal=false){r10Need(String(run?.id)===id&&run.run_attempt===1&&run.head_sha===head&&run.head_branch==='main'&&run.path===R10_WORKFLOW&&run.event==='workflow_dispatch'&&run.repository?.full_name===R10_REPOSITORY&&run.head_repository?.full_name===R10_REPOSITORY&&r10Owner(run.actor)&&r10Owner(run.triggering_actor)&&(terminal?run.status==='completed':run.status==='in_progress'&&run.conclusion===null),'ACTUAL_EXECUTION')}
export function r10Jobs(jobs,run){r10Need(jobs?.total_count===1&&Array.isArray(jobs.jobs)&&jobs.jobs.length===1,'COMPLETE_JOB_GRAPH');const j=jobs.jobs[0];r10Need(j.name==='current-source'&&j.run_id===run.id&&j.run_attempt===1&&j.head_sha===run.head_sha&&Array.isArray(j.steps)&&new Set(j.steps.map(s=>s.number)).size===j.steps.length&&new Set(j.steps.map(s=>s.name)).size===j.steps.length,'JOB_BINDING');return j}
export function r10PreSourcePhase(jobs,run){const j=r10Jobs(jobs,run),b=j.steps.filter(s=>s.name===R10_BUDGET_STEP),c=j.steps.filter(s=>s.name===R10_CAPTURE_STEP);r10Need(j.status==='in_progress'&&b.length===1&&b[0].status==='in_progress'&&b[0].conclusion===null&&j.steps.slice(0,j.steps.indexOf(b[0])).every(s=>s.status==='completed'&&s.conclusion==='success')&&(c.length===0||c.length===1&&j.steps.indexOf(c[0])>j.steps.indexOf(b[0])&&['queued','pending','waiting'].includes(c[0].status)&&c[0].conclusion===null&&!c[0].started_at),'PRE_SOURCE_PHASE');return j}
export function r10CapturePhase(jobs,run){const j=r10Jobs(jobs,run),b=j.steps.find(s=>s.name===R10_BUDGET_STEP),c=j.steps.filter(s=>s.name===R10_CAPTURE_STEP);r10Need(j.status==='in_progress'&&b?.status==='completed'&&b.conclusion==='success'&&c.length===1&&c[0].status==='in_progress'&&c[0].conclusion===null&&j.steps.indexOf(b)<j.steps.indexOf(c[0]),'CAPTURE_PHASE');return j}
export async function r10AuthenticateRuntime(github,head){r10Need(/^[a-f0-9]{40}$/.test(head),'SOURCE_HEAD');const runtime=fussballBadenR10CurrentRuntime(),c=await github(R10_PREFIX+'git/commits/'+head);r10Need(c?.sha===head&&/^[a-f0-9]{40}$/.test(c.tree?.sha??''),'SOURCE_COMMIT');for(const[path,hash]of Object.entries(runtime.files)){const v=await github(R10_PREFIX+'contents/'+path+'?ref='+head);r10Need(v?.type==='file'&&v.path===path&&v.encoding==='base64'&&v.size<=8*1024*1024&&Buffer.from(v.content??'','base64').length===v.size&&r10Sha(Buffer.from(v.content,'base64'))===hash,'SOURCE_RUNTIME_BODY')}return {...runtime,tree:c.tree.sha}}

export function r10CurrentMenu(files){const p=fussballBadenR10CurrentProfile(),m=r10Parse(files.get('manifest.json')),d=m.documents.find(d=>d.kind==='round'&&d.url===p.current.seedUrl);r10Need(d&&files.has(d.file),'CURRENT_MENU');const a=extractFussballSeasonLinks(files.get(d.file).toString('utf8'),p.current).previous;r10Need(a&&a.staffel===p.archive.staffel&&a.season===p.archive.season&&[p.archive.seedUrl,p.archiveObservedSeedUrl].includes(a.seedUrl),'GENUINE_R7_ADJACENCY');if(a.seedUrl!==p.archive.seedUrl)fussballArchiveSeedAlias({...p.archive,observedSeedUrl:a.seedUrl},p.current);return {currentRawSha256:d.sha256,observedSeedUrl:a.seedUrl,canonicalArchiveSeedUrl:p.archive.seedUrl,currentCode:p.current.staffel+':'+p.current.season,archiveCode:p.archive.staffel+':'+p.archive.season}}

// Current main graph: skipped research jobs never substitute for required builds.
export function r10MainCiJobs(value,run){
 const expected=new Map([['Pravice in roki v svezi bazi','success'],['Tipi, build, izris','success'],['novi-viri','skipped'],['diagnostika-virov','skipped'],['Migracije baze','success'],['Objava na Vercel','success'],['Objava Trgovine na Hetzner VM','success'],['Objava na Hetzner VM','success'],['Objava Club na Hetzner VM','success'],['Je nova različica res v zraku?','success']]),ids=new Set(),names=new Set()
 r10Need(value?.total_count===expected.size&&value.jobs?.length===expected.size&&value.jobs.every(j=>{if(!Number.isSafeInteger(j.id)||j.id<=0||ids.has(j.id)||names.has(j.name)||expected.get(j.name)!==j.conclusion||j.status!=='completed'||j.run_id!==run.id||j.run_attempt!==1||j.head_sha!==run.head_sha)return false;ids.add(j.id);names.add(j.name);return true})&&names.size===expected.size,'ACTUAL_MAIN_CI_GRAPH');return value
}
