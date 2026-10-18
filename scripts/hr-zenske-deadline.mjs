// Conservative fantasy cutoffs only; an unpublished source kickoff remains null.
const fail=message=>{throw Error(`hns women deadline: ${message}`)}
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
const parts=date=>Object.fromEntries(fmt.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]))
const localEpoch=p=>Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)
function localInstant(date,clock) {
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)fail('valid published source date required')
 if(typeof clock!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))fail('invalid source clock')
 const naive=Date.parse(`${date}T${clock}:00Z`),offsets=new Set([-86400000,0,86400000].map(delta=>localEpoch(parts(new Date(naive+delta)))-(naive+delta)))
 const matching=[...offsets].map(offset=>naive-offset).filter(candidate=>localEpoch(parts(new Date(candidate)))===naive)
 if(matching.length!==1)fail('ambiguous or nonexistent local source clock')
 return matching[0]
}
export function hnsWomenRoundCutoff(fixtures,{policy,offsetHours=6}={}) {
 if(policy!=='midnight-local-v1')fail('persisted midnight-local-v1 policy required')
 if(!Number.isFinite(offsetHours)||offsetHours<0||offsetHours>24)fail('invalid configured kickoff offset')
 if(!Array.isArray(fixtures)||!fixtures.length)fail('complete round fixtures required')
 const candidates=fixtures.map(f=>{
  const dateOnly=f.ura==null,instant=localInstant(f.datum,dateOnly?'00:00':f.ura)
  return{sourceMatchId:String(f.id),sourceDate:f.datum,sourceKickoff:f.ura??null,timeZone:'Europe/Zagreb',kind:dateOnly?'fantasy_midnight_date_only':'published_kickoff_offset',deadlineAt:new Date(instant-(dateOnly?0:offsetHours*3600000)).toISOString()}
 })
 const first=[...candidates].sort((a,b)=>a.deadlineAt.localeCompare(b.deadlineAt))[0]
 return{deadlineAt:first.deadlineAt,playedOn:fixtures.map(f=>f.datum).sort()[0],reason:first.kind,candidates}
}
