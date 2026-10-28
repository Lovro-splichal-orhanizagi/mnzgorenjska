// Native-only prototype. Genuine retained community report; role variants are
// explicit synthetic mutations. No source/DB capability or external IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
const api=await import('./viri/fussball-native-role-parser.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e})
const read=n=>readFileSync(new URL('./vzorci/de-fussball-community/'+n,import.meta.url)),w=JSON.parse(read('provenance.json')),main=read('report.html').toString(),lineup=read('lineup.html').toString(),fonts=Object.fromEntries(Object.entries(w.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}])),opts={fonts,id:w.matchId,lineupId:w.matchId,season:w.season,cardPolicy:'community-v1'}
const single='<div class="captain"><span class="c">T</span></div>',captain='<div class="captain"><span class="c">C</span></div>',role='<div class="goal-keeper"><span class="k">T</span></div>',changed=lineup.replace(single,captain+role),sha=b=>createHash('sha256').update(b).digest('hex')
function parse(html=changed,extra={}){assert.equal(typeof api.razberiNativeFantasyZapisnik,'function');return api.razberiNativeFantasyZapisnik(main,html,{...opts,...extra})}
test('native exact captain+keeper role retains ORIGINAL bundle/hash/revision and roundtrips whole envelope',()=>{
 assert.throws(()=>razberiFantasyZapisnik(main,changed,opts),/vratar/)
 const r=parse(),e=r.cardEnvelope;assert.equal(e.version,1);assert.equal(e.nativeRoleParser.protocol,'fussball-native-captain-keeper-v1');assert.equal(e.bundle.lineup.sha256,sha(changed));assert.equal(Buffer.from(e.bundle.lineup.base64,'base64').toString(),changed);assert.notEqual(e.nativeRoleParser.normalizedLineupSha256,e.bundle.lineup.sha256)
 assert.equal(e.nativeRoleParser.originalLineupSha256,e.bundle.lineup.sha256);assert.equal(e.nativeRoleParser.replacementOffsets.length,1)
 assert.equal(e.roster.filter(p=>p.starter&&p.goalkeeper).length,2);assert.throws(()=>validateFussballCardEnvelope(e));assert.deepEqual(api.validateFussballNativeRoleEnvelope(e).cardEnvelope,e)
 const normalized=Buffer.from(changed);for(const offset of e.nativeRoleParser.replacementOffsets){assert.equal(normalized[offset],107);normalized[offset]=99}assert.equal(normalized.length,Buffer.byteLength(changed));assert.equal(sha(normalized),e.nativeRoleParser.normalizedLineupSha256)
 const revision=sha(e.bundle.report.sha256+'\n'+e.bundle.lineup.sha256+'\n'+e.bundle.fonts.map(f=>f.fontId+':'+f.sha256).join('\n'));assert.equal(e.revisionSha256,revision);for(const c of e.cards)assert.equal(c.eventKey,sha(`${e.reportId}:${revision}:${c.ordinal}:${c.eventSha256}`))
})
test('legacy v1 parse/validation/replay delegates unchanged',()=>{assert.equal(typeof api.razberiNativeFantasyZapisnik,'function');const old=razberiFantasyZapisnik(main,lineup,opts),r=parse(lineup);assert.deepEqual(r,old);assert.deepEqual(api.validateFussballNativeRoleEnvelope(old.cardEnvelope),validateFussballCardEnvelope(old.cardEnvelope))})
test('comment/rawtext/wrong-wrapper/captain-only markers never create a keeper',()=>{
 for(const html of [changed.replace(role,'<!--'+role+'-->'),changed.replace(role,'<script>'+role+'</script>'),changed.replace(role,'<style>'+role+'</style>'),changed.replace(role,'<textarea>'+role+'</textarea>'),changed.replace(role,role.replace('goal-keeper','captain')),changed.replace(role,role.replace('>T<','>C<')),changed.replace(role,role.replace('<span class="k">T</span>','<span class="k"><b>T</b></span>'))])assert.throws(()=>parse(html))
})
test('duplicate or ambiguous live goalkeeper roles and recipient/source scope drift refuse',()=>{
 for(const html of [changed.replace(role,role+role),changed.replace(role,role+single),changed.replace(role,role.replace('class="k"','class="k" class="c"')),changed.replace(captain,'')])assert.throws(()=>parse(html))
 for(const extra of [{parser:()=>{}},{clock:()=>0},{success:true},{lineupId:'A'.repeat(32)}])assert.throws(()=>parse(changed,extra))
})
test('native original bytes/protocol/offset/card/roster mutations fail replay',()=>{
 const e=parse().cardEnvelope
 for(const change of [v=>{v.bundle.lineup.base64=Buffer.from('changed').toString('base64')},v=>{v.nativeRoleParser.originalLineupSha256='a'.repeat(64)},v=>{v.nativeRoleParser.normalizedLineupSha256='b'.repeat(64)},v=>{v.nativeRoleParser.replacementOffsets[0]++},v=>{v.nativeRoleParser.protocol='other'},v=>{v.nativeRoleParser.success=true},v=>{v.cards[0].minute++},v=>{v.roster[0].goalkeeper=!v.roster[0].goalkeeper},v=>{v.round++}]){const bad=structuredClone(e);change(bad);assert.throws(()=>api.validateFussballNativeRoleEnvelope(bad))}
})
test('native community resolution uses original event keys and same-side roster only',()=>{
 const e=parse().cardEnvelope,red=e.cards.find(c=>c.type!=='yellow'),candidate=e.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!main.includes(p.sourceId.split('-').at(-1))),resolutions={[red.eventKey]:candidate.sourceId};if(red.type==='second_yellow')resolutions[e.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal).eventKey]=candidate.sourceId
 const r=api.replayFussballNativeRoleEnvelope(e,resolutions);assert.equal(r.cardEnvelope.bundle.lineup.sha256,e.bundle.lineup.sha256);assert.deepEqual(r.cardEnvelope.nativeRoleParser,e.nativeRoleParser);assert.throws(()=>api.replayFussballNativeRoleEnvelope(e,{}));assert.throws(()=>api.replayFussballNativeRoleEnvelope(e,{bad:candidate.sourceId}))
})

