// Private, immutable original-byte evidence. A community decision changes only
// the recipient overlay; source rows and official attribution stay untouched.
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './fussball-statistika.mjs'
import {normalizeFussballReport} from '../fussball-import.mjs'
import {FUSSBALL_SOURCE_ID} from '../lib/fussball-identity.mjs'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const requireProof=(ok,reason)=>{if(!ok)throw Object.assign(Error(`fussball card envelope: ${reason}`),{code:'FUSSBALL_CARD_ENVELOPE_INVALID'})}
const key=id=>parseInt(hash(id).slice(0,13),16)+2**52
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
const pack=bytes=>({base64:Buffer.from(bytes).toString('base64'),sha256:hash(bytes)})
const revision=b=>hash(b.report.sha256+'\n'+b.lineup.sha256+'\n'+b.fonts.map(f=>f.fontId+':'+f.sha256).join('\n'))
export function buildFussballCardEnvelope(mainHtml,lineupHtml,{fonts,id,season,result,sourceUrl}={}){
 const z=result.z,year=Number(z.datum.slice(0,4))-(Number(z.datum.slice(5,7))<7?1:0)
 const dateSeason=`${year}/${String(year+1).slice(2)}`
 season??=dateSeason
 requireProof(season===dateSeason,'season differs from official report date')
 requireProof(/^20\d{2}\/\d{2}$/.test(season)&&Number(season.slice(5))===(Number(season.slice(0,4))+1)%100,'invalid season')
 const bundle={report:pack(Buffer.from(mainHtml)),lineup:pack(Buffer.from(lineupHtml)),fonts:Object.entries(fonts).sort(([a],[b])=>a.localeCompare(b)).map(([fontId,f])=>({fontId,...pack(f.bytes)}))}
 const revisionSha256=revision(bundle),reportId=z.zapisnikId
 const cards=result.dogodki.filter(e=>['rumeni','rdeci'].includes(e.vrsta)).map(e=>({eventKey:hash(`${reportId}:${revisionSha256}:${e.ordinal}:${e.eventSha256}`),ordinal:e.ordinal,eventSha256:e.eventSha256,type:e.vrsta==='rumeni'?'yellow':e.drugiRumeni?'second_yellow':'red',side:e.ekipaIdx,minute:e.minuta,base:e.osnovnaMinuta,added:e.dodatek,half:e.polcas,officialSourceId:e.officialSourceId??(e.attribution==='community'?null:e.virId)}))
 const roster=[z.domaci,z.gostje].flatMap((t,side)=>[...t.postava,...t.rezerve].map(p=>({sourceId:p.virId,regSt:key(p.virId),side,name:p.ime,shirt:p.st,starter:t.postava.includes(p),goalkeeper:p.vratar})))
 requireProof(roster.length<=80&&cards.length<=256,'bounded roster/cards exceeded')
 requireProof(Buffer.byteLength(mainHtml)+Buffer.byteLength(lineupHtml)+bundle.fonts.reduce((n,f)=>n+Buffer.from(f.base64,'base64').length,0)<=8*1024*1024,'bounded source bundle exceeded')
 return {version:1,reportId,matchId:id,sourceUrl,season,round:z.krog,date:z.datum,time:z.ura,homeName:z.domaci.ime,awayName:z.gostje.ime,score:structuredClone(z.rezultat),revisionSha256,cards,roster,bundle}
}
export function validateFussballCardEnvelope(envelope){
 const e=envelope,b=e?.bundle
 requireProof(e?.version===1&&Array.isArray(e.cards)&&e.cards.length<=256&&Array.isArray(e.roster)&&e.roster.length<=80&&b&&Array.isArray(b.fonts)&&b.fonts.length<=128,'invalid bounded envelope')
 let total=0
 const unpack=row=>{
  requireProof(row&&typeof row.base64==='string'&&row.base64.length<=Math.ceil(8*1024*1024/3)*4&&/^[a-f0-9]{64}$/.test(row.sha256??''),'invalid byte evidence')
  const bytes=Buffer.from(row.base64,'base64');total+=bytes.length
  requireProof(bytes.toString('base64')===row.base64&&hash(bytes)===row.sha256&&total<=8*1024*1024,'source byte/hash/size mismatch')
  return bytes
 }
 const report=unpack(b.report),lineup=unpack(b.lineup),fonts=Object.create(null)
 for(const f of b.fonts){requireProof(/^[a-z0-9]{8}$/.test(f.fontId??'')&&!fonts[f.fontId],'duplicate/invalid font');fonts[f.fontId]={bytes:unpack(f),sha256:f.sha256}}
 requireProof(revision(b)===e.revisionSha256&&e.roster.every(p=>FUSSBALL_SOURCE_ID.test(p.sourceId??'')&&p.regSt===key(p.sourceId)),'revision/identity mismatch')
 const decoder=new TextDecoder('utf-8',{fatal:true}),mainHtml=decoder.decode(report),lineupHtml=decoder.decode(lineup)
 const result=razberiFantasyZapisnik(mainHtml,lineupHtml,{id:e.matchId,lineupId:e.matchId,fonts,season:e.season,cardPolicy:'community-v1'})
 requireProof(canonical(result.cardEnvelope)===canonical(e),'metadata/card/roster differs from original bytes')
 return {cardEnvelope:result.cardEnvelope,result,mainHtml,lineupHtml,fonts}
}
export function replayFussballCardEnvelope(envelope,resolutions={}){
 const verified=validateFussballCardEnvelope(envelope),e=verified.cardEnvelope
 requireProof(resolutions&&typeof resolutions==='object'&&!Array.isArray(resolutions),'invalid recipient resolutions')
 const recipients={}
 for(const [eventKey,sourceId] of Object.entries(resolutions)){
  const card=e.cards.find(c=>c.eventKey===eventKey),p=e.roster.find(p=>p.sourceId===sourceId)
  requireProof(card&&card.officialSourceId===null&&p&&p.side===card.side,'unknown/official event or invalid historical recipient')
  recipients[card.ordinal]=sourceId
 }
 const result=razberiFantasyZapisnik(verified.mainHtml,verified.lineupHtml,{id:e.matchId,lineupId:e.matchId,fonts:verified.fonts,season:e.season,cardPolicy:'community-v1',cardRecipients:recipients})
 requireProof(!result.statisticsPending,'unresolved red recipients remain pending')
 const fixture={id:e.matchId,zapisnikId:e.reportId,url:e.sourceUrl,krog:e.round,datum:e.date,ura:e.time,domaci:e.homeName,gostje:e.awayName,rezultat:e.score}
 return normalizeFussballReport({fixture,result},fixture,e.season)
}
