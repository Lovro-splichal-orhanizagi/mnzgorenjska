// Read retained manifests only. Source holds do not resolve import/correction holds.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {collectionObservation} from './hns-recurring-observation.mjs'

const day = value => {
  assert.equal(typeof value,'string','invalid hold date')
  assert.match(value,/^\d{4}-\d{2}-\d{2}$/,'invalid hold date')
  assert.equal(new Date(value).toISOString().slice(0,10),value,'invalid hold date')
  return value
}
const identifier = value => {
  assert.ok(['number','string'].includes(typeof value),'invalid hold id')
  assert.match(String(value),/^[1-9]\d*$/,'invalid hold id')
  return String(value)
}

export function holdEvidence(dir,now=Date.now()) {
  // Validates filenames, hashes, times and schema, including older manifests.
  const observation=collectionObservation(dir,now)
  assert.ok(observation.observations.length,'no retained observation')
  const snapshots=observation.observations.map(o=>{
    const s=JSON.parse(fs.readFileSync(path.join(dir,'snapshots',o.sha256+'.json')))
    const fromDate=day(s.fromDate),holds=s.holds
    assert.ok(holds&&Array.isArray(holds.entries),'missing durable hold evidence')
    assert.equal(holds.openCount,holds.entries.length,'hold count mismatch')
    const keys=new Set()
    const entries=holds.entries.map(h=>{
      const leagueId=identifier(h.id),reportId=identifier(h.fixture?.id),key=leagueId+':'+reportId
      assert.ok(!keys.has(key),'duplicate hold');keys.add(key)
      assert.ok(['source-unplayed','report-pending'].includes(h.kind),'unknown hold kind')
      const playedOn=day(h.fixture.datum),first=Date.parse(h.firstObservedAt),last=Date.parse(h.lastObservedAt)
      assert.ok(Number.isFinite(first)&&Number.isFinite(last)&&first<=last&&last<=o.time,'invalid hold observation times')
      return {leagueId,reportId,kind:h.kind,playedOn,firstObservedAt:new Date(first).toISOString(),
        lastObservedAt:new Date(last).toISOString(),ageDays:Math.floor((now-first)/86400000),
        observationAgeDays:Math.floor((now-last)/86400000),outsideWindow:playedOn<fromDate}
    }).sort((a,b)=>a.leagueId.localeCompare(b.leagueId)||a.reportId.localeCompare(b.reportId))
    const olderCount=entries.filter(h=>h.outsideWindow).length
    assert.equal(holds.olderCount,olderCount,'older hold count mismatch')
    return {sha256:o.sha256,status:o.status,inventoryComplete:o.complete,fromDate,openCount:entries.length,olderCount,
      byKind:{'source-unplayed':entries.filter(h=>h.kind==='source-unplayed').length,'report-pending':entries.filter(h=>h.kind==='report-pending').length},entries}
  })
  // Keep tied observations separate; never choose a more convenient ledger.
  return {checkedAt:new Date(now).toISOString(),latestAt:observation.latestAt,
    observationHealthy:observation.healthy,snapshots}
}
