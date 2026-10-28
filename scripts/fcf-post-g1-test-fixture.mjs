// Genuine retained failure60, offline GET replay only. Synthetic future executions
// built by other fixtures never establish an actual new source attempt.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const sha=b=>createHash('sha256').update(b).digest('hex')
export function postG1RetainedFixture(){
 const dir=process.env.FCF_G1_POST_FAILURE_EVIDENCE_DIR,read=n=>readFileSync(join(dir,n)),parse=n=>JSON.parse(read(n)),map=new Map()
 for(const line of read('get-journal.ndjson').toString().trim().split('\n')){const r=JSON.parse(line);if(r.status==='actual-get-returned'){const b=read(r.filename);if(sha(b)!==r.sha256)throw Error('actual retained fixture digest differs');map.set(r.path,b)}}
 const config=parse('input-original-root-config.json'),approval=parse('input-source-approval.json'),loc=parse('authentication-input-locators.json'),history={prior:config.history,latest:{plan:approval.plan,claim:{execution:loc.execution,expected:loc.expected},consumption:loc.consumption,child:{diagnostic:loc.child},finalReceipt:loc.finalReceipt}},calls=[]
 const github=async(path,binary=false)=>{calls.push([path,binary]);const b=map.get(path);if(!b)throw Error('Missing retained actual response '+path);return binary?Buffer.from(b):JSON.parse(b)}
 return {history,github,calls,map,now:Date.parse('2026-10-28T12:00:00Z')}
}
