import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,statSync,utimesSync,symlinkSync,truncateSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import fs from 'node:fs'
import {syncBuiltinESMExports} from 'node:module'
import {spawnSync} from 'node:child_process'
const helper=await import('./izvozi-fcf-predpomnjene-dokaze.mjs')
const script=new URL('./izvozi-fcf-predpomnjene-dokaze.mjs',import.meta.url).pathname
const key='zapisniki-ES-k1od1-39122610224-1',sha='a'.repeat(40),mtime=new Date('2026-10-18T11:12:13Z')
const blocks=[[4109388,4109627],[4116188,4116427],[4118349,4118588]]
function fixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-history-export-'))),cache=join(root,'scripts/.predpomnilnik/fcf'),output=join(root,'fcf-historical-cache')
 mkdirSync(cache,{recursive:true});t.after(()=>rmSync(root,{recursive:true,force:true}))
 const put=(id,body=Buffer.from('original\r\nč\0bytes'))=>{const p=join(cache,`acta-${id}.html`);writeFileSync(p,body);utimesSync(p,mtime,mtime);return p}
 for(const [start,end]of blocks)for(let id=start;id<=end;id++)put(id)
 const outside=put(4109628,'not selected')
 return{root,cache,output,put,outside,options:{root,output,requestedKey:key,matchedKey:key,cacheHit:'true',restoreOutcome:'success',extractionCommit:sha,runId:'123',runAttempt:'2'}}
}
function run(f,patch={}){assert.equal(typeof helper.izvoziZgodovino,'function','closed 720-report cache exporter must exist');return helper.izvoziZgodovino({...f.options,...patch})}
const manifest=f=>JSON.parse(readFileSync(join(f.output,'manifest.json'),'utf8'))
test('exports only all three fixed blocks with byte hashes, original mtimes and exact restore/extraction lineage',t=>{
 const f=fixture(t),before=statSync(f.outside).mtimeMs,previous=globalThis.fetch
 globalThis.fetch=()=>{throw Error('source fetch forbidden')};t.after(()=>{globalThis.fetch=previous})
 assert.equal(run(f),0);const m=manifest(f)
 assert.equal(m.kind,'fcf-historical-cache');assert.equal(m.files.length,720);assert.equal(new Set(m.files.map(x=>x.id)).size,720)
 assert.deepEqual(m.files.filter((_,i)=>[0,239,240,479,480,719].includes(i)).map(x=>x.id),['4109388','4109627','4116188','4116427','4118349','4118588'])
 assert.equal(m.cache.requestedKey,key);assert.equal(m.cache.matchedKey,key);assert.equal(m.cache.state,'available')
 assert.deepEqual(m.extraction,{commit:sha,runId:'123',runAttempt:'2'});assert.equal(m.sourceFetchTime,null);assert.equal(m.sourceCaptureCommit,null)
 const bytes=readFileSync(join(f.output,'acta-4116314.html')),row=m.files.find(x=>x.id==='4116314')
 assert.equal(row.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(row.cachedMtime,mtime.toISOString());assert.deepEqual(bytes,Buffer.from('original\r\nč\0bytes'))
 assert.equal(readdirSync(f.output).length,721);assert.equal(statSync(f.outside).mtimeMs,before)
 assert.ok(!m.files.some(x=>x.id==='4109628'));assert.equal(statSync(f.output).mode&0o777,0o700);assert.equal(statSync(join(f.output,'manifest.json')).mode&0o777,0o600)
})
for(const [name,patch]of [['fallback',{matchedKey:key+'-suffix',cacheHit:'false'}],['unreviewed older exact key',{requestedKey:'zapisniki-ES-k1od1-39078000693-1',matchedKey:'zapisniki-ES-k1od1-39078000693-1'}],['restore failure',{restoreOutcome:'failure'}],['miss',{cacheHit:'false',matchedKey:''}],['arbitrary IDs',{ids:['1']}],['invalid commit',{extractionCommit:'bad'}]])test(`refuses ${name} before copying`,t=>{
 const f=fixture(t);assert.equal(run(f,patch),1);assert.deepEqual(readdirSync(f.output),['manifest.json']);assert.ok(manifest(f).files.every(x=>x.status==='not-inspected'))
})
for(const kind of ['leaf symlink','ancestor symlink','oversize','empty','missing'])test(`refuses ${kind} across the full snapshot without partial bodies`,t=>{
 const f=fixture(t),p=join(f.cache,'acta-4116314.html')
 if(kind==='leaf symlink'){rmSync(p);symlinkSync(f.outside,p)}
 if(kind==='ancestor symlink'){rmSync(f.cache,{recursive:true});symlinkSync(join(f.root,'absent'),f.cache)}
 if(kind==='oversize')writeFileSync(p,Buffer.alloc(2097153))
 if(kind==='empty')writeFileSync(p,'')
 if(kind==='missing')rmSync(p)
 assert.equal(run(f),1);assert.deepEqual(readdirSync(f.output),['manifest.json']);assert.notEqual(manifest(f).cache.state,'available')
})
test('real Actions CLI exports history profile without database credentials, dependencies or transport',t=>{
 const f=fixture(t),actionOutput=join(f.root,'action-output');writeFileSync(actionOutput,'')
 const p=spawnSync(process.execPath,[script],{cwd:f.root,env:{PATH:process.env.PATH,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_OUTPUT:actionOutput,FCF_EXPORT_KIND:'history',FCF_CACHE_KEY:key,FCF_CACHE_MATCHED_KEY:key,FCF_CACHE_HIT:'true',FCF_RESTORE_OUTCOME:'success'},encoding:'utf8',timeout:30000})
 assert.equal(p.status,0,p.stderr);assert.equal(manifest(f).files.length,720);assert.equal(readFileSync(actionOutput,'utf8'),'evidence_ready=true\n')
})

test('aggregate source-byte cap refuses before any bodies are copied',t=>{
 const f=fixture(t)
 // Sparse files exercise preflight without allocating 194MiB of test bytes.
 for(let id=4109388;id<=4109484;id++)truncateSync(join(f.cache,`acta-${id}.html`),2097152)
 assert.equal(run(f),1);assert.deepEqual(readdirSync(f.output),['manifest.json'])
 assert.ok(manifest(f).files.some(x=>x.reason==='snapshot-byte-limit'))
})
test('checked-in Actions restore metadata reaches the real cache-export CLI and refuses a fallback',t=>{
 const workflow=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8')
 const steps=workflow.split(/^      - /m).slice(1),restore=steps.find(s=>s.includes('uses: actions/cache/restore@')),exportStep=steps.find(s=>s.includes('id: export'))
 assert.ok(restore);assert.match(restore,/key: \$\{\{ inputs\.cache_key \}\}/);assert.doesNotMatch(workflow,/restore-keys:|cache\/save|secrets\.|npm |curl |wget |schedule:/)
 assert.match(workflow,/permissions:\n  contents: read/)
 const command=exportStep.match(/^        run: (.+)$/m)[1]
 for(const candidate of ['zapisniki-ES-k1od1-39053159080-1','zapisniki-ES-k1od1-39122610224-1','zapisniki-es-ct-tercera-g2-39130940424','zapisniki-es-ct-tercera-g4-39096381467'])for(const hit of [true,false]){
  const f=fixture(t),output=join(f.root,'action-output');writeFileSync(output,'')
  // The workflow's exact env expressions are evaluated at the external restore boundary.
  const restoreOutputs={'cache-matched-key':hit?candidate:candidate+'-fallback','cache-hit':String(hit)}
  const env=Object.fromEntries([...exportStep.matchAll(/^          ([A-Z_]+): (.+)$/gm)].map(([,k,v])=>[k,v.replace('${{ inputs.cache_key }}',candidate).replace(/\$\{\{ steps\.restore\.outputs\.([a-z-]+) \}\}/g,(_,name)=>restoreOutputs[name]).replace('${{ steps.restore.outcome }}','success')]))
  mkdirSync(join(f.root,'scripts'),{recursive:true});writeFileSync(join(f.root,'scripts/izvozi-fcf-predpomnjene-dokaze.mjs'),readFileSync(script))
  const result=spawnSync('bash',['-euo','pipefail','-c',command],{cwd:f.root,env:{PATH:process.env.PATH,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_OUTPUT:output,...env},encoding:'utf8',timeout:30000})
  assert.equal(result.status,hit?0:1,result.stderr);assert.equal(manifest(f).files.filter(x=>x.status==='found').length,hit?720:0)
  assert.equal(readFileSync(output,'utf8'),'evidence_ready=true\n')
 }
})

test('same inode/size/mtime replacement between preflight and open is refused using original ctime',async t=>{
 const f=fixture(t),p=join(f.cache,'acta-4116314.html'),open=fs.openSync,original=readFileSync(p)
 await new Promise(resolve=>setTimeout(resolve,10))
 let replaced=false
 fs.openSync=(path,...args)=>{
  if(path===p&&!replaced){replaced=true;writeFileSync(p,Buffer.alloc(original.length,65));utimesSync(p,mtime,mtime)}
  return open(path,...args)
 };syncBuiltinESMExports()
 try{assert.equal(run(f),1);assert.deepEqual(readdirSync(f.output),['manifest.json']);assert.equal(manifest(f).files.find(x=>x.id==='4116314').reason,'source-changed')}
 finally{fs.openSync=open;syncBuiltinESMExports()}
})

for(const candidate of ['zapisniki-ES-k1od1-39053159080-1','zapisniki-es-ct-tercera-g2-39130940424','zapisniki-es-ct-tercera-g4-39096381467'])test(`only explicitly reviewed candidate restores can supply original three-block bodies: ${candidate}`,t=>{
 const f=fixture(t);assert.equal(run(f,{requestedKey:candidate,matchedKey:candidate}),0)
 assert.equal(manifest(f).cache.requestedKey,candidate);assert.equal(manifest(f).cache.matchedKey,candidate)
})
