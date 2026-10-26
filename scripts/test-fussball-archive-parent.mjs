import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {inspectFussballArchivePage} from './fussball-season-links.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
const proof=JSON.parse(readFileSync(new URL('./vzorci/de-fussball-baden-archive-20261026.json',import.meta.url)))
const fixture=file=>readFileSync(new URL('./vzorci/'+file,import.meta.url))
const archiveHtml=fixture(proof.archiveSourceFile).toString(),currentBytes=fixture(proof.currentSourceFile)
const hash=b=>createHash('sha256').update(b).digest('hex')
const archiveParent=()=>({current:proof.current,observedSeedUrl:proof.observedSeedUrl,document:proof.currentOriginalReceipt.document,originalReceipt:proof.currentOriginalReceipt,bytes:currentBytes})
const options={...proof.archive,maxRequests:3,reportLimit:null,asOfDate:'2026-10-26'}
// Explicitly synthetic one-round, unplayed fixture body. Retained source header,
// form, canonical+OG and season selectors remain unchanged. This exercises the
// actual default collector and default offline verifier without live requests.
const roundUrl='https://www.fussball.de/spieltag/-/spieltag/1/staffel/'+proof.archive.staffel
const matchId='A'.repeat(32)
const html=archiveHtml.replace(/(<select\b[^>]*name="spieltag"[^>]*>)[\s\S]*?<\/select>/,`$1<option data-href="${roundUrl}" selected="selected">1. Spieltag</option></select>`).replace(/(<div class="fixtures-matches-table">[\s\S]*?<tbody>)[\s\S]*?<\/tbody>/,`$1<tr><td>01.05.2026</td></tr><tr><td class="column-date">15:00</td><td class="column-club"><div class="club-name">Synthetic Home</div></td><td class="column-club"><div class="club-name">Synthetic Away</div></td><td class="column-score"><a href="https://www.fussball.de/spiel/-/spiel/${matchId}"><span class="info-text">Ausfall</span></a></td></tr></tbody>`)
const fetchFn=async url=>{assert.equal(url,proof.archive.seedUrl);return new Response(html,{headers:{'content-type':'text/html'}})}
async function retained(run){const parent=mkdtempSync(join(tmpdir(),'fussball-parent-')),directory=join(parent,'capture');try{return await run(directory)}finally{rmSync(parent,{recursive:true,force:true})}}
test('authentic Baden header requires exact current-parent identity, selected season and archive form',()=>{
 assert.equal(hash(Buffer.from(archiveHtml)),'0656d749fe1aae62c48d11e478c103717db53e34bb3cd57a79b2d503e55bc6ea')
 assert.throws(()=>inspectFussballPage(archiveHtml,{kind:'round',staffel:proof.archive.staffel}))
 assert.equal(inspectFussballArchivePage(archiveHtml,{archive:proof.archive,current:proof.current}).url,proof.archive.seedUrl)
})
test('parent-aware capture persists original receipt and replays through the default strict collector/verifier',async()=>retained(async directory=>{
 const m=await captureFussballDirectory({directory,options,archiveParent:archiveParent(),fetchFn})
 assert.equal(m.version,3);assert.equal(m.snapshot.requests,1);assert.equal(m.documents.length,1)
 assert.equal(m.archiveParent.document.capturedAt,'2026-10-26T17:13:07.893Z')
 assert.deepEqual(m.archiveParent.originalReceipt,proof.currentOriginalReceipt)
 assert.deepEqual(m.archiveParent.alias,proof.redirect)
 assert.equal((await verifyFussballDirectory(directory)).verified,true)
 const raw=readFileSync(join(directory,'manifest.json'))
 for(const mutate of [x=>delete x.archiveParent,x=>x.archiveParent.current.staffel=proof.archive.staffel,x=>x.archiveParent.observedSeedUrl=proof.archive.seedUrl,x=>x.archiveParent.alias.sourceRun++,x=>x.archiveParent.originalReceipt.attempt.startedAt='2026-10-27T00:00:00Z',x=>x.archiveParent.originalReceipt.capture.codeSha256='f'.repeat(64),x=>x.archiveParent.originalReceipt.capture.createdAt='2026-10-26T17:12:00Z']){
  const changed=JSON.parse(raw);mutate(changed);writeFileSync(join(directory,'manifest.json'),JSON.stringify(changed));await assert.rejects(verifyFussballDirectory(directory))
 }
 writeFileSync(join(directory,'manifest.json'),raw)
 writeFileSync(join(directory,m.archiveParent.file),'changed parent bytes');await assert.rejects(verifyFussballDirectory(directory),/parent|hash|bytes/)
}))
test('missing/wrong parent or unobserved canonical alias is refused before archive network access',async()=>{
 for(const mutate of [x=>x.current.staffel=proof.archive.staffel,x=>x.observedSeedUrl=proof.archive.seedUrl,x=>x.bytes=Buffer.from('changed'),x=>x.originalReceipt.attempt.startedAt='2026-10-27T00:00:00Z'])await retained(async directory=>{
  const parent=structuredClone(archiveParent());mutate(parent);let requests=0
  await assert.rejects(captureFussballDirectory({directory,options,archiveParent:parent,fetchFn:async()=>{requests++;return fetchFn(options.seedUrl)}}));assert.equal(requests,0)
 })
 await retained(async directory=>{await assert.rejects(captureFussballDirectory({directory,options,fetchFn}),/identit/);await assert.rejects(verifyFussballDirectory(directory),/incomplete|failed/)})
})

test('parent paths are validated before reads and reject missing files and symlink directory or leaf',async()=>retained(async directory=>{
 const m=await captureFussballDirectory({directory,options,archiveParent:archiveParent(),fetchFn})
 const manifest=join(directory,'manifest.json'),raw=readFileSync(manifest),parentFile=join(directory,m.archiveParent.file),bytes=readFileSync(parentFile)
 // A wrong filename fails before the verifier even tries to read its target.
 m.archiveParent.file='never-exists.json';writeFileSync(manifest,JSON.stringify(m));await assert.rejects(verifyFussballDirectory(directory),/content-addressed path/)
 writeFileSync(manifest,raw);rmSync(parentFile);await assert.rejects(verifyFussballDirectory(directory),/ENOENT/)
 const foreign=join(directory,'foreign.html');writeFileSync(foreign,bytes);symlinkSync(foreign,parentFile);await assert.rejects(verifyFussballDirectory(directory),/symlink|regular/)
 rmSync(parentFile);writeFileSync(parentFile,bytes)
 renameSync(join(directory,'archive-parent'),join(directory,'real-parent'));symlinkSync(join(directory,'real-parent'),join(directory,'archive-parent'))
 await assert.rejects(verifyFussballDirectory(directory),/symbolic/)
}))
test('archive transport refusal keeps failed parent-aware evidence and cannot become replay success',async()=>retained(async directory=>{
 await assert.rejects(captureFussballDirectory({directory,options,archiveParent:archiveParent(),fetchFn:async()=>new Response('refused',{status:403})}),/403/)
 const m=JSON.parse(readFileSync(join(directory,'manifest.json')));assert.equal(m.version,3);assert.equal(m.success,false);assert.equal(m.snapshot.requests,1)
 await assert.rejects(verifyFussballDirectory(directory),/incomplete|failed/)
}))
