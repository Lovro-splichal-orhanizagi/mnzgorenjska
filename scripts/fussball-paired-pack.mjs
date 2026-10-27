// Admission adapter only: two separately replayed hosted captures retain their
// own original manifests, request journals and content-addressed documents.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync,mkdirSync,cpSync,writeFileSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {loadFussballImportCapture,parseFussballLeagueCode} from './fussball-import.mjs'
import {validateGermanyCandidate} from './bulk-germany-source.mjs'
import {fussballCardPolicyForCandidate} from './fussball-community-policy.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const canonical=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))]))):v)
const same=(a,b)=>canonical(a)===canonical(b)
const proof=(ok,message)=>{if(!ok)throw Object.assign(Error(`fussball paired pack: ${message}`),{dataHold:true,reason_code:'GERMANY_PAIRED_PACK_INVALID'})}
export function readPairedOriginal(directory,file){
 proof(typeof file==='string'&&file&&!file.startsWith('/')&&file.split('/').every(s=>s&&s!=='.'&&s!=='..'),'unsafe original path')
 const base=resolve(directory);let path=base
 proof(lstatSync(base).isDirectory()&&!lstatSync(base).isSymbolicLink(),'symbolic capture directory')
 for(const part of file.split('/')){path=join(path,part);const stat=lstatSync(path);proof(!stat.isSymbolicLink(),'symbolic original path')}
 proof(lstatSync(path).isFile(),'original must be regular file')
 return readFileSync(path)
}
const documentReceipt=d=>Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]]))
export async function loadFussballPairedPack(directory,{candidate,now=Date.now,requireFresh=true}={},dependencies={}){
 const c=validateGermanyCandidate(candidate,dependencies),m=JSON.parse(readPairedOriginal(directory,'manifest.json'))
 proof(c.archives.length===1&&m.version===1&&m.provider==='germany-paired-fussball'&&same(m.candidate,c)&&m.current==='current'&&m.archive==='archive','paired catalog/format scope differs')
 const {current,archive}=m.audit??{}
 proof(current&&archive&&current.repository==='Lovro-splichal-orhanizagi/mnzgorenjska'&&same({...current,artifactId:archive.artifactId,artifactName:archive.artifactName},archive)&&/^[1-9]\d{0,14}$/.test(current.runId)&&/^[a-f0-9]{40}$/.test(current.headSha)&&Number.isSafeInteger(current.artifactId)&&current.artifactId>0&&Number.isSafeInteger(archive.artifactId)&&archive.artifactId>0&&current.artifactId!==archive.artifactId&&current.artifactName===`fussball-season-${current.runId}`&&archive.artifactName===`fussball-season-archive-${current.runId}`,'paired audit admission differs')
 // Native admission stays at the audited commit. Cache-only replay can survive
 // an unrelated main commit; installed capture fingerprints still must match.
 if(requireFresh&&process.env.GITHUB_ACTIONS==='true')proof(current.headSha===process.env.GITHUB_SHA,'paired audit commit differs')
 const cardPolicy=fussballCardPolicyForCandidate(c)
 const scopes=[{...parseFussballLeagueCode(c.source_league_code),seedUrl:c.seedUrl},{...parseFussballLeagueCode(c.archives[0].code),seedUrl:c.archives[0].seedUrl}]
 proof(scopes[0].staffel!==scopes[1].staffel,'distinct current/archive staffel required')
 const manifests=['current','archive'].map(name=>JSON.parse(readPairedOriginal(directory,name+'/manifest.json')))
 const [cm,am]=manifests
 proof([1,4].includes(cm.version)&&am.version===3&&cm.success===true&&am.success===true,'successful ordinary/completed current and v3 archive required')
 const time=typeof now==='function'?now():now,at=time instanceof Date?+time:time
 proof(Number.isFinite(at)&&Date.parse(cm.createdAt)<=Date.parse(cm.completedAt)&&Date.parse(cm.completedAt)<=Date.parse(am.createdAt)&&Date.parse(am.createdAt)<=Date.parse(am.completedAt)&&Date.parse(am.completedAt)<=at,'paired chronology differs')
 for(const [i,s]of scopes.entries())proof(['seedUrl','staffel','season'].every(k=>manifests[i].options?.[k]===s[k])&&manifests[i].options.reportLimit===null&&manifests[i].options.cardPolicy===cardPolicy,'capture scope/full intent differs')
 const seed=cm.documents.filter(d=>d.kind==='round'&&d.url===scopes[0].seedUrl)
 proof(seed.length===1,'exact current original seed required')
 const d=seed[0],parent=am.archiveParent,originalReceipt={version:1,document:documentReceipt(d),attempt:cm.snapshot.attempts.find(a=>a.url===d.url),capture:{createdAt:cm.createdAt,codeSha256:cm.codeSha256,staffel:scopes[0].staffel,season:scopes[0].season}}
 proof(parent&&same(parent.current,scopes[0])&&same(parent.document,documentReceipt(d))&&same(parent.originalReceipt,originalReceipt),'archive parent does not belong to admitted current capture')
 const source=readPairedOriginal(directory,'current/'+d.file),parentBytes=readPairedOriginal(directory,'archive/'+parent.file)
 proof(source.length===d.bytes&&hash(source)===d.sha256&&source.equals(parentBytes),'archive parent original seed bytes differ')
 const load=dependencies.loadCapture??loadFussballImportCapture,seasons=[]
 for(const [i,s]of scopes.entries()){
  const batch=await load(join(directory,i===0?'current':'archive'),{staffel:s.staffel,season:s.season,current:i===0&&requireFresh,now:at,...(cardPolicy?{cardPolicy}:{})})
  proof(batch.provider==='fussball-public'&&batch.staffel===s.staffel&&batch.season===s.season&&batch.activationEligible===false&&batch.cardPolicy===cardPolicy,'verified native batch scope differs')
  seasons.push({code:i===0?c.source_league_code:c.archives[0].code,season:s.season,schedule:batch.schedule,reports:batch.reports,identities:batch.identities,...(cardPolicy?{cardPolicy,pendingReports:batch.pendingReports,cardEnvelopes:batch.cardEnvelopes}:{})})
 }
 const originals=['current','archive'].map(name=>['manifest.json','result.json','attempts.jsonl'].map(file=>[name+'/'+file,hash(readPairedOriginal(directory,name+'/'+file))]))
 return {version:1,candidate:c,seasons,captured_at:cm.createdAt,original_bytes_sha256:hash(canonical([['manifest.json',hash(readPairedOriginal(directory,'manifest.json'))],...originals]))}
}

export async function stageFussballPairedPack({directory,currentDirectory,archiveDirectory,candidate,audit,now=Date.now()}={},dependencies={}){
 proof(!existsSync(directory),'fresh paired output required; existing evidence cannot be overwritten')
 mkdirSync(directory,{recursive:true})
 for(const [name,source]of [['current',currentDirectory],['archive',archiveDirectory]]){
  proof(lstatSync(source).isDirectory()&&!lstatSync(source).isSymbolicLink(),'capture must be a regular directory')
  cpSync(source,join(directory,name),{recursive:true,errorOnExist:true,force:false,filter:path=>{proof(!lstatSync(path).isSymbolicLink(),'symbolic capture input');return true}})
 }
 writeFileSync(join(directory,'manifest.json'),JSON.stringify({version:1,provider:'germany-paired-fussball',candidate,audit,current:'current',archive:'archive'})+'\n',{flag:'wx'})
 return loadFussballPairedPack(directory,{candidate,now},dependencies)
}
