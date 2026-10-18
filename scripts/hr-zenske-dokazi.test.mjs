import test from 'node:test'
import assert from 'node:assert/strict'
import {buildHnsWomenPacket,readHnsWomenCaptures} from './hr-zenske-paket.mjs'
import {hnsWomenPersistedEvidence} from './hr-zenske-dokazi.mjs'
const captureDir=process.env.SLFF_HNS_WOMEN_CAPTURE_DIR,pilotDir=process.env.SLFF_HNS_WOMEN_PILOT_DIR
test('canonical persisted proof keeps exact source person identity and null unavailable observations',{skip:!captureDir||!pilotDir},()=>{
 const packet=buildHnsWomenPacket({...readHnsWomenCaptures({captureDir,pilotDir,currentFile:'current-refresh-20261018-final.html'}),sourceCommit:'a'.repeat(40),now:Date.parse('2026-10-18T14:00:00Z')})
 const evidence=hnsWomenPersistedEvidence(packet.manifest)
 assert.equal(evidence.length,131);assert.equal(evidence.filter(f=>f.statisticsStatus==='unavailable_historical').length,3)
 assert.equal(evidence.filter(f=>f.played&&f.statisticsStatus==='available').length,99)
 for(const f of evidence){
  if(f.statisticsStatus==='unavailable_historical')assert.deepEqual([f.appearances,f.goals],[null,null])
  else if(f.played){assert.equal(f.appearances.filter(p=>p.started).length,22);assert.ok(f.appearances.every(p=>/^[1-9]\d*$/.test(p.sourcePersonId)));assert.ok(f.goals.every(g=>f.appearances.some(p=>p.side===g.side&&p.sourcePersonId===g.sourcePersonId)))}
  else assert.deepEqual([f.appearances,f.goals],[[],[]])
 }
 const transition=evidence.find(f=>f.sourceMatchId==='100511758')
 assert.equal(transition.appearances.filter(p=>p.side===1&&p.is_goalkeeper).reduce((n,p)=>n+p.minutes_played,0),89)
 assert.equal(evidence.find(f=>f.sourceMatchId==='108056175').internalRound,21)
 const postponed=evidence.find(f=>f.sourceMatchId==='114471614');assert.equal(postponed.playedOn,null);assert.equal(postponed.explicitPostponed,true)
 const future=evidence.find(f=>f.sourceMatchId==='114471646');assert.equal(future.kickoff,null);assert.equal(future.playedOn,'2026-10-25')
 const changed=structuredClone(packet.manifest);changed.reports.find(r=>r.statisticsStatus==='available').z.goli[0].st=999
 assert.throws(()=>hnsWomenPersistedEvidence(changed),/goal|person|identity/i)
})
