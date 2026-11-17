// Re-evaluate retained quality holds offline before publishing, without modifying
// the collector's live checkpoint or making any source/DB request.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {schedule,report} from './hns-recovery-validation.mjs'
const directory=process.argv[2],s=JSON.parse(fs.readFileSync(path.join(directory,'latest.json')))
assert.equal(s.source,'hns')
const manifestBytes=fs.readFileSync(path.join(directory,'manifest.json')),manifest=JSON.parse(manifestBytes)
assert.equal(createHash('sha256').update(manifestBytes).digest('hex'),s.manifestSha256,'collection manifest changed')
const read=e=>{assert.match(e.sha256,/^[a-f0-9]{64}$/);const b=fs.readFileSync(path.join(directory,'blobs',e.sha256+'.html'));assert.equal(createHash('sha256').update(b).digest('hex'),e.sha256);return b.toString()}
for(const l of s.leagues){
 const fixtures=schedule(read(l.schedule)),pending=[]
 const binding=manifest.leagues.find(x=>x.id===l.id&&x.slug===l.slug&&x.code===l.code);assert.ok(binding)
 l.sourceUnplayed=fixtures.filter(f=>f.datum>=s.fromDate&&f.datum<=s.throughDate&&!f.izid&&!binding.completed.includes(String(f.id)))
 for(const r of l.pending){
  try{const f=fixtures.find(f=>f.id===r.fixture.id);assert.deepEqual(f,r.fixture);assert.equal(r.capture.url,`https://semafor.hns.family/utakmice/${f.id}/x/`);const {quality}=report(read(r.capture),f,l.code);if(quality.complete){l.reports.push({...r,validation:quality});continue}}catch{}
  pending.push(r)
 }
 l.pending=pending
}
if(['pending','complete'].includes(s.status))s.status=s.leagues.some(l=>l.pending.length||l.sourceUnplayed.length)?'pending':'complete'
process.stdout.write(JSON.stringify(s,null,2))
