// Separate exact six-entry namespace. Legacy registry and classifier remain unchanged.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {drevoRsc,elementi,glavaZapisnika,jeElement,besedilo,tokRsc,vrsticeRsc,jeIzziv} from './viri/fcf.mjs'
export const FCF_SIX_SOURCE_POLICY='es-fcf-six-reviewed-history-v1'
const fail=m=>{throw Error(`FCF_SIX_POLICY: ${m}`)}
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const registry=freeze(JSON.parse(readFileSync(new URL('./policies/fcf-six-reviewed-exclusions.json',import.meta.url),'utf8')))
const expected={'es-ct-segona-g1':['4109388','4109404'],'es-ct-tercera-g2':['4116215'],'es-ct-tercera-g9':['4118352','4118354','4118358']}
if(registry.schemaVersion!==1||registry.policies.length!==3||registry.policies.some(p=>p.provider!=='fcf'||p.sourcePolicy!==FCF_SIX_SOURCE_POLICY||hash(p.entries.map(e=>e.sourceMatchId))!==hash(expected[p.competitionSlug])))fail('fixed six registry differs')
export const getFcfSixPolicy=slug=>registry.policies.find(p=>p.competitionSlug===slug)??null
export const fcfSixPolicyHashes=()=>Object.fromEntries(registry.policies.map(p=>[p.competitionSlug,hash(p)]))
export const fcfSixPolicyIdHashes=()=>Object.fromEntries(registry.policies.map(p=>[p.id,hash(p)]))
const fixtureFor=(p,e)=>{const{rawSha256,reasonCode,...identity}=e;return{...identity,season:p.season}}
function selection(c,id){const p=getFcfSixPolicy(c?.slug);if(!p||c.source!=='fcf'||c.source_policy!==FCF_SIX_SOURCE_POLICY||typeof id!=='string'||!/^\d+$/.test(id))fail('exact six competition/provider/policy required');const e=p.entries.find(e=>e.sourceMatchId===id);if(!e&&registry.policies.some(p=>p.entries.some(e=>e.sourceMatchId===id)))fail('foreign historical ID');if(e&&(!/^\d{4}-\d\d-\d\d$/.test(c.firstFantasyPlayedOn??'')||e.playedOn>=c.firstFantasyPlayedOn))fail('strict prelaunch exclusion required');return{p,e}}
const envelope=(p,e)=>({id:`es${e.sourceMatchId}`,url:e.sourceUrl,z:null,fixture:fixtureFor(p,e),rawSha256:e.rawSha256,statisticsStatus:'unavailable_historical',historicalStatistics:{policyId:p.id,policySha256:hash(p),reasonCode:e.reasonCode}})
function rawFixture(html, id, competition) {
  if (typeof html !== 'string' || jeIzziv(html)) fail('raw source unavailable/challenged')
  const route=vrsticeRsc(tokRsc(html)).get('0')?.c
  if (JSON.stringify(route) !== JSON.stringify(['','ca','competicio','acta',id])) fail('raw route identity differs')
  const roots=drevoRsc(html), all=[...elementi(roots)], header=glavaZapisnika(roots)
  const group=/^es-ct-(segona|tercera)-g([1-9]\d*)$/.exec(competition.slug)
  if (!group || header.tekmovanje !== `${group[1].toUpperCase()} CATALANA` || header.skupina !== `GRUP ${group[2]}` || !header.zaprt || (!header.izid && id !== '4109404')) fail('raw competition/group/result identity differs')
  const top=all.find(e => e.props?.title === 'Acta del partit')
  const row=[...elementi(top)].find(e => e.tip === 'div' && e.otroci.filter(jeElement).length === 3 && /-/.test(besedilo(e.otroci.filter(jeElement)[1])))
  const sides=row?.otroci.filter(jeElement)
  if (!sides) fail('raw team header identity missing')
  const clubs=[sides[0],sides[2]].map(side => {
    const links=[...new Set([...elementi(side)].map(e=>e.props?.href).filter(href => /^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(href ?? '')))]
    if (links.length !== 1) fail('raw team/category identity ambiguous')
    const parts=links[0].split('/')
    return {club:parts[3],category:parts[5]}
  })
  const groups=[...new Set(all.filter(e=>e.props?.player).map(e=>e.props.codgrupo).filter(Boolean))]
  if (id === '4109404' ? groups.length !== 0 || all.some(e=>e.props?.player) || header.izid !== null : groups.length !== 1 || !/^[1-9]\d*$/.test(groups[0])) fail('raw source group identity ambiguous')
  return {sourceMatchId:id,sourceCompetitionId:groups.length ? String(groups[0]) : null,sourcePhase:null,sourceRound:header.krog,playedOn:header.datum,season:header.sezona,
    homeSourceClubId:clubs[0].club,awaySourceClubId:clubs[1].club,homeSourceCategoryId:clubs[0].category,awaySourceCategoryId:clubs[1].category,
    sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${id}`,observedHomeScore:header.izid?.domaci ?? null,observedAwayScore:header.izid?.gostje ?? null}
}


export function classifyFcfSixHistoricalStatistics({competition,id,html}){const{p,e}=selection(competition,id);if(!e)return{kind:'normal'};if(createHash('sha256').update(html??'').digest('hex')!==e.rawSha256)fail('approved raw SHA differs');const fixture=rawFixture(html,id,competition);if(hash(fixture)!==hash(fixtureFor(p,e)))fail('raw fixture identity differs');return envelope(p,e)}
export function verifyFcfSixInstalledHistoricalMarker({competition,marker:m}){const{p,e}=selection(competition,m?.sourceMatchId);if(!e||m.reportId!==`es${e.sourceMatchId}`||m.policyId!==p.id||m.policySha256!==hash(p)||m.rawSha256!==e.rawSha256||m.statisticsStatus!=='unavailable_historical'||m.importedAt!==null||m.individualRowCount!==0||hash(m.fixture)!==hash(fixtureFor(p,e))||['matchId','roundId','homeTeamId','awayTeamId'].some(k=>!Number.isSafeInteger(m[k])||m[k]<1)||m.homeTeamId===m.awayTeamId)fail('exact installed six marker differs');return envelope(p,e)}
export function validateFcfSixInstalledMarkers({competition,binding}){const p=getFcfSixPolicy(competition?.slug);if(!p||competition.source_policy!==FCF_SIX_SOURCE_POLICY||binding?.installed!==true||binding.policyId!==p.id||binding.policySha256!==hash(p)||!/^\d{4}-\d\d-\d\d$/.test(binding.firstFantasyPlayedOn??'')||competition.firstFantasyPlayedOn!=null&&competition.firstFantasyPlayedOn!==binding.firstFantasyPlayedOn||!Array.isArray(binding.markers)||binding.markers.length!==p.entries.length||new Set(binding.markers.map(m=>m.sourceMatchId)).size!==p.entries.length||new Set(binding.markers.map(m=>m.matchId)).size!==p.entries.length)fail('complete installed six binding required');for(const marker of binding.markers)verifyFcfSixInstalledHistoricalMarker({competition:{...competition,firstFantasyPlayedOn:binding.firstFantasyPlayedOn},marker});return freeze(structuredClone(binding))}
export function isFcfSixUnknownResultMarker(m){const p=getFcfSixPolicy('es-ct-segona-g1'),e=p.entries.find(e=>e.sourceMatchId==='4109404');return m?.sourceMatchId==='4109404'&&m.policyId===p.id&&m.policySha256===hash(p)&&m.rawSha256===e.rawSha256&&hash(m.fixture)===hash(fixtureFor(p,e))}

/** Compare a newly fetched historical header with the immutable reviewed facts.
 * This is an observation only: original cleanup bytes/receipts, execution/source
 * authentication and installed-marker checks are still required elsewhere.
 * Presentation changes never rewrite the original approved SHA or authorize a
 * new exclusion. The legacy initial-install classifier remains byte-exact.
 */
export function verifyFcfSixFreshHistoricalSource(input){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).sort().join(',')!=='html,id,targetSlug')fail('exact fresh historical observation input required')
 const {targetSlug,id,html}=input,p=getFcfSixPolicy(targetSlug),e=p?.entries.find(e=>e.sourceMatchId===id)
 if(!['es-ct-segona-g1','es-ct-tercera-g9'].includes(targetSlug)||typeof id!=='string'||!e||typeof html!=='string'||html.charCodeAt(0)===0xfeff||Buffer.byteLength(html)>2097152)fail('exact reviewed future-target historical report required')
 const fixture=rawFixture(html,id,{slug:targetSlug})
 if(hash(fixture)!==hash(fixtureFor(p,e)))fail('fresh historical factual identity differs from reviewed original')
 return freeze({kind:'fcf-six-fresh-historical-observation',targetSlug,sourceMatchId:id,policyId:p.id,policySha256:hash(p),approvedOriginalSha256:e.rawSha256,freshRawSha256:createHash('sha256').update(html).digest('hex'),fixture})
}
