// GENERATED TEST-ONLY closed packets. None of these job IDs, timestamps,
// synthetic normal reports or manifests is operational execution evidence.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {join} from 'node:path'
import {sha,parserSha256,preveriPosnetek,pripravi} from './vklopi-dfb-regijo.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {captureWorkflow,replayWorkflow,captureStep,policyReplayStep} from './dfb-replay-proof.mjs'
export async function syntheticHistoricalPacket(root){
 const policy=getHistoricalStatisticsPolicy('de-regionalliga-suedwest'),slug=policy.competitionSlug,statisticsPolicy={id:policy.id,sha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-23'},sourceCommit='a'.repeat(40),template=readFileSync(new URL('./vzorci/de-dfb-2402377.html',import.meta.url),'utf8'),base='https://datencenter.dfb.de',proof={version:3,slug,sourceCommit,sourceFilesIdentical:true,statisticsPolicy,proof:[]},dirs=[]
 for(const year of[2025,2026]){
  const season=`${year}/${String(year+1).slice(2)}`,code=`regionalliga-suedwest/${year}-${year+1}`,dir=join(root,'test-only-'+year);mkdirSync(dir);dirs.push(dir)
  const clubs=['fsv-frankfurt',...Array.from({length:17},(_,i)=>`test-club-${i+1}`)],ring=[...clubs],matches=[],pages=new Map()
  for(let r=0;r<17;r++){for(let i=0;i<9;i++){const[home,away]=[ring[i],ring[17-i]];matches.push({round:r+1,home,away},{round:r+18,home:away,away:home})}ring.splice(1,0,ring.pop())}
  const a=matches.find(a=>a.round===11&&matches.some(b=>b.round===19&&b.away===a.home&&b.home!==a.away)),b=matches.find(b=>b.round===19&&b.away===a.home&&b.home!==a.away),renames=new Map([[a.home,'tsg-balingen'],[a.away,'kickers-offenbach'],[b.home,'tsv-steinbach-haiger']]),names={'tsg-balingen':'TSG Balingen','kickers-offenbach':'Kickers Offenbach','tsv-steinbach-haiger':'TSV Steinbach Haiger'},label=s=>names[s]??s
  if(renames.has(clubs[0]))renames.set(clubs.find(c=>!renames.has(c)),'fsv-frankfurt')
  for(const m of matches){m.home=renames.get(m.home)??m.home;m.away=renames.get(m.away)??m.away}
  for(const[i,m]of matches.entries()){
   const entry=year===2025?m===a?policy.entries[0]:m===b?policy.entries[1]:null:null
   m.id=entry?.sourceMatchId??String((year===2025?8000000:9000000)+i);m.played=year===2025||m.round<=2;m.day=entry?.playedOn??(year===2025?'2026-02-15':m.played?'2026-08-15':'2026-10-23');m.score=entry?[entry.observedHomeScore,entry.observedAwayScore]:[0,0]
   m.url=entry?.sourceUrl??`${base}/datencenter/${code}/${m.round}-spieltag/${m.home}-${m.away}-${m.id}`
   if(!m.played)continue
   const body=entry?readFileSync(new URL(`./vzorci/de-dfb-suedwest-${entry.sourceMatchId}.html`,import.meta.url),'utf8'):template.replaceAll('sc-paderborn-07-ii-1-fc-bocholt-2402377',`${m.home}-${m.away}-${m.id}`).replaceAll('22-spieltag',`${m.round}-spieltag`).replaceAll('22. Spieltag',`${m.round}. Spieltag`).replaceAll('sc-paderborn-07-ii',m.home).replaceAll('1-fc-bocholt',m.away).replaceAll('SC Paderborn 07 II',label(m.home)).replaceAll('1. FC Bocholt',label(m.away)).replaceAll('regionalliga-west','regionalliga-suedwest').replaceAll('Regionalliga West','Regionalliga Südwest').replaceAll('2025-2026',`${year}-${year+1}`).replaceAll('2025/2026',`${year}/${year+1}`).replaceAll('2025/26',season).replaceAll('15. Februar 2026',year===2025?'15. Februar 2026':'15. August 2026')
   pages.set(m.url,body)
  }
  for(const club of clubs.map(c=>renames.get(c)??c)){
   const path=`regionalliga-suedwest/seasons/${year}-${year+1}`,url=`${base}/competitions/${path}/teams/${club}`,rows=matches.filter(m=>m.home===club||m.away===club).map(m=>{
    const cell=(side,c)=>`<div class="c-MatchTable-team c-MatchTable-team--${side}"><a href="${base}/competitions/${path}/teams/${c}">${label(c)}</a></div>`,day=m.day.split('-').reverse().join('.')
    return `<div class="c-MatchTable-row"><div id="match_${m.id}"><div class="c-MatchTable-description">Samstag, ${day} 14:00 Uhr</div></div>${cell('home',m.home)}<div class="c-MatchTable-score"><a href="${m.url}">${m.played?m.score.join(' : '):'- : -'}</a></div>${cell('away',m.away)}</div>`
   });pages.set(url,`<!doctype html><html><head><link rel="canonical" href="${url}"></head><body>${rows.join('')}</body></html>`)
  }
  const at=new Date(Date.now()-60000).toISOString(),records=[]
  for(const[url,body]of pages){const file=sha(body)+'.html';writeFileSync(join(dir,file),body);records.push({url,at,sha256:sha(body),file})}
  writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records)+'\n');writeFileSync(join(dir,'razpored.json'),'[]');writeFileSync(join(dir,'zapisniki.json'),'[]')
  const played=matches.filter(m=>m.played).length;writeFileSync(join(dir,'porocilo.json'),JSON.stringify({vir:'dfb',koda:code,sezona:season,prenesenih:records.length,krogov:34,klubov:18,odigranih:played,zapisnikov:year===2025?304:played,postavPo11:2*(year===2025?304:played),pripravljeno:year===2026,pokritost:year===2026,napake:year===2025?['TEST-ONLY exact two strict failures']:[],opozorila:[],cakajoci:[],klubiBrezVratarja:[]}))
  const snap=preveriPosnetek(dir,records),runId=year===2025?'500':'501',jobId=year===2025?'600':'601',lineage={capture:{runId:year===2025?'100':'101',jobId:year===2025?'200':'201',commit:'b'.repeat(40),workflow:captureWorkflow,step:captureStep(season),conclusion:year===2025?'failure':'success',workflowSha256:'c'.repeat(64),parserSha256:'d'.repeat(64),artifactId:year===2025?'300':'301',artifactDigest:'sha256:'+'e'.repeat(64),indexSha256:sha(readFileSync(join(dir,'prenosi.json'))),documentsSha256:snap.documentsSha256,capturedAt:at},replay:{runId,jobId,commit:sourceCommit,workflow:replayWorkflow,step:policyReplayStep,workflowSha256:'1'.repeat(64),parserSha256:parserSha256(),artifactId:year===2025?'700':'701',artifactDigest:'sha256:'+'2'.repeat(64),generatedAt:new Date().toISOString(),statisticsPolicyId:policy.id,statisticsPolicySha256:statisticsPolicy.sha256,firstFantasyPlayedOn:statisticsPolicy.firstFantasyPlayedOn}}
  proof.proof.push({season,runId,jobId,captureCommit:sourceCommit,seasonJobPassed:true,lineage})
 }
 const manifest=await pripravi({slug,archiveDir:dirs[0],currentDir:dirs[1],sourceCommit,proof}),raw=JSON.stringify(manifest)+'\n',file=join(root,'TEST-ONLY-MANIFEST.json'),proofFile=join(root,'TEST-ONLY-PROOF.json');writeFileSync(file,raw);writeFileSync(proofFile,JSON.stringify(proof)+'\n')
 return {manifest,raw,approvedSha:sha(raw),file,proofFile,archiveDir:dirs[0],currentDir:dirs[1]}
}
