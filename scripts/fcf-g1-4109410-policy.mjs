// Exactly one separately approved source availability exception. Pure DATA only;
// no installed marker, cleanup, source admission or native authority is issued.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {glavaStrani,drevoRsc,elementi,jeElement,besedilo,tokRsc,vrsticeRsc,vrstaStrani,jeIzziv,goliZapisnika} from './viri/fcf.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const policy=frozenJSON(JSON.parse(readFileSync(new URL('./policies/fcf-g1-4109410-supplement.json',import.meta.url)))),sha=b=>createHash('sha256').update(b).digest('hex')
export const getFcfG1Approved4109410Policy=()=>policy
export const fcfG1Approved4109410PolicySha256=()=>hash(policy)
export function verifyFcfG1Approved4109410Observation(input){
 exactKeys(input,['targetSlug','id','html'],'G1 supplemental observation')
 const {targetSlug,id,html}=input,f=policy.fixture
 if(targetSlug!=='es-ct-segona-g1'||id!=='4109410'||typeof html!=='string'||!Buffer.byteLength(html)||Buffer.byteLength(html)>2097152||html.charCodeAt(0)===0xfeff||Buffer.from(html).toString()!==html||jeIzziv(html)||vrstaStrani(html)!=='zapisnik')fail('exact approved4109410 source bytes required')
 const roots=drevoRsc(html),all=[...elementi(roots)],h=glavaStrani(html),rows=vrsticeRsc(tokRsc(html)),routes=new Set(),stack=[...rows.values()]
 while(stack.length){const r=stack.pop();if(!r||typeof r!=='object')continue;if(!Array.isArray(r)&&Array.isArray(r.c)&&r.c[1]==='ca'&&r.c[2]==='competicio'&&r.c[3]==='acta')routes.add(JSON.stringify(r.c));stack.push(...Object.values(r).filter(v=>v&&typeof v==='object'))}
 const route=JSON.stringify(['','ca','competicio','acta',id])
 if(JSON.stringify(rows.get('0')?.c)!==route||routes.size!==1||!routes.has(route)||!h||h.tekmovanje!=='SEGONA CATALANA'||h.skupina!=='GRUP 1'||h.krog!==f.sourceRound||h.sezona!==f.season||h.datum!==f.playedOn||h.ura!==f.kickoff||h.oznaka!=='Acta Tancada'||h.zaprt!==true||h.izid!==null||all.some(e=>e.props?.player)||goliZapisnika(roots).length!==0)fail('approved4109410 closed NULL-result/empty-statistics fixture facts differ')
 const wrappers=all.filter(e=>e.props?.title==='Acta del partit');if(wrappers.length!==1)fail('one supplemental source header required')
 const link=e=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(e.props?.href??''),has=side=>[...elementi(side)].some(link)
 const columns=[...elementi(wrappers[0])].filter(e=>{const s=e.otroci.filter(jeElement);return e.tip==='div'&&s.length===3&&has(s[0])&&has(s[2])&&/-/.test(besedilo(s[1]))})
 if(columns.length!==1)fail('one supplemental header side row required')
 const sides=columns[0].otroci.filter(jeElement)
 const resultParts=sides[1].otroci.filter(jeElement).map(besedilo)
 if(resultParts.length!==2||resultParts[0].trim()!=='Acta Tancada'||resultParts[1].replace(/\s+/g,'')!=='---')fail('actual unavailable score placeholder required; never guess0:0')
 const side=(e,club,category,name)=>{const links=[...new Set([...elementi(e)].filter(link).map(e=>e.props.href))];if(links.length!==1||links[0]!==`/ca/clubs/${club}/categories/${category}`||besedilo(e).replace(/\s+/g,' ').trim()!==name)fail('exact supplemental official club/category sides differ');return {sourceClubId:club,sourceCategoryId:category,name,href:links[0]}}
 const home=side(sides[0],f.homeSourceClubId,f.homeSourceCategoryId,policy.homeName),away=side(sides[2],f.awaySourceClubId,f.awaySourceCategoryId,policy.awayName)
 if(h.domaci!==home.name||h.gostje!==away.name)fail('supplemental header names conflict')
 return frozenJSON({kind:'fcf-g1-approved-4109410-observation',targetSlug,sourceMatchId:id,policyId:policy.id,policySha256:hash(policy),approvalReference:policy.approvalReference,approvedOriginalSha256:policy.approvedOriginalSha256,freshRawSha256:sha(html),fixture:structuredClone(f),header:{id,targetSlug,round:f.sourceRound,playedOn:f.playedOn,kickoff:f.kickoff,status:'published-result-unavailable',homeGoals:null,awayGoals:null,home,away}})
}
