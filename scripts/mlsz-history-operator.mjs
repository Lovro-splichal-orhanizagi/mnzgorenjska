// Main-only operator: no provider requests and no retries after a possible write.
import{createHash}from'node:crypto'
import{execFileSync}from'node:child_process'
import{mkdirSync,writeFileSync}from'node:fs'
import{pathToFileURL}from'node:url'
import{getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,validateInstalledHistoricalStatisticsMarkers}from'./lib/historical-statistics-policy.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/mlsz-reviewed-history.yml',root='release/mlsz-history'
const targets=[{id:463,slug:'hu-to-3-nyugat',source:'mlsz',source_league_code:'67/17/34465'},{id:619,slug:'hu-baz-u19-2-kozep',source:'mlsz',source_league_code:'67/4/34094'}]
const digest=x=>createHash('sha256').update(x).digest('hex'),require=(ok,message)=>{if(!ok)throw Error(`MLSZ_OPERATOR: ${message}`)}
function verifyLineage(run,artifact,main){
 require(run.status==='completed'&&run.conclusion==='success'&&run.run_attempt===1&&run.head_sha===main&&run.head_branch==='main'&&run.event==='workflow_dispatch'&&run.path===workflow&&run.repository?.full_name===repo,'run lineage differs')
 require(artifact.name===`mlsz-history-${run.id}`&&!artifact.expired&&artifact.workflow_run?.id===run.id&&artifact.workflow_run?.head_sha===main&&Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<64*1024*1024&&/^sha256:[a-f0-9]{64}$/.test(artifact.digest??''),'artifact lineage differs')
}
export function verifyMlszReceipt({run,artifact,bytes,kind,main,approved}){
 require(['prepare','preview'].includes(kind)&&/^[a-f0-9]{40}$/.test(main)&&/^[a-f0-9]{64}$/.test(approved),'invalid pinned receipt inputs')
 verifyLineage(run,artifact,main)
 require(artifact.name===`mlsz-history-${run.id}`&&!artifact.expired&&artifact.workflow_run?.id===run.id&&artifact.workflow_run?.head_sha===main&&artifact.size_in_bytes===bytes.length&&bytes.length<64*1024*1024&&artifact.digest==='sha256:'+digest(bytes),'artifact lineage or bytes differ')
 const file=execFileSync('python3',['-c',`import sys,zipfile,io,stat
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); names=z.namelist()
assert len(names)==len(set(names)) and set(names)<=set(['prepare.json','cleanup.json','price.json','preview.json','activate.json','readback.json'])
assert '${kind}.json' in names
for i in z.infolist():
 assert i.file_size<64*1024*1024 and stat.S_IFMT(i.external_attr>>16) in (0,stat.S_IFREG) and not i.flag_bits&1
sys.stdout.buffer.write(z.read('${kind}.json'))`],{input:bytes,maxBuffer:64*1024*1024})
 require(digest(file)===approved,'approved receipt file SHA differs')
 const value=JSON.parse(file);require(value.schemaVersion===1&&value.mode===kind&&value.mainCommit===main,'receipt scope differs');return value
}
const gh=path=>execFileSync('gh',['api',`repos/${repo}/${path}`],{env:{...process.env,GODEBUG:'http2client=0'},maxBuffer:64*1024*1024})
async function main(){
 const{MODE:mode,EXPECTED_SHA:sha,SOURCE_RUN_ID:sourceRun,APPROVED_SHA256:approved,GITHUB_SHA:head,GITHUB_REF:ref,SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key}=process.env
 require(['prepare','cleanup','price','preview','activate'].includes(mode)&&/^[a-f0-9]{40}$/.test(sha??'')&&sha===head&&ref==='refs/heads/main','exact reviewed main run required')
 require(JSON.parse(gh('commits/main')).sha===sha,'main changed')
 const slugs=(process.env.LIGE??targets.map(c=>c.slug).join(',')).split(',');require(slugs.length>0&&new Set(slugs).size===slugs.length&&slugs.every(s=>targets.some(c=>c.slug===s)),'exact selection required')
 const selected=targets.filter(c=>slugs.includes(c.slug));if(['prepare','cleanup'].includes(mode))require(selected.length===2,'cleanup scope is the exact pair')
 const policyHashes=Object.fromEntries(targets.map(c=>{const p=getHistoricalStatisticsPolicy(c.slug);return[p.id,historicalStatisticsPolicySha256(p)]}))
 require(url&&key,'database credentials required');mkdirSync(root,{recursive:true})
 const save=(kind,data)=>{const body=JSON.stringify({schemaVersion:1,mode:kind,mainCommit:sha,selection:selected,policyHashes,checkedAt:new Date().toISOString(),data},null,2)+'\n';writeFileSync(`${root}/${kind}.json`,body);console.log(`${kind} receipt SHA256: ${digest(body)}`)}
 const call=async(path,body)=>{const r=await fetch(new URL(`/rest/v1/${path}`,url),{method:body?'POST':'GET',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`Database operation failed: HTTP ${r.status}; inspect retained state, do not retry writes`);return r.json()}
 const rpc=(name,body)=>call('rpc/'+name,body)
 const competition=async c=>{const rows=await call(`competitions?select=id,slug,source,source_league_code,source_policy,active,prvi_fantasy_krog&id=eq.${c.id}`);require(rows.length===1&&Object.entries(c).every(([k,v])=>rows[0][k]===v),'native competition tuple changed');return rows[0]}
 const readback=async()=>{const data=[];for(const c of selected)data.push(await competition(c));writeFileSync(`${root}/readback.json`,JSON.stringify(data,null,2)+'\n');return data}
 const receipt=kind=>{require(/^[1-9]\d{0,19}$/.test(sourceRun??''),'source run required');const run=JSON.parse(gh('actions/runs/'+sourceRun));const artifacts=JSON.parse(gh(`actions/runs/${sourceRun}/artifacts`)).artifacts.filter(a=>a.name===`mlsz-history-${sourceRun}`);require(artifacts.length===1,'one exact artifact required');verifyLineage(run,artifacts[0],sha);const value=verifyMlszReceipt({run,artifact:artifacts[0],bytes:gh(`actions/artifacts/${artifacts[0].id}/zip`),kind,main:sha,approved});require(JSON.stringify(value.selection)===JSON.stringify(selected)&&JSON.stringify(value.policyHashes)===JSON.stringify(policyHashes),'receipt selection/policies changed');return value.data}
 try{
  if(mode==='prepare')save(mode,await rpc('prepare_mlsz_historical_cleanup',{p_main_sha:sha,p_policy_hashes:policyHashes}))
  if(mode==='cleanup'){const p=receipt('prepare');require(/^[a-f0-9]{64}$/.test(p.beforeSha256??'')&&typeof p.beforeImageText==='string','complete beforeimage missing');save(mode,await rpc('apply_mlsz_historical_cleanup',{p_main_sha:sha,p_policy_hashes:policyHashes,p_before_sha:p.beforeSha256,p_before_image_text:p.beforeImageText}))}
  if(mode==='price'){
   for(const c of selected){const row=await competition(c);require(!row.active,'active league cannot be repriced');validateInstalledHistoricalStatisticsMarkers({competition:row,binding:await rpc('get_installed_historical_statistics_markers',{p_competition_id:c.id})})}
   for(const c of selected){for(const script of['ugani-pozicije.mjs','ovrednoti-igralce.mjs'])execFileSync(process.execPath,[`scripts/${script}`,'--tekmovanje',c.slug,'--pisi'],{stdio:'inherit',env:process.env})}save(mode,{priced:selected.map(c=>c.slug)})
  }
  if(mode==='preview'||mode==='activate'){
   if(mode==='activate'){const rows=receipt('preview');require(Array.isArray(rows)&&rows.length===selected.length&&rows.every((r,i)=>r.id===selected[i].id&&r.result.ready===true&&r.result.active===false),'all selected preview gates must pass')}
   const results=[];for(const c of selected){let result;try{result=await rpc('release_mlsz_reviewed_history',{p_competition_id:c.id,p_main_sha:sha,p_activate:mode==='activate'});results.push({id:c.id,slug:c.slug,result});save(mode,results);require(result.ready===true,'native release is not ready');if(mode==='activate'){const row=await competition(c);require(result.active===true&&row.active&&row.prvi_fantasy_krog===result.firstRound,'activation readback differs')}}finally{await readback()}}
  }
 }finally{await readback()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
