#!/usr/bin/env node
// Strict local receipt replay. No network, environment credentials, database or importer.
import { readFileSync, statSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { parseDriblReport, verifyDriblReceipt } from './viri/dribl.mjs'
function localBytes(file,max=2_000_000){if(typeof file!=='string'||/^[a-z][a-z\d+.-]*:/i.test(file))throw new Error('Local files only');const s=statSync(file);if(!s.isFile()||s.size>max)throw new Error('Bounded local file required');return readFileSync(file)}
try{
 const args=process.argv.slice(2),v=new Map()
 if(args.length!==4)throw new Error('usage: --manifest <local.json> --match <observed-match-id>')
 for(let i=0;i<args.length;i+=2){if(!['--manifest','--match'].includes(args[i])||v.has(args[i])||!args[i+1])throw new Error('Unique --manifest and --match required');v.set(args[i],args[i+1])}
 const matchId=v.get('--match');if(!/^[A-Za-z0-9]+$/.test(matchId??''))throw new Error('Invalid match ID')
 const path=resolve(v.get('--manifest')),manifest=JSON.parse(localBytes(path,200_000)),base=dirname(path)
 if(manifest.version!==1||manifest.source!=='dribl'||!Array.isArray(manifest.responses))throw new Error('Unsupported receipt manifest')
 const load=pathname=>{
  const rows=manifest.responses.filter(r=>{try{return new URL(r.url).pathname===pathname}catch{return false}})
  if(rows.length!==1)throw new Error(`Exactly one original receipt required for ${pathname}`)
  const m=rows[0];if(typeof m.file!=='string'||basename(m.file)!==m.file||!/^au-dribl-[A-Za-z0-9-]+\.json$/.test(m.file))throw new Error('Manifest file must be a scoped local basename')
  const r={...m,byteLength:m.byteLength??m.bytes,bytes:localBytes(resolve(base,m.file))}
  const check=verifyDriblReceipt(r);if(!check.ok)throw new Error(`Receipt integrity failure: ${check.issues.join(', ')}`)
  return r
 }
 const match=load(`/api/matchcentre/${matchId}`),a=JSON.parse(match.bytes).data?.attributes
 const home=load(`/api/matchcentre-match-members/match/${matchId}/team/${a?.home_team_hash_id}`),away=load(`/api/matchcentre-match-members/match/${matchId}/team/${a?.away_team_hash_id}`)
 const report=parseDriblReport({match,home,away},{scope:manifest.scope})
 report.provenance={originalReceiptsVerified:true,permissionsVerified:false,responses:[match,home,away].map(r=>({url:r.url,sha256:r.sha256,byteLength:r.bytes.length,capturedAt:r.capturedAt}))}
 process.stdout.write(JSON.stringify(report,null,2)+'\n');process.exitCode=report.reportStatistikaPripravljena?0:2
}catch(e){process.stderr.write(`dribl: ${e.message}\n`);process.exitCode=1}
