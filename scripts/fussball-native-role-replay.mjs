// Pure native derivation over authenticated originals. No source collection,
// capability issuer, clock, mutable original or caller-selected parser.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup} from './viri/fussball-statistika.mjs'
import {inspectFussballNativeRoleEvidence,razberiNativeFantasyZapisnik} from './viri/fussball-native-role-parser.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x),digest=v=>sha(canonical(v))
const need=(ok,s)=>{if(!ok)throw Object.assign(Error('fussball native role replay: '+s),{code:'FUSSBALL_NATIVE_ROLE_REPLAY_HOLD',dataHold:true})}
const stages=['current','archive'],resource=d=>['css','font'].includes(d.metadata.kind)
const descriptor=d=>({stage:d.stage,url:d.metadata.url,kind:d.metadata.kind,sha256:sha(d.bytes),bytes:d.bytes.length,metadataSha256:digest(d.metadata),originalReceiptSha256:digest(d.metadata.originalReceipt??null)})
// Fresh-pair retains a commitment, not a fabricated original result.json.
export function fussballNativeOriginalResultBytes(stage){
 if(stage.manifest?.version!==8&&!stage.files.has('result-commitment.json'))return stage.files.get('result.json')
 const m=stage.manifest,leaf=stage.files.get('result-commitment.json')
 need(m.version===8&&m.protocol==='baden-fresh-paired-transports-v1'&&Buffer.isBuffer(leaf)&&sha(leaf)===m.resultCommitmentSha256,'fresh semantic commitment bytes differ')
 let c;try{c=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(leaf))}catch{need(false,'invalid fresh commitment JSON')}
 const raw=Buffer.from(JSON.stringify(stage.result)+'\n')
 need(c&&Object.getPrototypeOf(c)===Object.prototype&&same(Object.keys(c).sort(),['version','kind','resultSha256','semanticBytes','scope','coverage','sourceOnly','nativeAdmission','activationEligible'].sort()),'closed fresh semantic commitment required')
 need(c.version===1&&c.kind==='fussball-full-semantic-result-commitment'&&c.sourceOnly===true&&c.nativeAdmission===false&&c.activationEligible===false&&c.resultSha256===m.resultSha256&&sha(raw)===c.resultSha256&&raw.length===c.semanticBytes&&same(c.scope,stage.result.scope)&&same(c.coverage,stage.result.coverage),'fresh full semantic commitment differs')
 return raw
}
/** DATA only: this function cannot authenticate a source capability. The private
 * composer supplies reader-authenticated source stages and binds this witness. */
