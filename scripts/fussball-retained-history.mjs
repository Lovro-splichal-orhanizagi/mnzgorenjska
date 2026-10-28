// Offline preparation only. This fixed retained-source review is deliberately
// NOT an installed historical policy, native binding or full-season admission.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync} from 'node:fs'
import {join} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup,razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'

const rawDescriptor=readFileSync(new URL('./policies/fussball-baden-retained-history.json',import.meta.url))
const reviewed=JSON.parse(rawDescriptor)
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const descriptorSha256=sha(rawDescriptor)
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
const requireProof=(ok,why)=>{if(!ok)throw Error(`fussball retained history: ${why}`)}
const date=value=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value
const readRegular=(directory,file)=>{
 // All paths come from fixed reviewed hashes, never a caller-supplied manifest.
 const path=join(directory,file),stat=lstatSync(path)
 requireProof(stat.isFile()&&!stat.isSymbolicLink(),'document must be a regular file')
 return readFileSync(path)
}

/** Exact source classification; cutoff is a candidate, never installed authority. */
export function classifyRetainedFussballHistory({fixture,rejection,documents,firstFantasyPlayedOnCandidate}={}){
 const entry=reviewed.entries.find(e=>e.fixture.id===fixture?.id)
 requireProof(entry&&isDeepStrictEqual(fixture,entry.fixture),'unreviewed or changed fixture')
 requireProof(isDeepStrictEqual(rejection?.fixture,entry.fixture),'rejection fixture differs')
 requireProof(rejection?.code===entry.defect.code&&rejection?.reason===entry.defect.reason&&Object.keys(rejection).sort().join(',')==='code,fixture,reason','reviewed strict defect differs')
 requireProof(date(firstFantasyPlayedOnCandidate)&&fixture.datum<firstFantasyPlayedOnCandidate,'valid strictly prelaunch candidate cutoff required')
 requireProof(documents instanceof Map,'closed document map required')
 const bundle=new Map()
 for(const expected of entry.documents){
  const actual=documents.get(expected.url),bytes=actual?.bytes
  requireProof(actual&&(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array),'missing document bytes')
  const metadata={...actual,bytes:bytes.length}
  requireProof(bytes.length===expected.byteLength&&sha(bytes)===expected.sha256&&sha(stable(metadata))===expected.metadataSha256,'document bytes/identity/original receipt differs')
  bundle.set(expected.url,{kind:expected.kind,bytes:Buffer.from(bytes)})
 }
 const main=bundle.get(fixture.url),html=main.bytes.toString('utf8')
 const info=inspectFussballPage(html,{kind:'report',matchId:fixture.id})
 const lineup=bundle.get(info.lineupUrl)
 requireProof(lineup?.kind==='lineup','observed lineup document differs')
 const lineupHtml=lineup.bytes.toString('utf8')
 const ids=[...new Set([...info.fontIds,...inspectFussballLineup(lineupHtml)])].sort()
 requireProof(isDeepStrictEqual(ids,entry.observedFontIds),'observed font identity set differs')
 const fonts=Object.create(null),used=new Set([fixture.url,info.lineupUrl])
 for(const id of ids){
  const cssUrl=info.cssTemplate.replace('%ID%',id),css=bundle.get(cssUrl)
  // Retained fonts suffice to reproduce this precise failure. Uncaptured fonts
  // observed after that failure are not invented or claimed as complete proof.
  if(!css)continue
  requireProof(css.kind==='css','observed CSS kind differs')
  const url=fussballFontUrl(css.bytes.toString('utf8'),id),font=bundle.get(url)
  requireProof(url===`https://www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font`&&font?.kind==='font','observed CSS/font binding differs')
  used.add(cssUrl);used.add(url)
  fonts[id]={bytes:font.bytes,sha256:sha(font.bytes)}
 }
 requireProof(used.size===bundle.size,'unobserved document in reviewed bundle')
 let error
 try{razberiFantasyZapisnik(html,lineupHtml,{fonts,id:fixture.id,lineupId:fixture.id,cardPolicy:reviewed.cardPolicy,season:reviewed.season})}catch(e){error=e}
 requireProof(error?.code===entry.defect.code&&error.message===entry.defect.reason,'strict defect changed or report became parseable')
 return {
  kind:'reviewed-retained-source-unavailable',id:fixture.zapisnikId,url:fixture.url,
  fixture:structuredClone(fixture),sourceCompetitionId:`${reviewed.staffel}:${reviewed.season}`,season:reviewed.season,
  statisticsStatus:'unavailable_historical',statisticsReason:entry.defect.kind,
  starters:null,appearances:null,goals:null,nastopi:null,goli:null,importedAt:null,
  sourceRawSha256:entry.documents.find(d=>d.kind==='report').sha256,
  retainedReviewSha256:descriptorSha256,retainedBundleSha256:sha(stable(entry)),
  firstFantasyPlayedOnCandidate,nativeBindingRequired:true,activationEligible:false,
 }
}

/** Preparation seam for this exact retained artifact; no network/DB fallback.
 * Does not certify current freshness, deployed code or latest transport replay.
 * Complete archive inventory and native installation remain separate gates.
 */
export function loadRetainedFussballHistory(directory,{firstFantasyPlayedOnCandidate}={}){
 const bound=[['manifest.json','manifestSha256'],['result.json','resultSha256'],['attempts.jsonl','journalSha256']]
 const files=Object.fromEntries(bound.map(([file,key])=>{
  const bytes=readRegular(directory,file)
  requireProof(sha(bytes)===reviewed.capture[key],'retained capture metadata/result/journal changed')
  return [file,bytes]
 }))
 const manifest=JSON.parse(files['manifest.json']),result=JSON.parse(files['result.json'])
 requireProof(manifest.options.staffel===reviewed.staffel&&manifest.options.season===reviewed.season&&manifest.options.cardPolicy===reviewed.cardPolicy&&manifest.codeSha256===reviewed.capture.codeSha256,'retained capture scope differs')
 requireProof(isDeepStrictEqual(result.rejectedReports.map(r=>r.fixture.id),reviewed.entries.map(e=>e.fixture.id)),'retained rejection inventory differs')
 const documents=new Map()
 for(const expected of reviewed.entries.flatMap(e=>e.documents)){
  if(documents.has(expected.url))continue
  const metadata=manifest.documents.find(d=>d.url===expected.url)
  requireProof(metadata,'missing document metadata')
  documents.set(expected.url,{...metadata,bytes:readRegular(directory,expected.file)})
 }
 const fixtures=result.rejectedReports.map(rejection=>{
  const fixture=result.schedule.fixtures.find(f=>f.id===rejection.fixture.id)
  return classifyRetainedFussballHistory({fixture,rejection,documents,firstFantasyPlayedOnCandidate})
 })
 return {version:1,kind:'retained-source-preparation',staffel:reviewed.staffel,season:reviewed.season,
  fixtures,retainedCapture:structuredClone(reviewed.capture),retainedReviewSha256:descriptorSha256,
  nativeBindingRequired:true,activationEligible:false}
}
