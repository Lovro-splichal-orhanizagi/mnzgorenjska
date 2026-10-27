// Explicit opt-in only. Catalog equality and native installed bindings are
// checked at their admission boundaries; a setting alone grants no source proof.
export const FUSSBALL_COMMUNITY_SOURCE_POLICY='fussball-community-cards-v1'
export const FUSSBALL_COMMUNITY_CARD_POLICY='community-v1'
export function isFussballCommunityCandidate(candidate){
 return candidate?.source==='fussball-public'&&candidate.country_code==='DE'&&candidate.communityCards===true
}
export function isFussballCommunityCompetition(competition){
 return competition?.source==='fussball-public'&&competition.country_code==='DE'&&competition.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY
}
export function fussballCardPolicyForCandidate(candidate){
 return isFussballCommunityCandidate(candidate)?FUSSBALL_COMMUNITY_CARD_POLICY:undefined
}