export function replayFussballNativeRoles(input){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&same(Object.keys(input).sort(),stages.slice().sort()),'closed current/archive original stages required')
 const locals={},global=new Map(),out={}
 for(const name of stages){
  const s=input[name];need(s?.files instanceof Map&&Array.isArray(s.manifest?.documents)&&s.result,'original stage required')
  const raw=fussballNativeOriginalResultBytes(s);need(Buffer.isBuffer(raw)&&sha(raw)===s.manifest.resultSha256,'original result bytes differ')
  let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}catch{need(false,'original result JSON differs')};need(same(parsed,s.result),'original result object differs')
  const docs=new Map();for(const d of s.manifest.documents){
   const b=s.files.get(d.file);need(!docs.has(d.url)&&Buffer.isBuffer(b)&&b.length===d.bytes&&sha(b)===d.sha256,'original document bytes or URL differ')
   const row={stage:name,metadata:structuredClone(d),bytes:Buffer.from(b)};docs.set(d.url,row)
   if(resource(row)){const old=global.get(d.url);need(!old||(old.metadata.kind===d.kind&&old.bytes.equals(b)),'same resource URL has different original bytes');if(!old)global.set(d.url,row)}
  }locals[name]=docs
 }
 for(const name of stages){
  const s=input[name],r=s.result,documents=new Map(locals[name]);for(const [url,d]of global)if(!documents.has(url))documents.set(url,d)
  need(['reports','pendingReports','rejectedReports','cardEnvelopes'].every(k=>Array.isArray(r[k]))&&Array.isArray(r.schedule?.fixtures),'closed source report arrays required')
  need(r.coverage?.completeReports===r.reports.length&&r.coverage?.pendingReports===r.pendingReports.length&&r.coverage?.rejectedReports===r.rejectedReports.length,'original report coverage differs')
  need(same(r.cardEnvelopes,[...r.reports,...r.pendingReports].map(e=>e.result?.cardEnvelope)),'original card envelope inventory differs')
  const rows=new Map(),schedule=new Map(r.schedule.fixtures.map(f=>[f.id,f]));need(schedule.size===r.schedule.fixtures.length,'duplicate source fixture')
  for(const kind of ['reports','pendingReports','rejectedReports'])for(const entry of r[kind]){const f=entry.fixture;need(f&&schedule.has(f.id)&&same(schedule.get(f.id),f)&&!rows.has(f.id),'source report overlap or foreign fixture');rows.set(f.id,{kind,entry})}
  const changed=new Map(),affected=[]
  for(const f of r.schedule.fixtures){
   const original=rows.get(f.id);if(!original)continue
   const main=locals[name].get(f.url);need(main?.metadata.kind==='report','local original report required')
   const info=inspectFussballPage(main.bytes.toString('utf8'),{kind:'report',matchId:f.id}),lineup=locals[name].get(info.lineupUrl);need(lineup?.metadata.kind==='lineup','local original lineup required')
   const role=inspectFussballNativeRoleEvidence(lineup.bytes.toString('utf8'));if(!role)continue
   const ids=[...new Set([...info.fontIds,...inspectFussballLineup(lineup.bytes.toString('utf8'))])].sort(),fonts=Object.create(null),resources=[],missing=[]
   for(const id of ids){
    const css=documents.get(info.cssTemplate.replace('%ID%',id)),url=`https://www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font`,font=documents.get(url),absent=[]
    if(css){need(css.metadata.kind==='css'&&fussballFontUrl(css.bytes.toString('utf8'),id)===url,'observed original CSS identity differs');resources.push(descriptor(css))}else absent.push('css')
    if(font){need(css&&font.metadata.kind==='font','observed original WOFF lacks verified CSS');fonts[id]={bytes:font.bytes,sha256:sha(font.bytes)};resources.push(descriptor(font))}else absent.push('font')
    if(absent.length)missing.push({id,missing:absent})
   }
   let result,error;try{result=razberiNativeFantasyZapisnik(main.bytes.toString('utf8'),lineup.bytes.toString('utf8'),{fonts,id:f.id,lineupId:f.id,season:r.scope.season,cardPolicy:'community-v1'})}catch(e){need(e?.name==='FussballReportError'&&['FUSSBALL_REPORT_INVALID','FUSSBALL_REPORT_UNSUPPORTED'].includes(e.code)&&typeof e.message==='string'&&e.message.startsWith('fussball statistika: '),'unknown native parser error');error={fixture:structuredClone(f),code:e.code,reason:e.message}}
   const outcome=error?'strict-rejection':result.statisticsPending===true?'community-pending':'complete',entry=error??{fixture:structuredClone(f),result}
   changed.set(f.id,{kind:error?'rejectedReports':result.statisticsPending===true?'pendingReports':'reports',entry})
   affected.push({sourceMatchId:f.id,fixtureSha256:digest(f),originalPartition:original.kind,originalEntrySha256:digest(original.entry),report:descriptor(main),lineup:descriptor(lineup),nativeRoleParser:role,nativeRoleParserSha256:digest(role),observedFontIds:ids,missingObservedFonts:missing,resources,outcome,...(error?{strictErrorSha256:digest(error),strictError:structuredClone(error)}:{resultSha256:digest(result)})})
  }
  const effective=structuredClone(r)
  for(const kind of ['reports','pendingReports','rejectedReports'])effective[kind]=[...r[kind].filter(e=>!changed.has(e.fixture.id)).map(e=>structuredClone(e)),...r.schedule.fixtures.flatMap(f=>changed.get(f.id)?.kind===kind?[changed.get(f.id).entry]:[])]
  effective.cardEnvelopes=[...effective.reports,...effective.pendingReports].map(e=>e.result.cardEnvelope)
  effective.coverage={...structuredClone(r.coverage),completeReports:effective.reports.length,pendingReports:effective.pendingReports.length,rejectedReports:effective.rejectedReports.length}
  const witness={version:1,protocol:'fussball-native-role-replay-v1',stage:name,originalResultSha256:s.manifest.resultSha256,originalRejectionsSha256:digest(r.rejectedReports),affected,effectiveReportsSha256:digest(effective.reports),effectivePendingReportsSha256:digest(effective.pendingReports),effectiveRejectionsSha256:digest(effective.rejectedReports),effectiveCardEnvelopesSha256:digest(effective.cardEnvelopes),derivedCoverageSha256:digest(effective.coverage)}
  out[name]={result:effective,documents,nativeRoleReplay:witness,nativeRoleReplaySha256:digest(witness)}
 }return out
}
