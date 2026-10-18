// The service getter validates immutable initial native-club→DBteam bindings.
// Public display names may change; source identities and country may not.
import {HNS_WOMEN_CLUBS} from './hns-zenske-quality.mjs'
export function validateHnsWomenClubBindings(competition,binding,markers=[]) {
 const fail=()=>{throw Error('HNS women club binding: exact native/provider/competition/country identity required')},positive=n=>Number.isSafeInteger(n)&&n>0
 if(competition?.slug!=='hr-prva-hnlz'||competition.source!=='hns'||competition.source_league_code!=='114471579'||competition.source_policy!=='hr-hnlz-v1'||competition.date_only_deadline_policy!=='midnight-local-v1'||!positive(competition.id)||!positive(competition.country_id)
  ||binding?.competitionId!==competition.id||binding.sourceCompetitionId!=='114471579'||!Array.isArray(binding.clubs)||binding.clubs.length!==8)fail()
 const native=new Set(),teams=new Set()
 for(const b of binding.clubs) {
  if(!b||typeof b.sourceClubId!=='string'||b.canonicalName!==HNS_WOMEN_CLUBS[b.sourceClubId]||!positive(b.teamId)||b.countryId!==competition.country_id||native.has(b.sourceClubId)||teams.has(b.teamId))fail()
  native.add(b.sourceClubId);teams.add(b.teamId)
 }
 if(Object.keys(HNS_WOMEN_CLUBS).some(id=>!native.has(id)))fail()
 for(const m of markers)for(const[side,key]of[['home','homeTeamId'],['away','awayTeamId']])if(binding.clubs.find(b=>b.sourceClubId===m.fixture[`${side}SourceClubId`])?.teamId!==m[key])fail()
 return Object.freeze(binding.clubs.map(b=>Object.freeze({...b})))
}
