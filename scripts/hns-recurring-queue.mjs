// A batch leaves the queue only after all import shards AND score RPCs succeed.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
export function selectBatch(dir){
 const pending=[]
 for(const name of fs.readdirSync(path.join(dir,'snapshots'))){
  assert.match(name,/^[a-f0-9]{64}\.json$/,'unexpected snapshot filename')
  const id=name.slice(0,-5),body=fs.readFileSync(path.join(dir,'snapshots',name))
  assert.equal(createHash('sha256').update(body).digest('hex'),id,'snapshot hash mismatch')
  const s=JSON.parse(body);assert.equal(s.schema,2);assert.equal(s.source,'hns');assert.equal(s.mode,'recurring');assert.ok(Number.isFinite(Date.parse(s.createdAt)))
  assert.ok(Array.isArray(s.leagues))
  if(s.leagues.length===0){assert.ok(['paused','stopped'].includes(s.status),'empty complete inventory');continue}
  const receipt=path.join(dir,'receipts',name)
  if(fs.existsSync(receipt)){
   const r=JSON.parse(fs.readFileSync(receipt));assert.equal(r.sha256,id)
   if(r.status==='import-and-scoring-complete-with-review-holds')assert.ok(Array.isArray(r.manualReview)&&r.manualReview.length>0&&r.manualReview.every(h=>h.kind==='already-imported-source-change'&&Number.isSafeInteger(h.matchId)&&/^\d+$/.test(h.reportId)),'explicit review holds required')
   else assert.equal(r.status,'import-and-scoring-complete')
   continue
  }
  pending.push({sha256:id,createdAt:s.createdAt})
 }
 pending.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.sha256.localeCompare(b.sha256))
 return pending[0]??null
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const dir=process.argv[2],batch=selectBatch(dir)
 const holds=fs.readdirSync(path.join(dir,'receipts')).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).flatMap(n=>JSON.parse(fs.readFileSync(path.join(dir,'receipts',n))).manualReview??[])
 console.log(JSON.stringify({pending:!!batch,...batch,manualReview:holds}))
 if(holds.length&&process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Existing-result corrections awaiting review\n\nThese imported results were preserved.\n\n```json\n'+JSON.stringify(holds,null,2)+'\n```\n')
 if(batch)fs.copyFileSync(path.join(dir,'snapshots',batch.sha256+'.json'),path.join(dir,'latest.json'))
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`replay_needed=${!!batch}\nsnapshot=${batch?.sha256??''}\n`)
}
