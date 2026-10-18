import test from 'node:test'
import assert from 'node:assert/strict'
import fs, { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync, utimesSync, statSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
const helper = await import('./izvozi-fcf-g13-predpomnjene-dokaze.mjs').catch(() => ({}))
const keys = ['zapisniki-ES-k1od1-39053159080-1', 'zapisniki-ES-k1od1-39078000693-1']
const fixed = ['4119076','4119085','4119093','4119222','4119110']
const script = new URL('./izvozi-fcf-g13-predpomnjene-dokaze.mjs', import.meta.url).pathname
const workflow = new URL('../.github/workflows/fcf-g13-predpomnjeni-dokazi.yml', import.meta.url)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const oldExporterHash = '0776217679d23f61d68d47d1e58fe5e8c360ee51cce39c40ac89e1705c51d735'
const e = (type, children, props={}) => ['$',type,null,{...props,children}]
// Tiny constructed RSC test data, never represented as an original source capture.
function page(id, p={}) {
  const home=p.home??'BASE ESPIRALL-LES CLOTES,CF', away=p.away??'Pª JOVE DE LES ROQUETES'
  const side=(name, club, missing=false, conflict=false) => e('div',[
    e('a',name,missing?{}:{href:`/ca/clubs/${club}/categories/300`}),
    e('a',e('img',null,{alt:name}),missing?{}:{href:`/ca/clubs/${conflict?'999':club}/categories/300`})])
  const body=e('main',[
    e('section',e('div',[side(home,'101',p.missingIdentity,p.conflictIdentity),e('div',[e('span','Pendent'),e('span','- - -')]),side(away,'202')]),{title:'Acta del partit'}),
    e('div',['COMPETICIÓ',p.competition??'TERCERA CATALANA',p.group??'GRUP 13',`Jornada ${p.round??1}`].map(x=>e('span',x))),
    e('span',['Temporada',': ',p.season??'2026 / 27']),e('span',['Data',': ','19.09.2026']),e('span',['Hora',': ','17.00 H']),
    e('a','arbitrary unrelated link',{href:'/ca/clubs/777/categories/888'}),e('aside','PRIVATE STAFF MARKER')])
  const data={c:['','ca','competicio','acta',p.route??id],body,...(p.extraRoute?{other:{c:['','ca','competicio','acta',p.extraRoute]}}:{})}
  if(p.noRoute) delete data.c
  return `<title>Acta: test fixture</title><script>self.__next_f.push([1,${JSON.stringify(`0:${JSON.stringify(data)}\n`)}])</script>`
}
function fixture(t,key=keys[0]) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'g13-evidence-'))); t.after(()=>rmSync(root,{recursive:true,force:true}))
  const cache=join(root,'scripts/.predpomnilnik/fcf'); mkdirSync(cache,{recursive:true})
  const output=join(root,'fcf-g13-predpomnjeni-dokazi')
  const put=(id,bytes=page(id))=>{const path=join(cache,`acta-${id}.html`);writeFileSync(path,bytes);utimesSync(path,new Date('2026-09-01Z'),new Date('2026-09-01Z'));return path}
  return {root,cache,output,put,options:{root,output,requestedKey:key,matchedKey:key,cacheHit:'true',restoreOutcome:'success',extractionCommit:'a'.repeat(40),runId:'123',runAttempt:'2'}}
}
function run(f,p={}) {assert.equal(typeof helper.izvozi,'function','bounded G13 extractor must exist');return helper.izvozi({...f.options,...p})}
const manifest=f=>JSON.parse(readFileSync(join(f.output,'manifest.json')))
const heads=f=>JSON.parse(readFileSync(join(f.output,'heads.json')))
const rawNames=f=>readdirSync(f.output).filter(x=>x.endsWith('.html'))
for(const key of keys) test(`fixed block, exact bytes, side links and historical provenance: ${key}`,t=>{
 const f=fixture(t,key);const source=f.put(fixed[0]);f.put('4119077');f.put('4119316','OUTSIDE');const before=readFileSync(source),mtime=statSync(source).mtimeMs
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('network forbidden')};t.after(()=>{globalThis.fetch=fetch})
 assert.deepEqual(run(f),{status:0,artifactReady:true});const m=manifest(f),h=heads(f)
 assert.equal(m.files.length,480);assert.equal(m.files[0].id,'4119076');assert.equal(m.files[239].id,'4119315');assert.equal(m.files[240].id,'4115228');assert.equal(m.files.at(-1).id,'4115467');assert.equal(h.derived,true);assert.equal(h.heads.length,2)
 assert.deepEqual(rawNames(f),['acta-4119076.html']);assert.deepEqual(readFileSync(join(f.output,'acta-4119076.html')),before)
 assert.equal(m.files[0].sha256,hash(before));assert.equal(m.files[0].byteCount,before.length);assert.equal(m.files[0].cachedMtime,'2026-09-01T00:00:00.000Z')
 assert.equal(h.heads[0].identityValid,true);assert.equal(h.heads[0].home.link,'/ca/clubs/101/categories/300');assert.equal(h.heads[0].away.link,'/ca/clubs/202/categories/300')
 assert.equal(m.sourceFetchTime,null);assert.equal(m.sourceCaptureCommit,null);assert.equal(m.freshness,'unverified-historical-cache');assert.equal(m.extraction.commit,'a'.repeat(40))
 assert.ok(!JSON.stringify(h).includes('PRIVATE STAFF'));assert.ok(!JSON.stringify(h).includes('777'));assert.equal(statSync(source).mtimeMs,mtime);assert.deepEqual(readFileSync(source),before)
 assert.equal(hash(readFileSync(new URL('./izvozi-fcf-predpomnjene-dokaze.mjs',import.meta.url))),oldExporterHash)
})
test('fixed five plus four exact full-name round/direction extras produce at most nine raw bodies',t=>{
 const f=fixture(t);fixed.forEach(id=>f.put(id));let id=4119240
 for(const round of [8,23]) for(const reverse of [false,true]) f.put(String(id++),page(String(id-1),{round,...(reverse?{home:'Pª JOVE DE LES ROQUETES',away:'BASE ESPIRALL-LES CLOTES,CF'}:{})}))
 f.put('4119244',page('4119244',{round:8,home:'BASE ESPIRALL-LES CLOTES'}));f.put('4119245',page('4119245',{round:9}))
 assert.equal(run(f).status,0);assert.equal(rawNames(f).length,9);assert.equal(manifest(f).selectedRaw.length,9)
 assert.equal(heads(f).heads.find(x=>x.id==='4119241').header.domaci,'Pª JOVE DE LES ROQUETES')
})
test('duplicate round/direction is explicit ambiguity without silently choosing an extra',t=>{
 const f=fixture(t);f.put(fixed[0]);for(const id of ['4119240','4119241']) f.put(id,page(id,{round:8}))
 assert.equal(run(f).status,1);assert.equal(manifest(f).selection.state,'ambiguous');assert.deepEqual(rawNames(f),['acta-4119076.html']);assert.equal(manifest(f).selection.ambiguous.length,1)
})
for(const [name,patch] of [['missing links',{missingIdentity:true}],['conflicting links',{conflictIdentity:true}]]) test(`${name}: keep diagnostic head and fixed raw, forbid target extra`,t=>{
 const f=fixture(t);f.put(fixed[0],page(fixed[0],patch));f.put('4119240',page('4119240',{...patch,round:8}));assert.equal(run(f).status,1)
 assert.equal(heads(f).heads.length,2);assert.ok(heads(f).heads.every(x=>!x.identityValid && x.home.reason));assert.deepEqual(rawNames(f),['acta-4119076.html'])
})
for(const [name,value] of [['empty',''],['challenge','<title>Just a moment</title>'],['unknown','<h1>mystery</h1>'],['wrong group',{group:'GRUP 12'}],['wrong season',{season:'2025 / 26'}],['wrong competition',{competition:'QUARTA CATALANA'}],['route mismatch',{route:'9999999'}],['missing route',{noRoute:true}],['conflicting routes',{extraRoute:'9999999'}]]) test(`invalid ${name} never becomes a head or raw`,t=>{
 const f=fixture(t);f.put(fixed[0],typeof value==='string'?value:page(fixed[0],value));const result=run(f);assert.equal(result.status,1);assert.equal(result.artifactReady,true);assert.deepEqual(heads(f).heads,[]);assert.deepEqual(rawNames(f),[]);assert.equal(manifest(f).files[0].status,'invalid')
})
for(const [name,patch] of [['miss',{cacheHit:'false',matchedKey:''}],['prefix',{cacheHit:'false',matchedKey:keys[0]+'-suffix'}],['other key',{matchedKey:keys[1]}],['unknown key',{requestedKey:'SECRET'}],['restore fail',{restoreOutcome:'failure'}],['extra option',{ids:['9999999']}],['bad SHA',{extractionCommit:'SECRET'}],['boolean hit',{cacheHit:true}]]) test(`metadata ${name} never inspects cache`,t=>{
 const f=fixture(t);symlinkSync('/does/not/exist',join(f.cache,'acta-4119076.html'));assert.deepEqual(run(f,patch),{status:1,artifactReady:true});assert.ok(manifest(f).files.every(x=>x.status==='not-inspected'));assert.equal(JSON.stringify(manifest(f)).includes('SECRET'),false);assert.deepEqual(rawNames(f),[])
})
test('all 480 missing members yield explicit complete diagnostic manifest',t=>{const f=fixture(t);rmSync(join(f.root,'scripts'),{recursive:true});assert.deepEqual(run(f),{status:0,artifactReady:true});assert.ok(manifest(f).files.every(x=>x.status==='missing'));assert.deepEqual(heads(f).heads,[])})
for(const kind of ['symlink','ancestor symlink','directory','fifo','oversized']) test(`unsafe source ${kind} fails closed`,t=>{
 const f=fixture(t);f.put(fixed[0]);const target=join(f.cache,'acta-4119077.html')
 if(kind==='symlink') symlinkSync('/does/not/exist',target)
 if(kind==='ancestor symlink'){rmSync(f.cache,{recursive:true});symlinkSync(f.root,f.cache)}
 if(kind==='directory')mkdirSync(target)
 if(kind==='fifo')assert.equal(spawnSync('mkfifo',[target]).status,0)
 if(kind==='oversized')writeFileSync(target,Buffer.alloc(2097153))
 assert.equal(run(f).status,1);assert.ok(manifest(f).files.some(x=>x.status==='invalid'));assert.deepEqual(rawNames(f),[])
})
for(const kind of ['preexisting','symlink','outside','root symlink']) test(`unsafe output ${kind} never authorizes upload`,t=>{
 const f=fixture(t);let patch={};const outside=join(f.root,'outside');mkdirSync(outside);writeFileSync(join(outside,'marker'),'untouched')
 if(kind==='preexisting'){mkdirSync(f.output);writeFileSync(join(f.output,'manifest.json'),'stale')}
 if(kind==='symlink')symlinkSync(outside,f.output)
 if(kind==='outside')patch={output:outside}
 if(kind==='root symlink'){symlinkSync(outside,join(f.root,'link'));patch={root:join(f.root,'link'),output:join(f.root,'link/fcf-g13-predpomnjeni-dokazi')}}
 assert.deepEqual(run(f,patch),{status:1,artifactReady:false});assert.equal(readFileSync(join(outside,'marker'),'utf8'),'untouched');assert.deepEqual(readdirSync(outside),['marker'])
})
test('file changed after inspection is rejected before any raw output',t=>{
 const f=fixture(t),target=f.put(fixed[0]),open=fs.openSync;let changed=false
 fs.openSync=(path,...args)=>{if(path===target&&!changed){changed=true;writeFileSync(target,page(fixed[0])+'changed')}return open(path,...args)};syncBuiltinESMExports()
 try{assert.equal(run(f).status,1);assert.equal(manifest(f).files[0].reason,'source-changed');assert.deepEqual(rawNames(f),[])}finally{fs.openSync=open;syncBuiltinESMExports()}
})
test('incomplete output write never authorizes artifact upload',t=>{
 const f=fixture(t);f.put(fixed[0]);const write=fs.writeFileSync
 fs.writeFileSync=(path,...args)=>{if(path===join(f.output,'heads.json'))throw Error('private IO detail');return write(path,...args)};syncBuiltinESMExports()
 try{assert.deepEqual(run(f),{status:1,artifactReady:false})}finally{fs.writeFileSync=write;syncBuiltinESMExports()}
})
function env(f,patch={}){return {PATH:process.env.PATH,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',FCF_CACHE_KEY:f.options.requestedKey,FCF_CACHE_MATCHED_KEY:f.options.matchedKey,FCF_CACHE_HIT:'true',FCF_RESTORE_OUTCOME:'success',...patch}}
for(const scenario of ['ok','miss','wrong ref','wrong repo','extra arg','stale']) test(`actual CLI artifact eligibility: ${scenario}`,t=>{
 const f=fixture(t);f.put(fixed[0]);const actionOutput=join(f.root,'action-output');writeFileSync(actionOutput,'');const patch={GITHUB_OUTPUT:actionOutput}
 if(scenario==='miss')Object.assign(patch,{FCF_CACHE_HIT:'false',FCF_CACHE_MATCHED_KEY:''})
 if(scenario==='wrong ref')patch.GITHUB_REF='refs/heads/other'
 if(scenario==='wrong repo')patch.GITHUB_REPOSITORY='other/repo'
 if(scenario==='stale'){mkdirSync(f.output);writeFileSync(join(f.output,'manifest.json'),'stale')}
 const p=spawnSync(process.execPath,[script,...(scenario==='extra arg'?['--ids=9']:[])],{cwd:f.root,env:env(f,patch),encoding:'utf8',timeout:5000})
 assert.equal(p.status,scenario==='ok'?0:1,p.stderr);assert.equal(readFileSync(actionOutput,'utf8'),scenario==='stale'?'':'evidence_ready=true\n')
})
test('workflow is main-only, fixed exact two-key restore, bounded and only uploads ready output',()=>{
 assert.equal(existsSync(workflow),true,'bounded G13 workflow must exist');const text=readFileSync(workflow,'utf8')
 assert.match(text,/on:\n  workflow_dispatch:/);assert.match(text,/if: github.ref == 'refs\/heads\/main'/);assert.match(text,/timeout-minutes: 15/)
 assert.deepEqual([...text.matchAll(/^          - (zapisniki-.*)$/gm)].map(x=>x[1]),keys)
 assert.match(text,/persist-credentials: false/);assert.match(text,/permissions:\n  contents: read/);assert.match(text,/uses: actions\/cache\/restore@v4/)
 assert.match(text,/key: \$\{\{ matrix.cache_key \}\}/);assert.match(text,/if: always\(\) && steps.export.outputs.evidence_ready == 'true'/)
 assert.match(text,/path: fcf-g13-predpomnjeni-dokazi/);assert.match(text,/run: node scripts\/izvozi-fcf-g13-predpomnjene-dokaze.mjs/)
 assert.doesNotMatch(text,/inputs:|schedule:|restore-keys:|cache\/save|secrets\.|npm |curl |wget |cakaj-na|concurrency:/)
 assert.deepEqual([...text.matchAll(/uses: (.*)/g)].map(x=>x[1]),['actions/checkout@v4','actions/setup-node@v4','actions/cache/restore@v4','actions/upload-artifact@v4'])
})

// Controller amendment 55175c8: independently observed active Tercera G4 defect.
const g4 = (id,p={}) => page(id,{group:'GRUP 4',home:'CALLDETENES, C.F.',away:'SANT QUIRZE BESORA, U.D.',round:5,...p})
test('G4 fixed block adds four valid pair round/direction originals and total raw cap is thirteen',t=>{
 const f=fixture(t);fixed.forEach(id=>f.put(id));let id=4119240
 for(const round of [8,23]) for(const reverse of [false,true]) {const key=String(id++);f.put(key,page(key,{round,...(reverse?{home:'Pª JOVE DE LES ROQUETES',away:'BASE ESPIRALL-LES CLOTES,CF'}:{})}))}
 id=4115300
 for(const round of [5,20]) for(const reverse of [false,true]) {const key=String(id++);f.put(key,g4(key,{round,...(reverse?{home:'SANT QUIRZE BESORA, U.D.',away:'CALLDETENES, C.F.'}:{})}))}
 f.put('4115228',g4('4115228',{round:1}));f.put('4115467',g4('4115467',{round:30}));f.put('4115468',g4('4115468'))
 assert.equal(run(f).status,0);assert.equal(rawNames(f).length,13);const m=manifest(f),h=heads(f)
 assert.equal(m.block.maxFiles,480);assert.equal(m.block.maxReadBytes,1006632960);assert.equal(m.block.maxRawBytes,27262976);assert.equal(m.block.maxRawFiles,13)
 const g=h.heads.find(x=>x.id==='4115301');assert.equal(g.group,'GRUP 4');assert.equal(g.block,'4115228-4115467');assert.equal(g.header.domaci,'SANT QUIRZE BESORA, U.D.')
 assert.equal(h.heads.find(x=>x.id===fixed[0]).block,'4119076-4119315');assert.equal(h.heads.length,15);assert.equal(rawNames(f).includes('acta-4115228.html'),false)
})
for(const [name,p] of [['wrong round',{round:8}],['shortened pair',{home:'CALLDETENES'}],['invalid identity',{missingIdentity:true}]]) test(`G4 ${name} cannot select raw`,t=>{
 const f=fixture(t);f.put('4115300',g4('4115300',p));run(f);assert.deepEqual(rawNames(f),[])
})
test('G4 duplicate direction ambiguity cannot silently export either candidate',t=>{
 const f=fixture(t);for(const id of ['4115300','4115301'])f.put(id,g4(id));assert.equal(run(f).status,1);assert.equal(manifest(f).selection.state,'ambiguous');assert.deepEqual(rawNames(f),[])
})
for(const [id,body] of [['4119076',g4('4119076')],['4115228',page('4115228')]]) test(`fixed block ${id} rejects valid header from other allowed group`,t=>{
 const f=fixture(t);f.put(id,body);assert.equal(run(f).status,1);assert.equal(manifest(f).files.find(x=>x.id===id).status,'invalid');assert.deepEqual(heads(f).heads,[])
})
test('exact 2MiB original is accepted with exact hash; unrelated cache file remains unopened',t=>{
 const f=fixture(t);const prefix=page(fixed[0]);const bytes=Buffer.concat([Buffer.from(prefix),Buffer.alloc(2097152-Buffer.byteLength(prefix),32)]);f.put(fixed[0],bytes)
 symlinkSync('/does/not/exist',join(f.cache,'acta-9999999.html'));assert.equal(run(f).status,0);assert.equal(manifest(f).files[0].sha256,hash(bytes));assert.equal(readFileSync(join(f.output,'acta-4119076.html')).length,2097152)
})
test('every member of both fixed blocks is opened at most once, never an outside file',t=>{
 const f=fixture(t);for(let i=0;i<240;i++){f.put(String(4119076+i));f.put(String(4115228+i),g4(String(4115228+i),{round:1}))}
 const open=fs.openSync,counts=new Map();fs.openSync=(path,...args)=>{if(String(path).startsWith(f.cache)){counts.set(path,(counts.get(path)??0)+1)}return open(path,...args)};syncBuiltinESMExports()
 try{assert.equal(run(f).status,0);assert.equal(counts.size,480);assert.ok([...counts.values()].every(n=>n===1));assert.equal(heads(f).heads.length,480)}finally{fs.openSync=open;syncBuiltinESMExports()}
})
test('source changes during its single read fail descriptor checks',t=>{
 const f=fixture(t),target=f.put(fixed[0]),open=fs.openSync,read=fs.readSync;let sourceFd,changed=false
 fs.openSync=(path,...args)=>{const fd=open(path,...args);if(path===target)sourceFd=fd;return fd}
 fs.readSync=(fd,...args)=>{const n=read(fd,...args);if(fd===sourceFd&&!changed){changed=true;writeFileSync(target,page(fixed[0])+'changed')}return n};syncBuiltinESMExports()
 try{assert.equal(run(f).status,1);assert.equal(manifest(f).files[0].reason,'source-changed');assert.deepEqual(rawNames(f),[])}finally{fs.openSync=open;fs.readSync=read;syncBuiltinESMExports()}
})
function steps(text){return text.split(/^      - /m).slice(1).map(block=>({block,run:block.match(/^        run: (.*)$/m)?.[1],id:block.match(/^        id: (.*)$/m)?.[1],condition:block.match(/^        if: (.*)$/m)?.[1],uses:block.match(/uses: (.*)/)?.[1]}))}
function evaluate(value,context){return value.replace(/\$\{\{\s*(.*?)\s*\}\}/g,(_,expression)=>String(Function('matrix','steps',`return (${expression.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g,(_,key)=>`[${JSON.stringify(key)}]`)})`)(context.matrix,context.steps)))}
for(const key of keys)for(const [name,outcome,hit,matched,want] of [
 ['exact','success','true',key,0],['missing','success','','',1],['prefix','success','false',key+'-suffix',1],['restore failure','failure','true',key,1],['stale','success','true',key,1]
])test(`checked-in workflow shell/env ${key} ${name}`,t=>{
 const f=fixture(t,key);f.put(fixed[0]);const text=readFileSync(workflow,'utf8'),workflowSteps=steps(text),restore=workflowSteps.find(x=>x.uses?.startsWith('actions/cache/restore@'))
 const context={matrix:{cache_key:key},steps:{[restore.id]:{outcome,outputs:{'cache-hit':hit,'cache-matched-key':matched}}}}
 const actionOutput=join(f.root,'action-output');writeFileSync(actionOutput,'');writeFileSync(join(f.root,'scripts/izvozi-fcf-g13-predpomnjene-dokaze.mjs'),readFileSync(script));symlinkSync(new URL('./viri',import.meta.url).pathname,join(f.root,'scripts/viri'))
 if(name==='stale'){mkdirSync(f.output);writeFileSync(join(f.output,'unapproved'),'stale')}
 let invoked=false,uploaded=false
 for(const step of workflowSteps){
  if(!step.run&&!step.uses?.startsWith('actions/upload-artifact@'))continue
  const condition=step.condition?.replaceAll('always()','true').replace(/steps\.export\.outputs\.evidence_ready/g,JSON.stringify(context.steps.export?.outputs.evidence_ready??''))
  if(condition&&!Function(`return (${condition})`)())continue
  if(step.run){
   const stepEnv=Object.fromEntries([...step.block.matchAll(/^          ([A-Z_]+): (.+)$/gm)].map(([,k,v])=>[k,evaluate(v,context)]))
   const p=spawnSync('bash',['-euo','pipefail','-c',step.run],{cwd:f.root,env:env(f,{...stepEnv,GITHUB_OUTPUT:actionOutput}),encoding:'utf8',timeout:5000})
   assert.equal(p.status,want,p.stderr);invoked=true;context.steps[step.id]={outputs:Object.fromEntries(readFileSync(actionOutput,'utf8').trim().split('\n').filter(Boolean).map(x=>x.split('=')))}
  }else{uploaded=true;assert.equal(existsSync(join(f.output,'manifest.json')),true);assert.equal(existsSync(join(f.output,'heads.json')),true)}
 }
 assert.equal(invoked,true);assert.equal(uploaded,name!=='stale');if(name==='stale')assert.deepEqual(readdirSync(f.output),['unapproved'])
})
