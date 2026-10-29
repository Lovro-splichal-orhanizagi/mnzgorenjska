// Fixed missing-body plan, genuine original seed and header-only proof. No transport.
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as canonicalHash} from './lib/historical-statistics-policy.mjs'
import {classifyFcfHistoricalStatistics} from './fcf-historical-policy.mjs'
import {glavaStrani,drevoRsc,elementi,jeElement,besedilo,tokRsc,vrsticeRsc,vrstaStrani,jeIzziv,isFcfActaSourceRoute} from './viri/fcf.mjs'
import {inventoryFail as fail,exactKeys,frozenJSON,rawSha256,nativeId,commitId,sha256Id,artifactDigest,validUTC,jsonBytes,verifyInventoryExecution,readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
const sourceCaptureCommit='f7efba26c31f76372b5aab1e976061631fbaebda'
const scopes=Object.freeze([
 Object.freeze({targetSlug:'es-ct-segona-g1',competitionId:783,start:4109388,end:4109627,maximumSourceGETs:239}),
 Object.freeze({targetSlug:'es-ct-tercera-g9',competitionId:797,start:4118349,end:4118588,maximumSourceGETs:238}),
])
const limits=Object.freeze({maximumBodyBytes:2097152,maximumManifestBytes:8388608,maximumExpandedBytes:201326592,maximumZipBytes:104857600,pauseMs:3000,attemptTimeoutMs:90000,sourceWindowMs:2700000,retentionMarginMs:15000,maximumPlanAgeMs:86400000})
const pins=Object.freeze([
 ['4109388','request-3-acta-4109388.html','2026-10-18T12:31:53.340Z','2026-10-18T12:31:53.882Z',458406],
 ['4118352','request-6-acta-4118352.html','2026-10-18T12:32:03.718Z','2026-10-18T12:32:04.175Z',476814],
 ['4118358','request-7-acta-4118358.html','2026-10-18T12:32:07.176Z','2026-10-18T12:32:07.646Z',441280],
].map(([id,file,startedUTC,endedUTC,bytes])=>Object.freeze({id,file,startedUTC,endedUTC,bytes})))
const seeds=new WeakMap()
const clone=value=>structuredClone(value)
const equal=(a,b)=>canonicalHash(a)===canonicalHash(b)
const scopeFor=slug=>{const scope=scopes.find(s=>s.targetSlug===slug);if(!scope)fail('exact G1 or G9 target required');return scope}
const entryFor=id=>{const scope=scopes.find(s=>Number(id)>=s.start&&Number(id)<=s.end);return getHistoricalStatisticsPolicy(scope.targetSlug).entries.find(e=>e.sourceMatchId===id)}
export function fcfMissingInventoryPolicyHashes(){return Object.fromEntries(['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(slug=>[slug,canonicalHash(getHistoricalStatisticsPolicy(slug))]))}
function policies(value){if(!equal(value,fcfMissingInventoryPolicyHashes()))fail('immutable policy hashes differ')}
function pinnedDescriptors(){return pins.map(pin=>{const entry=entryFor(pin.id);return {id:pin.id,artifactFile:`acta-${pin.id}.html`,bytes:pin.bytes,rawSha256:entry.rawSha256,receipt:{url:entry.sourceUrl,startedUTC:pin.startedUTC,sequence:Number(pin.file.match(/^request-(\d+)/)[1]),status:200,responseURL:entry.sourceUrl,redirected:false,endedUTC:pin.endedUTC,bytes:pin.bytes,sha256:entry.rawSha256,file:pin.file},sourceCaptureCommit}})}
function validateSeedBinding(binding){
 exactKeys(binding,['artifactId','artifactDigest','manifestSha256','runId','runAttempt','jobId','retentionCommit','sourceCaptureCommit','originalManifestSha256'],'seed binding')
 if(!['artifactId','runId','runAttempt','jobId'].every(key=>nativeId(binding[key]))||!artifactDigest(binding.artifactDigest)||!sha256Id(binding.manifestSha256)||!sha256Id(binding.originalManifestSha256)||!commitId(binding.retentionCommit)||binding.sourceCaptureCommit!==sourceCaptureCommit)fail('seed artifact/source identity differs')
}
/** Source-free staging checks content only, never creates Actions SeedEvidence. */
export function validateFcfMissingInventorySeedBytes({zipBytes,expected,now=Date.now()}){
 if(!expected||!Number.isFinite(now)||!commitId(expected.sourceCommit)||!sha256Id(expected.manifestSha256)||!sha256Id(expected.originalManifestSha256))fail('explicit seed staging hashes/commit required')
 policies(expected.policyHashes)
 const artifact={size_in_bytes:zipBytes?.length}
 const members={'manifest.json':limits.maximumManifestBytes,'original-receipts.json':limits.maximumManifestBytes,...Object.fromEntries(pins.map(p=>[`acta-${p.id}.html`,limits.maximumBodyBytes]))}
 const files=readInventoryZip({zipBytes,artifact,expected,members}),manifest=jsonBytes(files.get('manifest.json'),'seed manifest'),originalBytes=files.get('original-receipts.json'),original=jsonBytes(originalBytes,'original receipts')
 exactKeys(manifest,['schemaVersion','kind','retentionCommit','sourceCaptureCommit','originalManifestSha256','policyHashes','originals'],'seed manifest')
 if(manifest.schemaVersion!==1||manifest.kind!=='fcf-missing-inventory-seed'||manifest.retentionCommit!==expected.sourceCommit||manifest.sourceCaptureCommit!==sourceCaptureCommit||manifest.originalManifestSha256!==expected.originalManifestSha256||rawSha256(originalBytes)!==expected.originalManifestSha256||original.sourceCommit!==sourceCaptureCommit||!Array.isArray(original.requests))fail('seed original/retention provenance differs')
 policies(manifest.policyHashes)
 const descriptors=pinnedDescriptors()
 if(!equal(manifest.originals,descriptors))fail('raw original descriptors/receipts differ')
 const originals=[]
 for(const descriptor of descriptors){
  const raw=files.get(descriptor.artifactFile),receipts=original.requests.filter(r=>r.url===descriptor.receipt.url)
  if(receipts.length!==1||!equal(receipts[0],descriptor.receipt))fail('original receipt bytes/fields differ')
  if(raw.length!==descriptor.bytes||rawSha256(raw)!==descriptor.rawSha256)fail('raw original bytes/SHA differ')
  if(Date.parse(descriptor.receipt.endedUTC)>now)fail('future original receipt')
  const scope=scopeFor(descriptor.id==='4109388'?'es-ct-segona-g1':'es-ct-tercera-g9'),html=decodeSource(raw)
  deriveFcfInventoryHeader({targetSlug:scope.targetSlug,id:descriptor.id,bytes:raw})
  classifyFcfHistoricalStatistics({competition:{slug:scope.targetSlug,source:'fcf',source_policy:'es-fcf-reviewed-history-v1',firstFantasyPlayedOn:'2026-10-24'},id:descriptor.id,html})
  originals.push({id:descriptor.id,bytes:Buffer.from(raw)})
 }
 return {kind:'fcf-missing-inventory-validated-seed-bytes',files,originals,descriptors,policyHashes:clone(manifest.policyHashes),sourceCaptureCommit,originalManifestSha256:expected.originalManifestSha256,manifestSha256:expected.manifestSha256}
}
export function getFcfMissingInventoryOriginalDescriptors(){return frozenJSON(pinnedDescriptors())}
/** Authenticates real ZIP bytes plus independently expected GitHub metadata. */
export function readFcfMissingInventorySeed({zipBytes,artifact,run,jobs,expected,now=Date.now()}){
 const binding=verifyInventoryExecution({artifact,run,jobs,expected,jobName:'missing-inventory-seed',stepNames:['Validate retained FCF inventory originals','Retain reviewed FCF inventory seed'],artifactName:`fcf-inventory-seed-${expected?.runId}-${expected?.runAttempt}`,runPhase:'successful-run'})
 if(!Buffer.isBuffer(zipBytes)||zipBytes.length!==artifact.size_in_bytes)fail('actual seed artifact bytes differ')
 const staged=validateFcfMissingInventorySeedBytes({zipBytes,expected,now})
 const proof=frozenJSON({kind:'fcf-missing-inventory-seed-proof',binding:{...binding,sourceCaptureCommit,originalManifestSha256:expected.originalManifestSha256},policyHashes:staged.policyHashes,originals:staged.descriptors})
 seeds.set(proof,staged.originals)
 return proof
}
export function getFcfMissingInventorySeedOriginals(seedEvidence){
 const originals=seeds.get(seedEvidence);if(!originals)fail('actual authenticated seed proof required')
 return originals.map(row=>({id:row.id,bytes:Buffer.from(row.bytes)}))
}
export function buildFcfMissingInventoryPlan({sourceCommit,seedEvidence,policyHashes,rulesetSnapshotSha256,now=Date.now()}){
 if(!seeds.has(seedEvidence))fail('actual authenticated seed proof required')
 policies(policyHashes)
 if(!commitId(sourceCommit)||!sha256Id(rulesetSnapshotSha256)||!Number.isFinite(now))fail('exact source commit/time required')
 const descriptors=pinnedDescriptors(),children=scopes.map(scope=>({targetSlug:scope.targetSlug,competitionId:scope.competitionId,sourceCode:`${scope.start}-${scope.end}`,season:'2026/27',fetchIds:Array.from({length:240},(_,i)=>String(scope.start+i)).filter(id=>!descriptors.some(d=>d.id===id)),reuse:descriptors.filter(d=>Number(d.id)>=scope.start&&Number(d.id)<=scope.end),maximumSourceGETs:scope.maximumSourceGETs}))
 const body={schemaVersion:1,kind:'fcf-missing-inventory-plan',preset:'g1-then-g9-missing-v1',sourceCommit,createdUTC:new Date(now).toISOString(),rulesetSnapshotSha256,maximumSourceGETs:477,stopOnDefect:true,seedBinding:clone(seedEvidence.binding),policyHashes:clone(policyHashes),limits:{...limits},children}
 const plan={...body,planSha256:canonicalHash(body)}
 validateFcfMissingInventoryPlan({plan,expectedPlanSha256:plan.planSha256,now})
 return frozenJSON(plan)
}
export function validateFcfMissingInventoryPlan({plan,expectedPlanSha256,now=Date.now()}){
 exactKeys(plan,['schemaVersion','kind','preset','sourceCommit','createdUTC','rulesetSnapshotSha256','maximumSourceGETs','stopOnDefect','seedBinding','policyHashes','limits','children','planSha256'],'plan')
 const {planSha256,...body}=plan
 if(!sha256Id(expectedPlanSha256)||planSha256!==expectedPlanSha256||canonicalHash(body)!==planSha256||plan.schemaVersion!==1||plan.kind!=='fcf-missing-inventory-plan'||plan.preset!=='g1-then-g9-missing-v1'||!commitId(plan.sourceCommit)||!sha256Id(plan.rulesetSnapshotSha256)||!validUTC(plan.createdUTC)||!Number.isFinite(now)||Date.parse(plan.createdUTC)>now||now-Date.parse(plan.createdUTC)>limits.maximumPlanAgeMs||plan.maximumSourceGETs!==477||plan.stopOnDefect!==true||!equal(plan.limits,limits))fail('immutable plan/hash/time/limits differ')
 validateSeedBinding(plan.seedBinding);policies(plan.policyHashes)
 if(!Array.isArray(plan.children)||plan.children.length!==2)fail('exact two ordered children required')
 const originals=pinnedDescriptors()
 return frozenJSON(plan.children.map((child,i)=>{
  exactKeys(child,['targetSlug','competitionId','sourceCode','season','fetchIds','reuse','maximumSourceGETs'],'child plan')
  const scope=scopes[i],reuse=originals.filter(d=>Number(d.id)>=scope.start&&Number(d.id)<=scope.end),fetchIds=Array.from({length:240},(_,n)=>String(scope.start+n)).filter(id=>!reuse.some(d=>d.id===id))
  if(child.targetSlug!==scope.targetSlug||child.competitionId!==scope.competitionId||child.sourceCode!==`${scope.start}-${scope.end}`||child.season!=='2026/27'||child.maximumSourceGETs!==scope.maximumSourceGETs||!equal(child.reuse,reuse)||!equal(child.fetchIds,fetchIds))fail('fixed child target/IDs/originals/budget differ')
  return {...clone(child),childPlanSha256:canonicalHash({...child,parentPlanSha256:planSha256})}
 }))
}
function decodeSource(bytes){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>limits.maximumBodyBytes||bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)fail('source bytes/size/BOM invalid')
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{fail('source UTF8 invalid')}
}
const actualDay=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value&&value>='2026-07-01'&&value<'2027-07-01'
function sideIdentity(side){
 const links=[...new Set([...elementi(side)].map(e=>e.props?.href).filter(href=>typeof href==='string'&&/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(href)))],name=besedilo(side).replace(/\s+/g,' ').trim()
 if(links.length!==1||!name||name.length>160||/[\x00-\x1f\x7f]/.test(name)||/^(undefined|null)$/i.test(name))fail('ambiguous native header-side identity')
 const [,sourceClubId,sourceCategoryId]=links[0].match(/^\/ca\/clubs\/([1-9]\d*)\/categories\/([1-9]\d*)$/)
 return {sourceClubId,sourceCategoryId,name,href:links[0]}
}
/** No normal individual parser is invoked by this header-only adapter. */
export function deriveFcfInventoryHeader({targetSlug,id,bytes}){
 const scope=scopeFor(targetSlug)
 if(!nativeId(id)||Number(id)<scope.start||Number(id)>scope.end)fail('foreign source ID')
 const html=decodeSource(bytes)
 if(jeIzziv(html)||vrstaStrani(html)!=='zapisnik')fail('source challenge/unknown page')
 let roots,header,rawRows
 try{roots=drevoRsc(html);header=glavaStrani(html);rawRows=vrsticeRsc(tokRsc(html))}catch{fail('unknown source header schema')}
 const routes=new Set(),stack=[...rawRows.values()]
 while(stack.length){const row=stack.pop();if(!row||typeof row!=='object')continue;if(!Array.isArray(row)&&Array.isArray(row.c)&&row.c[1]==='ca'&&row.c[2]==='competicio'&&row.c[3]==='acta')routes.add(JSON.stringify(row.c));stack.push(...Object.values(row).filter(v=>v&&typeof v==='object'))}
 if(!isFcfActaSourceRoute(rawRows.get('0')?.c,id)||routes.size!==1||!isFcfActaSourceRoute(JSON.parse([...routes][0]),id))fail('actual route missing/conflicting/mismatched')
 if(header.sezona!=='2026/27'||header.tekmovanje!==(targetSlug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA')||header.skupina!==`GRUP ${targetSlug.split('-g')[1]}`||!Number.isInteger(header.krog)||header.krog<1||header.krog>30||!actualDay(header.datum))fail('actual season/group/round/date differs')
 const statuses={'Acta Tancada':'published','Pendent':'pending','SUSPÈS':'suspended','AJORNAT':'postponed'},status=statuses[header.oznaka]
 if(!status||(status==='published')!==!!header.izid||header.izid&&(!Number.isSafeInteger(header.izid.domaci)||header.izid.domaci<0||!Number.isSafeInteger(header.izid.gostje)||header.izid.gostje<0))fail('unknown/incoherent match status/result')
 const wrappers=[...elementi(roots)].filter(e=>e.props?.title==='Acta del partit')
 if(wrappers.length!==1)fail('ambiguous header wrapper')
 const hasNativeLink=side=>[...elementi(side)].some(e=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(e.props?.href??''))
 const rows=[...elementi(wrappers[0])].filter(e=>{const sides=e.otroci.filter(jeElement);return e.tip==='div'&&sides.length===3&&/-/.test(besedilo(sides[1]))&&hasNativeLink(sides[0])&&hasNativeLink(sides[2])})
 if(rows.length!==1)fail('ambiguous header side columns')
 const sides=rows[0].otroci.filter(jeElement),home=sideIdentity(sides[0]),away=sideIdentity(sides[2])
 if(home.href===away.href||home.name!==header.domaci||away.name!==header.gostje)fail('self/conflicting native header fixture')
 return frozenJSON({id,targetSlug,round:header.krog,playedOn:header.datum,kickoff:header.ura,status,homeGoals:header.izid?.domaci??null,awayGoals:header.izid?.gostje??null,home,away})
}
export function validateFcfInventoryHeaders({targetSlug,headers,complete}){
 const scope=scopeFor(targetSlug)
 if(!Array.isArray(headers)||headers.length>240||typeof complete!=='boolean')fail('bounded header inventory required')
 const ids=new Set(),clubs=new Map(),pairs=new Set(),rounds=new Map()
 for(const h of headers){
  exactKeys(h,['id','targetSlug','round','playedOn','kickoff','status','homeGoals','awayGoals','home','away'],'inventory header')
  if(h.targetSlug!==targetSlug||!nativeId(h.id)||Number(h.id)<scope.start||Number(h.id)>scope.end||ids.has(h.id)||!Number.isInteger(h.round)||h.round<1||h.round>30||!actualDay(h.playedOn)||!['published','pending','suspended','postponed'].includes(h.status))fail('foreign/duplicate/invalid header inventory')
  ids.add(h.id)
  const keys=[h.home,h.away].map(side=>{
   exactKeys(side,['sourceClubId','sourceCategoryId','name','href'],'native side')
   if(!nativeId(side.sourceClubId)||!nativeId(side.sourceCategoryId)||typeof side.name!=='string'||!side.name.trim()||side.href!==`/ca/clubs/${side.sourceClubId}/categories/${side.sourceCategoryId}`)fail('native side identity differs')
   const key=`${side.sourceClubId}/${side.sourceCategoryId}`,previous=clubs.get(key)
   if(previous&&previous.name!==side.name)fail('native club name drift')
   clubs.set(key,{...side});return key
  })
  const pair=keys.join('|'),round=rounds.get(h.round)??{ids:[],clubs:new Set()}
  if(keys[0]===keys[1]||pairs.has(pair)||keys.some(key=>round.clubs.has(key)))fail('self/duplicate directed pairing or repeated round club')
  pairs.add(pair);round.ids.push(h.id);keys.forEach(key=>round.clubs.add(key));rounds.set(h.round,round)
  if(clubs.size>16||round.ids.length>8)fail('seventeenth club/ninth round match')
 }
 if(complete&&(headers.length!==240||rounds.size!==30||clubs.size!==16||pairs.size!==240||[...rounds.values()].some(r=>r.ids.length!==8||r.clubs.size!==16)))fail('complete240/30/8/16 native header closure required')
 return frozenJSON({documentCount:headers.length,clubs:[...clubs.values()],rounds:[...rounds].sort(([a],[b])=>a-b).map(([round,r])=>({round,ids:r.ids}))})
}
