import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {validateHnsWomenDocument,buildHnsWomenPacket,readHnsWomenCaptures,validateHnsWomenPacket} from './hr-zenske-paket.mjs'
const body='<html>TEST-ONLY metadata bytes</html>',sha=x=>createHash('sha256').update(x).digest('hex')
const document=()=>({url:'https://semafor.hns.family/utakmice/114471616/znk-agram-znk-split/',file:'documents/match-114471616.html',capturedAt:'2026-10-18T12:03:15.379Z',status:200,bytes:Buffer.byteLength(body),sha256:sha(body),body})
test('immutable document metadata validates original bytes/time/request identity without a source call',()=>{
 const d=document(),result=validateHnsWomenDocument(d)
 assert.equal(result.canonicalUrl,'https://semafor.hns.family/utakmice/114471616/x/')
 assert.equal(result.capturedAt,d.capturedAt);assert.equal(result.sha256,sha(body))
})
for(const patch of [{sha256:'0'.repeat(64)},{bytes:1},{status:403},{capturedAt:'unknown'},{url:'https://example.com/utakmice/114471616/x/'},{file:'../match.html'},{file:'/absolute.html'},{body:body+'changed'}])test(`capture packet refuses changed/unsafe metadata ${JSON.stringify(patch)}`,()=>assert.throws(()=>validateHnsWomenDocument({...document(),...patch}),/HNS women packet|capture|SHA|identity|path|bytes|status/i))
const captureDir=process.env.SLFF_HNS_WOMEN_CAPTURE_DIR,pilotDir=process.env.SLFF_HNS_WOMEN_PILOT_DIR
// Full real reports remain private; this explicit offline replay is run in the implementation/review workspace.
test('retained real75archive+27current replay yields99unchanged complete reports and exact3unavailable',{skip:!captureDir||!pilotDir},()=>{
 const docs=readHnsWomenCaptures({captureDir,pilotDir,currentFile:'current-refresh-20261018-final.html'})
 const packet=buildHnsWomenPacket({...docs,sourceCommit:'a'.repeat(40),firstFantasyRound:9,now:Date.parse('2026-10-18T14:00:00Z')})
 assert.equal(packet.manifest.coverage.archiveComplete,75);assert.equal(packet.manifest.coverage.normalComplete,99)
 assert.deepEqual(packet.manifest.reports.filter(r=>r.statisticsStatus==='unavailable_historical').map(r=>r.id).sort(),['114471617','114471627','114471629'])
 assert.equal(packet.manifest.releaseReady,false);assert.deepEqual(packet.manifest.releaseBlockingPendingIds.sort(),['114471642','114471643','114471644','114471645'])
 assert.equal(packet.manifest.future.deadlineAt,'2026-10-24T22:00:00.000Z')
 assert.equal(packet.manifest.schedules.find(s=>s.code==='108043476').fixtures.length,75)
 assert.ok(packet.manifest.documents.every(d=>Date.parse(d.capturedAt)<=Date.parse('2026-10-18T13:00:00Z')))
 const audit=JSON.parse(readFileSync(resolve(captureDir,'audit.json'))),byID=new Map(audit.map(r=>[r.id,r]))
 for(const report of packet.manifest.reports.filter(r=>r.statisticsStatus==='available'))assert.deepEqual(report.appearances,byID.get(report.id).n)
 assert.equal(validateHnsWomenPacket(packet,{approvedSha256:sha(JSON.stringify(packet.manifest)),now:Date.parse('2026-10-18T14:00:00Z')}).coverage.normalComplete,99)
 for(const mutate of [p=>p.documents[0].body+='changed',p=>p.documents.push({...p.documents[0]}),p=>p.manifest.reports[0].appearances[0].minute=0,p=>p.manifest.releaseReady=true,p=>p.manifest.sourceBudget.total=999]) {
  const changed=structuredClone(packet);mutate(changed)
  assert.throws(()=>validateHnsWomenPacket(changed,{approvedSha256:sha(JSON.stringify(packet.manifest)),now:Date.parse('2026-10-18T14:00:00Z')}),/HNS women packet|SHA|document|manifest|budget/i)
 }
})
