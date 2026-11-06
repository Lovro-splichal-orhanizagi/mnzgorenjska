// Source-only hosted CLI. The token has contents:read/actions:read and is used
// exclusively for GitHub GETs. No dispatch, football transport or fallback.
import {fileURLToPath} from 'node:url'
import {produceFussballAuditReplay} from './fussball-audit-replay.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/replay-fussball-audit.yml'
const need=(v,m)=>{if(!v)throw Error('retained source stage: '+m)}
export function githubGetAdapter(token){
 need(typeof token==='string'&&token.length>0,'read-only GitHub token required')
 return async(path,binary=false)=>{
  need(typeof path==='string'&&path.startsWith(`repos/${repo}/`)&&!path.includes('..')&&!path.includes('#')&&!path.includes('://')&&/^[A-Za-z0-9_/.?=&-]+$/.test(path),'repository GET path differs')
  const response=await fetch('https://api.github.com/'+path,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:binary?'application/vnd.github+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}})
  need(response.ok,'authoritative GitHub GET failed '+response.status)
  const limit=binary?1024*1024*1024:16*1024*1024,length=response.headers.get('content-length');need(length===null||Number(length)<=limit,'GET content length exceeded bound')
  const parts=[];let total=0
  for await(const chunk of response.body){total+=chunk.length;if(total>limit){throw Error('retained source stage: GET stream exceeded bound')}parts.push(Buffer.from(chunk))}
  const bytes=Buffer.concat(parts,total);return binary?bytes:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
 }
}
export async function stageFussballRetainedAudit({command,directory,env}){
 need(['validate','produce'].includes(command),'validate or produce command required')
 need(env.GITHUB_REPOSITORY===repo&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.EXPECTED_SHA===env.GITHUB_SHA&&env.SOURCE_RUN_ID==='40641606028'&&/^\d+$/.test(env.GITHUB_RUN_ID??''),'exact manual main first-attempt runtime pins required')
 const github=githubGetAdapter(env.GH_TOKEN),prefix=`repos/${repo}/`,run=await github(prefix+`actions/runs/${env.GITHUB_RUN_ID}`),main=await github(prefix+'branches/main')
 need(run.id===Number(env.GITHUB_RUN_ID)&&run.run_attempt===1&&run.head_sha===env.GITHUB_SHA&&run.head_branch==='main'&&run.path===workflow&&run.event==='workflow_dispatch'&&run.status==='in_progress'&&run.conclusion===null&&run.repository?.full_name===repo&&run.head_repository?.full_name===repo&&main.name==='main'&&main.commit?.sha===env.GITHUB_SHA,'authoritative replay run/main binding differs')
 if(command==='validate')return {validated:true,sourceAuthenticationOnly:true,nativeEligible:false,activationEligible:false}
 return produceFussballAuditReplay({sourceRunId:env.SOURCE_RUN_ID,replayRunId:env.GITHUB_RUN_ID,replayHead:env.GITHUB_SHA,github,directory})
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 stageFussballRetainedAudit({command:process.argv[2],directory:process.argv[3],env:process.env}).then(v=>console.log(JSON.stringify({sourceAuthenticationOnly:true,nativeEligible:false,activationEligible:false,replayRunId:v.replayRunId??process.env.GITHUB_RUN_ID}))).catch(e=>{console.error(e.message);process.exitCode=1})
}
