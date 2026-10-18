// Actions-only wrapper. All source evidence is replayed/approved BEFORE writes.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { pripravi, preveriOdobritev, actionsOnly, databaseCheck } from './vklopi-dfb-regijo.mjs'
import { getHistoricalStatisticsPolicy } from './lib/historical-statistics-policy.mjs'
import { loadApprovedDocuments } from './dfb-offline.mjs'
export async function importApprovedDfbRegion({file,approvedSha,archiveDir,currentDir,proofFile},{run=execFileSync,fetchFn=globalThis.fetch}={}){
 const raw=readFileSync(file,'utf8'),m=preveriOdobritev(raw,approvedSha)
 actionsOnly()
 const replay=await pripravi({slug:m.slug,archiveDir,currentDir,sourceCommit:m.sourceCommit,proof:JSON.parse(readFileSync(proofFile,'utf8'))})
 if(JSON.stringify(replay)+'\n'!==raw)throw Error('Approved manifest differs from full offline replay')
 loadApprovedDocuments(raw,approvedSha,[archiveDir,currentDir])
 // No restored cache may bypass the verified fetch loader. This workflow runs
 // on an ephemeral checkout; refuse dirty cache rather than deleting evidence.
 if(existsSync('scripts/.predpomnilnik'))throw Error('Import requires a fresh checkout without source cache')
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!key||!base||new URL(base).protocol!=='https:')throw Error('Actions database configuration required')
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}
 const url=new URL('/rest/v1/competitions',base);url.search=new URLSearchParams({slug:`eq.${m.slug}`,select:'id,slug,active,source,source_policy,source_league_code,rok_pomak_ur'})
 const response=await fetchFn(url,{headers,signal:AbortSignal.timeout(30000)}),rows=await response.json(),c=rows?.[0]
 if(!response.ok||rows.length!==1||c.slug!==m.slug||c.active!==false||c.source!=='dfb'||c.source_league_code!==m.seasons[1].code||c.rok_pomak_ur!==6)throw Error('Refusing unknown/active/changed regional import target')
 if(m.version===3||m.version===4&&m.statisticsPolicy!=null){
  if(c.source_policy!=null&&c.source_policy!==m.statisticsPolicy.id)throw Error('Refusing changed historical source policy')
  // The dedicated RPC validates this exact text again and installs metadata+
  // BOTH immutable headers atomically. Generic import never bootstraps partial sets.
  const response=await fetchFn(new URL('/rest/v1/rpc/prepare_dfb_historical_statistics',base),{method:'POST',headers,body:JSON.stringify({p_manifest:raw,p_sha256:approvedSha}),signal:AbortSignal.timeout(120000)}),prepared=await response.json()
  if(!response.ok||prepared.prepared!==true||prepared.unavailableHistoricalCount!==getHistoricalStatisticsPolicy(m.slug).entries.length||prepared.manifestSha256!==approvedSha||prepared.firstFantasyPlayedOn!==m.statisticsPolicy.firstFantasyPlayedOn||!Number.isSafeInteger(prepared.prvi_krog)||!m.seasons[1].fixtures.some(f=>f.round===prepared.prvi_krog&&f.date===prepared.firstFantasyPlayedOn&&f.played===false))throw Error(`Historical bootstrap refused: ${prepared.message??response.status}`)
 }
 const env={...process.env,SLFF_DFB_MANIFEST:resolve(file),SLFF_DFB_APPROVED_SHA:approvedSha,SLFF_DFB_ARCHIVE:resolve(archiveDir),SLFF_DFB_CURRENT:resolve(currentDir)}
 const step=(script,args=[])=>run(process.execPath,['--import',resolve('scripts/dfb-offline.mjs'),`scripts/${script}.mjs`,'--tekmovanje',m.slug,...args],{env,stdio:'inherit'})
 await step('uvoz-zapisnikov',['--liga',m.seasons[0].code])
 await step('uvoz-razporeda',['--pisi'])
 await step('uvoz-zapisnikov')
 for(const script of ['lazni-vratarji','ugani-pozicije','ovrednoti-igralce'])await step(script,['--pisi'])
 // Preflight remains separate from activation and independently rechecks every
 // persisted canonical fact, installed marker, price/keeper and future deadline.
 return databaseCheck(raw,approvedSha,false,{fetchFn})
}
async function main(){
 const [file,approvedSha,archiveDir,currentDir,proofFile]=process.argv.slice(2)
 console.log(JSON.stringify(await importApprovedDfbRegion({file,approvedSha,archiveDir,currentDir,proofFile})))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
