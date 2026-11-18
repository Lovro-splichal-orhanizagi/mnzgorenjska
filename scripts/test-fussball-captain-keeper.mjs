import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'

// SLF-571: Verbandsliga Baden, SV Waldhof Mannheim 2 - ASV Eppelheim. The starting
// keeper is also captain, so the page marks him with the captain badge `C` and a
// separate `goal-keeper` badge `T`; the parser used to see no keeper and rejected the report.
const read=f=>readFileSync(new URL('./vzorci/de-fussball-captain-keeper/'+f,import.meta.url))
const witness=JSON.parse(read('provenance.json')),id=witness.matchId
const main=read('report.html').toString(),lineup=read('lineup.html').toString()
const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([key,f])=>[key,{bytes:read(f.file),sha256:f.sha256}]))
const parse=(html=lineup,policy='community-v1')=>razberiFantasyZapisnik(main,html,{fonts,id,lineupId:id,season:witness.season,cardPolicy:policy})
const captain='<div class="captain"><span class="c">C</span></div>',role='<div class="goal-keeper"><span class="k">T</span></div>'

test('a captain who is also the starting keeper no longer rejects the report',()=>{
 for(const row of witness.documents)assert.equal(createHash('sha256').update(read(row.kind+'.html')).digest('hex'),row.sha256)
 assert.equal(lineup.split(role).length-1,1)
 for(const policy of [undefined,'community-v1']){
  const result=parse(lineup,policy)
  assert.equal(result.z.zapisnikId,'de-fussball-'+id)
  assert.equal(result.z.datum,'2026-11-15')
  assert.equal([...result.z.domaci.postava,...result.z.gostje.postava].filter(p=>p.vratar).length,2)
  if(policy)assert.deepEqual(validateFussballCardEnvelope(result.cardEnvelope).cardEnvelope,result.cardEnvelope)
 }
})

test('the keeper badge still has to be exact and unique per starting eleven',()=>{
 const start=lineup.indexOf(role)
 // No keeper badge on the starting keeper: back to the original rejection.
 assert.throws(()=>parse(lineup.slice(0,start)+lineup.slice(start+role.length)),/vratar/)
 // A different class or text is not a keeper badge.
 assert.throws(()=>parse(lineup.replace(role,role.replace('"k"','"x"'))),/vratar/)
 assert.throws(()=>parse(lineup.replace(role,role.replace('>T<','>Z<'))),/vratar/)
 // A keeper badge without the captain badge next to it is not a keeper.
 const next=lineup.indexOf('<span class="player-number">',start)
 assert.throws(()=>parse(lineup.replace(captain,'')),/vratar/)
 // A second captain+keeper pair in the same starting eleven is still rejected.
 const other=lineup.indexOf('<span class="player-number">',next+1),stop=lineup.indexOf('</a>',other)
 assert.throws(()=>parse(lineup.slice(0,stop)+captain+'\n\t'+role+lineup.slice(stop)),/vratar/)
 // Only the witnessed markup counts: the compact one-line pair is still rejected.
 assert.throws(()=>parse(lineup.replace(/(<div class="captain"><span class="c">C<\/span><\/div>)\s+(<div class="goal-keeper">)/,'$1$2')),/vratar/)
 // Two keeper badges in one anchor are ambiguous.
 assert.throws(()=>parse(lineup.replace(role,role+role)),/vratar/)
})
