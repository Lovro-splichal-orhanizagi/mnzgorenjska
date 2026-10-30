// Fixed G9 per-report source DATA only. The complete calendar and all normal
// statistics are independently validated before issuing any semantic capability.
import {validateFcfSingleReportSource,isFcfActaSourceRoute,vrstaStrani,jeIzziv,vrsticeRsc,tokRsc} from './viri/fcf.mjs'
import {deriveFcfInventoryHeader} from './fcf-missing-inventory-plan.mjs'
import {getFcfSixPolicy,verifyFcfSixFreshHistoricalSource} from './fcf-six-historical-policy.mjs'
import {frozenJSON,rawSha256} from './fcf-missing-inventory-artifact.mjs'
const slug='es-ct-tercera-g9',code='4118349-4118588',need=(v,m)=>{if(!v)throw Error('FCF_G9_NATIVE800_CLASSIFIER: '+m)}
export function classifyFcfG9Native800Document({id,bytes}){
 need(typeof id==='string'&&/^4118\d{3}$/.test(id)&&+id>=4118349&&+id<=4118588&&Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=2097152,'fixed G9 bounded source required')
 let html;try{html=new TextDecoder('utf8',{fatal:true}).decode(bytes)}catch{need(false,'actual UTF8 required')}
 need(Buffer.from(html,'utf8').equals(bytes)&&html.charCodeAt(0)!==0xfeff&&!jeIzziv(html)&&!/cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(html)&&vrstaStrani(html)==='zapisnik','actual source report without BOM/challenge/refusal required')
 const rows=vrsticeRsc(tokRsc(html)),routes=[],stack=[...rows.values()]
 while(stack.length){const x=stack.pop();if(!x||typeof x!=='object')continue;if(!Array.isArray(x)&&Array.isArray(x.c)&&x.c[1]==='ca'&&x.c[2]==='competicio'&&x.c[3]==='acta')routes.push(x.c);stack.push(...Object.values(x).filter(v=>v&&typeof v==='object'))}
 need(isFcfActaSourceRoute(rows.get('0')?.c,id)&&routes.length===1&&isFcfActaSourceRoute(routes[0],id),'one exact actual source route required')
 const header=validateFcfSingleReportSource(html,code,{id:'es'+id,tekmovanje:{slug,source:'fcf',source_league_code:code,sezona_koledarska:false},sezona:'2026/27',danes:Date.now()})
 need(header.krog>=1&&header.krog<=30&&/^202[67]-\d\d-\d\d$/.test(header.datum??'')&&Number.isFinite(Date.parse(header.datum))&&new Date(header.datum).toISOString().slice(0,10)===header.datum&&header.datum>='2026-07-01'&&header.datum<'2027-07-01','actual source round/date required')
 const common={id,url:`https://www.fcf.cat/ca/competicio/acta/${id}`,sha256:rawSha256(bytes),byteLength:bytes.length,header,sourceOnly:true,admissible:false,nativeAdmission:false,activationEligible:false}
 if(getFcfSixPolicy(slug).entries.some(e=>e.sourceMatchId===id)){const observation=verifyFcfSixFreshHistoricalSource({targetSlug:slug,id,html});return frozenJSON({...common,classification:'existing-reviewed-history',unresolved:false,calendarHeader:deriveFcfInventoryHeader({targetSlug:slug,id,bytes}),observation})}
 // Retain authentic but unresolved NULL source without inventing a header,
 // official score or exclusion. The semantic constructor refuses this record.
 if(header.zaprt&&header.izid===null)return frozenJSON({...common,classification:'closed-result-unavailable',unresolved:true,calendarHeader:null})
 return frozenJSON({...common,classification:'normal-report-source-only',unresolved:false,calendarHeader:deriveFcfInventoryHeader({targetSlug:slug,id,bytes})})
}
