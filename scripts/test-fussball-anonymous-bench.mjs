import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiPostavo,razberiZapisnik} from './viri/fussball.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {validateFussballCardEnvelope,replayFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
const read=n=>readFileSync(new URL('./vzorci/de-fussball-anonymous-bench/'+n,import.meta.url))
const provenance=JSON.parse(read('provenance.json')),fonts=Object.fromEntries(Object.entries(provenance.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const fixtures=provenance.records.map(r=>({...r,main:read(r.matchId+'-report.html').toString(),lineup:read(r.matchId+'-lineup.html').toString()})),[bench,leadingZero,starters]=fixtures
const parse=(f=bench,lineup=f.lineup,main=f.main,cardPolicy)=>razberiFantasyZapisnik(main,lineup,{fonts,id:f.matchId,lineupId:f.matchId,season:'2026/27',...(cardPolicy?{cardPolicy}:{})})
const placeholder=f=>f.lineup.match(/<a href="#"[^>]*>[\s\S]*?<\/a>/)[0]
const baseRead=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const baseProof=JSON.parse(baseRead('de-fussball-zapisnik.json')),baseFonts=Object.fromEntries(Object.entries(baseProof.fonts).map(([id,f])=>[id,{bytes:baseRead(f.file),sha256:f.sha256}]))
const base={matchId:'031EQBPLF4000000VS5489BTVUS470OH',main:baseRead('de-fussball-ilvesheim-main.html').toString(),lineup:baseRead('de-fussball-ilvesheim-lineup.html').toString()}
function compose(row){
 // TEST ONLY composition: the unchanged genuine anonymous bench row is placed
 // into the fully retained Ilvesheim frame. This is not a full Baden replay.
 const side=row.match(/class="player-wrapper (home|away)"/)[1],bench=base.lineup.indexOf('<div class="substitutes club-wrapper">'),group=base.lineup.indexOf(`<div class="group ${side}">`,bench),at=base.lineup.indexOf('<a href=',group)
 return base.lineup.slice(0,at)+row+base.lineup.slice(at)
}
const parseComposition=(row,lineup=compose(row),main=base.main,cardPolicy)=>razberiFantasyZapisnik(main,lineup,{fonts:baseFonts,id:base.matchId,lineupId:base.matchId,season:'2026/27',...(cardPolicy?{cardPolicy}:{})})
test('retained fixtures pin exact original bytes and include genuine #24, #03 bench and anonymous starters',()=>{
 for(const r of fixtures)for(const d of r.documents)assert.equal(createHash('sha256').update(read(d.retainedFile)).digest('hex'),d.sha256)
 assert.match(placeholder(bench),/player-number">24</);assert.match(placeholder(leadingZero),/player-number">03</)
 assert.equal([...starters.lineup.matchAll(/<a href="#"/g)].length,3)
})
test('exact genuine anonymous unused reserves are omitted from public lineup in both observed shirt forms',()=>{
 for(const f of [bench,leadingZero]){
  const teams=razberiPostavo(f.lineup,{fonts}),all=teams.flatMap(t=>[...t.postava,...t.rezerve])
  assert.equal(teams.flatMap(t=>t.postava).length,22);assert.ok(all.every(p=>p.virId&&p.ime!=='k.A.'));assert.equal(all.length,[...f.lineup.matchAll(/<a href="https:\/\/www\.fussball\.de\/spielerprofil\//g)].length)
 }
})
test('genuine complete Baden report replay still holds on missing retained report fonts',()=>{
 for(const [f,font]of [[bench,'cdqbs15t'],[leadingZero,'jnei0hbk']])assert.throws(()=>parse(f,f.lineup,f.main,'community-v1'),new RegExp('manjka vezana pisava '+font))
})
test('TEST ONLY exact bench-row compositions preserve full statistics and exclude private voting/native identities',()=>{
 const baseline=razberiFantasyZapisnik(base.main,base.lineup,{fonts:baseFonts,id:base.matchId,lineupId:base.matchId})
 for(const f of [bench,leadingZero]){
  const row=placeholder(f),lineup=compose(row),community=parseComposition(row,lineup,base.main,'community-v1'),strict=parseComposition(row)
  assert.deepEqual(strict.nastopi,baseline.nastopi);assert.deepEqual(community.nastopi,baseline.nastopi)
  assert.deepEqual(community.z.domaci,baseline.z.domaci);assert.deepEqual(community.z.gostje,baseline.z.gostje)
  assert.ok(community.z.opozorila.some(w=>/izpuščene nejavne neuporabljene rezerve: 1/.test(w)))
  assert.ok(community.cardEnvelope.roster.every(p=>p.sourceId&&p.name!=='k.A.'));assert.equal(Buffer.from(community.cardEnvelope.bundle.lineup.base64,'base64').toString(),lineup)
  assert.deepEqual(validateFussballCardEnvelope(community.cardEnvelope).cardEnvelope,community.cardEnvelope)
  const native=replayFussballCardEnvelope(community.cardEnvelope,{})
  assert.equal(native.nastopi.length,baseline.nastopi.length);assert.ok(native.nastopi.every(p=>p.virId&&p.ime!=='k.A.'))
 }
})
test('genuine unnamed starters remain holds in both strict and community paths',()=>{for(const policy of [undefined,'community-v1']){assert.throws(()=>razberiPostavo(starters.lineup,{fonts}),/profil|identitet|začetn/);assert.throws(()=>parse(starters,starters.lineup,starters.main,policy),/profil|identitet|začetn/)}})
test('the exception rejects changed identity, side, image, role, name, attributes and wrapped bench markup',()=>{
 const row=placeholder(bench)
 for(const changed of [row.replace('href="#"','href=""'),row.replace('player-wrapper home','player-wrapper away'),row.replace('NPI_1234567890123456789012345678','NPI_1234567890123456789012345679'),row.replace('class="firstname"','data-obfuscation="q7mmnqjw" class="firstname"'),row.replace('>k.A.<','>Private Name<'),row.replace('</a>','<div class="captain"><span class="c">T</span></div></a>'),row.replace('class="player-wrapper home"','class="player-wrapper home" hidden="hidden"'),'<div class="unexpected">'+row+'</div>']){assert.throws(()=>razberiPostavo(bench.lineup.replace(row,changed),{fonts}));for(const policy of [undefined,'community-v1'])assert.throws(()=>parseComposition(row,compose(row).replace(row,changed),base.main,policy))}
})
test('TEST ONLY anonymous substitute, scorer or linked card event cannot hide behind a bench omission',()=>{
 const row=placeholder(bench),lineup=compose(row)
 function range(html,start){const tokens=/<\/?div\b[^>]*>/g;tokens.lastIndex=start;let depth=0,m;while((m=tokens.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(!depth)return html.slice(start,tokens.lastIndex)}assert.fail('unclosed row')}
 const rows=[...base.main.matchAll(/<div class="row-event event-(?:left|right)(?: own-goal)?">/g)].map(m=>range(base.main,m.index))
 const substitution=rows.find(r=>r.includes('icon-substitute')),goal=rows.find(r=>r.includes('class="even"')),yellow=rows.find(r=>r.includes('icon-card yellow-card'))
 assert.ok(substitution&&goal&&yellow)
 const broken=[substitution,goal].map(r=>base.main.replace(r,r.replace(/href="https:\/\/www\.fussball\.de\/spielerprofil\/[^"]+"/,'href="#"')))
 const named=yellow.replace('<div class="valign-cell">Gelbe Karte</div>','<div class="valign-cell"><div>Gelbe Karte</div><a href="#"><span data-obfuscation="q73uvs1t">&#xE000;</span></a></div>')
 broken.push(base.main.replace(yellow,named))
 for(const main of broken)for(const policy of [undefined,'community-v1'])assert.throws(()=>parseComposition(row,lineup,main,policy),/identitet|enoličn|menjava brez obeh/)
})

test('TEST ONLY a publicly linked used reserve cannot be replaced by an anonymous bench row',()=>{
 const baseline=razberiFantasyZapisnik(base.main,base.lineup,{fonts:baseFonts,id:base.matchId,lineupId:base.matchId}),entered=baseline.nastopi.find(p=>!p.zacetnik&&p.ekipaIdx===0&&p.minute>0)
 const original=[...base.lineup.matchAll(/<a href="https:\/\/www\.fussball\.de\/spielerprofil\/[^"]+"[^>]*>[\s\S]*?<\/a>/g)].find(m=>m[0].includes(entered.virId.split('-').at(-1)))[0]
 const privateRow=placeholder(bench).replace('>24</span>',`>${entered.st}</span>`),lineup=base.lineup.replace(original,privateRow)
 for(const policy of [undefined,'community-v1'])assert.throws(()=>parseComposition(privateRow,lineup,base.main,policy),/neznanega igralca/)
})
test('duplicate anonymous slots and anonymous rows outside their actual bench group stay rejected',()=>{
 const row=placeholder(bench),lineup=compose(row)
 for(const changed of [lineup.replace(row,row+row),lineup.replace(row,'').replace('</div>','</div>'+row)])for(const policy of [undefined,'community-v1'])assert.throws(()=>parseComposition(row,changed,base.main,policy))
})
