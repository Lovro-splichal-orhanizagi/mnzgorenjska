// Review DATA only. No source, DB, admission or activation capability is issued.
import {vrstaStrani,jeIzziv,validateFcfSingleReportSource,drevoRsc,elementi,jeElement,besedilo,vrsticeRsc,tokRsc} from './viri/fcf.mjs'
import {parseFcfFutureAuditDocument} from './fcf-current-source-proof.mjs'
import {deriveFcfInventoryHeader,validateFcfInventoryHeaders} from './fcf-missing-inventory-plan.mjs'
import {deriveFcfFutureInventoryHeader} from './fcf-future-source-header.mjs'
import {getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
import {rawSha256,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const fail=reason=>{throw Error(`FCF_G1_QUARANTINE: ${reason}`)}
const flags={admissible:false,nativeAdmission:false,activationEligible:false}
const slug='es-ct-segona-g1',url=id=>`https://www.fcf.cat/ca/competicio/acta/${id}`
// Exact reviewed parser DATA failures. New messages and programming exceptions
// propagate; no prefix-based or catch-all conversion to quarantine is allowed.
const calendarDataErrors=new Set(['FCF_INVENTORY: native club name drift','FCF_INVENTORY: self/duplicate directed pairing or repeated round club','FCF_INVENTORY: seventeenth club/ninth round match','FCF_INVENTORY: complete240/30/8/16 native header closure required'])
const dataErrors=new Set([
 'FCF_SOURCE_PROOF: normal report has incomplete individual statistics',
 'FCF_SOURCE_PROOF: explicit eleven starters and exactly one official goalkeeper per side required',
 'FCF_SOURCE_PROOF: ambiguous full source player identities',
 'FCF_SOURCE_PROOF: unresolved normal source warning/goal mismatch; no new exception',
 'FCF_SOURCE_PROOF: normal minute/event canonical proof differs',
 'FCF_SOURCE_PROOF: continuous exactly one explicit goalkeeper per side over minutes0–90 required',
 'FCF_SOURCE_PROOF: new result is not a completed reviewed prelaunch round',
])
function closedNullHeader(html,id,h){
 const roots=drevoRsc(html),rows=vrsticeRsc(tokRsc(html)),routes=new Set(),stack=[...rows.values()]
 while(stack.length){const x=stack.pop();if(!x||typeof x!=='object')continue;if(!Array.isArray(x)&&Array.isArray(x.c)&&x.c[1]==='ca'&&x.c[2]==='competicio'&&x.c[3]==='acta')routes.add(JSON.stringify(x.c));stack.push(...Object.values(x).filter(v=>v&&typeof v==='object'))}
 const expected=JSON.stringify(['','ca','competicio','acta',id]);if(JSON.stringify(rows.get('0')?.c)!==expected||routes.size!==1||!routes.has(expected))fail('conflicting source route held')
 const wrappers=[...elementi(roots)].filter(e=>e.props?.title==='Acta del partit');if(wrappers.length!==1)fail('ambiguous closed NULL wrapper held')
 const link=e=>[...elementi(e)].some(x=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(x.props?.href??'')),columns=[...elementi(wrappers[0])].filter(e=>{const d=e.otroci.filter(jeElement);return e.tip==='div'&&d.length===3&&/-/.test(besedilo(d[1]))&&link(d[0])&&link(d[2])})
 if(columns.length!==1)fail('ambiguous closed NULL columns held');const [home,middle,away]=columns[0].otroci.filter(jeElement)
 if(besedilo(middle).replace(/\s+/g,'')!=='ActaTancada---')fail('unobserved closed NULL score layout held')
 const side=e=>{const links=[...new Set([...elementi(e)].map(x=>x.props?.href).filter(x=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(x??'')))],name=besedilo(e).replace(/\s+/g,' ').trim();if(links.length!==1||!name||name.length>160||/[\x00-\x1f\x7f]/.test(name)||/^(null|undefined)$/i.test(name))fail('ambiguous closed NULL club held');const [,sourceClubId,sourceCategoryId]=links[0].match(/^\/ca\/clubs\/([1-9]\d*)\/categories\/([1-9]\d*)$/);return{sourceClubId,sourceCategoryId,name,href:links[0]}}
 const a=side(home),b=side(away);if(a.href===b.href||a.name!==h.domaci||b.name!==h.gostje)fail('conflicting closed NULL clubs held')
 return{id,targetSlug:slug,round:h.krog,playedOn:h.datum,kickoff:h.ura,status:'published-result-unavailable',homeGoals:null,awayGoals:null,home:a,away:b}
}
export function classifyFcfG1QuarantineDocument({id,bytes}){
 if(typeof id!=='string'||!/^4109\d{3}$/.test(id)||+id<4109388||+id>4109627||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>2097152)fail('fixed G1 bounded raw document required')
 let html;try{html=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{fail('actual UTF8 required')}
 if(bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf||jeIzziv(html)||/cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(html))fail('BOM/challenge/refusal held')
 const common={id,url:url(id),sha256:rawSha256(bytes),byteLength:bytes.length,...flags},kind=vrstaStrani(html)
 if(kind==='ni'){const titles=[...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];if(titles.length!==1||!/^Acta no trobada(?:\s*\|[^<>]*)?$/i.test(titles[0][1].trim()))fail('ambiguous official not-found page held');return frozenJSON({...common,classification:'official-not-found',header:null,individuals:null,unresolved:true})}
 if(kind!=='zapisnik')fail('unknown page held')
 let header
 try{header=validateFcfSingleReportSource(html,'4109388-4109627',{id:`es${id}`,tekmovanje:{slug,source:'fcf',source_league_code:'4109388-4109627',sezona_koledarska:false},sezona:'2026/27',danes:Date.now()})}catch(error){throw Error('FCF_G1_QUARANTINE: source identity/shape held',{cause:error})}
 if(header.krog<1||header.krog>30||!/^202[67]-\d\d-\d\d$/.test(header.datum??'')||!Number.isFinite(Date.parse(header.datum))||new Date(header.datum).toISOString().slice(0,10)!==header.datum||header.datum<'2026-07-01'||header.datum>='2027-07-01')fail('source round/date held')
 let calendarHeader=null;const finish=(classification,unresolved,extra={})=>frozenJSON({...common,classification,header,calendarHeader,individuals:null,unresolved,...extra})
 // Historical markers remain under their existing separate immutable policies.
 if(getFcfSixPolicy(slug).entries.some(e=>e.sourceMatchId===id)||id==='4109409'){
  calendarHeader=deriveFcfFutureInventoryHeader({targetSlug:slug,id,bytes,protocol:'future-g1-after-failed-g1-v1'})
  return finish('existing-reviewed-history',false)
 }
 if(header.zaprt&&!header.izid){calendarHeader=closedNullHeader(html,id,header);return finish('closed-result-unavailable',true)}
 calendarHeader=deriveFcfInventoryHeader({targetSlug:slug,id,bytes})
 if(!header.izid)return finish(calendarHeader.status,false)
 try{
  const facts=parseFcfFutureAuditDocument({id,competitionSlug:slug,expectedSourceRound:header.krog,html,receipt:{id,competitionSlug:slug,sourceUrl:url(id),bytes:bytes.length,rawSha256:common.sha256},now:Date.now()})
  return finish(facts.status==='pending'?'pending':'parsed-individual-review-data',false)
 }catch(error){if(!dataErrors.has(error?.message))throw error;return finish('individual-data-defect',true,{defect:error.message})}
}
/** The caller must supply all240 retained bodies. This supplies classification
 * DATA only; it authenticates neither lineage nor source admission. */
export function auditFcfG1QuarantineDocuments({documents}){
 if(!Array.isArray(documents)||documents.length!==240||documents.some((d,i)=>d?.id!==String(4109388+i)))fail('whole ordered240 required before audit')
 const classifications=documents.map(d=>classifyFcfG1QuarantineDocument({id:d.id,bytes:d.raw??d.bytes})),headers=classifications.map(x=>x.calendarHeader).filter(Boolean),calendar={knownHeaderCount:headers.length,unknownHeaderIds:classifications.filter(x=>!x.calendarHeader).map(x=>x.id),structuralClosure:false,holdReason:null}
 try{validateFcfInventoryHeaders({targetSlug:slug,headers:headers.map(h=>h.status==='published-result-unavailable'?{...h,status:'pending'}:h),complete:true});calendar.structuralClosure=true}catch(error){if(!calendarDataErrors.has(error?.message))throw error;calendar.holdReason=error.message}
 return frozenJSON({schemaVersion:1,kind:'fcf-g1-quarantine-review-data',status:'COMPLETE_QUARANTINE',...flags,documentCount:240,calendar,classifications,unresolvedReportIds:classifications.filter(x=>x.unresolved).map(x=>x.id)})
}
