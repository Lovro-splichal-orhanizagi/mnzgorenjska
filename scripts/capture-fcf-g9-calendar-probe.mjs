// Closed hosted entry. Imports have no source/network effect.
import {execFileSync} from 'node:child_process'
import {appendFileSync,existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {readFcfG9CalendarCounter,readFcfG9CalendarProbe,readFcfG9CalendarExecution,captureFcfG9CalendarProbe} from './fcf-g9-calendar-probe.mjs'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
function github(path,binary=false){if(typeof path!=='string'||!path.startsWith(prefix)||/[\\\r\n]/.test(path)||path.includes('..'))throw Error('G9 own-repository GET required');const b=execFileSync('gh',['api','--method','GET',...(path.includes('/contents/')?['-H','Accept: application/vnd.github.object+json']:[]),path],{timeout:binary?180000:60000,maxBuffer:(binary?100:8)*1024*1024+1,stdio:['ignore','pipe','pipe']});return binary?b:JSON.parse(b)}
export async function runFcfG9CalendarProbe(){
 const e=process.env;if(process.argv.length!==2||e.G9_MODE!=='g9-calendar-discovery-v1'||!e.GH_TOKEN)throw Error('closed G9 hosted mode required');let proof=await readFcfG9CalendarCounter({github}),locators=JSON.parse(e.G9_PREVIOUS_PROBES??'[]');if(!Array.isArray(locators)||locators.length>2||JSON.stringify(locators).length>16384)throw Error('bounded previous probe locators required');for(const locator of locators)proof=await readFcfG9CalendarProbe({counterProof:proof,locator,github});const executionProof=await readFcfG9CalendarExecution({counterProof:proof,runId:e.GITHUB_RUN_ID,sourceHead:e.EXPECTED_SHA,mainCiRunId:e.MAIN_CI_RUN_ID,selectedURL:e.G9_SELECTED_URL??'',github});return captureFcfG9CalendarProbe({executionProof})
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 runFcfG9CalendarProbe().then(m=>{console.log(JSON.stringify({sourceOnly:true,actualSourceGETs:m.actualSourceGETs,nativeAdmission:false}));if(m.outcome.reason&&m.outcome.reason!=='observed-redirect')process.exitCode=1}).catch(()=>{console.error('G9 calendar probe held; retain originals and reconcile; never retry dispatch or source.');process.exitCode=1}).finally(()=>{if(process.env.GITHUB_OUTPUT&&existsSync('fcf-g9-calendar-probe'))appendFileSync(process.env.GITHUB_OUTPUT,'evidence_ready=true\n')})
}
