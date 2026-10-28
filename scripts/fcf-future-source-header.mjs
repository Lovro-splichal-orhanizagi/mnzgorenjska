import {verifyFcfG1SupplementalObservation,getFcfG1SupplementalPolicy} from './fcf-g1-4109409-policy.mjs'
// Future-only header DATA. Fresh approved historical facts are checked before
// handling the single unknown official result; no admission/cleanup authority.
import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {deriveFcfInventoryHeader,validateFcfInventoryHeaders} from './fcf-missing-inventory-plan.mjs'
import {validateFcfSixInventoryHeaders} from './fcf-six-source-proof.mjs'
import {getFcfSixPolicy,verifyFcfSixFreshHistoricalSource} from './fcf-six-historical-policy.mjs'
import {glavaStrani,drevoRsc,elementi,jeElement,besedilo,tokRsc,vrsticeRsc,vrstaStrani,jeIzziv} from './viri/fcf.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON} from './fcf-missing-inventory-artifact.mjs'

// The old normal adapter requires a score for closed pages. Preserve its
// structural standards here without changing/guessing a score or raw status.
function unknownResultSides(html,id,header){
 if(jeIzziv(html)||vrstaStrani(html)!=='zapisnik')fail('source challenge/unknown page')
 const roots=drevoRsc(html),rawRows=vrsticeRsc(tokRsc(html)),routes=new Set(),stack=[...rawRows.values()]
 while(stack.length){const row=stack.pop();if(!row||typeof row!=='object')continue;if(!Array.isArray(row)&&Array.isArray(row.c)&&row.c[1]==='ca'&&row.c[2]==='competicio'&&row.c[3]==='acta')routes.add(JSON.stringify(row.c));stack.push(...Object.values(row).filter(v=>v&&typeof v==='object'))}
 const expected=JSON.stringify(['','ca','competicio','acta',id])
 if(JSON.stringify(rawRows.get('0')?.c)!==expected||routes.size!==1||!routes.has(expected))fail('actual route missing/conflicting/mismatched')
 const wrappers=[...elementi(roots)].filter(e=>e.props?.title==='Acta del partit')
 if(wrappers.length!==1)fail('ambiguous header wrapper')
 const hasNativeLink=side=>[...elementi(side)].some(e=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(e.props?.href??''))
 const rows=[...elementi(wrappers[0])].filter(e=>{const sides=e.otroci.filter(jeElement);return e.tip==='div'&&sides.length===3&&/-/.test(besedilo(sides[1]))&&hasNativeLink(sides[0])&&hasNativeLink(sides[2])})
 if(rows.length!==1)fail('ambiguous header side columns')
 const sideIdentity=side=>{
  const links=[...new Set([...elementi(side)].map(e=>e.props?.href).filter(href=>typeof href==='string'&&/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(href)))],name=besedilo(side).replace(/\s+/g,' ').trim()
  if(links.length!==1||!name||name.length>160||/[\x00-\x1f\x7f]/.test(name)||/^(undefined|null)$/i.test(name))fail('ambiguous native header-side identity')
  const [,sourceClubId,sourceCategoryId]=links[0].match(/^\/ca\/clubs\/([1-9]\d*)\/categories\/([1-9]\d*)$/)
  return {sourceClubId,sourceCategoryId,name,href:links[0]}
 }
 const sides=rows[0].otroci.filter(jeElement),home=sideIdentity(sides[0]),away=sideIdentity(sides[2])
 if(home.href===away.href||home.name!==header.domaci||away.name!==header.gostje)fail('self/conflicting native header fixture')
 return {home,away}
}

export function deriveFcfFutureInventoryHeader(input){
 exactKeys(input,['targetSlug','id','bytes',...(Object.hasOwn(input??{},'protocol')?['protocol']:[])],'future source header')
 const {targetSlug,id,bytes,protocol}=input
 if(protocol!==undefined&&protocol!=='future-g1-after-failed-g1-v1')fail('explicit new supplemental source protocol required')
 getFcfFutureTarget({targetSlug,id})
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>2097152)fail('bounded raw future header bytes required')
 const html=bytes.toString('utf8')
 if(html.charCodeAt(0)===0xfeff||!Buffer.from(html,'utf8').equals(bytes))fail('actual UTF8 future header bytes required')
 if(protocol==='future-g1-after-failed-g1-v1'&&id==='4109409')return verifyFcfG1SupplementalObservation({targetSlug,id,html}).header
 const historical=getFcfSixPolicy(targetSlug).entries.some(e=>e.sourceMatchId===id)
 const observation=historical?verifyFcfSixFreshHistoricalSource({targetSlug,id,html}):null
 if(id!=='4109404')return deriveFcfInventoryHeader({targetSlug,id,bytes})
 // Only the immutable reviewed NULL-score fixture can reach this branch.
 // Keep observation hashes separate from the unchanged wire header shape.
 const f=observation.fixture,h=glavaStrani(html),{home,away}=unknownResultSides(html,id,h)
 return frozenJSON({id,targetSlug,round:f.sourceRound,playedOn:f.playedOn,kickoff:h.ura,status:'published-result-unavailable',homeGoals:null,awayGoals:null,home,away})
}

export function validateFcfFutureInventoryHeaders(input){
 exactKeys(input,['targetSlug','headers','complete',...(Object.hasOwn(input??{},'protocol')?['protocol']:[])],'future header calendar')
 getFcfFutureTarget({targetSlug:input.targetSlug})
 if(!Array.isArray(input.headers)||typeof input.complete!=='boolean')fail('future header array/completeness required')
 // Reuse six's structural unknown-score validation without changing any stored
 // status or NULL result. It supplies no individual-statistics interpretation.
 if(input.protocol===undefined)return validateFcfSixInventoryHeaders(input)
 if(input.protocol!=='future-g1-after-failed-g1-v1'||input.targetSlug!=='es-ct-segona-g1')fail('exact supplemental G1 header protocol required')
 const f=getFcfG1SupplementalPolicy().fixture
 for(const h of input.headers){if(h.id!=='4109409'){validateFcfSixInventoryHeaders({targetSlug:input.targetSlug,headers:[h],complete:false});continue}if(h.targetSlug!==input.targetSlug||h.status!=='published-result-unavailable'||h.round!==f.sourceRound||h.playedOn!==f.playedOn||h.kickoff!==f.kickoff||h.homeGoals!==null||h.awayGoals!==null||h.home.sourceClubId!==f.homeSourceClubId||h.home.sourceCategoryId!==f.homeSourceCategoryId||h.away.sourceClubId!==f.awaySourceClubId||h.away.sourceCategoryId!==f.awaySourceCategoryId)fail('exact supplemental NULL header facts required')}
 // Structural validation uses the same NULL-as-pending projection as the original six validator; returned wire headers remain unchanged.
 return validateFcfInventoryHeaders({targetSlug:input.targetSlug,headers:input.headers.map(h=>h.status==='published-result-unavailable'?{...h,status:'pending'}:h),complete:input.complete})
}
