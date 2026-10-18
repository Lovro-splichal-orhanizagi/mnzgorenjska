// Bounded existing-data activation. No source requests, imports, repricing or SQL.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { oceniPripravljenost, najcenejsiKader } from '../src/lib/pripravljenost.ts'

const registryPath = new URL('./policies/existing-league-candidates-20261018.json', import.meta.url)
export function validateSelection(registry, slugs) {
  if (!slugs.length || new Set(slugs).size !== slugs.length) throw Error('Provide a nonempty explicit list without duplicates.')
  return slugs.map(slug => {
    const candidate = registry.candidates.find(c => c.slug === slug)
    if (!candidate || !['ncefl','pzpn','wmzpn','eps','sportnet','dbu'].includes(candidate.source) || /^(de|es|hr)-/.test(slug)) throw Error(`Outside fixed existing-league scope: ${slug}`)
    return candidate
  }).sort((a,b) => a.slug.localeCompare(b.slug))
}
export const approvalDigest = (sha, candidates, sourceContracts = {}) => createHash('sha256').update(JSON.stringify({sha,candidates,sourceContracts})).digest('hex')

export function createTransport({url,key,fetch:request=globalThis.fetch}) {
  const base = new URL('/rest/v1/', url)
  async function call(path, body) {
    const response = await request(new URL(path,base), {method:body ? 'POST':'GET', headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)}:{}), redirect:'error',signal:AbortSignal.timeout(60_000)})
    if (!response.ok) throw Error(`Database request failed (HTTP ${response.status}).`)
    return response.json()
  }
  async function rows(table, query) {
    const result=[]
    for (let offset=0;;offset+=500) {
      const page=await call(`${table}?${new URLSearchParams({...query,limit:'500',offset:String(offset)})}`)
      if(!Array.isArray(page)) throw Error(`Invalid database rows: ${table}`)
      result.push(...page);if(page.length<500)return result
    }
  }
  return {
    competition:async c => {
      const data=await rows('competitions',{select:'id,slug,active,source,source_league_code,source_policy,date_only_deadline_policy,prvi_fantasy_krog',id:`eq.${c.id}`,order:'id'})
      if(data.length!==1)throw Error('Candidate competition missing or ambiguous.');return data[0]
    },
    state:c=>call('rpc/stanje_lige',{p_competition_id:c.id}),
    season:c=>call('rpc/sezona_lige',{p_competition_id:c.id}),
    rounds:c=>rows('rounds',{select:'id,number,season,deadline_at,played_on,lineups_locked_at',competition_id:`eq.${c.id}`,order:'id'}),
    matches:c=>rows('matches',{select:'id,round_id,played_on,zapisnik_id,vir_brez_izida,home_goals,away_goals,imported_at,kontumacija,statistics_status,goals(count),appearances(count),rounds!inner(competition_id)', 'rounds.competition_id':`eq.${c.id}`,order:'id'}),
    activate:c=>call('rpc/vklopi_ligo_sredi_sezone',{p_slug:c.slug}),
  }
}
const count = (match,key) => {
  const value=match[key]?.[0]?.count
  if (!Number.isSafeInteger(value) || value<0) throw Error(`Missing ${key} count for match ${match.id}`)
  return value
}
function inspect(candidate,competition,state,season,rounds,matches,now) {
  for(const key of ['id','slug','source','source_league_code'])if(competition[key]!==candidate[key])throw Error(`Candidate ${key} changed.`)
  if(competition.source_policy || competition.date_only_deadline_policy)throw Error('Custom or pending source/deadline policy requires its own reviewed route.')
  for(const key of ['aktivnih','privzetih','klubov','najvisja_cena','nastopov_s_klopi','golov_brez_nastopa','krogov_tekoce'])if(!Number.isFinite(Number(state?.[key]))||state[key]==null)throw Error(`Incomplete readiness state: ${key}`)
  const assessment=oceniPripravljenost({aktivnih:state.aktivnih,privzetih:state.privzetih,klubov:state.klubov,najvisjaCena:Number(state.najvisja_cena),poPozicijah:state.po_pozicijah,nastopovSKlopi:state.nastopov_s_klopi,golovBrezNastopa:state.golov_brez_nastopa,krogovTekoce:state.krogov_tekoce,igralci:state.igralci})
  if(!assessment.pripravljena)throw Error(assessment.tezave.map(t=>`${t.kljuc}: ${t.kaj}`).join('; '))
  if(!season || typeof season!=='string')throw Error('Missing current season.')
  const current=rounds.filter(r=>r.season===season)
  const currentIds=new Set(current.map(r=>r.id))
  const currentMatches=matches.filter(m=>currentIds.has(m.round_id))
  // Scores are NOT NULL DEFAULT 0: future 0:0 rows are fixtures, not published results.
  // A past fixture without a report needs review even when its result is still unknown.
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Ljubljana',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  const roundById=new Map(current.map(r=>[r.id,r]))
  const pastUnimported=currentMatches.filter(m=>!m.imported_at&&!m.kontumacija&&((m.played_on??roundById.get(m.round_id)?.played_on)??'9999')<today)
  if(pastUnimported.length)throw Error(`Past current fixtures without reports (publication unknown; review required): ${pastUnimported.map(m=>m.id).join(', ')}`)
  if(matches.some(m=>m.statistics_status==='unavailable_historical'))throw Error('Historical statistics policy requires its own reviewed route.')
  let difference=0
  for(const m of matches)if(m.imported_at&&!m.kontumacija) {
    if(!Number.isFinite(m.home_goals)||!Number.isFinite(m.away_goals))throw Error('Imported match missing score.')
    difference+=m.home_goals+m.away_goals-count(m,'goals')
  }
  if(difference!==0)throw Error(`Score/goals difference: ${difference}`)
  const played=new Set(currentMatches.filter(m=>count(m,'appearances')>0).map(m=>m.round_id))
  const future=current.filter(r=>Date.parse(r.deadline_at)>now.getTime()).sort((a,b)=>a.number-b.number)
  const gap=future.find(r=>!played.has(r.id))?.number
  const playedNumbers=current.filter(r=>played.has(r.id)).map(r=>r.number)
  const last=Math.max(0,...playedNumbers.filter(n=>gap==null||n<gap||playedNumbers.filter(x=>x>gap).length>2))
  const first=future.find(r=>r.number>last)
  if(!first || !first.played_on || first.played_on.slice(0,10)<today || first.lineups_locked_at || played.has(first.id) || !currentMatches.some(m=>m.round_id===first.id))throw Error('No unlocked future first round with fixtures and no appearances.')
  if(currentMatches.some(m=>m.round_id===first.id&&(m.imported_at||m.home_goals>0||m.away_goals>0)))throw Error('First future round already has a report/result.')
  return {season,state_summary:Object.fromEntries(Object.entries(state).filter(([key])=>key!=='igralci')),first_round:first,cheapest_squad:najcenejsiKader(state.igralci),score_goal_difference:difference,past_current_unimported:0,assessment}
}
export async function runBatch({candidates,transport,apply=false,now=()=>new Date(),onResult=()=>{}}) {
  const results=[]
  for(const candidate of candidates) {
    const result={slug:candidate.slug,checked_at:now().toISOString(),status:'HOLD'}
    try {
      const competition=await transport.competition(candidate)
      if(competition.active) {result.status='ALREADY_ACTIVE';result.readback=competition}
      else {
        const state=await transport.state(candidate)
        const season=await transport.season(candidate)
        const rounds=await transport.rounds(candidate)
        const matches=await transport.matches(candidate)
        Object.assign(result,inspect(candidate,competition,state,season,rounds,matches,now()))
        if(apply) {
          // The native service RPC and trigger recheck/lock database data in its transaction.
          // Never retry a write after an ambiguous network response; readback is recorded below.
          try {result.activation=await transport.activate(candidate)}
          finally {result.readback=await transport.competition(candidate)}
          if(!result.activation?.vklopljena)throw Error(result.activation?.razlog??'Native activation refused.')
          if(result.activation.razlika!==0)throw Error('Native activation observed score/goals difference; review persisted state.')
          if(!result.readback.active || result.readback.prvi_fantasy_krog!==result.first_round.number || result.activation.prvi_krog!==result.first_round.number)throw Error('Activation readback/start differs; review persisted state.')
          result.status='ACTIVE'
        } else result.status='READY'
      }
    } catch(error) {result.reason=error.message}
    results.push(result);await onResult(result)
  }
  return results
}
async function main() {
  const args=process.argv.slice(2);const mode=args.shift()
  if(!['preview','apply'].includes(mode))throw Error('Use preview|apply --lige <explicit,candidates> --expected-sha <40hex> [--approved-sha256 <digest>] [--output <directory>]')
  const options={}
  while(args.length) {const flag=args.shift();if(!['--lige','--expected-sha','--approved-sha256','--output'].includes(flag)||!args.length)throw Error(`Invalid option: ${flag}`);options[flag]=args.shift()}
  const registry=JSON.parse(readFileSync(registryPath,'utf8'))
  const candidates=validateSelection(registry,(options['--lige']??'').split(',').map(s=>s.trim()).filter(Boolean))
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
  if(!/^[a-f0-9]{40}$/.test(options['--expected-sha']??'')||options['--expected-sha']!==sha)throw Error('Exact checked-out --expected-sha is required.')
  const sourceContracts=Object.fromEntries([...new Set(candidates.map(c=>c.source))].sort().map(s=>[s,registry.source_contracts[s]]))
  const digest=approvalDigest(sha,candidates,sourceContracts)
  const output=resolve(options['--output']??'release/obstojece-lige');mkdirSync(output,{recursive:true})
  writeFileSync(resolve(output,'scope.json'),JSON.stringify({sha,approval_sha256:digest,candidates,source_contracts:sourceContracts},null,2)+'\n')
  console.log(`Scope approval SHA256: ${digest}`)
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_SHA!==sha)throw Error('Preview/apply require GitHub Actions on exact main commit.')
  if(mode==='apply') {
    if(options['--approved-sha256']!==digest)throw Error('Apply requires exact reviewed scope SHA256 from preview on this commit.')
  }
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)throw Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required; no local .env loading.')
  const reportPath=resolve(output,'results.jsonl');writeFileSync(reportPath,'')
  const results=await runBatch({candidates,transport:createTransport({url,key}),apply:mode==='apply',onResult:r=>{appendFileSync(reportPath,JSON.stringify(r)+'\n');console.log(`${r.status}: ${r.slug}${r.reason?` — ${r.reason}`:''}`)}})
  writeFileSync(resolve(output,'summary.json'),JSON.stringify({sha,approval_sha256:digest,mode,counts:results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{})},null,2)+'\n')
  if(results.some(r=>r.status==='HOLD'))process.exitCode=1
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`::error::${error.message}`);process.exitCode=1})
