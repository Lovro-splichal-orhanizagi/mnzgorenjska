// Opt-in strict women's runtime. Complete installed DB authority must exist
// before traversal; initial marker installation belongs to the offline writer.
import {createHash} from 'node:crypto'
import {hnsWomenOfflineDocument} from '../hr-zenske-offline.mjs'
import {parseHnsWomenReport,hnsWomenFixtureIdentity} from './hns-zenske-quality.mjs'
import {hnsWomenScheduleFixtures} from '../hr-zenske-paket.mjs'
import {validateInstalledHistoricalStatisticsMarkers,classifyHistoricalStatistics} from '../lib/historical-statistics-policy.mjs'
const fail=message=>{throw Error(`HNS women runtime: ${message}`)}
const refusal=(message,status)=>Object.assign(Error(`HNS women refusal: ${message}`),{zavrnitev:true,status})
const challenge=html=>/<title>\s*(?:Just a moment|Access Denied)|cf-chl-/i.test(html)
const scope=code=>{if(!['114471579','108043476'].includes(code))fail('unreviewed source container scope');return code}
export function withHnsWomenStatistics(base,competition,{installedHistoricalMarkers}={}) {
 if(base?.ime!=='hns'||competition?.source!=='hns'||competition.slug!=='hr-prva-hnlz'||competition.source_policy!=='hr-hnlz-v1'||competition.date_only_deadline_policy!=='midnight-local-v1'||competition.source_league_code!=='114471579')fail('invalid opt-in competition/deadline tuple')
 const binding=validateInstalledHistoricalStatisticsMarkers({competition,binding:installedHistoricalMarkers}),context={...competition,firstFantasyPlayedOn:binding.firstFantasyPlayedOn},markers=new Map(binding.markers.map(m=>[m.sourceMatchId,m])),verified=new WeakMap()
 async function fixtures(code,read) {
  scope(code)
  const html=await read(`https://semafor.hns.family/natjecanja/${code}/x/`,`natjecanje-${code}.html`,true)
  const rows=hnsWomenScheduleFixtures(html,code)
  for(const row of rows) {
   const marker=markers.get(row.id)
   if(marker) {
    const c=classifyHistoricalStatistics({competition:context,fixture:hnsWomenFixtureIdentity(row,code),rawSha256:marker.rawSha256})
    if(c.kind!=='unavailable_historical')fail('installed fixture identity differs from current published schedule')
   }
  }
  return rows
 }
 async function reports(code,read,options={}) {
  scope(code)
  const selected=options.samoZapisnik==null?null:String(options.samoZapisnik)
  if(selected&&markers.has(selected))return []
  if(selected&&!/^[1-9]\d*$/.test(selected))fail('invalid native report selection')
  const rows=await fixtures(code,read)
  if(selected&&!rows.some(t=>t.id===selected&&t.izid))fail('selected report is not a published played fixture in this container')
  const skip=new Set(options.preskoci??[]),out=[]
  for(const f of rows.filter(f=>f.izid&&(!selected||f.id===selected)&&!markers.has(f.id)&&!skip.has(f.id))) {
   const report=parseHnsWomenReport(await read(`https://semafor.hns.family/utakmice/${f.id}/x/`,`tekma-${f.id}.html`,options.sveziZapisniki?.has(f.id)??false),{competition:context,fixture:f,sourceCompetitionId:code})
   if(report.statisticsStatus!=='available'||!report.z)fail('uninstalled historical or unverified normal report')
   verified.set(report.z,report.appearances);out.push(report)
  }
  return out
 }
 return {...base,premorMs:1000,razporedBrezUvodnegaPrenosa:true,brezRezerveRazporeda:true,
  // Prevent the generic transport's redirects/retries from changing source scope
  // or repeating a refusal. Other providers retain their transport behavior.
  zaPredpomnilnik(html,file) {
   const m=/^(natjecanje|razpored|tekma)-([1-9]\d*)\.html$/.exec(file)
   if(!m)return false
   const doc=hnsWomenOfflineDocument(`https://semafor.hns.family/${m[1]==='tekma'?'utakmice':'natjecanja'}/${m[2]}/x/`)
   return !doc||createHash('sha256').update(html).digest('hex')===doc.sha256
  },
  async fetch(url,init={}) {
   if((init.method??url?.method??'GET')!=='GET')fail('only GET source requests are permitted')
   if(!/^https:\/\/semafor\.hns\.family\/(?:natjecanja\/(?:114471579|108043476)|utakmice\/[1-9]\d*)\/[a-z0-9-]+\/$/.test(String(url)))fail('foreign source request')
   let response;try{response=await globalThis.fetch(url,{...init,redirect:'error'})}catch(e){throw Error(`HNS women source request failed: ${e.message}`)}
   if([401,403,429].includes(response.status))throw refusal(`HTTP${response.status}`,response.status)
   if(response.status!==200)throw Object.assign(Error(`HNS women source HTTP${response.status}`),{status:response.status})
   if(challenge(await response.clone().text()))throw refusal('challenge page',response.status)
   return response
  },jeIzziv:challenge,zavrnitev:refusal,
  zapisniki:reports,
  posamezniZapisnik(code,{id}) {
   scope(code);if(!/^[1-9]\d*$/.test(String(id)))fail('invalid native report selection')
   return read=>reports(code,read,{samoZapisnik:String(id)})
  },
  nastopi(z){if(!verified.has(z))fail('unverified report cannot derive legacy appearances');return structuredClone(verified.get(z))},
  async razporedVseStrani(code,read) {
   const rows=await fixtures(code,read),rounds=new Map()
   for(const f of rows) {
    if(!rounds.has(f.krog))rounds.set(f.krog,{stevilka:f.krog,tekme:[]})
    rounds.get(f.krog).tekme.push({...f,odigrana:!!f.izid,kontumacija:false,...(markers.has(f.id)?{historicalMarker:markers.get(f.id)}:{})})
   }
   return [...rounds.values()].sort((a,b)=>a.stevilka-b.stevilka)
  },
 }
}
