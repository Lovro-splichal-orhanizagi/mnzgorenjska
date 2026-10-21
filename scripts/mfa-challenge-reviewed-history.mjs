// GitHub Actions only. Closed native RPCs + original Actions artifact; never reads MFA.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {github,githubJson,sha256,repository} from './dfb-artifacts.mjs'
import {MFA_CHALLENGE_ORIGINAL as MFA_ORIGINAL,readChallengeArchive as readMfaArchive,verifyMfaArtifactIdentity,verifyChallengePreparedFiles as verifyMfaPreparedFiles} from './mfa-challenge-reviewed-history-evidence.mjs'
import {runMfaRegistrationSmoke} from './mfa-registration-smoke.mjs'
const env=process.env,mode=process.argv[2],commit=env.EXPECTED_SHA
const fail=message=>{throw Error(`MFA route: ${message}`)}
if(!['prepare','cleanup','reprice','preview','activate','receipt'].includes(mode)||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_SHA!==commit||!/^[a-f0-9]{40}$/.test(commit??'')||env.GITHUB_RUN_ATTEMPT!=='1'||!/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??''))fail('first-attempt pinned main Actions execution required')
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==commit||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==commit)fail('checkout/remote main SHA changed')
const policy=getHistoricalStatisticsPolicy('mt-challenge'),policySha=historicalStatisticsPolicySha256(policy)
let endpoint
try{endpoint=new URL(env.SUPABASE_URL)}catch{fail('database endpoint required')}
if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.port||endpoint.search||endpoint.hash||endpoint.pathname!=='/'||!env.SUPABASE_SERVICE_ROLE_KEY)fail('fixed database HTTPS/service key required')
async function rpc(name,parameters={}){
 const response=await fetch(new URL(`/rest/v1/rpc/${name}`,endpoint),{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(parameters),signal:AbortSignal.timeout(200000)})
 if(!response.ok)fail(`native RPC ${name} HTTP${response.status}; read receipt before retrying an ambiguous write`)
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>32*1024*1024)fail('response too large');return JSON.parse(bytes.toString('utf8'))
}
function artifact(expected){
 const metadata=githubJson(`actions/artifacts/${expected.artifactId}`),run=githubJson(`actions/runs/${expected.runId}`)
 verifyMfaArtifactIdentity({artifact:metadata,run,expected});const bytes=github(`actions/artifacts/${expected.artifactId}/zip`,true)
 if(bytes.length!==metadata.size_in_bytes)fail('artifact size changed');return readMfaArchive(bytes,expected.digest,{prepared:expected.workflow.endsWith('/mfa-challenge-reviewed-history.yml')})
}
const dir=`mfa-challenge-reviewed-${mode}`;mkdirSync(dir);if(readdirSync(dir).length)fail('fresh artifact output required')
const manifest={schemaVersion:1,kind:`mfa-challenge-reviewed-${mode}`,mainCommit:commit,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,policySha256:policySha}
if(mode==='prepare'){
 const originals=artifact(MFA_ORIGINAL),prepared=await rpc('prepare_mfa_challenge_reviewed_cleanup',{p_main_sha:commit,p_policy_sha:policySha})
 if(sha256(Buffer.from(prepared.beforeImageText))!==prepared.beforeSha256)fail('SQL beforeimage text hash differs')
 writeFileSync(`${dir}/before-image.json`,prepared.beforeImageText)
 for(const[name,bytes]of originals)writeFileSync(`${dir}/${name}`,bytes)
 Object.assign(manifest,{beforeSha256:prepared.beforeSha256,sourceArtifact:MFA_ORIGINAL})
}else if(mode==='cleanup'){
 const expected={runId:env.PREPARE_RUN_ID,artifactId:env.PREPARE_ARTIFACT_ID,digest:env.PREPARE_ARTIFACT_DIGEST,commit,workflow:'.github/workflows/mfa-challenge-reviewed-history.yml',name:`mfa-challenge-reviewed-prepare-${env.PREPARE_RUN_ID}-1`}
 const files=artifact(expected),before=verifyMfaPreparedFiles(files,{commit,runId:expected.runId,beforeSha256:env.BEFORE_SHA256,policySha256:policySha})
 manifest.prepareArtifact=expected;manifest.result=await rpc('apply_mfa_challenge_reviewed_cleanup',{p_main_sha:commit,p_policy_sha:policySha,p_before_sha:env.BEFORE_SHA256,p_before_image_text:before})
}else if(mode==='reprice'){
 // Existing DB-only pricing sequence, same flags and order as uvoz-lige.
 for(const script of ['lazni-vratarji','ugani-pozicije','ovrednoti-igralce'])execFileSync(process.execPath,[`scripts/${script}.mjs`,'--tekmovanje','mt-challenge','--pisi'],{stdio:'inherit',env})
 manifest.result=await rpc('record_mfa_challenge_reviewed_prices',{p_main_sha:commit})
}else if(mode==='preview'||mode==='activate'){
 if(mode==='activate'&&!/^[a-f0-9]{64}$/.test(env.PREVIEW_SHA256??''))fail('externally reviewed preview SHA required')
 if(mode==='preview')manifest.normalRegistrationSmoke=runMfaRegistrationSmoke(endpoint,env)
 manifest.result=await rpc('check_mfa_challenge_reviewed_release',{p_main_sha:commit,p_expected_preview_sha:mode==='activate'?env.PREVIEW_SHA256:null,p_activate:mode==='activate'})
}else manifest.result=await rpc('get_mfa_challenge_reviewed_receipt')
writeFileSync(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({mode,mainCommit:commit,beforeSha256:manifest.beforeSha256??manifest.result?.beforeSha256,previewSha256:manifest.result?.previewSha256,active:manifest.result?.active??false}))
