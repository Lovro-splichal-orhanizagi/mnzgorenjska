// Fixed Baden hosted handoff only. No football transport, DB or owner access.
import {existsSync,lstatSync,realpathSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {selectBulkCandidates} from './bulk-source-packs.mjs'
import {atomicCheckpoint} from './provider-league-batch.mjs'
import {githubGetAdapter} from './stage-fussball-native-composition.mjs'
import {loadFussballNativeComposition,getFussballNativeComposition} from './fussball-native-composition.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-baden-native.yml',slug='de-verbandsliga-baden',profile='germany-retained-fussball-native-v1'
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const need=(ok,m)=>{if(!ok)throw Object.assign(Error('Baden native staging: '+m),{dataHold:true})}
const root=()=>resolve('release/pl-de-bulk')
function regularDirectory(path){need(existsSync(path)&&lstatSync(path).isDirectory()&&!lstatSync(path).isSymbolicLink()&&realpathSync(path)===path,'canonical regular directory required')}
function environment(env){
 need(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY===repo&&env.GITHUB_WORKFLOW_REF===repo+'/'+workflow+'@refs/heads/main'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d{0,15}$/.test(env.GITHUB_RUN_ID??'')&&/^[1-9]\d{0,15}$/.test(env.DERIVED_RUN_ID??'')&&env.GITHUB_RUN_ID!==env.DERIVED_RUN_ID&&Number.isSafeInteger(Number(env.GITHUB_RUN_ID))&&Number.isSafeInteger(Number(env.DERIVED_RUN_ID))&&/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA??'')&&env.GITHUB_SHA===env.EXPECTED_SHA&&['false','true'].includes(env.ACTIVATE_IF_READY)&&env.FROZEN_DE77_DIRECTORY==='frozen-de77'&&env.FROZEN_V6_DIRECTORY==='frozen-v6','fixed manual main/first-attempt/head/derived/frozen/activation scope required')
 need(!existsSync(resolve('.env')),'repository.env forbidden')
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===env.EXPECTED_SHA,'installed checkout differs')
}
function runIdentity(r,env){
 need(r?.id===Number(env.GITHUB_RUN_ID)&&r.run_attempt===1&&r.head_sha===env.EXPECTED_SHA&&r.head_branch==='main'&&r.path===workflow&&r.event==='workflow_dispatch'&&r.status==='in_progress'&&r.conclusion===null&&r.repository?.full_name===repo&&r.head_repository?.full_name===repo,'actual native workflow identity differs')
 need([r.actor,r.triggering_actor].every(a=>a?.id===25134229&&a.login==='nejcar20'&&a.type==='User'),'actual reviewed actor and triggering_actor required')
}
export async function stageBadenNativeComposition(input={}){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&Object.keys(input).every(k=>k==='env'),'no caller output/path or authority overrides')
 const env=input.env??process.env;environment(env)
 need(!env.SUPABASE_URL&&!env.SUPABASE_SERVICE_ROLE_KEY&&!env.SUPABASE_DB_URL,'read-only staging must have no DB credentials')
 need(!existsSync(root()),'existing output: once-only exclusive stage; inspect partial state, no replay')
 if(existsSync(resolve('release')))regularDirectory(resolve('release'))
 const frozenDirectory=resolve('frozen-de77'),v6FrozenDirectory=resolve('frozen-v6');regularDirectory(frozenDirectory);regularDirectory(v6FrozenDirectory)
 const github=githubGetAdapter(env.GH_TOKEN??env.GITHUB_TOKEN),base=`repos/${repo}/`,path=base+'actions/runs/'+env.GITHUB_RUN_ID
 const run=await github(path);runIdentity(run,env)
 const main=await github(base+'branches/main');need(main?.name==='main'&&main.commit?.sha===env.EXPECTED_SHA,'current main differs')
 const composition=await loadFussballNativeComposition({derivedRunId:env.DERIVED_RUN_ID,derivedHead:env.EXPECTED_SHA,frozenDirectory,v6FrozenDirectory,github}),state=getFussballNativeComposition(composition)
 need(state.proof.derivedRunId===env.DERIVED_RUN_ID&&state.proof.derivedHead===env.EXPECTED_SHA&&state.pack.profile===profile&&state.pack.expectedSha===env.EXPECTED_SHA&&state.pack.replayHead===env.EXPECTED_SHA&&state.sourceProof.kind==='authenticated-completed-fussball-v7-source'&&Date.parse(state.pack.currentFreshUntil)>Date.now()&&state.proof.currentFreshUntil===state.pack.currentFreshUntil,'private V7 composition/head/original freshness differs')
 need(same(await github(path),run)&&same(await github(base+'branches/main'),main),'native caller/main changed during authentication')
 const candidates=selectBulkCandidates('DE',slug);need(candidates.length===1,'fixed single reviewed Baden candidate required')
 need(!existsSync(root()),'existing output changed during private authentication')
 mkdirSync(resolve('release'),{recursive:true});regularDirectory(resolve('release'));mkdirSync(root())
 atomicCheckpoint(join(root(),'staging.json'),{version:1,status:'RUNNING',expected_sha:env.EXPECTED_SHA,derived_run_id:env.DERIVED_RUN_ID,activate_if_ready:env.ACTIVATE_IF_READY==='true'})
 const directory=join(root(),'packs',slug);mkdirSync(directory,{recursive:true})
 const locator={derivedRunId:env.DERIVED_RUN_ID,derivedHead:env.EXPECTED_SHA,frozenDirectory,v6FrozenDirectory};writeFileSync(join(directory,'baden-native-locator.json'),JSON.stringify(locator)+'\n',{flag:'wx',mode:0o600})
 const report={version:1,phase:'source',expected_sha:env.EXPECTED_SHA,scope_sha256:hash(candidates),status:'STAGED',results:[{candidate:candidates[0],slug,directory,profile,status:'STAGED'}],host_stops:{},infrastructure_stop:null}
 atomicCheckpoint(join(root(),'source-report.json'),report);atomicCheckpoint(join(root(),'staging.json'),{version:1,status:'STAGED',expected_sha:env.EXPECTED_SHA,derived_run_id:env.DERIVED_RUN_ID,activate_if_ready:env.ACTIVATE_IF_READY==='true'})
 return {status:'STAGED',slug,expectedSha:env.EXPECTED_SHA,derivedRunId:env.DERIVED_RUN_ID,activateIfReady:env.ACTIVATE_IF_READY==='true',nativeAdmission:false,activationEligible:false}
}
/** These are local stop checks, never source/native authority. The existing
 * bulk CLI reauthenticates source, DB, seed, exact cache and SQL conjunction. */
