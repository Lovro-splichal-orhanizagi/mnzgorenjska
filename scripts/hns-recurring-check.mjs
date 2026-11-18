// Check the entire inventory before publishing or admitting an unattended batch.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import {loadRecovery} from './viri/recovery-captured.mjs'
const dir=process.argv[2]
assert.ok(dir,'capture directory required')
const s=loadRecovery(dir,'hns',{recurring:true,allowPartial:true})
assert.ok(s.leagues.length>0&&s.leagues.length<=139,'invalid HNS inventory size')
if(['complete','pending'].includes(s.status)){assert.equal(s.leagues.length,139,'incomplete inventory marked complete');assert.ok(s.leagues.every(l=>l.finished===true),'unfinished league marked complete')}
const reports=s.leagues.reduce((n,l)=>n+l.reports.length,0),pending=s.leagues.reduce((n,l)=>n+l.pending.length,0)
const hashes=new Set()
for(const l of s.leagues)for(const c of [l.schedule,...l.reports.map(r=>r.capture)]){assert.match(c.sha256,/^[a-f0-9]{64}$/);hashes.add(c.sha256+'.html')}
fs.writeFileSync(path.join(dir,'blob-files.txt'),[...hashes].join('\n')+'\n')
const summary={inventoryComplete:s.leagues.length===139&&s.leagues.every(l=>l.finished),createdAt:s.createdAt,updatedAt:s.updatedAt,status:s.status,leagues:s.leagues.length,reports,pending,sourceUnplayed:s.sourceUnplayedCount??null,holds:s.holds??null}
console.log(JSON.stringify(summary))
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Croatian collector\n\n```json\n'+JSON.stringify(summary,null,2)+'\n```\n\n'+s.leagues.filter(l=>l.pending.length).map(l=>`- ${l.slug}: ${l.pending.length} held reports`).join('\n')+'\n')
