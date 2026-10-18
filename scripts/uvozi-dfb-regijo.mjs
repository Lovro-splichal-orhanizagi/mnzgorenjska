// Actions-only wrapper. All source evidence is replayed/approved BEFORE writes.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { pripravi, preveriOdobritev, actionsOnly, databaseCheck } from './vklopi-dfb-regijo.mjs'
import { loadApprovedDocuments } from './dfb-offline.mjs'
async function main(){
 const [file,approvedSha,archiveDir,currentDir,proofFile]=process.argv.slice(2)
 const raw=readFileSync(file,'utf8'),m=preveriOdobritev(raw,approvedSha)
 if(m.version===3)throw Error('Historical import requires the separately reviewed shared importer/RPC checkpoint')
 actionsOnly()
 const replay=await pripravi({slug:m.slug,archiveDir,currentDir,sourceCommit:m.sourceCommit,proof:JSON.parse(readFileSync(proofFile,'utf8'))})
 if(JSON.stringify(replay)+'\n'!==raw)throw Error('Approved manifest differs from full offline replay')
 loadApprovedDocuments(raw,approvedSha,[archiveDir,currentDir])
 // No restored cache may bypass the verified fetch loader. This workflow runs
 // on an ephemeral checkout; refuse dirty cache rather than deleting evidence.
 if(existsSync('scripts/.predpomnilnik'))throw Error('Import requires a fresh checkout without source cache')
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!key||!base||new URL(base).protocol!=='https:')throw Error('Actions database configuration required')
 const url=new URL('/rest/v1/competitions',base);url.search=new URLSearchParams({slug:`eq.${m.slug}`,select:'slug,active,source,source_league_code,rok_pomak_ur'})
 const response=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}}),rows=await response.json(),c=rows?.[0]
 if(!response.ok||rows.length!==1||c.active!==false||c.source!=='dfb'||c.source_league_code!==m.seasons[1].code||c.rok_pomak_ur!==6)throw Error('Refusing unknown/active/changed regional import target')
 const env={...process.env,SLFF_DFB_MANIFEST:resolve(file),SLFF_DFB_APPROVED_SHA:approvedSha,SLFF_DFB_ARCHIVE:resolve(archiveDir),SLFF_DFB_CURRENT:resolve(currentDir)}
 const run=(script,args=[])=>execFileSync(process.execPath,['--import',resolve('scripts/dfb-offline.mjs'),`scripts/${script}.mjs`,'--tekmovanje',m.slug,...args],{env,stdio:'inherit'})
 run('uvoz-zapisnikov',['--liga',m.seasons[0].code])
 run('uvoz-razporeda',['--pisi'])
 run('uvoz-zapisnikov')
 for(const script of ['lazni-vratarji','ugani-pozicije','ovrednoti-igralce'])run(script,['--pisi'])
 console.log(JSON.stringify(await databaseCheck(raw,approvedSha,false)))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
