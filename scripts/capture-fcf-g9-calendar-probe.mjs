// Closed hosted entry. Imports have no source/network effect.
import {execFileSync} from 'node:child_process'
import {appendFileSync,existsSync,writeFileSync,openSync,fsyncSync,closeSync,realpathSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFcfG9CalendarCounter,readFcfG9CalendarProbe,readFcfG9CalendarExecution,captureFcfG9CalendarProbe} from './fcf-g9-calendar-probe.mjs'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
const phases=['ENVIRONMENT','COUNTER','PRIOR_PROBE','EXECUTION','CAPTURE','COMPLETE'],guards={
 'FCF_G9_PROBE_HOLD: live source/writer overlap held':'LIVE_SOURCE_WRITER_OVERLAP',
 'FCF_G9_PROBE_HOLD: complete stable metadata pages required':'METADATA_PAGE_CONTRACT',
 'FCF_G9_PROBE_HOLD: actual immutable runtime bytes differ':'RUNTIME_BYTES',
 'FCF_G9_PROBE_HOLD: fresh complete accounted source metadata differs':'SOURCE_HISTORY_METADATA',
 'FCF_G9_PROBE_HOLD: fixed historical terminal execution differs':'COUNTER_TERMINAL_METADATA',
 'FCF_G9_PROBE_HOLD: counter artifact metadata differs':'COUNTER_ARTIFACT_METADATA',
 'FCF_G9_PROBE_HOLD: typed actual final counter differs':'COUNTER_RECEIPT',
 'FCF_G9_PROBE_HOLD: actual main/CI differs':'MAIN_CI',
 'FCF_G9_PROBE_HOLD: actual root/main/manual/first-attempt run required':'RUN_IDENTITY',
 'FCF_G9_PROBE_HOLD: actual served main differs':'SERVED_HEAD',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: complete exact raw R1 job log required':'R1_RAW_LOG',
 'FCF_G9_ARCHIVED_R1_LOG: exact private draft release identity and API URLs required':'R1_ARCHIVED_LOG',
 'FCF_G9_ARCHIVED_R1_LOG: exact root-uploaded archived R1 asset metadata required':'R1_ARCHIVED_LOG',
 'FCF_G9_ARCHIVED_R1_LOG: exact archived R1 job log bytes/digest required':'R1_ARCHIVED_LOG',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: exact failed root/main/manual R1 run required':'R1_RUN',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: complete exact terminal two-job graph required':'R1_JOB_GRAPH',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: exact empty R1 artifact inventory required':'R1_ARTIFACTS',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: frozen R1 runtime/import/test body drift':'R1_FROZEN_BODY',
 'FCF_G9_PRE_PROVIDER_ZERO_HOLD: late R1 terminal metadata drift':'R1_LATE_METADATA'
}
// Diagnostic DATA only: never count/zero/source evidence or an executable input.
const archiveEndpoints=new Set(['releases/416653899','releases/416653899/assets?per_page=100&page=1','releases/assets/690729624'])
export function formatFcfG9CalendarDiagnostic(phase,lastGithubEndpoint,error=null){
 const tail=typeof lastGithubEndpoint==='string'?lastGithubEndpoint.slice(prefix.length):'',allowed=archiveEndpoints.has(tail)||/^actions\/(?:runs\/\d+(?:\/(?:attempts\/1\/jobs|artifacts)\?per_page=100&page=\d+)?|jobs\/\d+\/logs|artifacts\/\d+(?:\/zip)?|workflows\/[A-Za-z0-9_-]+\.yml(?:\/runs\?per_page=100&page=\d+)?)$|^branches\/main$|^contents\/[A-Za-z0-9_.\/-]+\?ref=[a-f0-9]{40}$/.test(tail),endpoint=typeof lastGithubEndpoint==='string'&&lastGithubEndpoint.startsWith(prefix)&&lastGithubEndpoint.length<=2048&&allowed&&!lastGithubEndpoint.includes('..')?lastGithubEndpoint:null,status=String(error?.stderr??'').match(/\bHTTP ([1-5][0-9]{2})\b/)?.[1],guard=Object.hasOwn(guards,error?.message)?guards[error.message]:typeof error?.message==='string'&&error.message.startsWith('FCF_G9_ARCHIVED_R1_LOG:')?'R1_ARCHIVED_LOG':'UNKNOWN'
 return {version:1,kind:'fcf-g9-calendar-diagnostic',UTC:new Date().toISOString(),phase:phases.includes(phase)?phase:'UNKNOWN',lastGithubEndpoint:endpoint,guard,githubHttpStatus:status?Number(status):null,diagnosticOnly:true,accountingKnown:false,actualSourceGETs:null,nativeAdmission:false,activationEligible:false}
}
export async function runFcfG9CalendarProbe(){
 const e=process.env;let phase='ENVIRONMENT',lastGithubEndpoint=null,journal=null
 const record=error=>{const row=formatFcfG9CalendarDiagnostic(phase,lastGithubEndpoint,error),bytes=JSON.stringify(row)+'\n';console.error('G9_DIAGNOSTIC '+JSON.stringify(row));if(journal){appendFileSync(journal,bytes);const fd=openSync(journal,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}}
 function github(path,binary=false){if(typeof path!=='string'||!path.startsWith(prefix)||/[\\\r\n]/.test(path)||path.includes('..'))throw Error('G9 own-repository GET required');lastGithubEndpoint=path;const b=execFileSync('gh',['api','--method','GET',...(path.includes('/contents/')?['-H','Accept: application/vnd.github.object+json']:[]),path],{timeout:binary?180000:60000,maxBuffer:(binary?100:8)*1024*1024+1,stdio:['ignore','pipe','pipe']});return binary?b:JSON.parse(b)}
 try{
  if(process.argv.length!==2||e.G9_MODE!=='g9-calendar-discovery-v1'||!e.GH_TOKEN)throw Error('closed G9 hosted mode required')
  // Separate runner-temp path keeps the source output/clean-check/mkdir contract.
  const path=join(realpathSync(e.RUNNER_TEMP),'fcf-g9-calendar-diagnostic.jsonl');writeFileSync(path,'',{flag:'wx',mode:0o600});journal=path;record()
  phase='COUNTER';record();let proof=await readFcfG9CalendarCounter({github}),locators=JSON.parse(e.G9_PREVIOUS_PROBES??'[]');if(!Array.isArray(locators)||locators.length>2||JSON.stringify(locators).length>16384)throw Error('bounded previous probe locators required')
  for(const locator of locators){phase='PRIOR_PROBE';record();proof=await readFcfG9CalendarProbe({counterProof:proof,locator,github})}
  phase='EXECUTION';record();const executionProof=await readFcfG9CalendarExecution({counterProof:proof,runId:e.GITHUB_RUN_ID,sourceHead:e.EXPECTED_SHA,mainCiRunId:e.MAIN_CI_RUN_ID,selectedURL:e.G9_SELECTED_URL??'',github})
  phase='CAPTURE';record();const result=await captureFcfG9CalendarProbe({executionProof});phase='COMPLETE';record();return result
 }catch(error){record(error);throw error}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 runFcfG9CalendarProbe().then(m=>{console.log(JSON.stringify({sourceOnly:true,actualSourceGETs:m.actualSourceGETs,nativeAdmission:false}));if(m.outcome.reason&&m.outcome.reason!=='observed-redirect')process.exitCode=1}).catch(()=>{console.error('G9 calendar probe held; retain originals and reconcile; never retry dispatch or source.');process.exitCode=1}).finally(()=>{if(process.env.GITHUB_OUTPUT&&existsSync('fcf-g9-calendar-probe'))appendFileSync(process.env.GITHUB_OUTPUT,'evidence_ready=true\n')})
}
