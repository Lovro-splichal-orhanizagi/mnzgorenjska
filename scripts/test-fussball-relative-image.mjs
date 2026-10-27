import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {replayFussballCardEnvelope,validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {buildFussballCardNativeRows} from './fussball-community-runtime.mjs'

const read=f=>readFileSync(new URL('./vzorci/de-fussball-relative-image/'+f,import.meta.url))
const witness=JSON.parse(read('provenance.json')),id=witness.matchId
const main=read('report.html').toString(),lineup=read('lineup.html').toString()
const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([key,f])=>[key,{bytes:read(f.file),sha256:f.sha256}]))
const observed='//images.media.fussball.de/userfiles/f/A/a/hxR4Z8tsdwHmfMlWpbRg91_p3.jpg'
const parse=(html=main,extra={})=>razberiFantasyZapisnik(html,lineup,{fonts,id,lineupId:id,season:witness.season,cardPolicy:'community-v1',...extra})

test('genuine relative decorative image URL preserves the public scorer and complete native report without photo requests',()=>{
 for(const row of witness.documents)assert.equal(createHash('sha256').update(read(row.kind+'.html')).digest('hex'),row.sha256)
 assert.ok(main.includes(observed))
 for(const policy of [undefined,'community-v1']){
  const result=parse(main,{cardPolicy:policy})
  assert.equal(result.reportStatistikaPripravljena,true)
  assert.deepEqual(result.z.rezultat,{domaci:3,gostje:0})
  assert.equal(result.z.goli.length,3)
  assert.equal(result.nastopi.length,32)
  assert.equal(result.nastopi.filter(a=>a.zacetnik).length,22)
  for(const side of [0,1])assert.equal(result.nastopi.filter(a=>a.ekipaIdx===side).reduce((n,a)=>n+a.minute,0),990)
  assert.equal(result.nastopi.filter(a=>a.vratar&&a.minute===90).length,2)
 }
 const e=parse().cardEnvelope
 validateFussballCardEnvelope(e)
 const report=replayFussballCardEnvelope(e,{})
 const candidates=e.roster.map((p,i)=>({source_id:p.sourceId,player_id:1000+i,team_id:p.side?202:101}))
 const rows=buildFussballCardNativeRows({envelope:e,report,candidates,matchId:789})
 assert.equal(rows.goals.length,3);assert.equal(rows.appearances.length,32)
 assert.ok(rows.goals.every(g=>g.team_id===101&&rows.appearances.some(a=>a.player_id===g.scorer_id&&a.goals>0)))
})

test('relative decorative URL support cannot accept foreign hosts, insecure URLs or altered event markup',()=>{
 for(const bad of [
  'http:'+observed,'https://evil.invalid/userfiles/f/A/a/hxR4Z8tsdwHmfMlWpbRg91_p3.jpg',
  observed.replace('images.media.fussball.de','images.media.fussball.de.evil.invalid'),
  observed+'?redirect=1',observed+'#hidden',observed.replace('_p3.jpg','_p4.jpg'),
 ])assert.throws(()=>parse(main.replaceAll(observed,bad)),/slika|struktura|atribut/)
 assert.throws(()=>parse(main.replaceAll(observed,observed+'" onerror="injected')))
})
