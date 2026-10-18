// Dedicated Actions writer. Every import replays one immutable closed packet;
// activation is possible only through the complete same-transaction SQL gate.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,lstatSync,mkdirSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readHnsWomenPacket} from './hr-zenske-paket.mjs'
import {vseVrstice} from './strani.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',root=fileURLToPath(new URL('../',import.meta.url)),slug='hr-prva-hnlz'
const fail=message=>{throw Error(`HNS women release: ${message}`)},sha=bytes=>createHash('sha256').update(bytes).digest('hex'),digest=value=>/^[a-f0-9]{64}$/.test(value??'')
export function validateHnsWomenActionsContext(env,reviewedSha,checkoutSha) {
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_REPOSITORY!==repository||!/^[a-f0-9]{40}$/.test(reviewedSha??'')||env.GITHUB_SHA!==reviewedSha||checkoutSha!==reviewedSha)fail('exact reviewed main checkout, repository and Actions dispatch required')
}
export function validateHnsWomenStaging(value) {
 const asset=value.release?.assets?.find(a=>a.id===value.assetId)
 if(value.repository!==repository||!Number.isSafeInteger(value.releaseId)||value.releaseId<=0||!Number.isSafeInteger(value.assetId)||value.assetId<=0||value.release?.id!==value.releaseId||value.release?.draft!==true||value.release.url!==`https://api.github.com/repos/${repository}/releases/${value.releaseId}`||asset?.url!==`https://api.github.com/repos/${repository}/releases/assets/${value.assetId}`||asset.name!==`hns-women-${value.reviewedSha}.tar.gz`||asset.state!=='uploaded'||!Buffer.isBuffer(value.assetBytes)||value.assetBytes.length<1||value.assetBytes.length>32_000_000||asset.size!==value.assetBytes.length||!digest(value.archiveSha256)||!digest(value.manifestSha256)||sha(value.assetBytes)!==value.archiveSha256||asset.digest!=null&&asset.digest!==`sha256:${value.archiveSha256}`||!/^[a-f0-9]{40}$/.test(value.reviewedSha??''))fail('draft release/asset/repository/hash proof differs')
 return asset
}
export function extractHnsWomenArchive(archive,destination) {
 try{execFileSync('python3',[join(root,'scripts/hr-zenske-stage.py'),resolve(archive),resolve(destination)],{stdio:['ignore','pipe','pipe']})}
 catch(error){fail(`archive extraction refused: ${error.stderr?.toString().trim()??error.message}`)}
}
export function runHnsWomenImports(packetDirectory,manifestSha256,{run=execFileSync}={}) {
 const env={...process.env,SLFF_HNS_WOMEN_PACKET_DIR:resolve(packetDirectory),SLFF_HNS_WOMEN_PACKET_SHA256:manifestSha256}
 for(const [script,...args]of [['uvoz-zapisnikov.mjs','--tekmovanje',slug,'--liga','108043476'],['uvoz-razporeda.mjs','--tekmovanje',slug,'--pisi'],['uvoz-zapisnikov.mjs','--tekmovanje',slug],['ugani-pozicije.mjs','--tekmovanje',slug,'--pisi'],['ovrednoti-igralce.mjs','--tekmovanje',slug,'--pisi']])run(process.execPath,['--import',join(root,'scripts/hr-zenske-offline.mjs'),`scripts/${script}`,...args],{cwd:root,env,stdio:'inherit'})
}
export async function refreshHnsWomenDerivedState(db,competitionId) {
 if(!Number.isSafeInteger(competitionId)||competitionId<=0)fail('prepared competition identity required for scoped refresh')
 const rounds=await vseVrstice((from,to)=>db.from('rounds').select('id').eq('competition_id',competitionId).order('id').range(from,to))
 for(const round of rounds){const {error}=await db.rpc('recompute_round_scores',{p_round_id:round.id});if(error)fail(`round-score refresh: ${error.message}`)}
 const people=await vseVrstice((from,to)=>db.from('players').select('id').eq('competition_id',competitionId).order('id').range(from,to))
 const {error}=await db.rpc('osvezi_statistiko_igralcev',{p_igralci:people.map(p=>p.id)});if(error)fail(`season cache refresh: ${error.message}`)
}
export async function runHnsWomenReleaseGate(db,manifest,manifestSha256,{activate=false}={}) {
 const {data,error}=await db.rpc('check_hns_women_release',{p_manifest:JSON.stringify(manifest),p_sha256:manifestSha256,p_activate:activate})
 if(error)fail(`canonical readiness gate: ${error.message}`)
 if(data?.verified!==true||data.active!==activate||data.manifestSha256!==manifestSha256||data.sourceCommit!==manifest.sourceCommit||data.parserSha256!==manifest.parserSha256||data.fixtures!==131||data.archiveFixtures!==75||data.currentFixtures!==56||data.unavailableHistorical!==3||data.normalComplete!==manifest.coverage.normalComplete||data.pending!==manifest.coverage.pending||data.eligibleCurrentClubs!==8||!Number.isSafeInteger(data.activePlayers)||data.activePlayers<15||data.firstFantasyRound!==manifest.firstFantasyRound||!Number.isFinite(Date.parse(data.deadlineAt))||Date.parse(data.deadlineAt)<=Date.now()||Date.parse(data.deadlineAt)>Date.parse(manifest.future.deadlineAt)||!Number.isFinite(data.defaultPricePercent)||data.defaultPricePercent>70||!Number.isFinite(data.maxPrice)||data.maxPrice<8||!Number.isFinite(data.cheapestLegal15)||data.cheapestLegal15>100)fail('canonical readiness gate returned incomplete/mismatched proof')
 const captures=records=>records?.map(record=>({code:record.code,capturedAt:record.capturedAt,sha256:record.sha256}))
 if(data.statisticsPolicyId!==manifest.statisticsPolicy.id||data.statisticsPolicySha256!==manifest.statisticsPolicy.sha256||data.firstFantasyPlayedOn!==manifest.statisticsPolicy.firstFantasyPlayedOn||!['fantasy_midnight_date_only','published_kickoff_offset'].includes(data.deadlineReason)||!Array.isArray(data.originalCaptures)||JSON.stringify(captures(data.originalCaptures))!==JSON.stringify(captures(manifest.schedules))||['hnsRequests','otherRequests','total','refusalObserved'].some(key=>data.sourceBudget?.[key]!==manifest.sourceBudget[key]))fail('canonical readiness gate policy/original receipt proof differs')
 return data
}
function file(path,limit) {
 const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)fail('unsafe/oversized evidence file')
 return readFileSync(path)
}
function packet(directory,manifestSha256,reviewedSha) {
 const result=readHnsWomenPacket(directory,{approvedSha256:manifestSha256,requireReady:true})
 if(result.manifest.sourceCommit!==reviewedSha)fail('packet source commit differs from reviewed main')
 return result
}
function outputs(manifestSha256,reviewedSha) {
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`manifest_sha256=${manifestSha256}\nreviewed_sha=${reviewedSha}\n`)
}
async function main() {
 const [mode,...args]=process.argv.slice(2),arg=name=>{const i=args.indexOf(`--${name}`);if(i<0||!args[i+1]||args[i+1].startsWith('--'))fail(`missing ${name}`);return args[i+1]}
 const reviewedSha=arg('reviewed-sha'),manifestSha256=arg('manifest-sha256')
 validateHnsWomenActionsContext(process.env,reviewedSha,execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim())
 if(!digest(manifestSha256))fail('exact approved manifest SHA required')
 if(mode==='stage'||mode==='verify') {
  if(process.env.SUPABASE_SERVICE_ROLE_KEY)fail('evidence reader must not receive writer credentials')
  const evidenceDirectory=resolve(arg('evidence-dir')),packetDirectory=resolve(arg('packet-dir'));let staging
  if(mode==='stage') {
   const releaseId=Number(arg('release-id')),assetId=Number(arg('asset-id')),archiveSha256=arg('archive-sha256')
   if(!Number.isSafeInteger(releaseId)||releaseId<=0||!Number.isSafeInteger(assetId)||assetId<=0||!digest(archiveSha256))fail('exact staging release/asset IDs and archive SHA required')
   const release=JSON.parse(execFileSync('gh',['api',`repos/${repository}/releases/${releaseId}`],{encoding:'utf8',maxBuffer:1_000_000}))
   const assetBytes=execFileSync('gh',['api',`repos/${repository}/releases/assets/${assetId}`,'--header','Accept: application/octet-stream'],{maxBuffer:32_000_000})
   staging={repository,releaseId,assetId,archiveSha256,manifestSha256,reviewedSha,release}
   validateHnsWomenStaging({...staging,assetBytes});mkdirSync(evidenceDirectory,{mode:0o700})
   writeFileSync(join(evidenceDirectory,'packet.tar.gz'),assetBytes,{flag:'wx',mode:0o600});writeFileSync(join(evidenceDirectory,'staging.json'),JSON.stringify(staging),{flag:'wx',mode:0o600})
  }else {
   staging=JSON.parse(file(join(evidenceDirectory,'staging.json'),1_000_000))
   if(staging.releaseId!==Number(arg('release-id'))||staging.assetId!==Number(arg('asset-id'))||staging.archiveSha256!==arg('archive-sha256'))fail('retained staging and approved asset inputs differ')
  }
  if(staging.reviewedSha!==reviewedSha||staging.manifestSha256!==manifestSha256)fail('staging and reviewed inputs differ')
  validateHnsWomenStaging({...staging,assetBytes:file(join(evidenceDirectory,'packet.tar.gz'),32_000_000)})
  extractHnsWomenArchive(join(evidenceDirectory,'packet.tar.gz'),packetDirectory)
  const {manifest}=packet(packetDirectory,manifestSha256,reviewedSha)
  console.log(JSON.stringify({verified:true,active:false,coverage:manifest.coverage,originalCaptures:manifest.schedules.map(s=>({code:s.code,capturedAt:s.capturedAt,sha256:s.sha256})),future:manifest.future,manifestSha256}))
  outputs(manifestSha256,reviewedSha);return
 }
 if(!['prepare','import','check','activate'].includes(mode))fail('mode must be stage, verify, prepare, import, check or activate')
 const packetDirectory=resolve(arg('packet-dir')),{manifest}=packet(packetDirectory,manifestSha256,reviewedSha)
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL
 if(!service||!base)fail('Actions writer credentials required after packet proof')
 const {createClient}=await import('@supabase/supabase-js'),db=createClient(base,service,{auth:{persistSession:false}})
 if(mode==='check'||mode==='activate'){console.log(JSON.stringify(await runHnsWomenReleaseGate(db,manifest,manifestSha256,{activate:mode==='activate'})));return}
 const {data,error}=await db.rpc('prepare_hns_women_release',{p_manifest:JSON.stringify(manifest),p_sha256:manifestSha256})
 if(error||data?.prepared!==true||data.active!==false)fail(error?.message??'atomic inactive preparation failed')
 console.log(JSON.stringify(data))
 if(mode==='import') {
  runHnsWomenImports(packetDirectory,manifestSha256)
  await refreshHnsWomenDerivedState(db,data.competitionId)
  console.log(JSON.stringify(await runHnsWomenReleaseGate(db,manifest,manifestSha256)))
 }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main()
