// TEST ONLY retained parser samples + explicit synthetic captain/keeper markup.
// No source capability or approval is issued here.
import test from 'node:test'
import assert from 'node:assert/strict'
import {partitionFixture,canonical,digest,hash,json,isolatedComposition} from './fussball-native-composition-test-fixture.mjs'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {inspectFussballNativeRoleEvidence} from './viri/fussball-native-role-parser.mjs'
import {inspectFussballLineup} from './viri/fussball-statistika.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
const api=await import('./fussball-native-role-replay.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const single='<div class="captain"><span class="c">T</span></div>',roles='<div class="captain"><span class="c">C</span></div><div class="goal-keeper"><span class="k">T</span></div>'
function fixture(){
 const f=partitionFixture(),stage=f.state.originals.stages.current,r=stage.result,entry=r.pendingReports.pop(),e=entry.result.cardEnvelope,url=inspectFussballPage(Buffer.from(e.bundle.report.base64,'base64').toString(),{kind:'report',matchId:e.matchId}).lineupUrl,d=stage.manifest.documents.find(d=>d.url===url),bytes=Buffer.from(Buffer.from(e.bundle.lineup.base64,'base64').toString().replace(single,roles));assert.notEqual(hash(bytes),d.sha256)
 stage.files.delete(d.file);Object.assign(d,{bytes:bytes.length,sha256:hash(bytes),file:'documents/'+hash(bytes)+'.html'});d.originalReceipt.sha256=d.sha256;stage.files.set(d.file,bytes)
 const fonts=Object.fromEntries(e.bundle.fonts.map(f=>[f.fontId,{bytes:Buffer.from(f.base64,'base64'),sha256:f.sha256}]));let error;try{razberiFantasyZapisnik(Buffer.from(e.bundle.report.base64,'base64').toString(),bytes.toString(),{fonts,id:e.matchId,lineupId:e.matchId,season:e.season,cardPolicy:'community-v1'})}catch(ex){error=ex}assert.ok(error)
 r.rejectedReports.push({fixture:entry.fixture,code:error.code,reason:error.message});f.repin();return f
}
function replay(f){assert.equal(typeof api.replayFussballNativeRoles,'function');return api.replayFussballNativeRoles(f.state.originals.stages)}
test('native role stage replay preserves original source results and derives only affected pending envelope',()=>{
 const f=fixture(),before=canonical(f.state.originals.stages.current.result),raw=Buffer.from(f.state.originals.stages.current.files.get('result.json')),out=replay(f),s=out.current
 assert.equal(canonical(f.state.originals.stages.current.result),before);assert.deepEqual(f.state.originals.stages.current.files.get('result.json'),raw)
 assert.equal(s.result.pendingReports.length,1);assert.equal(s.result.rejectedReports.length,1);assert.equal(s.nativeRoleReplay.affected.length,1);assert.equal(s.nativeRoleReplay.affected[0].outcome,'community-pending');assert.ok(s.result.pendingReports[0].result.cardEnvelope.nativeRoleParser)
 assert.deepEqual(s.result.reports,f.state.originals.stages.current.result.reports);assert.equal(s.nativeRoleReplay.originalResultSha256,hash(raw));assert.equal(s.nativeRoleReplaySha256,digest(s.nativeRoleReplay));assert.equal(s.result.coverage.pendingReports,1)
})
test('cross-stage resources use verified original bytes with deterministic provenance and local preference',()=>{
 const f=fixture(),stage=f.state.originals.stages.current,archive=f.state.originals.stages.archive,font=stage.manifest.documents.find(d=>d.url===replay(f).current.nativeRoleReplay.affected[0].resources.find(d=>d.kind==='font').url),copy=structuredClone(font);archive.manifest.documents.push(copy);archive.files.set(copy.file,Buffer.from(stage.files.get(font.file)))
 const first=replay(f);assert.ok(first.current.nativeRoleReplay.affected[0].resources.some(d=>d.url===font.url&&d.stage==='current'))
 stage.manifest.documents=stage.manifest.documents.filter(d=>d!==font);const second=replay(f);assert.ok(second.current.nativeRoleReplay.affected[0].resources.some(d=>d.url===font.url&&d.stage==='archive'));assert.notEqual(first.current.nativeRoleReplaySha256,second.current.nativeRoleReplaySha256)
 archive.files.get(copy.file)[0]^=1;assert.throws(()=>replay(f),/original document bytes/)
})
test('raw/result/resource drift, cross-stage HTML fallback, overlap and arbitrary parser inputs hold',()=>{
 for(const mutate of [f=>f.state.originals.stages.current.files.get('result.json')[0]^=1,f=>f.state.originals.stages.current.result.rejectedReports.push(f.state.originals.stages.current.result.rejectedReports[0]),f=>{const s=f.state.originals.stages.current;const d=s.manifest.documents.find(d=>d.kind==='lineup');s.manifest.documents=s.manifest.documents.filter(v=>v!==d);f.state.originals.stages.archive.manifest.documents.push(d);f.state.originals.stages.archive.files.set(d.file,s.files.get(d.file))},f=>{const s=f.state.originals.stages.current,d=s.manifest.documents.find(d=>d.kind==='font'),v={...structuredClone(d),sha256:hash(Buffer.from('different')),bytes:9,file:'different.woff'};f.state.originals.stages.archive.manifest.documents.push(v);f.state.originals.stages.archive.files.set(v.file,Buffer.from('different'))}]){const f=fixture();mutate(f);assert.throws(()=>replay(f))}
 const f=fixture();assert.throws(()=>api.replayFussballNativeRoles({...f.state.originals.stages,parser:()=>true}),/closed/)
})
test('catalog replay hash binds effective partition while original result hashes stay original',()=>{
 const f=fixture(),out=replay(f);for(const s of f.catalog.seasons)s.nativeRoleReplaySha256=out[s.stage].nativeRoleReplaySha256
 const pack=isolatedComposition(f).buildFussballNativeComposition(f.proof);assert.equal(pack.seasons[0].nativeRoleReplaySha256,out.current.nativeRoleReplaySha256);assert.deepEqual(pack.seasons[0].originalCoverage,f.state.originals.stages.current.result.coverage);assert.equal(pack.seasons[0].derivedCoverage.pendingReports,1)
 for(const mutate of [w=>w.affected[0].nativeRoleParserSha256='0'.repeat(64),w=>w.affected[0].resources[0].stage='archive',w=>w.affected=[]]){const w=structuredClone(out.current.nativeRoleReplay);mutate(w);f.catalog.seasons[0].nativeRoleReplaySha256=digest(w);assert.throws(()=>isolatedComposition(f).buildFussballNativeComposition(f.proof),/native role replay/)}
})

test('TEST ONLY imported-parser fault cannot become a reviewed arbitrary rejection',()=>{
 // Isolated fixed import fault exercises the catch guard; production exports
 // still accept only closed stages, never this parser or an error override.
 const code=readFileSync(new URL('./fussball-native-role-replay.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/\bexport /g,'')+';return replayFussballNativeRoles'
 const isolated=new Function('createHash','same','inspectFussballPage','fussballFontUrl','inspectFussballLineup','inspectFussballNativeRoleEvidence','razberiNativeFantasyZapisnik',code)(createHash,isDeepStrictEqual,inspectFussballPage,fussballFontUrl,inspectFussballLineup,inspectFussballNativeRoleEvidence,()=>{throw Object.assign(Error('unclassified fault'),{code:'FUSSBALL_REPORT_INVALID'})})
 assert.throws(()=>isolated(fixture().state.originals.stages),/unknown native parser error/)
})
