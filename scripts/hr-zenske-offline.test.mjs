import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {buildHnsWomenPacket,readHnsWomenCaptures,writeHnsWomenPacket,readHnsWomenPacket} from './hr-zenske-paket.mjs'
import {createHnsWomenOfflineFetch} from './hr-zenske-offline.mjs'
const captureDir=process.env.SLFF_HNS_WOMEN_CAPTURE_DIR,pilotDir=process.env.SLFF_HNS_WOMEN_PILOT_DIR,sha=x=>createHash('sha256').update(x).digest('hex')
test('closed HNS fetch never falls through to live source or foreign HNS paths',async()=>{
 const doc={url:'https://semafor.hns.family/utakmice/123/x/',canonicalUrl:'https://semafor.hns.family/utakmice/123/x/',body:'TEST ONLY'},calls=[],fetch=createHnsWomenOfflineFetch([doc],async(...a)=>{calls.push(a);return new Response('db')})
 assert.equal(await(await fetch(doc.url)).text(),doc.body)
 for(const url of ['https://semafor.hns.family/utakmice/124/x/','https://hns.family/anything','https://semafor.hns.family./utakmice/123/x/','https://semafor.hns.family%2e/utakmice/123/x/','http://semafor.hns.family/utakmice/123/x/'])await assert.rejects(()=>fetch(url),/closed|packet|source/i)
 await assert.rejects(()=>fetch(new Request(doc.url,{method:'POST'})),/closed|packet|source/i)
 assert.equal(await(await fetch('https://example.invalid/rest/v1/rounds')).text(),'db');assert.equal(calls.length,1)
})
test('original packet round-trip verifies every byte before any source or DB fetch',{skip:!captureDir||!pilotDir},async()=>{
 const now=Date.parse('2026-10-18T14:00:00Z'),packet=buildHnsWomenPacket({...readHnsWomenCaptures({captureDir,pilotDir,currentFile:'current-refresh-20261018-final.html'}),sourceCommit:'a'.repeat(40),now}),dir=mkdtempSync(join(tmpdir(),'hns-women-packet-'))
 try {
  const approvedSha256=writeHnsWomenPacket(packet,dir),loaded=readHnsWomenPacket(dir,{approvedSha256,now})
  assert.deepEqual(loaded.manifest,packet.manifest);assert.equal(loaded.documents.length,104)
  assert.throws(()=>readHnsWomenPacket(dir,{approvedSha256,now,requireReady:true}),/unpublished/i)
  const fetch=createHnsWomenOfflineFetch(loaded.documents,()=>{throw Error('network forbidden')})
  for(const d of loaded.documents)assert.equal(sha(await(await fetch(d.url)).text()),d.sha256)
  const path=join(dir,loaded.documents[0].file),raw=readFileSync(path);writeFileSync(path,raw+'changed')
  assert.throws(()=>readHnsWomenPacket(dir,{approvedSha256,now}),/bytes|SHA|capture/i)
  writeFileSync(path,raw);rmSync(path);symlinkSync('/etc/hosts',path)
  assert.throws(()=>readHnsWomenPacket(dir,{approvedSha256,now}),/symlink|file/i)
 } finally {rmSync(dir,{recursive:true,force:true})}
})