export function requireBadenNativeReport(mode,env=process.env){
 environment(env);need(['import','active'].includes(mode),'fixed report stage required')
 const path=join(root(),mode==='import'?'native-import-report.json':'native-report.json');need(existsSync(path)&&lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink()&&lstatSync(path).size<=16*1024*1024,'bounded actual native checkpoint required')
 const r=JSON.parse(readFileSync(path,'utf8')),v=r.results?.[0],expected=mode==='import'?'VERIFIED':'ACTIVE'
 const [candidate]=selectBulkCandidates('DE',slug),scope={...v?.candidate};if(!candidate.id)delete scope.id
 need(same(scope,candidate),'native checkpoint candidate differs from fixed catalog')
 need(r.phase==='native'&&r.expected_sha===env.EXPECTED_SHA&&r.status===expected&&r.infrastructure_stop===null&&r.results.length===1&&v.status===expected&&v.slug===slug&&v.profile===profile&&Number.isSafeInteger(v.candidate?.id)&&v.candidate.id>0&&v.candidate.slug===slug&&v.candidate.source==='fussball-public'&&v.candidate.country_code==='DE'&&v.proof?.version===2&&v.proof.contract_id==='bulk-native-baden-composition-v2'&&v.proof.expected_sha===env.EXPECTED_SHA&&Array.isArray(v.steps)&&v.steps.every(s=>s.status==='COMPLETED'),'incomplete/HOLD/UNKNOWN native checkpoint: no cache/admission/activation or replay')
 if(mode==='active')need(env.ACTIVATE_IF_READY==='true'&&v.readback?.active===true,'explicit activation and actual active readback required')
 return {status:expected,slug,expectedSha:env.EXPECTED_SHA}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const [command,...extra]=process.argv.slice(2)
 Promise.resolve().then(()=>{need(extra.length===0,'no arbitrary arguments');if(command==='stage')return stageBadenNativeComposition();if(command==='require-import')return requireBadenNativeReport('import');if(command==='require-active')return requireBadenNativeReport('active');need(false,'stage|require-import|require-active required')}).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e.message);process.exitCode=1})
}
