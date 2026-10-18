// Dedicated Actions writer. Every import replays one immutable closed packet;
// this command has no live HNS capture mode and cannot activate a competition.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,lstatSync,mkdirSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readHnsWomenPacket} from './hr-zenske-paket.mjs'
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
 if(!['prepare','import'].includes(mode))fail('mode must be stage, verify, prepare or import; activation is unavailable')
 const packetDirectory=resolve(arg('packet-dir')),{manifest}=packet(packetDirectory,manifestSha256,reviewedSha)
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL
 if(!service||!base)fail('Actions writer credentials required after packet proof')
 const {createClient}=await import('@supabase/supabase-js'),db=createClient(base,service,{auth:{persistSession:false}})
 const {data,error}=await db.rpc('prepare_hns_women_release',{p_manifest:JSON.stringify(manifest),p_sha256:manifestSha256})
 if(error||data?.prepared!==true||data.active!==false)fail(error?.message??'atomic inactive preparation failed')
 console.log(JSON.stringify(data))
 if(mode==='import') {
  runHnsWomenImports(packetDirectory,manifestSha256)
  console.log('HNS source import and ordinary valuation finished; league remains inactive. Dedicated readiness and activation remain required.')
 }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main()
