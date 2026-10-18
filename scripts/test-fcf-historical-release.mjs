import test from 'node:test'
import assert from 'node:assert/strict'
import {packetFixture,calendarFixture,digest,now} from './fcf-release-test-fixture.mjs'
const release=await import('./fcf-historical-release.mjs').catch(()=>({}))
const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
const compile=input=>{assert.equal(typeof release.compileFcfCurrentReleasePacket,'function','closed current packet compiler must exist');return release.compileFcfCurrentReleasePacket(input)}
test('compiler requires an exact closed three-group source and backup binding',()=>{
 assert.equal(typeof release.compileFcfCurrentReleasePacket,'function','closed current packet compiler must exist')
 assert.throws(()=>compile({...packetFixture(),groups:[]}),/FCF_RELEASE/)
})
test('full current packet derives strict canonical statistics and all calendars from retained raw bytes',{skip:!retained},()=>{
 const f=packetFixture(),p=compile(f),m=JSON.parse(p.manifestText)
 assert.equal(digest(p.manifestText),p.manifestSha256)
 assert.equal(m.beforeImageText,f.beforeImageText);assert.equal(m.beforeSha256,f.beforeSha256)
 assert.deepEqual(m.groups.map(g=>g.fixtures.length),[240,240,240])
 assert.equal(m.groups.flatMap(g=>g.fixtures).filter(f=>f.statisticsStatus==='unavailable_historical').length,4)
 assert.ok(m.groups.every(g=>g.verifiedKeeperClubs.length===16))
 const normal=m.groups[0].fixtures.find(f=>f.statisticsStatus==='available')
 assert.equal(normal.appearances.length,34);assert.equal(normal.goals.length,3)
 assert.ok(normal.appearances.every(a=>Number.isSafeInteger(a.regSt)&&typeof a.vratar==='boolean'))
 assert.equal(release.verifyFcfCurrentReleasePacket({...f,...p,now:now+1000}).manifestSha256,p.manifestSha256)
})
for(const [name,mutate]of[
 ['missing database inventory',f=>delete f.databaseInventory],['known imported report downgraded to pending',f=>f.databaseInventory.groups[0].nativeImportedIDs.push(f.groups[0].documents.find(d=>d.expectedSourceRound===5).id)],
 ['missing full calendar',f=>f.groups[0].documents.pop()],['duplicate source',f=>f.groups[0].documents[1]=f.groups[0].documents[0]],
 ['foreign block',f=>f.groups[0].competition.source_league_code='4109387-4109626'],['active competition',f=>f.groups[0].competition.active=true],
 ['backup text formatting drift',f=>f.beforeImageText=f.beforeImageText.replace('8.10','8.1')],['raw source drift',f=>f.groups[0].documents[1].html+=' '],
 ['future original timestamp',f=>f.groups[0].documents[1].receipt.cacheMtimeUTC='2027-01-01T00:00:00Z'],
 ['missing raw lineage',f=>f.groups[0].documents[1].lineage=null],['unverified lineage',f=>f.groups[0].documents[1].lineage.verified=false],
 ['guessed source round',f=>f.groups[1].documents.find(d=>d.id==='4116314').expectedSourceRound=1],
 ['stale pending source',f=>f.groups[0].documents.at(-1).receipt.cacheMtimeUTC='2026-10-01T00:00:00Z'],
 ['future source capture',f=>f.groups[0].documents[1].receipt.capturedUTC='2027-01-01T00:00:00Z'],
])test(`packet refuses ${name}`,{skip:!retained},()=>{const f=packetFixture();mutate(f);assert.throws(()=>compile(f),/FCF_RELEASE|FCF_SOURCE_PROOF|fcf:/)})
test('exact-text replay refuses changed canonical statistics even when caller recomputes the outer hash',{skip:!retained},()=>{
 const f=packetFixture(),p=compile(f),m=JSON.parse(p.manifestText)
 m.groups[0].fixtures.find(f=>f.appearances?.length).appearances[0].minutaDo=1
 const manifestText=JSON.stringify(m)
 assert.throws(()=>release.verifyFcfCurrentReleasePacket({...f,manifestText,manifestSha256:digest(manifestText)}),/FCF_RELEASE/)
})
test('offline audit cannot refresh source or packet age',{skip:!retained},()=>{
 const f=packetFixture(),p=compile(f)
 assert.throws(()=>release.verifyFcfCurrentReleasePacket({...f,...p,now:now+25*3600000}),/FCF_RELEASE/)
})

