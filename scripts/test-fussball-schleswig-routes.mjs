import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,symlinkSync,mkdtempSync,rmSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {razberiKrog} from './viri/fussball.mjs'
import {fussballFontUrl,inspectFussballPage} from './viri/fussball-discovery.mjs'
import {validateFussballFixture} from './fussball-season.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
const read=f=>readFileSync(new URL(`./vzorci/${f}`,import.meta.url))
const evidence=JSON.parse(read('de-fussball-schleswig-round16-20261024.json')),fonts={}
for(const d of evidence.documents){const bytes=read(d.file);assert.equal(bytes.length,d.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),d.sha256)
 if(d.kind==='font'){const id=d.url.match(/\/id\/([a-z0-9]{8})\//)[1],css=evidence.documents.find(x=>x.kind==='css'&&x.url.includes('/id/'+id+'/'));assert.equal(fussballFontUrl(read(css.file).toString(),id),d.url);fonts[id]={bytes,sha256:d.sha256}}
}
const html=read(evidence.documents.find(d=>d.kind==='round').file).toString(),parsed=razberiKrog(html,{fonts,staffel:evidence.scope.staffel})
const double=parsed.tekme.filter(f=>f.url.includes('--'))

test('unchanged retained Schleswig round decodes all eight exact fixture identities including two double-hyphen URLs',()=>{
 assert.equal(evidence.originalCaptureSuccess,false);assert.equal(evidence.requests,5)
 assert.equal(inspectFussballPage(html,{kind:'round',staffel:evidence.scope.staffel}).url,'https://www.fussball.de/spieltag/flens-oberliga-schleswig-holstein-oberliga-schleswig-holstein-herren-saison2627-schleswig-holstein/-/staffel/031AVH9TIC000004VS5489BTVSK8S3O6-G')
 assert.equal(parsed.sezona,'2026/27');assert.equal(parsed.krog,16);assert.equal(parsed.krogi.length,30)
 assert.deepEqual(parsed.tekme.map(f=>f.id),evidence.expectedFixtureIds);assert.equal(double.length,2)
 for(const f of parsed.tekme)assert.doesNotThrow(()=>validateFussballFixture(f,{round:16}),f.url)
})
test('transport admits the two actually linked double-hyphen report URLs with exact host/path/IDs',async()=>{
 for(const f of double){let calls=0;const c=createFussballCaptureClient({maxRequests:1,fetchFn:async url=>{assert.equal(url,f.url);calls++;return new Response('retained transport fixture',{headers:{'content-type':'text/html'}})}})
  await c.read(f.url,'report');assert.equal(calls,1)
 }
})
test('nearby unsupported slugs, foreign hosts, queries, extra paths and altered ID lengths remain rejected before fetch',async()=>{
 const f=double[0]
 for(const url of [f.url.replace('--','---'),f.url.replace('/spiel/vfb','/spiel/-vfb'),f.url.replace('/-/spiel/','-/-/spiel/'),f.url.replace('www.fussball.de','evil.invalid'),f.url+'?q=1',f.url+'/extra',f.url.slice(0,-1)]){
  let n=0;const c=createFussballCaptureClient({maxRequests:1,fetchFn:()=>{n++;throw Error('must not fetch')}})
  await assert.rejects(()=>c.read(url,'report'));assert.equal(n,0);assert.throws(()=>validateFussballFixture({...f,url},{round:16}))
 }
})
test('absolute screen CLI entered through a symlink executes argument validation instead of silently exiting',()=>{
 const parent=mkdtempSync(join(tmpdir(),'slff-screen-entry-'))
 try{const link=join(parent,'linked-cli.mjs');symlinkSync(fileURLToPath(new URL('./zajemi-fussball-vzorec.mjs',import.meta.url)),link)
  const run=spawnSync(process.execPath,[link,'unsupported-mode'],{cwd:parent,encoding:'utf8'});assert.equal(run.status,1);assert.match(run.stderr,/Use capture/)
 }finally{rmSync(parent,{recursive:true,force:true})}
})
