// Public Football NSW Dribl evidence reader. Pure/offline; never registers or writes a league.
import { createHash } from 'node:crypto'
const API = 'https://mc-api.dribl.com'
const SITE = 'https://competitions.footballnsw.com.au'
const KEYS = ['tenant', 'season', 'competition', 'league']
const id = x => typeof x === 'string' && /^[A-Za-z0-9]+$/.test(x)
const name = p => `${p.first_name ?? ''} ${p.last_name ?? ''}`.normalize('NFC').replace(/\s+/gu, ' ').trim()
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b)
const list = (x, issue, field) => Array.isArray(x) ? x : (issue('EVENTS_MISSING',{field}), [])
function read(bytes,issue) {
  try {
    if (bytes && typeof bytes === 'object' && !Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) return structuredClone(bytes)
    if (typeof bytes !== 'string' && !(bytes instanceof Uint8Array)) throw new Error('Expected original JSON bytes')
    if (Buffer.byteLength(bytes)>2_000_000) throw new Error('Response exceeds 2 MB')
    return JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch(e) { issue('JSON_INVALID',{message:e.message}); return null }
}
function urlScope(value,path,scope,queryKeys,issue) {
  try {
    const u=new URL(value)
    if(u.origin!==API||u.username||u.password||u.hash||!path.test(u.pathname)) throw new Error('Unexpected public API URL')
    for(const k of queryKeys) if(!id(scope?.[k])||u.searchParams.getAll(k).length!==1||u.searchParams.get(k)!==scope[k]) throw new Error(`URL context mismatch: ${k}`)
    for(const k of new Set(u.searchParams.keys())) if(u.searchParams.getAll(k).length!==1) throw new Error('Repeated URL parameter')
    return u
  } catch(e){issue('URL_SCOPE',{message:e.message});return null}
}
function result(kind,scope) {
  const r={source:'dribl',verdict:'HOLD',issues:[],scope:{...scope},activationEligible:false,...kind}
  return [r,(code,fields={})=>r.issues.push({code,...fields})]
}
/** Verifies original-byte receipt; does not imply permissions or season completeness. */
export function verifyDriblReceipt(receipt) {
  const issues=[]
  if(!(receipt?.bytes instanceof Uint8Array)||receipt.status!==200||!/^application\/json(?:;|$)/i.test(receipt.contentType??'')) issues.push('RECEIPT_FORMAT')
  let u;try{u=new URL(receipt.url);if(u.origin!==API||u.username||u.password||u.hash||!u.pathname.startsWith('/api/'))issues.push('RECEIPT_URL')}catch{issues.push('RECEIPT_URL')}
  const sha256=receipt?.bytes instanceof Uint8Array?createHash('sha256').update(receipt.bytes).digest('hex'):null
  if(!/^[a-f0-9]{64}$/.test(receipt?.sha256??'')||sha256!==receipt.sha256)issues.push('RECEIPT_SHA256')
  if(receipt.byteLength!==undefined&&receipt.bytes?.length!==receipt.byteLength)issues.push('RECEIPT_LENGTH')
  return {ok:issues.length===0,issues,sha256}
}
export function parseDriblCatalog(bytes,{kind,url,scope}={}) {
  const [r,issue]=result({kind,rows:[],complete:false},scope)
  if(!['seasons','competitions','leagues'].includes(kind)){issue('CATALOG_KIND');return r}
  const u=urlScope(url,new RegExp(`^/api/list/${kind}$`),scope,kind==='seasons'?['tenant']:kind==='competitions'?['tenant','season']:['tenant','competition'],issue)
  const allowed=new Set(['tenant','disable_paging',...(kind==='competitions'?['season']:kind==='leagues'?['competition','sort']:[])])
  if(u&&([...u.searchParams.keys()].some(k=>!allowed.has(k))||(kind==='leagues'&&u.searchParams.get('sort')!=='+name')))issue('CATALOG_FILTER')
  if(u?.searchParams.get('disable_paging')!=='true')issue('CATALOG_PAGING')
  const x=read(bytes,issue),rows=x?.data
  if(!Array.isArray(rows)||!rows.length)issue('CATALOG_MISSING')
  const seen=new Set()
  for(const p of Array.isArray(rows)?rows:[]){
    if(!p||typeof p!=='object'){issue('CATALOG_ROW');continue}
    if(p.type!==kind||!id(p.id)||p.id!==p.value||typeof p.name!=='string'||!p.name.trim()||p.title!==p.name||seen.has(p.id)){issue('CATALOG_ROW');continue}
    seen.add(p.id)
    if(kind==='leagues'&&(p.fixture_access!=='public'||p.result_access!=='public'))issue('CATALOG_NOT_PUBLIC',{id:p.id})
    r.rows.push({id:p.id,name:p.name,...(kind==='seasons'?{year:p.year,isCurrent:p.is_current}:{}),...(kind==='leagues'?{competitionName:p.competition_name,seasonName:p.season_name}:{})})
  }
  r.complete=r.issues.length===0;r.verdict=r.complete?'PASS':'HOLD';return r
}
export function parseDriblSchedule(bytes,{url,scope}={}) {
  const [r,issue]=result({rows:[],nextCursor:null,nextUrl:null,complete:false,seasonComplete:false,fullInventoryEvidence:false,inventoryKind:null,completenessScope:'bound-query-pages'},scope)
  const u=urlScope(url,/^\/api\/(?:results|fixtures)$/,scope,KEYS,issue)
  const fixtures=u?.pathname==='/api/fixtures'
  r.inventoryKind=fixtures?'fixtures-all':u?.pathname==='/api/results'?'results':null
  const allowed=new Set([...KEYS,'date_range','timezone','cursor',...(!fixtures?['results']:[])])
  if(u&&([...u.searchParams.keys()].some(k=>!allowed.has(k))||u.searchParams.get('timezone')!=='Europe/Ljubljana'||u.searchParams.get('date_range')!==(fixtures?'all':'default')||(!fixtures&&u.searchParams.get('results')!=='1')))issue('SCHEDULE_FILTER')
  if(u?.searchParams.has('cursor')&&!/^[A-Za-z0-9_-]{1,2000}$/.test(u.searchParams.get('cursor')))issue('SCHEDULE_CURSOR')
  const x=read(bytes,issue)
  if(!Array.isArray(x?.data)||!x.meta||!x.links||x.meta.path!==`${API}${u?.pathname}`||x.meta.per_page!==30)issue('SCHEDULE_MISSING')
  const seen=new Set()
  for(const p of Array.isArray(x?.data)?x.data:[]){
    if(!p||typeof p!=='object'){issue('SCHEDULE_ROW');continue}
    const a=p.attributes??{}
    if(p.type!==(fixtures?'fixtures':'results')||!id(p.hash_id)||!id(a.match_hash_id)||seen.has(a.match_hash_id)||!id(a.home_team_hash_id)||!id(a.away_team_hash_id)||a.league_result_access!=='public'){issue('SCHEDULE_ROW');continue}
    seen.add(a.match_hash_id)
    r.rows.push({resultId:p.hash_id,matchId:a.match_hash_id,dateUtc:fixtures?fixtureDateUtc(a.date):dateUtc(a.date),home:{teamId:a.home_team_hash_id,name:a.home_team_name},away:{teamId:a.away_team_hash_id,name:a.away_team_name},score:{home:a.home_score,away:a.away_score},round:a.round,fullRound:a.full_round??null,roundLabel:a.round_label,status:a.status,matchUrl:`${SITE}/matchcentre/?m=${a.match_hash_id}`})
    if(!r.rows.at(-1).dateUtc)issue('SCHEDULE_DATE')
  }
  const cursor=x?.meta?.next_cursor
  if(cursor!==null&&(typeof cursor!=='string'||!/^[A-Za-z0-9_-]{1,2000}$/.test(cursor)))issue('SCHEDULE_CURSOR')
  if(typeof cursor==='string'&&cursor){
    r.nextCursor=cursor
    // API links.next contains only cursor: preserve the independently bound public filters.
    if(u){const next=new URL(u);next.searchParams.set('cursor',cursor);r.nextUrl=next.href}
    try{const next=new URL(x.links.next);if(next.origin!==API||next.pathname!==u?.pathname||next.searchParams.get('cursor')!==cursor||[...next.searchParams.keys()].some(k=>k!=='cursor'))issue('SCHEDULE_CURSOR')}catch{issue('SCHEDULE_CURSOR')}
    issue('SCHEDULE_INCOMPLETE',{message:'Remaining cursor pages have not been captured'})
  }else if(x?.links?.next!==null)issue('SCHEDULE_CURSOR')
  r.fullInventoryEvidence=Boolean(fixtures&&u&&r.issues.every(i=>i.code==='SCHEDULE_INCOMPLETE'))
  r.complete=r.issues.length===0;r.verdict=r.complete?'PASS':'HOLD';return r
}
// Actual fixtures use an explicit UTC ISO timestamp with six fractional zeros.
function fixtureDateUtc(value){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000000Z$/.test(value))return null
  return dateUtc(value.slice(0,19).replace('T',' '))
}
function dateUtc(s){
  if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s))return null
  const v=s.replace(' ','T')+'Z',d=new Date(v);return Number.isFinite(+d)&&d.toISOString()===v.replace('Z','.000Z')?v:null
}
function clock(e,issue){
  if(!e||typeof e!=='object'){issue('EVENT_INVALID');return null}
  const minute=typeof e.minute==='number'?e.minute:typeof e.minute==='string'&&/^\d+$/.test(e.minute)?Number(e.minute):NaN
  if(!Number.isInteger(minute)||!['ft-first-half','ft-second-half'].includes(e.game_section)||minute<0||(e.game_section==='ft-first-half'?minute>60:minute<45||minute>110)) {issue('CLOCK_UNSUPPORTED');return null}
  return {minute,section:e.game_section,effectiveMinute:Math.min(minute,e.game_section==='ft-first-half'?45:90)}
}
function card(e,issue){
  const yellow=e.final_card_type==='Yellow Card'&&e.first_card_type==='Yellow Card'&&['Y1','Y2','Y3','Y4'].includes(e.final_card_code),red=e.final_card_type==='Red Card'&&e.first_card_type==='Red Card'&&['R5','R7'].includes(e.final_card_code)
  if((!yellow&&!red)||e.final_card_code!==e.first_card_code||typeof e.final_card_code!=='string'||e.final_card_override_color!==null||e.first_card_override_color!==null)issue('CARD_UNSUPPORTED')
  return {kind:red?'red':'yellow',code:e.final_card_code??null,secondYellow:red&&e.final_card_code==='R7'}
}
const clockOrder=e=>(e.section==='ft-second-half'?1000:0)+e.minute
const eventKey=e=>JSON.stringify([e.type,e.teamId,e.profileId,e.minute,e.section,e.kind??null,e.code??null,e.ownGoal??null,e.penalty??null])
function reconcile(a,b,issue,field){const counts=xs=>xs.map(eventKey).sort();if(!same(counts(a),counts(b)))issue('EVENT_RECONCILIATION',{field})}
export function parseDriblReport(bundle,{scope}={}) {
  const [r,issue]=result({reportStatistikaPripravljena:false,sezonskiUvozPodprt:false,header:null,appearances:null,goals:null,cards:null,substitutions:null,diagnostics:{teams:[],appearances:[],goals:[],cards:[],substitutions:[]}},scope)
  const x=read(bundle?.match?.bytes,issue),a=x?.data?.attributes
  const matchId=x?.data?.hash_id
  const mu=urlScope(bundle?.match?.url,/^\/api\/matchcentre\/[A-Za-z0-9]+$/,scope,['tenant'],issue)
  if(!a||x.data.type!=='fixtures'||!id(matchId)||mu?.pathname!==`/api/matchcentre/${matchId}`){issue('MATCH_MISSING');return r}
  for(const k of KEYS)if(!id(scope?.[k])||a[`${k}_hash_id`]!==scope[k])issue('CONTEXT_MISMATCH',{field:k})
  if(a.match_hash_id!==matchId)issue('CONTEXT_MISMATCH',{field:'match'})
  r.header={matchId,round:a.round_number??null,displayRound:a.display_round_number??null,fullRound:a.full_round??null,roundLabel:a.round_label??null,matchType:a.match_type??null,...Object.fromEntries(KEYS.map(k=>[k,a[`${k}_hash_id`]])),dateUtc:dateUtc(a.date),score:{home:a.home_score,away:a.away_score},home:{teamId:a.home_team_hash_id,clubId:a.home_club_hash_id,name:a.home_team_name},away:{teamId:a.away_team_hash_id,clubId:a.away_club_hash_id,name:a.away_team_name}}
  if(!r.header.dateUtc||!['home','away'].every(s=>id(r.header[s].teamId)&&id(r.header[s].clubId)&&typeof r.header[s].name==='string')||a.home_team_hash_id===a.away_team_hash_id)issue('HEADER_INVALID')
  const publicComplete=a.league_result_access==='public'&&a.league_enable_match_events===1&&a.league_enable_squad_public_display===true&&a.hide_lineups===false&&a.publish_status==='published'&&a.matchsheet_status==='completed'&&a.status==='complete'&&a.event_status==='complete'&&['home','away'].every(s=>a[`matchsheet_${s}_team_submitted`]===true)
  r.diagnostics.matchsheet={status:a.matchsheet_status,homeSubmitted:a.matchsheet_home_team_submitted,awaySubmitted:a.matchsheet_away_team_submitted,homeConfirmed:a.matchsheet_home_team_confirmed,awayConfirmed:a.matchsheet_away_team_confirmed}
  if(!publicComplete)issue('REPORT_NOT_PUBLIC_COMPLETE')
  if(a.game_progress!=='ft'||a.ft_first_half_duration!==45||a.ft_second_half_duration!==45||a.is_bye!==false||a.forfeit_team_hash_id!==null||['home_score_et','away_score_et','home_score_extra','away_score_extra','home_score_penalty','away_score_penalty'].some(k=>a[k]!==null))issue('DURATION_UNSUPPORTED')
  const allPlayers=[],nested=[],profileIds=new Set()
  for(const side of ['home','away']){
    const teamId=a[`${side}_team_hash_id`], u=urlScope(bundle?.[side]?.url,/^\/api\/matchcentre-match-members\/match\/[A-Za-z0-9]+\/team\/[A-Za-z0-9]+$/,scope,[],issue)
    if(u?.pathname!==`/api/matchcentre-match-members/match/${matchId}/team/${teamId}`)issue('ROSTER_URL_MISMATCH',{side})
    const raw=read(bundle?.[side]?.bytes,issue),team={side,teamId,players:[]};r.diagnostics.teams.push(team)
    if(!Array.isArray(raw)){issue('ROSTER_MISSING',{side});continue}
    for(const p of raw.filter(p=>p?.role_slug==='player')){
      if(p.team_hash_id!==teamId)issue('ROSTER_TEAM_MISMATCH',{side})
      if(!id(p.user_hash_id)||profileIds.has(p.user_hash_id))issue('PLAYER_ID_DUPLICATE',{side});profileIds.add(p.user_hash_id)
      for(const k of ['starting','available','playing','is_goalkeeper'])if(typeof p[k]!=='boolean')issue('PLAYER_FLAGS',{side,field:k})
      if(p.available!==true){if(p.starting||[p.goals,p.cards,p.in_subs,p.out_subs].some(xs=>Array.isArray(xs)&&xs.length))issue('UNAVAILABLE_PLAYER_EVENT',{side});continue}
      const gk=[p.field_role==='Goalkeeper',p.field_role_slug==='goalkeeper',p.field_role_group==='goalkeeper']
      if((gk.some(Boolean)&&!gk.every(Boolean))||(p.is_goalkeeper===true&&!gk.every(Boolean)))issue('GK_ROLE_CONTRADICTION',{side,profileId:p.user_hash_id})
      const player={profileId:p.user_hash_id,sourcePlayerId:`dribl:${scope?.tenant}:user:${p.user_hash_id}`,profileUrl:`${SITE}/memberprofile?m=${p.user_hash_id}&season=${scope?.season}`,name:name(p),teamId,side,starter:p.starting,goalkeeper:gk.every(Boolean),positionEvidence:gk.every(Boolean)?'field-role':null,shirt:p.jersey,from:null,to:null,minutes:null}
      if(!player.name||typeof p.jersey!=='string'||!/^\d+$/.test(p.jersey)||p.playing!==true)issue('PLAYER_INVALID',{side,profileId:p.user_hash_id})
      player._in=list(p.in_subs,issue,'in_subs');player._out=list(p.out_subs,issue,'out_subs')
      const pg=list(p.goals,issue,'goals'),pc=list(p.cards,issue,'cards')
      if(p.has_goals!==(pg.length>0)||p.has_cards!==(pc.length>0)||p.has_subs!==(player._in.length+player._out.length>0))issue('EVENT_FLAG_MISMATCH',{profileId:p.user_hash_id})
      for(const [type,events]of[['in',player._in],['out',player._out],['goal',pg],['card',pc]])for(const e of events){
        const c=clock(e,issue);if(!c)continue
        const n={type,profileId:player.profileId,sourcePlayerId:player.sourcePlayerId,profileUrl:player.profileUrl,name:player.name,teamId,side,...c}
        if(type==='goal'){if(typeof e.own_goal!=='boolean'||typeof e.penalty_kick!=='boolean'||e.own_goal)issue('GOAL_UNSUPPORTED');Object.assign(n,{ownGoal:e.own_goal,penalty:e.penalty_kick})}
        if(type==='card')Object.assign(n,card(e,issue))
        nested.push(n)
      }
      team.players.push(player);allPlayers.push(player)
    }
    if(team.players.filter(p=>p.starter).length!==11)issue('STARTER_COUNT',{side})
    if(team.players.filter(p=>p.starter&&p.goalkeeper).length!==1)issue('STARTING_GK_MISSING',{side})
    for(const field of ['name','shirt']){const values=team.players.map(p=>p[field]);if(new Set(values).size!==values.length)issue(field==='name'?'ACTOR_AMBIGUOUS':'SHIRT_AMBIGUOUS',{side})}
  }
  const actor=(teamId,n,shirt)=>{const ps=allPlayers.filter(p=>p.teamId===teamId&&p.name===(typeof n==='string'?n.normalize('NFC').replace(/\s+/gu,' ').trim():null)&&(shirt===undefined||p.shirt===shirt));if(ps.length!==1){issue('ACTOR_AMBIGUOUS',{teamId,name:n});return null}return ps[0]}
  const timeline=[]
  for(const e of list(a.match_events,issue,'match_events')){
    const c=clock(e,issue);if(!c)continue
        if(e.type==='sub'){
      const pin=actor(e.team_id,e.in_name,e.in_jersey),pout=actor(e.team_id,e.out_name,e.out_jersey)
      if(!pin||!pout)continue
      for(const[type,p]of[['in',pin],['out',pout]])timeline.push({type,teamId:e.team_id,profileId:p.profileId,...c})
      r.diagnostics.substitutions.push({teamId:e.team_id,side:pin.side,...c,inProfileId:pin.profileId,outProfileId:pout.profileId});continue
    }
    if(!['goal','card'].includes(e.type)){issue('EVENT_UNSUPPORTED');continue}
    const p=actor(e.team_id,e.name,e.jersey);if(!p)continue
    const v={type:e.type,teamId:e.team_id,profileId:p.profileId,...c}
    if(e.type==='goal'){if(typeof e.own_goal!=='boolean'||typeof e.penalty_kick!=='boolean'||e.own_goal)issue('GOAL_UNSUPPORTED');Object.assign(v,{ownGoal:e.own_goal,penalty:e.penalty_kick})}
    else Object.assign(v,card(e,issue))
    timeline.push(v)
  }
  reconcile(nested,timeline,issue,'member events versus match timeline')
  const goals=nested.filter(e=>e.type==='goal'),sourceGoals=[]
  for(const g of list(a.goals,issue,'goals')){
    const c=clock(g,issue);if(!c)continue;const p=actor(g.team_id,name(g));if(!p)continue
    if(!id(g.member_id)||g.type!=='goal')issue('GOAL_MEMBER_ID')
    const v={type:'goal',teamId:g.team_id,profileId:p.profileId,...c,ownGoal:g.own_goal,penalty:g.penalty_kick};sourceGoals.push(v)
    const matches=goals.filter(e=>eventKey(e)===eventKey(v));if(matches.length!==1)issue('GOAL_MEMBER_RECONCILIATION');else matches[0].sourceMemberId=g.member_id
  }
  reconcile(goals,sourceGoals,issue,'goal member namespace')
  if(!Number.isInteger(a.home_score)||a.home_score<0||!Number.isInteger(a.away_score)||a.away_score<0||goals.filter(e=>e.side==='home').length!==a.home_score||goals.filter(e=>e.side==='away').length!==a.away_score)issue('SCORE_MISMATCH')
  if(a.enable_half_time_scores!==true||!Number.isInteger(a.home_score_ht)||!Number.isInteger(a.away_score_ht)||goals.filter(e=>e.side==='home'&&e.section==='ft-first-half').length!==a.home_score_ht||goals.filter(e=>e.side==='away'&&e.section==='ft-first-half').length!==a.away_score_ht)issue('HALF_TIME_SCORE_MISMATCH')
  let home=0,away=0
  for(const e of (Array.isArray(a.match_events)?a.match_events:[]).filter(e=>e?.type==='goal').slice().sort((x,y)=>(x.game_section==='ft-second-half'?1000:0)+Number(x.minute)-((y.game_section==='ft-second-half'?1000:0)+Number(y.minute)))){if(e.team_id===a.home_team_hash_id)home++;else if(e.team_id===a.away_team_hash_id)away++;else issue('SCORE_MISMATCH');if(e.home_score!==home||e.away_score!==away)issue('SCORE_MISMATCH')}
  for(const p of allPlayers){
    const ins=nested.filter(e=>e.type==='in'&&e.profileId===p.profileId),outs=nested.filter(e=>e.type==='out'&&e.profileId===p.profileId)
    if(ins.length>1||outs.length>1||(p.starter&&ins.length)||(!p.starter&&outs.length&&!ins.length))issue('INTERVAL_INVALID',{profileId:p.profileId})
    const cards=nested.filter(e=>e.type==='card'&&e.profileId===p.profileId),reds=cards.filter(e=>e.kind==='red'),yellows=cards.filter(e=>e.kind==='yellow').sort((a,b)=>clockOrder(a)-clockOrder(b))
    if(reds.length>1||yellows.length>2)issue('DISCIPLINE_INCONSISTENT',{profileId:p.profileId})
    if(reds.some(e=>e.secondYellow)&&(yellows.length!==2||clockOrder(yellows[0])>clockOrder(yellows[1])||clockOrder(yellows[1])!==clockOrder(reds[0]))||yellows.length===2&&!reds.some(e=>e.secondYellow))issue('SECOND_YELLOW_INCONSISTENT',{profileId:p.profileId})
    if(reds.length&&outs.some(e=>clockOrder(e)>=clockOrder(reds[0])))issue('INTERVAL_INVALID',{profileId:p.profileId})
    p.from=p.starter?0:ins[0]?.effectiveMinute??null;p.to=p.from===null?null:Math.min(outs[0]?.effectiveMinute??90,reds[0]?.effectiveMinute??90);p.minutes=p.from===null?null:p.to-p.from
    const rawFrom=p.starter?0:ins[0]?clockOrder(ins[0]):null,rawTo=Math.min(outs[0]?clockOrder(outs[0]):Infinity,reds[0]?clockOrder(reds[0]):Infinity)
    if(p.minutes!==null&&(p.minutes<0||p.minutes>90)||rawFrom!==null&&rawFrom>rawTo)issue('INTERVAL_INVALID',{profileId:p.profileId})
    // Period and unclamped minute establish eligibility; 45/90 clamps apply only to duration totals.
    for(const e of nested.filter(e=>e.profileId===p.profileId&&['goal','card'].includes(e.type)))if(rawFrom===null||clockOrder(e)<rawFrom||clockOrder(e)>rawTo)issue('EVENT_OUTSIDE_INTERVAL',{profileId:p.profileId})
    delete p._in;delete p._out
    if(p.from!==null)r.diagnostics.appearances.push({...p})
  }
  r.diagnostics.teamMinutesExpected={}
  for(const side of ['home','away']){const expected=990-nested.filter(e=>e.type==='card'&&e.kind==='red'&&e.side===side).reduce((n,e)=>n+90-e.effectiveMinute,0);r.diagnostics.teamMinutesExpected[side]=expected;if(r.diagnostics.appearances.filter(p=>p.side===side).reduce((s,p)=>s+p.minutes,0)!==expected)issue('TEAM_MINUTES_MISMATCH',{side})}
  r.diagnostics.goals=goals;r.diagnostics.cards=nested.filter(e=>e.type==='card')
  r.reportStatistikaPripravljena=r.issues.length===0;r.verdict=r.reportStatistikaPripravljena?'PASS':'HOLD'
  if(r.reportStatistikaPripravljena)for(const k of ['appearances','goals','cards','substitutions'])r[k]=r.diagnostics[k]
  return r
}
