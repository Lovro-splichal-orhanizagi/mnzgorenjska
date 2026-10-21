// Challenge has its own pinned retained source artifact; Premier evidence remains unchanged.
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {sha256} from './dfb-artifacts.mjs'
export {verifyMfaArtifactIdentity} from './mfa-reviewed-history-evidence.mjs'
export const MFA_CHALLENGE_ORIGINAL=Object.freeze({"runId":"39507147003","artifactId":"12303812226","digest":"sha256:e4d1654151c9ecaf76b736581c20bfed12f4f56d9ea72f7afa62ee0b45eaac5c","commit":"2b14476e4869a906840792417b7e75fec057ff7c","branch":"codex/mfa-challenge-cache-audit-20261020","workflow":".github/workflows/razdeli-zlite-igralce.yml","name":"mfa-challenge-cached-report-audit-39507147003"})
export const MFA_CHALLENGE_SOURCE_HASHES=Object.freeze({"mt50903309-izid.json":"3f7b43b148159fefe5375524006182a08f760c6ee3e3a5ebf8d947f71da9089a","mt50903309-postava.json":"6d3e76c052422a1f17568214e71250e24fa917a3a06998e66ad5c6639083ad4e","mt50903328-izid.json":"42e69f86ca5c83257a88c4eabcc6c11548b0363e831f0fc106d96e88bd3be53d","mt50903328-postava.json":"59f9a7f7e4825acb00feaa31b16aadc2ea257991121a19e85b1f007dca17429a","mt50903358-izid.json":"8c27d0353b260e4ef333c5f7c27d0d11cd43b52434ee4e880c7fae8fa35dbe3e","mt50903358-postava.json":"2a79857b3d37fdb4476e07b59969e8ab49c3a5d3d723d9bc3d10393951d63ada","mt52353213-izid.json":"d83f612f582778f8f734e8465e118cd30e0856e36c12a207729df592052bdd34","mt52353213-postava.json":"16479747a46715412892ca6e5c437d7e96c511caf378584b23873e67622950b0"})
const fail=message=>{throw Error(`MFA Challenge evidence: ${message}`)}
export function readChallengeArchive(bytes,digest,{prepared=false}={}){
 if(!Buffer.isBuffer(bytes)||bytes.length>32*1024*1024||`sha256:${sha256(bytes)}`!==digest)fail('ZIP digest mismatch')
 const dir=mkdtempSync(join(tmpdir(),'slff-mfa-challenge-'))
 try{
  const zip=join(dir,'artifact.zip');writeFileSync(zip,bytes)
  // Inspect every central-directory member and size before reading any body.
  // Python's ZIP reader never extracts paths or follows links.
  const selected=execFileSync('python3',['-c',`
import zipfile,sys,json,stat,re,base64
z=zipfile.ZipFile(sys.argv[1]); members=z.infolist(); prepared=sys.argv[2]=='true'
expected=json.loads(sys.argv[3]); names=[m.filename for m in members]
if len(set(names))!=len(names): raise ValueError('duplicate ZIP member')
if prepared:
 if set(names)!=set(expected)|{'manifest.json','before-image.json'}: raise ValueError('exact prepared members required')
else:
 if len(names)!=448 or sum(n.startswith('cache/') for n in names)!=446: raise ValueError('exact448 members/446 cache files required')
 for n in names:
  if n not in ('fixture-inventory.json','touched-catalog.json') and not re.fullmatch(r'cache/[A-Za-z0-9_-]+\.json',n): raise ValueError('unsafe member')
if sum(m.file_size for m in members)>32*1024*1024: raise ValueError('ZIP expanded size limit')
for m in members:
 if m.file_size>8*1024*1024 or m.flag_bits&1 or m.is_dir() or stat.S_ISLNK(m.external_attr>>16): raise ValueError('unsafe member metadata')
# Authenticate every body/CRC before selecting the known eight source paths.
for m in members: z.read(m)
paths=expected if prepared else {'cache/tekma-'+n[2:]:h for n,h in expected.items()}
if not set(paths)<=set(names): raise ValueError('missing source bodies')
out={}
for n in paths:
 key=n if prepared else 'mt'+n.removeprefix('cache/tekma-')
 out[key]=base64.b64encode(z.read(n)).decode()
if prepared:
 for n in ('manifest.json','before-image.json'): out[n]=base64.b64encode(z.read(n)).decode()
print(json.dumps(out))
`,zip,String(prepared),JSON.stringify(MFA_CHALLENGE_SOURCE_HASHES)],{encoding:'utf8',maxBuffer:32*1024*1024})
  const files=new Map(Object.entries(JSON.parse(selected)).map(([n,b])=>[n,Buffer.from(b,'base64')]))
  for(const[name,hash]of Object.entries(MFA_CHALLENGE_SOURCE_HASHES))if(sha256(files.get(name))!==hash)fail('original source bytes changed')
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
export function verifyChallengePreparedFiles(files,{commit,runId,beforeSha256,policySha256}){
 const manifest=JSON.parse(files.get('manifest.json')),text=files.get('before-image.json').toString('utf8'),image=JSON.parse(text)
 if(manifest.kind!=='mfa-challenge-reviewed-prepare'||manifest.mainCommit!==commit||manifest.runId!==runId||manifest.runAttempt!=='1'||manifest.beforeSha256!==beforeSha256||manifest.policySha256!==policySha256||image.mainCommit!==commit||image.policySha256!==policySha256||sha256(Buffer.from(text))!==beforeSha256||image.appearances?.length!==118||image.goals?.length!==14||image.installedPolicies?.length!==0||image.markers?.length!==0)fail('exact reviewed prepare image/manifest differs')
 for(const id of ['50903309','50903328','50903358','52353213'])if(image.sourceHashes?.[id]?.resultSha256!==MFA_CHALLENGE_SOURCE_HASHES[`mt${id}-izid.json`]||image.sourceHashes?.[id]?.lineupSha256!==MFA_CHALLENGE_SOURCE_HASHES[`mt${id}-postava.json`])fail('prepare source proof differs')
 return text
}
