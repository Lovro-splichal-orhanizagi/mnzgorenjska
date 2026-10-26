// No football requests or database writes: admit two hosted artifacts, replay
// their original bytes, and stage the existing bulk import contract.
import {readFileSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {admitFussballPairedAudit} from './fussball-import-actions.mjs'
import {stageFussballPairedPack} from './fussball-paired-pack.mjs'
import {selectBulkCandidates,saveBulkAdmission} from './bulk-source-packs.mjs'
import {collectBulkBatch} from './bulk-league-rollout.mjs'
import {atomicCheckpoint} from './provider-league-batch.mjs'
export async function stageHostedFussballPair({env=process.env,headSha,mainSha,envFileExists=false,run,inventory,currentDirectory,archiveDirectory,directory=resolve('release/pl-de-bulk')}={},dependencies={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_RUN_ATTEMPT!=='1'||! /^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')||! /^[a-f0-9]{40}$/.test(env.EXPECTED_SHA??'')||env.EXPECTED_SHA!==env.GITHUB_SHA||headSha!==env.EXPECTED_SHA||mainSha!==env.EXPECTED_SHA||envFileExists||! /^[1-9]\d{0,14}$/.test(env.AUDIT_RUN??'')||env.COUNTRY!=='DE'||!env.CANDIDATE)throw Error('Paired staging requires a single reviewed German candidate on a first exact-main dispatch without repository .env.')
 const candidates=selectBulkCandidates('DE',env.CANDIDATE)
 const audit=admitFussballPairedAudit(run,inventory,{repository:env.GITHUB_REPOSITORY,headSha:env.EXPECTED_SHA,runId:env.AUDIT_RUN})
 if(existsSync(join(directory,'source-report.json')))throw Error('Existing source checkpoint; automatic staging replay forbidden.')
 const report=await collectBulkBatch({candidates,expectedSha:env.EXPECTED_SHA,directory:join(directory,'packs'),capture:(candidate,options)=>stageFussballPairedPack({...options,currentDirectory,archiveDirectory,candidate,audit},dependencies),saveAdmission:saveBulkAdmission,onCheckpoint:r=>atomicCheckpoint(join(directory,'source-report.json'),r)})
 if(report.status!=='STAGED')throw Error(`Paired audit staging refused: ${report.results[0]?.reason??report.status}`)
 return report
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 stageHostedFussballPair({headSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mainSha:execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{encoding:'utf8',timeout:30000}).split(/\s/)[0],envFileExists:existsSync('.env'),run:JSON.parse(readFileSync('audit-run.json')),inventory:JSON.parse(readFileSync('audit-artifacts.json')),currentDirectory:resolve('current-capture'),archiveDirectory:resolve('archive-capture')}).then(r=>console.log(JSON.stringify({status:r.status,candidates:r.results.map(r=>r.slug)}))).catch(e=>{console.error(e.message);process.exitCode=1})
}
