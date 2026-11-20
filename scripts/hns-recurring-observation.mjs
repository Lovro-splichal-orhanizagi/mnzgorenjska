// Collection health follows immutable observations, independently of replay receipts.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'

export function collectionObservation(dir, now=Date.now()) {
  const observations=fs.readdirSync(path.join(dir,'snapshots')).map(name=>{
    assert.match(name,/^[a-f0-9]{64}\.json$/,'unexpected snapshot filename')
    const body=fs.readFileSync(path.join(dir,'snapshots',name))
    assert.equal(createHash('sha256').update(body).digest('hex'),name.slice(0,-5),'snapshot hash mismatch')
    const s=JSON.parse(body)
    assert.equal(s.schema,2);assert.equal(s.source,'hns');assert.equal(s.mode,'recurring')
    assert.ok(['complete','pending','paused','stopped'].includes(s.status),'unknown collection status')
    assert.ok(Array.isArray(s.leagues),'missing collection inventory')
    const time=Date.parse(s.updatedAt),created=Date.parse(s.createdAt)
    assert.ok(Number.isFinite(time)&&Number.isFinite(created)&&time>=created,'invalid observation time')
    assert.ok(time<=now+60000,'future observation')
    const complete=s.leagues.length===139&&s.leagues.every(l=>l.finished===true)
    return {sha256:name.slice(0,-5),time,status:s.status,complete,leagues:s.leagues.length}
  })
  // Same-time observations must all agree on health; hash/file order cannot hide a failure.
  const latestTime=observations.reduce((latest,o)=>Math.max(latest,o.time),-Infinity)
  const latest=observations.filter(o=>o.time===latestTime).sort((a,b)=>a.sha256.localeCompare(b.sha256))
  const healthy=latest.length>0&&now-latestTime<86400000&&latest.every(o=>o.complete&&['complete','pending'].includes(o.status))
  return {healthy,latestAt:latest.length?new Date(latestTime).toISOString():null,observations:latest}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=collectionObservation(process.argv[2])
  console.log(JSON.stringify(result))
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`observation_healthy=${result.healthy}\n`)
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Latest immutable collection observation\n\n```json\n'+JSON.stringify(result,null,2)+'\n```\n')
}
