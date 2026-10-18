// HNS schedules never use the generic 10:00 fallback or direct round writes.
export async function persistHnsWomenRound(db,competition,round,offsetHours) {
 const source=round.hnsWomenSource,fail=message=>{throw Error(`HNS women round import: ${message}`)}
 if(competition.slug!=='hr-prva-hnlz'||competition.source!=='hns'||competition.source_policy!=='hr-hnlz-v1'||competition.date_only_deadline_policy!=='midnight-local-v1'||competition.source_league_code!=='114471579'||offsetHours!==6||!source||!['114471579','108043476'].includes(source.sourceCompetitionId)||!Array.isArray(source.fixtures)||!source.fixtures.length||!/^[a-f0-9]{64}$/.test(source.rawSha256??'')||!Number.isFinite(Date.parse(source.capturedAt)))fail('exact source provenance/offset required')
 const {data,error}=await db.rpc('update_hns_women_round',{p_competition_id:competition.id,p_source_competition_id:source.sourceCompetitionId,p_round:round.stevilka,p_fixtures:source.fixtures,p_source_sha256:source.rawSha256,p_captured_at:source.capturedAt})
 if(error||!Number.isSafeInteger(data?.roundId)||data.roundId<=0)fail(error?.message??'guarded round RPC returned no identity')
 return data.roundId
}