test('normal document proof derives native clubs, goals and official keeper statistics without private fixtures',()=>{
 assert.equal(typeof release.proveFcfCurrentReleaseDocument,'function','independent pure document proof must exist')
 const g=packetFixture(null).groups[0],d=g.documents.find(d=>d.expectedSourceRound===3),f=release.proveFcfCurrentReleaseDocument({competition:g.competition,document:d,now})
 assert.equal(f.statisticsStatus,'available');assert.equal(f.appearances.length,34);assert.equal(f.goals.length,3)
 assert.equal(f.appearances.filter(a=>a.zacetnik&&a.vratar).length,2)
 assert.equal(f.source.capturedUTC,null);assert.equal(f.source.cacheMtimeUTC,'2026-10-18T13:00:00Z')
 for(const mutate of [x=>x.receipt.rawSha256='0'.repeat(64),x=>x.receipt.bytes++,x=>x.lineage.verified=false,x=>x.expectedSourceRound=6,x=>x.receipt.cacheMtimeUTC='2027-01-01T00:00:00Z']){
  const changed=structuredClone(d);mutate(changed)
  assert.throws(()=>release.proveFcfCurrentReleaseDocument({competition:g.competition,document:changed,now}),/FCF_RELEASE|FCF_SOURCE_PROOF|fcf:/)
 }
})
test('pending document proof preserves null individual statistics and requires an actual fresh R6 capture',()=>{
 assert.equal(typeof release.proveFcfCurrentReleaseDocument,'function')
 const g=packetFixture(null).groups[0],d=g.documents.find(d=>d.expectedSourceRound===6),prove=()=>release.proveFcfCurrentReleaseDocument({competition:g.competition,document:d,now})
 const f=prove();assert.equal(f.statisticsStatus,'pending');assert.equal(f.report,null);assert.equal(f.appearances,null);assert.equal(f.goals,null)
 d.receipt.startedUTC=null;d.receipt.capturedUTC=null;d.receipt.cacheMtimeUTC='2026-10-18T13:00:00Z'
 assert.throws(prove,/FCF_RELEASE: pending prelaunch\/R6/)
})
test('calendar proof rejects repeated native pairings and round participation collisions',()=>{
 assert.equal(typeof release.validateFcfCurrentReleaseCalendar,'function')
 const g=packetFixture(null).groups[0],normal=g.documents.filter(d=>d.expectedSourceRound===3).map(document=>release.proveFcfCurrentReleaseDocument({competition:g.competition,document,now}))
 assert.throws(()=>release.validateFcfCurrentReleaseCalendar(normal),/FCF_RELEASE/)
 assert.throws(()=>release.validateFcfCurrentReleaseCalendar([...normal,...normal]),/duplicate\/self native calendar pairing/)
})

test('full native calendar proof enforces every actual round and keeper club without private bytes',()=>{
 const f=calendarFixture(),result=release.validateFcfCurrentReleaseCalendar(f)
 assert.equal(result.clubs.length,16);assert.equal(result.verifiedKeeperClubs.length,16)
 const missing=structuredClone(f);missing.pop();assert.throws(()=>release.validateFcfCurrentReleaseCalendar(missing),/full calendar/)
 const repeated=structuredClone(f);repeated[1].clubs=repeated[0].clubs;assert.throws(()=>release.validateFcfCurrentReleaseCalendar(repeated),/duplicate/)
 const collision=structuredClone(f);[collision[0].round,collision[8].round]=[collision[8].round,collision[0].round];assert.throws(()=>release.validateFcfCurrentReleaseCalendar(collision),/every club exactly once/)
 const keeper=structuredClone(f);keeper.find(f=>f.round===3).appearances[0].vratar=false;assert.throws(()=>release.validateFcfCurrentReleaseCalendar(keeper),/verified keeper coverage/)
})
