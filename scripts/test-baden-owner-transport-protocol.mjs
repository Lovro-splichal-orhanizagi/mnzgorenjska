// Source-free physical adapter/CLI and compressed ZIP protocol checks.
import test from 'node:test'
import assert from 'node:assert/strict'
import child from 'node:child_process'
import {syncBuiltinESMExports} from 'node:module'
import {fileURLToPath} from 'node:url'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,symlinkSync,readdirSync,realpathSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',head='a'.repeat(40),secret='TEST_SECRET_MUST_NEVER_APPEAR'
if(process.argv[2]==='adapter'){
 const calls=[];let fault=null;child.execFileSync=(cmd,args,options)=>{calls.push({args,timeout:options.timeout,maxBuffer:options.maxBuffer,stdio:options.stdio});if(fault)throw fault;return Buffer.concat([Buffer.from('HTTP/2.0 200 OK\r\n\r\n'),Buffer.from(args.includes('Accept: application/vnd.github.raw+json')?'raw':'{}')])};syncBuiltinESMExports()
 const {githubGetAdapter}=await import('./stage-fussball-native-composition.mjs'),get=githubGetAdapter(secret)
 await get(prefix+'actions/artifacts/123/zip',true);await get(prefix+'actions/artifacts/123');await get(prefix+'contents/scripts/policies/fussball-baden-native-composition.json?ref='+head,true)
 const errors=[];let failedId=124;for(const f of [{code:'ETIMEDOUT'},{code:'ENOBUFS'},{stderr:Buffer.from('gh: Not Found (HTTP 404) '+secret)},{message:secret}]){fault=Object.assign(Error(secret),f);try{await get(prefix+'actions/artifacts/'+failedId+++'/zip',true)}catch(e){errors.push({code:e.code,githubDiagnostic:e.githubDiagnostic,message:e.message})}}
 console.log(JSON.stringify({calls,errors}));process.exit(0)
}else{
 test('physical GitHub adapter scopes 180s to artifact ZIP only and emits bounded safe failure codes',()=>{
  const r=JSON.parse(child.execFileSync(process.execPath,[fileURLToPath(import.meta.url),'adapter'],{encoding:'utf8'}));assert.equal(r.calls[0].timeout,180000);assert.deepEqual(r.calls[0].stdio,['ignore','pipe','pipe']);assert.equal(r.calls[0].maxBuffer,512*1024*1024+64*1024+1);assert.equal(r.calls[1].timeout,60000);assert.equal(r.calls[2].timeout,60000);assert.equal(r.calls[2].maxBuffer,4*1024*1024+64*1024+1);assert.deepEqual(r.errors.map(e=>e.githubDiagnostic),['ARTIFACT_ZIP_TIMEOUT','ARTIFACT_ZIP_BUFFER','ARTIFACT_ZIP_HTTP_404','ARTIFACT_ZIP_FAILED']);assert.ok(!JSON.stringify(r.errors).includes(secret))
 })
 test('physical installer CLI retains only safe failure DATA while refusing pins before network or credentials',t=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'baden-diagnostic-TEST-ONLY-')));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'scripts'));mkdirSync(join(root,'scripts/lib'));const original=new URL('./install-baden-native-catalog.mjs',import.meta.url),text=readFileSync(original,'utf8'),copy=join(root,'scripts/install-baden-native-catalog.mjs');writeFileSync(copy,text)
  for(const match of text.matchAll(/^import .* from '(\.\/[^']+)'/gm)){const source=new URL(match[1],original);symlinkSync(fileURLToPath(source),join(root,'scripts',match[1].slice(2)))}
  const r=child.spawnSync(process.execPath,[copy,'validate'],{cwd:root,encoding:'utf8',env:{PATH:'/usr/bin:/bin',GITHUB_ACTIONS:'false',GH_TOKEN:secret,SUPABASE_DB_URL:secret}});assert.equal(r.status,1);assert.match(r.stderr,/"phase":"PINS"/);assert.match(r.stderr,/"code":"PINS_REFUSED"/);assert.ok(!r.stderr.includes(secret));assert.equal(r.stdout,'')
  const directory=join(root,'baden-native-catalog-install'),raw=readFileSync(join(directory,'diagnostic.json'),'utf8');assert.deepEqual(readdirSync(directory),['diagnostic.json']);assert.deepEqual(JSON.parse(raw),JSON.parse(r.stderr));assert.ok(!raw.includes(secret));const again=child.spawnSync(process.execPath,[copy,'validate'],{cwd:root,encoding:'utf8',env:{PATH:'/usr/bin:/bin',GITHUB_ACTIONS:'false'}});assert.equal(again.status,1);assert.equal(readFileSync(join(directory,'diagnostic.json'),'utf8'),raw)
 })
 test('derived ZIP compression6 preserves exact uncompressed certificate/pack and private hosted load gates',async t=>{
  const {hostedDerivedFixture,derivedRunId,derivedHead,hash}=await import('./fussball-native-composition-test-fixture.mjs'),f=await hostedDerivedFixture(t),root=mkdtempSync(join(tmpdir(),'baden-compressed-TEST-ONLY-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [name,b]of f.files)writeFileSync(join(root,name),b)
  child.execFileSync('zip',['-q','-6','compressed.zip',...f.files.keys()],{cwd:root});const zip=readFileSync(join(root,'compressed.zip'));assert.ok(zip.length<f.zipBytes.length);for(const [name,b]of f.files)assert.deepEqual(child.execFileSync('unzip',['-p',join(root,'compressed.zip'),name],{maxBuffer:b.length+1}),b)
  f.zipBytes=zip;Object.assign(f.artifact,{size_in_bytes:zip.length,digest:'sha256:'+hash(zip)});f.inventory={total_count:1,artifacts:[f.artifact]};const proof=await f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',v6FrozenDirectory:'TEST-ONLY-4e',github:f.github});assert.equal(proof.actualReady,false);assert.equal(proof.nativeImportEligible,false)
 })
}