test('lookalike data-class and data-href attributes cannot authorize role normalization',()=>{
 assert.throws(()=>parse(changed.replace('class="player-wrapper home"','data-class="player-wrapper home"')))
 assert.throws(()=>parse(changed.replace('href="https://www.fussball.de/spielerprofil/','data-href="https://www.fussball.de/spielerprofil/')))
})

test('pure inspector exposes defensive original-byte role DATA even when report parsing would fail',()=>{
 assert.equal(typeof api.inspectFussballNativeRoleEvidence,'function')
 const p=api.inspectFussballNativeRoleEvidence(changed);assert.equal(p.protocol,'fussball-native-captain-keeper-v1');assert.equal(p.originalLineupSha256,sha(changed));assert.equal(p.replacementOffsets.length,1)
 const offset=p.replacementOffsets[0];p.replacementOffsets[0]++;assert.equal(api.inspectFussballNativeRoleEvidence(changed).replacementOffsets[0],offset)
 assert.equal(api.inspectFussballNativeRoleEvidence(lineup),null);assert.equal(api.inspectFussballNativeRoleEvidence(changed.replace(role,'<!--'+role+'-->')),null);assert.equal(api.inspectFussballNativeRoleEvidence(changed.replace(role,'<script>'+role+'</script>')),null)
 assert.throws(()=>parse(changed,{parser:()=>true}));assert.equal(api.inspectFussballNativeRoleEvidence(changed).originalLineupSha256,sha(changed));assert.throws(()=>api.inspectFussballNativeRoleEvidence({html:changed}))
})

test('PURE inspector cannot discover class/href names inside other attribute values or data-* names',()=>{
 const inspect=api.inspectFussballNativeRoleEvidence,href=lineup.match(/href="(https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+)"/)[1]
 for(const html of [changed.replace('class="player-wrapper home"','data-class="player-wrapper home"'),changed.replace('href="https://www.fussball.de/spielerprofil/','data-href="https://www.fussball.de/spielerprofil/'),`<a data-proof='class="player-wrapper home" href="${href}"'>${captain}${role}</a>`,`<div data-proof='<a class="player-wrapper home" href="${href}">${captain}${role}</a>'></div>`])assert.equal(inspect(html),null)
})
test('PURE inspector excludes inert and foreign namespace ancestry rather than trusting profile-looking anchors',()=>{
 const inspect=api.inspectFussballNativeRoleEvidence,href=lineup.match(/href="(https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+)"/)[1],anchor=`<a class="player-wrapper home" href="${href}">${captain}${role}</a>`
 assert.ok(inspect(anchor))
 for(const tag of ['template','svg','math','noscript','head','svg:g'])assert.equal(inspect(`<${tag}>${anchor}</${tag}>`),null)
 for(const wrapper of [`<svg><foreignObject>${anchor}</foreignObject></svg>`,`<div xmlns="http://www.w3.org/2000/svg">${anchor}</div>`,`<div xmlns:svg="http://www.w3.org/2000/svg">${anchor}</div>`])assert.equal(inspect(wrapper),null)
 for(const tag of ['script','style','textarea','title','xmp','iframe','noembed','noframes'])assert.equal(inspect(`<${tag}>${anchor}</${tag}>`),null)
 assert.equal(inspect(`<!--${anchor}-->`),null)
})
