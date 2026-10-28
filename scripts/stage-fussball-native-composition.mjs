// Read-only GitHub producer; source football transport and native writes absent.
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {readFussballCompletedSourceV7} from './fussball-completed-source-v7.mjs'
import {validateFussballNativeCatalog,produceFussballNativeComposition} from './fussball-native-composition.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/replay-fussball-native-composition.yml'
const need=(v,m)=>{if(!v)throw Object.assign(Error('Baden derived stage: '+m),{dataHold:true})}
export function githubGetAdapter(token){
 need(typeof token==='string'&&token.length>0,'GitHub read token required')
 return async(path,binary=false)=>{
  need(typeof path==='string'&&path.startsWith(`repos/${repo}/`)&&!path.includes('..')&&!path.includes('\\')&&!path.includes('\n'),'own-repository GET only')
  const bytes=execFileSync('gh',['api','--method','GET',path],{env:{...process.env,GH_TOKEN:token},timeout:60000,maxBuffer:(binary?512:8)*1024*1024+1})
  return binary?bytes:JSON.parse(bytes)
 }
}
export async function stageFussballNativeComposition({command,directory,env}){
 need(['validate','produce'].includes(command),'validate or produce command required')
 need(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY===repo&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.EXPECTED_SHA===env.GITHUB_SHA&&/^[1-9]\d{0,15}$/.test(env.SOURCE_RUN_ID??'')&&/^[1-9]\d{0,15}$/.test(env.GITHUB_RUN_ID??'')&&env.SOURCE_RUN_ID!==env.GITHUB_RUN_ID&&env.FROZEN_DE77_DIRECTORY==='frozen-de77'&&env.FROZEN_V6_DIRECTORY==='frozen-v6','exact manual main first-attempt runtime pins required')
 validateFussballNativeCatalog(JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url))))
 const github=githubGetAdapter(env.GH_TOKEN),prefix=`repos/${repo}/`,run=await github(prefix+`actions/runs/${env.GITHUB_RUN_ID}`),main=await github(prefix+'branches/main')
 need(run.id===Number(env.GITHUB_RUN_ID)&&run.run_attempt===1&&run.head_sha===env.GITHUB_SHA&&run.head_branch==='main'&&run.path===workflow&&run.event==='workflow_dispatch'&&run.status==='in_progress'&&run.conclusion===null&&run.repository?.full_name===repo&&run.head_repository?.full_name===repo&&main.name==='main'&&main.commit?.sha===env.GITHUB_SHA,'actual derived run/main binding differs')
 if(command==='validate'){
  await readFussballCompletedSourceV7({sourceRunId:env.SOURCE_RUN_ID,frozenDirectory:env.FROZEN_DE77_DIRECTORY,v6FrozenDirectory:env.FROZEN_V6_DIRECTORY,github})
  return {validated:true,actualReady:false,registrationEligible:false,nativeImportEligible:false,activationEligible:false}
 }
 return produceFussballNativeComposition({derivedRunId:env.GITHUB_RUN_ID,derivedHead:env.GITHUB_SHA,sourceRunId:env.SOURCE_RUN_ID,frozenDirectory:env.FROZEN_DE77_DIRECTORY,v6FrozenDirectory:env.FROZEN_V6_DIRECTORY,github,directory})
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 stageFussballNativeComposition({command:process.argv[2],directory:process.argv[3],env:process.env}).then(v=>console.log(JSON.stringify({derivedRunId:v.derivedRunId??process.env.GITHUB_RUN_ID,actualReady:false,registrationEligible:false,nativeImportEligible:false,activationEligible:false}))).catch(e=>{console.error(e.message);process.exitCode=1})
}
