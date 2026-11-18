// Read-only incident inventory: public DB + retained FCF cache, no source requests.
import fs from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {glavaStrani,kljucKlubaEs,razberiKodo} from './viri/fcf.mjs'
const env=Object.fromEntries(fs.readFileSync('.env.production','utf8').split('\n').filter(s=>s.startsWith('VITE_')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)]}))
const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}})
const {data:leagues,error}=await db.from('competitions').select('id,slug,source,source_league_code,source_policy,active,countries!inner(code)').eq('active',true).or('source.eq.fcf,source_league_code.like.epsdod.gr:%');if(error)throw error
const rows=[]
for(let offset=0;;offset+=1000){const {data,error}=await db.from('matches').select('id,zapisnik_id,imported_at,played_on,home_goals,away_goals,kontumacija,vir_brez_izida,home:teams!home_team_id(id,name),away:teams!away_team_id(id,name),rounds!inner(id,competition_id,season,number)').in('rounds.competition_id',leagues.map(l=>l.id)).eq('rounds.season','2026/27').gte('played_on','2026-11-06').lte('played_on','2026-11-17').order('id').range(offset,offset+999);if(error)throw error;rows.push(...data);if(data.length<1000)break}
const report={at:new Date().toISOString(),from:'2026-11-06',through:'2026-11-17',leagues:[]}
for(const l of leagues){const matches=rows.filter(r=>r.rounds.competition_id===l.id),missing=matches.filter(m=>!m.imported_at&&!m.kontumacija),out={...l,matches,missingIds:missing.map(m=>m.id),candidates:[],unknownCache:[]};if(l.source==='fcf'){
 const range=razberiKodo(l.source_league_code)
 for(let id=range.od;id<=range.do;id++){const file=`scripts/.predpomnilnik/fcf/acta-${id}.html`;if(!fs.existsSync(file)){out.unknownCache.push(id);continue}const header=glavaStrani(fs.readFileSync(file,'utf8'));if(!header?.domaci||!header?.gostje||!header?.sezona){out.unknownCache.push(id);continue}
 const matching=missing.filter(m=>m.rounds.number===header.krog&&kljucKlubaEs(m.home.name)===kljucKlubaEs(header.domaci)&&kljucKlubaEs(m.away.name)===kljucKlubaEs(header.gostje));if(matching.length===1)out.candidates.push({reportId:`es${id}`,match:matching[0],cachedHeader:header});
 }
}report.leagues.push(out)}
fs.mkdirSync('source-inventory',{recursive:true,mode:0o700});fs.writeFileSync('source-inventory/inventory.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({leagues:leagues.length,matches:rows.length,missing:report.leagues.reduce((n,l)=>n+l.missingIds.length,0),fcfCandidates:report.leagues.reduce((n,l)=>n+l.candidates.length,0),unknownCache:report.leagues.reduce((n,l)=>n+l.unknownCache.length,0)}));process.exit(0)
