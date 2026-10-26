// Real bounded import/pricing. Activation additionally needs an installed reviewed provider contract.
import {createHash} from 'node:crypto'
import {spawn,execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,openSync,fsyncSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {MLSZ_BATCH_MAPPINGS,createMlszContract} from './mlsz-provider-proof.mjs'
import {EPS_BATCH_MAPPINGS,createEpsContract} from './eps-provider-proof.mjs'
import {readSourceBudget} from './provider-source-budget.mjs'
import {createTransport,runBatch} from './vklopi-obstojece-lige.mjs'
const REPOSITORY='Lovro-splichal-orhanizagi/mnzgorenjska'
const TUPLE=['id','slug','source','source_league_code']
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fail=message=>{throw Object.assign(Error(message),{dataHold:true})}
// Only exact mappings reviewed in docs/viri/madzarska.md; registry presence is not permission.
const MAPPINGS=[...MLSZ_BATCH_MAPPINGS,...EPS_BATCH_MAPPINGS]
function validProviderSelection(selected) {
 const source=selected?.[0]?.source
 return Array.isArray(selected)&&selected.length>0&&new Set(selected.map(c=>c.slug)).size===selected.length&&
  selected.every(c=>c.source===source)&&
  (source==='eps'?selected.length<=32&&selected.every(c=>EPS_BATCH_MAPPINGS.some(m=>digest(m)===digest(c))):
   source==='mlsz'&&selected.length<=5&&new Set(selected.map(c=>c.host)).size===1)
}
export function selectProviderCandidates(registry,slugs) {
 if(!Array.isArray(slugs)||slugs.length<1||slugs.length>32||new Set(slugs).size!==slugs.length)fail('Select distinct explicit reviewed league slugs within the provider bound.')
 const selected=slugs.map(slug=>{
  const mapping=MAPPINGS.find(c=>c.slug===slug),candidate=registry?.candidates?.find(c=>c.slug===slug)
  // EPS has its own proof-only catalog; adding its tuples to the generic
  // activation registry would create a route that skips this source proof.
  if(!mapping||mapping.source==='mlsz'&&!candidate||candidate&&TUPLE.some(k=>mapping[k]!==candidate[k])||mapping.source==='eps'&&!registry?.source_contracts?.eps)fail(`Outside reviewed provider mapping or changed tuple: ${slug}`)
  return structuredClone(mapping)
 })
 if(!validProviderSelection(selected))fail('A batch must share one provider; MLSZ remains limited to five on one host.')
 const archives=selected.flatMap(c=>c.archives.map(a=>a.code))
 if(new Set(archives).size!==archives.length)fail('Archive ownership collision in selected mappings.')
 return selected
}
export function parseArguments(args) {
 const options={output:'release/provider-batch',maxRequests:500},names={'--max-requests':'maxRequests','--lige':'slugs','--expected-sha':'expectedSha','--output':'output'},seen=new Set()
 for(let i=0;i<args.length;i+=2){const name=names[args[i]],value=args[i+1];if(!name||seen.has(name)||!value||value.startsWith('--'))fail('Invalid or duplicate batch argument.');seen.add(name);options[name]=value}
 if(!/^[a-f0-9]{40}$/.test(options.expectedSha??''))fail('Exact 40-character expected main SHA required.')
 options.maxRequests=Number(options.maxRequests);if(!Number.isSafeInteger(options.maxRequests)||options.maxRequests<1||options.maxRequests>1000)fail('Source request limit must be 1–1000.')
 options.slugs=(options.slugs??'').split(',');if(options.slugs.some(s=>! /^[a-z0-9-]+$/.test(s)))fail('Explicit comma-separated slugs required.')
 return options
}
export function assertBatchExecution({expectedSha,headSha,mainSha,env=process.env,envFileExists=false}) {
 if(!/^[a-f0-9]{40}$/.test(expectedSha??'')||headSha!==expectedSha||mainSha!==expectedSha||env.GITHUB_ACTIONS!=='true'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_SHA!==expectedSha||env.GITHUB_REPOSITORY!==REPOSITORY||! /^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')||env.GITHUB_RUN_ATTEMPT!=='1')fail('Batch requires first Actions attempt on exact reviewed current main; no automatic write replay.')
 if(envFileExists||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)fail('Actions database keys required and repository .env must be absent.')
}
function requireCandidate(candidate,competition) {
 if(TUPLE.some(k=>competition?.[k]!==candidate[k]))fail('Candidate tuple changed.')
 if(competition.active!==false)fail('Candidate must remain inactive.')
 if(competition.source_policy!==null||competition.date_only_deadline_policy!==null)fail('Custom or unknown source/deadline policy requires its reviewed route.')
 if(candidate.source==='eps'&&competition.country_code!=='GR')fail('EPS requires the actual Greek country.')
}
function requireNoFantasy(snapshot) {
 if(!Array.isArray(snapshot.fantasy?.teams)||!Array.isArray(snapshot.fantasy?.lineups))fail('Incomplete fantasy-data check.')
 if(snapshot.fantasy.teams.length||snapshot.fantasy.lineups.length)fail('Existing fantasy teams or lineups prevent batch mutation.')
}
export function auditStoredData(candidate,snapshot,now=new Date()) {
 requireCandidate(candidate,snapshot.competition);requireNoFantasy(snapshot)
 const {players,rounds,matches,season}=snapshot
 if(!Array.isArray(players)||!Array.isArray(rounds)||!Array.isArray(matches)||!season)fail('Incomplete stored snapshot.')
 const byPlayer=new Map(players.map(p=>[p.id,p])),byRound=new Map(rounds.map(r=>[r.id,r]))
 if(byPlayer.size!==players.length||byRound.size!==rounds.length||new Set(matches.map(m=>m.id)).size!==matches.length)fail('Duplicate stored identity.')
 const requiredSeasons=new Set([season,...candidate.archives.map(a=>a.season)]),seenSeasons=new Set(),clubs=new Set()
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Ljubljana',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
 let reports=0
 for(const m of matches) {
  const round=byRound.get(m.round_id);if(!round||!requiredSeasons.has(round.season))fail('Unexpected or unbound stored archive/round.')
  if(round.season===season){clubs.add(m.home_team_id);clubs.add(m.away_team_id)}
  if(m.statistics_status==='unavailable_historical')fail('Historical exclusions require their own reviewed route.')
  if(!m.imported_at){if(!m.kontumacija&&m.vir_brez_izida!==true&&(m.played_on??round.played_on??'9999')<today)fail('Past fixture missing report.');continue}
  if(m.kontumacija)continue
  seenSeasons.add(round.season);reports++
  if(!Number.isSafeInteger(m.home_team_id)||!Number.isSafeInteger(m.away_team_id)||m.home_team_id===m.away_team_id)fail('Invalid playing teams.')
  if(!Array.isArray(m.appearance_rows)||!Array.isArray(m.goal_rows))fail('Incomplete individual report rows.')
  const sides=new Map([m.home_team_id,m.away_team_id].map(id=>[id,{starters:0,keepers:0,minutes:0,redLoss:0,goals:0}]))
  const appearances=new Map()
  for(const a of m.appearance_rows) {
   const side=sides.get(a.team_id),p=byPlayer.get(a.player_id)
   if(!side||!p||!Number.isSafeInteger(p.reg_st)||p.reg_st<=0||appearances.has(a.player_id))fail('Missing source profile identity or invalid team-linked appearance.')
   appearances.set(a.player_id,a)
   if(typeof a.started!=='boolean'||typeof a.is_goalkeeper!=='boolean'||![a.minute_on,a.minute_off,a.minutes_played,a.red_cards].every(Number.isSafeInteger)||a.minute_on<0||a.minute_off>90||a.minute_off<a.minute_on||a.minutes_played!==a.minute_off-a.minute_on||(a.started&&a.minute_on!==0)||a.red_cards<0||a.red_cards>1)fail('Invalid timed appearance interval or role.')
   if(!Number.isSafeInteger(a.penalties_missed)||a.penalties_missed<0)fail('Incomplete or invalid penalties_missed count.')
   if(a.red_cards&&a.red_card_minute!=null&&a.red_card_minute!==a.minute_off)fail('Red card interval does not reconcile.')
   if(a.started)side.starters++
   if(a.started&&a.is_goalkeeper)side.keepers++
   side.minutes+=a.minutes_played
   if(a.red_cards&&(a.started||a.minutes_played>0))side.redLoss+=90-a.minute_off
  }
  for(const side of sides.values())if(side.starters<7||side.starters>11||side.keepers!==1||side.minutes!==90*side.starters-side.redLoss)fail('Starter/keeper counts or team minutes do not reconcile.')
  for(const [teamId,side] of sides) {
   const teamRows=m.appearance_rows.filter(a=>a.team_id===teamId)
   const bounds=[...new Set([0,90,...teamRows.flatMap(a=>[a.minute_on,a.minute_off])])].sort((a,b)=>a-b)
   for(let i=1;i<bounds.length;i++) {
    const time=(bounds[i-1]+bounds[i])/2
    const onPitch=teamRows.filter(a=>a.minute_on<=time&&a.minute_off>time).length
    const sentOff=teamRows.filter(a=>a.red_cards&&(a.started||a.minutes_played>0)&&a.minute_off<=time).length
    if(onPitch!==side.starters-sentOff)fail('Timed substitution/red-card intervals do not reconcile.')
   }
  }
  for(const g of m.goal_rows) {
   const a=appearances.get(g.scorer_id)
   if(!a||!sides.has(g.team_id)||a.team_id!==g.team_id||!Number.isSafeInteger(g.minute)||g.minute<0||g.minute>90||g.minute<a.minute_on||g.minute>a.minute_off||typeof g.is_own_goal!=='boolean')fail('Invalid team-linked scorer identity or event interval.')
   const beneficiary=g.is_own_goal?(g.team_id===m.home_team_id?m.away_team_id:m.home_team_id):g.team_id
   sides.get(beneficiary).goals++
  }
  if(sides.get(m.home_team_id).goals!==m.home_goals||sides.get(m.away_team_id).goals!==m.away_goals)fail('Team score/goals mismatch including own goals.')
 }
 if([...requiredSeasons].some(s=>!seenSeasons.has(s)))fail('Missing complete reports in a required current/archive season.')
 for(const club of clubs)if(!players.some(p=>p.team_id===club&&p.active===true&&p.position==='GK'&&p.position_source&&p.position_source!=='ugibanje'&&Number.isSafeInteger(p.reg_st)&&p.reg_st>0))fail('Current club lacks active report-linked goalkeeper coverage.')
 if(candidate.source==='eps'&&(snapshot.competition.country_code!=='GR'||season!=='2026/27'))fail('EPS requires the actual Greek country and current reviewed season.')
 return {reports,snapshot_sha256:digest(snapshot),keeper_basis:candidate.source==='mlsz'?'mlsz-published-order-inference':candidate.source==='eps'?'eps-published-order-inference':'STORED_ROLE_ONLY',source_completeness:'NOT_ESTABLISHED'}
}
export function assertProviderProof({candidate,expectedSha,audit,snapshot,proof,contract,now=new Date()}) {
 if(!contract||contract.source!==candidate.source||contract.host!==candidate.host||typeof contract.verify!=='function')fail('No installed reviewed strict provider contract; source proof required.')
 if(!proof||proof.contract_id!==contract.id||proof.expected_sha!==expectedSha||digest(proof.candidate)!==digest(candidate)||proof.snapshot_sha256!==audit.snapshot_sha256||proof.schedule_complete!==true||digest(proof.archives)!==digest(candidate.archives)||!Array.isArray(proof.archive_collisions)||proof.archive_collisions.length||! /^[a-f0-9]{64}$/.test(proof.original_bytes_sha256??'')||!proof.keeper_basis)fail('Strict provider proof binding/completeness failed.')
 const age=now.getTime()-Date.parse(proof.captured_at)
 if(!Number.isFinite(age)||age<0||age>15*60_000)fail('Strict provider proof is stale or lacks original capture time.')
 if(contract.verify({candidate,expectedSha,audit,snapshot,proof,now})!==true)fail('Strict provider proof verifier rejected evidence.')
 return proof
}
export function atomicCheckpoint(path,report) {
 mkdirSync(dirname(path),{recursive:true});const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(report,null,2)+'\n',{mode:0o600});const fd=openSync(tmp,'r');try{fsyncSync(fd)}finally{closeSync(fd)}renameSync(tmp,path)
}
export function markInterrupted(path) {
 if(!existsSync(path))return
 const report=JSON.parse(readFileSync(path,'utf8'))
 if(report.status!=='RUNNING')return
 report.status='STOPPED';report.host_stop='Interrupted batch; inspect receipts before a distinct reviewed run.'
 for(const result of report.results??[])if(result.status==='RUNNING') {
  const running=result.steps?.find(s=>s.status==='RUNNING')
  result.status=running?'UNKNOWN':'HOLD';result.reason=report.host_stop
  if(running)running.status='UNKNOWN'
 }
 atomicCheckpoint(path,report)
}
const SOURCE_FAILURE=/HTTP\s*(?:401|403|429|5\d\d)|CAPTCHA|Too many connections|SQLSTATE|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|vir.{0,20}(?:zavrnil|nedosegljiv)|stran.{0,25}(?:ni|ne).{0,20}(?:dosegljiv|zapisnik)/i
export function runImportCommand(file,args,{logPath,budgetPath,maxRequests,source='mlsz',hosts=[]}={}) {
 return new Promise((resolve,reject)=>{
  if(!budgetPath||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>1000)return reject(Error('Fixed source budget is required for every batch child.'))
  if(!['mlsz','eps'].includes(source))return reject(Error('Unreviewed child provider.'))
  const hook=fileURLToPath(new URL(source==='eps'?'./eps-source-budget.mjs':'./provider-source-budget.mjs',import.meta.url))
  const budgetEnv=source==='eps'?{SLFF_EPS_BUDGET_PATH:budgetPath,SLFF_EPS_MAX_REQUESTS:String(maxRequests),SLFF_EPS_HOSTS:JSON.stringify(hosts)}:{SLFF_PROVIDER_BUDGET_PATH:budgetPath,SLFF_PROVIDER_MAX_REQUESTS:String(maxRequests)}
  const env={...process.env};for(const key of ['SLFF_PROVIDER_BUDGET_PATH','SLFF_PROVIDER_MAX_REQUESTS','SLFF_EPS_BUDGET_PATH','SLFF_EPS_MAX_REQUESTS','SLFF_EPS_HOSTS'])delete env[key]
  const child=spawn(process.execPath,['--import',hook,file,...args],{env:{...env,...budgetEnv},stdio:['ignore','pipe','pipe'],timeout:45*60_000});let sourceFailure=false,archiveCollision=false,tail='',log
  if(logPath){mkdirSync(dirname(logPath),{recursive:true});log=openSync(logPath,'a',0o600)}
  const output=(chunk,stream)=>{stream.write(chunk);if(log!=null)writeFileSync(log,chunk);tail=(tail+chunk.toString()).slice(-8192);if(SOURCE_FAILURE.test(tail)||/(?:Provider|EPS) source stopped/i.test(tail))sourceFailure=true;if(/zapisnikov je že v drugi ligi|skupen arhiv/.test(tail))archiveCollision=true}
  child.stdout.on('data',c=>output(c,process.stdout));child.stderr.on('data',c=>output(c,process.stderr))
  child.once('error',error=>{if(log!=null){closeSync(log);log=null}reject(error)})
  child.once('close',(code,signal)=>{if(log!=null)closeSync(log);signal?reject(Error(`Write terminated (${signal}); inspect checkpoint and database before another run.`)):resolve({code,sourceFailure,archiveCollision})})
 })
}
export function createBatchTransport({url,key,fetch:request=globalThis.fetch}) {
 const base=new URL('/rest/v1/',url)
 if(base.protocol!=='https:'||!key)fail('HTTPS database origin and Actions key required.')
 async function rows(table,query) {
  const result=[],seen=new Set();let total=null
  for(let offset=0;offset<100000;offset+=500) {
   let response
   try{response=await request(new URL(`${table}?${new URLSearchParams({...query,limit:'500',offset:String(offset)})}`,base),{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact'},redirect:'error',signal:AbortSignal.timeout(60000)})}catch{throw Object.assign(Error('Database read failed.'),{infrastructure:true})}
   if(!response.ok)throw Object.assign(Error(`Database read failed (HTTP ${response.status}).`),{infrastructure:true})
   const page=await response.json()
   if(!Array.isArray(page)||page.length>500)throw Object.assign(Error('Invalid database pagination.'),{infrastructure:true})
   const range=/^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(response.headers?.get('content-range')??'')
   const count=Number(range?.[3])
   if(!range||!Number.isSafeInteger(count)||count>100000||(total!==null&&count!==total)||page.length&&Number(range[1])!==offset||page.length&&Number(range[2])!==offset+page.length-1)throw Object.assign(Error('Unproven database pagination count/range.'),{infrastructure:true})
   total=count
   for(const row of page){
    const identity=table==='fantasy_lineups'?[row.round_id,row.fantasy_team_id,row.player_id]:[row.id]
    const id=identity.join('|')
    if(!identity.every(Number.isSafeInteger)||seen.has(id))throw Object.assign(Error('Duplicate database pagination identity.'),{infrastructure:true})
    seen.add(id);result.push(row)
   }
   if(result.length===total)return result
   if(result.length>total||page.length<500)throw Object.assign(Error('Database pagination truncated.'),{infrastructure:true})
  }
  throw Object.assign(Error('Database pagination incomplete at bound.'),{infrastructure:true})
 }
 const native=createTransport({url,key,fetch:request})
 const boundCompetition=async c=>{
  const cs=await rows('competitions',{select:'*',id:`eq.${c.id}`,order:'id'})
  if(cs.length!==1)throw Error('Native competition missing or ambiguous.')
  const competition=cs[0]
  if(c.source==='eps'){
   if(!Number.isSafeInteger(competition.country_id)||competition.country_id<=0)throw Error('EPS country foreign key missing.')
   const countries=await rows('countries',{select:'id,code',id:`eq.${competition.country_id}`,order:'id'})
   if(countries.length!==1||countries[0].code!=='GR')throw Error('EPS actual country differs.')
   competition.country_code=countries[0].code
  }
  return competition
 }
 return {...native,competition:c=>c.source==='eps'?boundCompetition(c):native.competition(c),snapshot:async c=>{
  try {
   const competition=await boundCompetition(c),season=await native.season(c)
   const rounds=await rows('rounds',{select:'id,number,season,deadline_at,played_on,lineups_locked_at',competition_id:`eq.${c.id}`,order:'id'})
   const matches=await rows('matches',{select:'id,round_id,played_on,zapisnik_id,vir_brez_izida,home_goals,away_goals,home_team_id,away_team_id,imported_at,kontumacija,statistics_status,import_warnings,rounds!inner(competition_id)','rounds.competition_id':`eq.${c.id}`,order:'id'})
   const linked={select:'*,matches!inner(rounds!inner(competition_id))','matches.rounds.competition_id':`eq.${c.id}`,order:'id'}
   const appearances=await rows('appearances',linked),goals=await rows('goals',linked)
   const players=await rows('players',{select:'id,reg_st,team_id,active,position,position_source,value',competition_id:`eq.${c.id}`,order:'id'})
   const clubIds=[...new Set(matches.flatMap(m=>[m.home_team_id,m.away_team_id]))].sort((a,b)=>a-b)
   const clubs=clubIds.length?await rows('teams',{select:'id,name',id:`in.(${clubIds.join(',')})`,order:'id'}):[]
   const teams=await rows('fantasy_teams',{select:'id',competition_id:`eq.${c.id}`,order:'id'})
   const lineups=await rows('fantasy_lineups',{select:'round_id,fantasy_team_id,player_id,rounds!inner(competition_id)','rounds.competition_id':`eq.${c.id}`,order:'round_id,fantasy_team_id,player_id'})
   for(const match of matches){match.appearance_rows=appearances.filter(a=>a.match_id===match.id);match.goal_rows=goals.filter(g=>g.match_id===match.id)}
   return {competition,season,rounds,matches,players,teams:clubs,fantasy:{teams,lineups}}
  }catch(error){error.infrastructure=true;throw error}
 }}
}
export async function runProviderBatch({candidates,expectedSha,transport,guard,runCommand=runImportCommand,contracts,activationRunner=runBatch,onCheckpoint=()=>{},now=()=>new Date(),logDirectory,budgetPath,maxRequests=500}) {
 if(!validProviderSelection(candidates))fail('Invalid bounded provider selection.')
 if(typeof guard!=='function')fail('Exact main guard is required.')
 const hosts=[...new Set(candidates.map(c=>c.host))].sort(),outputDirectory=logDirectory?resolve(logDirectory,'../source-proof'):undefined
 contracts??={mlsz:createMlszContract({runCommand,budgetPath,maxRequests,outputDirectory}),...Object.fromEntries(hosts.filter(host=>candidates[0].source==='eps').map(host=>['eps|'+host,createEpsContract({host,runCommand:(file,args,opts)=>runCommand(file,args,{...opts,source:'eps',hosts}),budgetPath,maxRequests,outputDirectory})]))}
 const report={version:1,expected_sha:expectedSha,candidates,scope_sha256:digest({expectedSha,candidates}),status:'RUNNING',results:[],host_stop:null,host_stops:{}}
 const checkpoint=async()=>{try{await onCheckpoint(structuredClone(report))}catch(error){error.infrastructure=true;throw error}}
 await checkpoint()
 try {
  await guard()
  for(const candidate of candidates) {
   const result={slug:candidate.slug,status:'RUNNING',steps:[],pricing:'NOT_RUN'};report.results.push(result);await checkpoint()
   if(report.host_stop||report.host_stops[candidate.host]){result.status='SKIPPED_SOURCE_STOP';result.reason=report.host_stop??report.host_stops[candidate.host];await checkpoint();continue}
   let mutating=false
   const guarded=async()=>{try{await guard()}catch(error){error.infrastructure=true;throw error}}
   try {
    const initial=await transport.snapshot(candidate);requireCandidate(candidate,initial.competition);requireNoFantasy(initial)
    if(candidate.source==='eps'&&initial.season!=='2026/27')fail('EPS current native season changed.')
    // Missing-only catch-up cannot repair a completed contradictory report.
    // Filter that known blocker before spending source budget or writing rows.
    if(candidate.source==='eps'&&initial.matches.some(m=>m.imported_at&&!m.kontumacija&&Array.isArray(m.goal_rows)&&m.home_goals+m.away_goals!==m.goal_rows.length)){
     result.reason_code='EXISTING_REPORT_MISMATCH';fail('Completed imported report score/goals mismatch needs reviewed repair before missing-only catch-up.')
    }
    const stage=async(name,file,args)=>{
     await guarded();requireCandidate(candidate,await transport.competition(candidate));const latest=await transport.snapshot(candidate);requireCandidate(candidate,latest.competition);requireNoFantasy(latest)
     if(candidate.source==='eps'&&latest.season!=='2026/27')fail('EPS current native season changed.')
     const step={stage:name,status:'RUNNING',started_at:now().toISOString(),file,args};result.steps.push(step);await checkpoint()
     mutating=true
     let output
     try{output=await runCommand(file,args,{logPath:logDirectory?resolve(logDirectory,`${candidate.slug}-${name}.log`):undefined,budgetPath,maxRequests,source:candidate.source,hosts})}catch(error){step.status='UNKNOWN';throw error}
     mutating=false
     let establishedHostStop=false
     if(budgetPath&&(existsSync(budgetPath)||existsSync(budgetPath+'.stopped'))) {
      const budget=existsSync(budgetPath)?readSourceBudget(budgetPath):null;report.source_budget=budget
      if(candidate.source==='eps'){
       if(budget?.global?.stopped||existsSync(budgetPath+'.stopped'))throw Object.assign(Error('EPS global source budget or receipt stopped.'),{infrastructure:true})
       establishedHostStop=typeof budget?.hosts?.[candidate.host]?.stopped==='string'
       if(establishedHostStop||budget?.hosts?.[candidate.host]?.pending)output.sourceFailure=true
      }else if(budget?.stopped||budget?.pending||existsSync(budgetPath+'.stopped'))output.sourceFailure=true
     }
     step.exit_code=output.code;step.completed_at=now().toISOString()
     if(output.sourceFailure||output.code!==0){
      step.status=output.code===3?'HOLD':'FAILED'
      if(candidate.source==='eps'&&!establishedHostStop&&(output.code!==3||output.sourceFailure)){
       // Log text such as "fetch failed" can originate from a native DB write.
       // Only a durable source-host stop permits independent-host continuation.
       mutating=true;step.status='UNKNOWN';throw Error(`${name}: unclassified EPS write failure; reconciliation required.`)
      }
      if(output.code!==3||output.sourceFailure)throw Object.assign(Error(`${name}: source failure or unclassified exit ${output.code}; stop shared host.`),{sourceStop:true})
      fail(`${name}: league club-count guard refused.`)
     }
     if(output.archiveCollision){step.status='HOLD';fail('Observed archive ownership collision; no pricing or exception fallback.')}
     step.status='COMPLETED';await checkpoint()
    }
    if(candidate.source!=='eps')for(let i=0;i<candidate.archives.length;i++)await stage(`archive-${i+1}`,'scripts/uvoz-zapisnikov.mjs',['--tekmovanje',candidate.slug,'--liga',candidate.archives[i].code])
    await stage('schedule','scripts/uvoz-razporeda.mjs',['--tekmovanje',candidate.slug,'--pisi'])
    await stage('current','scripts/uvoz-zapisnikov.mjs',['--tekmovanje',candidate.slug,...(candidate.source==='eps'?['--samo-manjkajoce']:[])])
    result.pre_price_audit=auditStoredData(candidate,await transport.snapshot(candidate),now());await checkpoint()
    for(const [name,file]of [['keepers','lazni-vratarji'],['positions','ugani-pozicije'],['prices','ovrednoti-igralce']])await stage(name,`scripts/${file}.mjs`,['--tekmovanje',candidate.slug,'--pisi'])
    result.pricing='COMPLETED';result.post_price_audit=auditStoredData(candidate,await transport.snapshot(candidate),now());await checkpoint()
    const contract=contracts[candidate.source+'|'+candidate.host]??contracts[candidate.source]
    if(!contract){result.status='HOLD';result.reason_code='NEEDS_STRICT_PROVIDER_PROOF';result.reason='Import and pricing completed; no installed strict source-proof contract was selected. Aggregate READY does not establish source completeness.';await checkpoint();continue}
    if(candidate.source==='eps'){
     // A negative native preview can avoid a costly full-season source proof.
     // READY here is only provisional; source proof still precedes every write
     // activation below. No official future round remains an ordinary HOLD.
     await guarded()
     const [preview]=await activationRunner({candidates:[candidate],transport,apply:false,now})
     result.native_preflight=preview;await checkpoint()
     if(preview?.status!=='READY')fail(preview?.reason??'Native readiness preflight refused.')
    }
    await guarded()
    const snapshot=await transport.snapshot(candidate),audit=auditStoredData(candidate,snapshot,now())
    const receipts={expected_sha:expectedSha,slug:candidate.slug,snapshot_sha256:audit.snapshot_sha256,steps:result.steps.filter(s=>['keepers','positions','prices'].includes(s.stage))}
    const proofStep={stage:'source-proof',status:'RUNNING',started_at:now().toISOString()};result.steps.push(proofStep);await checkpoint()
    const proof=await contract.capture({candidate,expectedSha,snapshot,audit,receipts,now:now()})
    proofStep.status='COMPLETED';proofStep.completed_at=now().toISOString()
    assertProviderProof({candidate,expectedSha,audit,snapshot,proof,contract,now:now()});result.source_proof=proof;await checkpoint()
    // Fresh state must still match the independently verified proof immediately before native apply.
    await guarded();const finalSnapshot=await transport.snapshot(candidate),finalAudit=auditStoredData(candidate,finalSnapshot,now())
    assertProviderProof({candidate,expectedSha,audit:finalAudit,snapshot:finalSnapshot,proof,contract,now:now()})
    const step={stage:'activate',status:'RUNNING',started_at:now().toISOString()};result.steps.push(step);await checkpoint();mutating=true
    let activationStarted=false,activationReturned=false
    const native={...transport,activate:async c=>{activationStarted=true;const value=await transport.activate(c);activationReturned=true;return value}}
    const [activated]=await activationRunner({candidates:[candidate],transport:native,apply:true,now})
    result.activation=activated;result.readback=await transport.competition(candidate)
    if(activationStarted&&!activationReturned){step.status='UNKNOWN';throw Error('Activation response ambiguous; readback retained, no retry.')}
    mutating=false
    if(activated?.status!=='ACTIVE'||!result.readback.active){step.status='HOLD';fail(activated?.reason??'Native activation refused.')}
    step.status='COMPLETED';step.completed_at=now().toISOString();result.status='ACTIVE';await checkpoint()
   }catch(error){
    result.reason=error.message
    if(candidate.source==='eps'&&budgetPath){
     try{const budget=existsSync(budgetPath)?readSourceBudget(budgetPath):null;if(budget?.global?.stopped||existsSync(budgetPath+'.stopped'))error.infrastructure=true}catch{error.infrastructure=true}
    }
    if(mutating){result.status='UNKNOWN';report.host_stop='Ambiguous write; inspect retained checkpoint and readback before a new reviewed run.';try{result.readback=await transport.competition(candidate)}catch{result.readback_error='Readback unavailable.'}}
    else if(error.infrastructure){result.status='INFRASTRUCTURE_STOP';report.host_stop=error.message}
    else if(error.sourceStop){result.status='SOURCE_STOP';if(candidate.source==='eps')report.host_stops[candidate.host]=error.message;else report.host_stop=error.message}
    else if(error.dataHold)result.status='HOLD'
    else {result.status='INFRASTRUCTURE_STOP';report.host_stop=error.message}
    await checkpoint()
   }
  }
  report.status=report.host_stop?'STOPPED':report.results.every(r=>r.status==='ACTIVE')?'ACTIVE':'COMPLETED_WITH_HOLDS'
 }catch(error){report.status='STOPPED';report.reason=error.message}
 await checkpoint();return report
}
async function main() {
 const options=parseArguments(process.argv.slice(2)),output=resolve(options.output),path=resolve(output,'report.json')
 if(existsSync(path))fail('Existing batch checkpoint; review it before creating a distinct new run. Automatic replay is forbidden.')
 mkdirSync(output,{recursive:true})
 try {
  const guard=async()=>{
   const headSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
   const mainSha=execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{encoding:'utf8',timeout:30000}).split(/\s/)[0]
   assertBatchExecution({expectedSha:options.expectedSha,headSha,mainSha,envFileExists:existsSync(resolve('.env'))})
  }
  await guard()
  const registry=JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url),'utf8'))
  const candidates=selectProviderCandidates(registry,options.slugs)
  if(candidates[0].source==='eps'&&options.maxRequests<=6)fail('EPS allowance must include six prior qualifier requests and at least one new request.')
  const report=await runProviderBatch({candidates,expectedSha:options.expectedSha,transport:createBatchTransport({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY}),guard,budgetPath:resolve(output,'source-budget.json'),maxRequests:options.maxRequests,logDirectory:resolve(output,'logs'),onCheckpoint:r=>atomicCheckpoint(path,r)})
  for(const r of report.results)console.log(`${r.status}: ${r.slug}${r.reason?' — '+r.reason:''}`)
  if(report.status!=='ACTIVE')process.exitCode=1
 }catch(error){if(existsSync(path))markInterrupted(path);else atomicCheckpoint(path,{status:'STOPPED',reason:error.message,expected_sha:options.expectedSha});throw error}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`::error::${error.message}`);process.exitCode=1})
