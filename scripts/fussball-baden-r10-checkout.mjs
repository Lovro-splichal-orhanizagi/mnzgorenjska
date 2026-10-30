// DATA only: the exact primary BUILD checkout, not API's mutable PR head/ref.
import {createHash} from 'node:crypto'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix='repos/'+repo+'/',hex=v=>/^[a-f0-9]{40}$/.test(v??'')
const need=(v,c)=>{if(!v)throw Object.assign(Error('BADEN_CHECKOUT_'+c),{code:'BADEN_CHECKOUT_'+c,dataHold:true})}
export async function readBadenR10CiCheckout({github,run,jobs}){
 need(typeof github==='function'&&run?.event==='pull_request'&&run.run_attempt===1&&run.repository?.full_name===repo&&run.head_repository?.full_name===repo&&hex(run.head_sha)&&Number.isSafeInteger(run.id)&&Array.isArray(run.pull_requests)&&run.pull_requests.length<=1&&run.pull_requests.every(p=>Number.isSafeInteger(p.number)),'RUN')
 need(Number.isSafeInteger(jobs?.total_count)&&jobs.total_count===jobs.jobs?.length,'JOBS')
 const scout=run.path==='.github/workflows/scout-in-funkcije.yml';need(scout||run.path==='.github/workflows/ci.yml','WORKFLOW')
 const candidates=jobs.jobs.filter(j=>j.name===(scout?'Kaj se je spremenilo':'Tipi, build, izris'));need(candidates.length===1,'BUILD_JOB')
 const j=candidates[0],steps=j.steps
 need(j.run_id===run.id&&j.run_attempt===1&&j.head_sha===run.head_sha&&j.status==='completed'&&Array.isArray(steps),'JOB_BINDING')
 const checkouts=steps.filter(s=>s.name==='Run actions/checkout@v4');need(checkouts.length===1,'PRIMARY_STEP')
 const step=checkouts[0],next=steps[steps.indexOf(step)+1]
 need(step.status==='completed'&&step.conclusion==='success'&&next?.name===(scout?'Run if [ -z "$BAZA" ]; then':'Run actions/setup-node@v4')&&Number.isFinite(Date.parse(step.started_at))&&Number.isFinite(Date.parse(step.completed_at)),'STEP_BINDING')
 const bytes=await github(prefix+`actions/jobs/${j.id}/logs`,true)
 need(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=10*1024*1024,'LOG_BOUND')
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{need(false,'LOG_UTF8')}
 const lines=text.split(/\r?\n/),start=lines.map((l,i)=>l.endsWith(' ##[group]Run actions/checkout@v4')?i:-1).filter(i=>i>=0),ends=lines.map((l,i)=>l.endsWith(' ##[group]'+next.name)?i:-1).filter(i=>i>=0)
 need(start.length===1&&ends.length===1&&ends[0]>start[0],'AMBIGUOUS_PRIMARY_CHECKOUT')
 const segment=lines.slice(start[0],ends[0]),parsed=segment.map(l=>{const m=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) (.*)$/.exec(l);need(m,'LOG_LINE');need(Date.parse(m[1])>=Date.parse(step.started_at)&&Date.parse(m[1])<Date.parse(step.completed_at)+1000,'STEP_TIME');return m[2]})
 need(parsed.includes('  repository: '+repo)&&parsed.includes('Syncing repository: '+repo)&&parsed.filter(l=>l.startsWith('[command]/usr/bin/git remote add origin ')).length===1&&parsed.includes('[command]/usr/bin/git remote add origin https://github.com/'+repo),'OWN_ORIGIN')
 const results=parsed.map((l,i)=>l==='[command]/usr/bin/git log -1 --format=%H'?parsed[i+1]:null).filter(Boolean);need(results.length===1&&hex(results[0]),'LOG_COMMIT')
 const checkoutCommands=parsed.filter(l=>l.startsWith('[command]/usr/bin/git checkout ')),match=checkoutCommands.length===1&&/^\[command\]\/usr\/bin\/git checkout --progress --force refs\/remotes\/pull\/(\d+)\/merge$/.exec(checkoutCommands[0]);need(match,'CHECKED_REF')
 const pr=Number(match[1]);need(Number.isSafeInteger(pr)&&pr>0&&run.pull_requests.every(p=>p.number===pr),'PR_NUMBER')
 const checkoutHead=results[0],ref='refs/remotes/pull/'+pr+'/merge'
 need(parsed.filter(l=>l.startsWith('[command]/usr/bin/git checkout ')).length===1&&parsed.includes('[command]/usr/bin/git checkout --progress --force '+ref)&&parsed.some(l=>l.startsWith('[command]/usr/bin/git ')&&l.includes(' fetch ')&&l.includes('+'+checkoutHead+':'+ref)),'CHECKED_REF')
 need(Array.isArray(run.referenced_workflows)&&run.referenced_workflows.every(r=>r.sha===checkoutHead&&r.ref==='refs/pull/'+pr+'/merge'&&['preveri-nova-vira.yml','diagnostika-javnih-virov.yml'].some(w=>r.path===repo+'/.github/workflows/'+w+'@'+checkoutHead))&&new Set(run.referenced_workflows.map(r=>r.path)).size===run.referenced_workflows.length,'REUSABLE_BINDING')
 const commit=await github(prefix+'git/commits/'+checkoutHead)
 need(commit?.sha===checkoutHead&&hex(commit.tree?.sha)&&Array.isArray(commit.parents)&&commit.parents.length===2&&commit.parents.every(p=>hex(p.sha))&&commit.parents[0].sha!==commit.parents[1].sha&&commit.parents[1].sha===run.head_sha,'IMMUTABLE_MERGE_PARENTS')
 return {checkoutHead,parents:commit.parents.map(p=>p.sha),tree:commit.tree.sha,buildJobId:j.id,checkoutStep:step.number,logSha256:createHash('sha256').update(bytes).digest('hex'),sourceOperationAuthorized:false}
}
