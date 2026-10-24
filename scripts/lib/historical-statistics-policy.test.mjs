import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  classifyHistoricalStatistics, getHistoricalStatisticsPolicy,
  historicalStatisticsPolicySha256, validateHistoricalStatisticsRegistry,
} from './historical-statistics-policy.mjs'

const registry = JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json', import.meta.url)))
const seedSql=['20261018180000_historical_statistical_availability.sql','20261018231000_dfb_nord_west_historical_policy.sql','20261020223000_mfa_reviewed_history.sql','20261021093000_mfa_challenge_reviewed_history.sql','20261021190100_mfa_nl1_reviewed_policy.sql','20261021203000_mfa_nl2_reviewed_policy.sql','20261022121000_mlsz_reviewed_history.sql','20261022185000_dfb_west_prelaunch_availability.sql','20261023103000_reviewed_existing_history.sql','20261023200000_reviewed_ro_md_admission.sql','20261024090000_reviewed_ro_alba_l5_s2.sql','20261024143000_reviewed_hu_pest_c_history.sql','20261024162000_reviewed_mlsz_toth_history.sql'].map(file=>readFileSync(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8')).join('\n')
const clone = value => structuredClone(value)
const reEscape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hr = registry.policies.find(p => p.provider === 'hns')
const de = registry.policies.find(p => p.competitionSlug === 'de-regionalliga-suedwest')
const west = registry.policies.find(p => p.competitionSlug === 'de-regionalliga-west')
const competitionFor = policy => ({ ...(policy.provider==='mlsz'||policy.sourcePolicy==='reviewed-existing-history-20261023-v1'?{id:policy.competitionId,source_league_code:policy.sourceLeagueCode}:{}),...(policy.provider==='mfa'?(policy.competitionSlug==='mt-premier'?{id:971,source_league_code:'58539/2027'}:policy.competitionSlug==='mt-challenge'?{id:972,source_league_code:'2601248/2027'}:policy.competitionSlug==='mt-nl1'?{id:973,source_league_code:'2601267/2027'}:{id:974,source_league_code:'6234492/2027'}):{}),slug: policy.competitionSlug, source: policy.provider, source_policy: policy.sourcePolicy, firstFantasyPlayedOn: '2026-10-25' })
const fixtureFor = (policy, entry) => ({ ...entry, season: entry.season??policy.season })
const classify = (policy = hr, entry = policy.entries[0], overrides = {}) => classifyHistoricalStatistics({
  competition: competitionFor(policy), fixture: fixtureFor(policy, entry), rawSha256: entry.rawSha256, policy, ...overrides,
})

test('registry contains exactly reviewed identities, including the thirteen cleanup targets', () => {
  assert.equal(validateHistoricalStatisticsRegistry(registry), true)
  assert.deepEqual(hr.entries.map(x => x.sourceMatchId).sort(), ['114471617', '114471627', '114471629'])
  assert.deepEqual(de.entries.map(x => x.sourceMatchId).sort(), ['2402929', '2403004'])
  assert.deepEqual(registry.policies.filter(p=>p.provider==='dfb').flatMap(p=>p.entries.map(e=>e.sourceMatchId)).sort(),['2402287','2402299','2402306','2402312','2402325','2402332','2402346','2402352','2402929','2403004','2405268','2405441','2425409','2425474'])
  assert.deepEqual(west.entries.filter(e=>e.season==='2026/27').map(e=>e.sourceMatchId).sort(),['2425409','2425474'])
  assert.deepEqual(registry.policies.filter(p=>p.provider==='fcf').flatMap(p=>p.entries.map(e=>e.sourceMatchId)).sort(), ['4109388','4116215','4118352','4118358'])
  assert.deepEqual(registry.policies.filter(p=>p.provider==='mlsz').flatMap(p=>p.entries.map(e=>e.sourceMatchId)).sort(), ['2078392','2078437','2079402','2079433','2120218','2175016'])
  assert.equal(registry.policies.length,22)
  const npl=registry.policies.find(p=>p.competitionSlug==='gb-npl-midlands')
  assert.deepEqual(npl.entries.map(x=>[x.sourceMatchId,x.season??npl.season]).sort(),[['6896abc31c6f4c56212c7ac5','2025/26'],['6a590670ce9ef452b61f386d','2026/27']])
  const bih=registry.policies.find(p=>p.competitionSlug==='ba-wwin-liga-bih')
  assert.deepEqual(bih.entries.map(x=>x.sourceMatchId).sort(),['54152295','54152303'])
  assert.ok(!hr.entries.some(x => x.sourceMatchId === '100511758'))
})

test('only the two exact West v2 current entries can override the archive policy season',()=>{
 assert.equal(classify(west,west.entries.find(e=>e.sourceMatchId==='2425409')).kind,'unavailable_historical')
 const changed=clone(registry);const w=changed.policies.find(p=>p.competitionSlug==='de-regionalliga-west')
 for(const mutate of [x=>x.id='wrong',x=>x.sourcePolicy='wrong',x=>x.entries.find(e=>e.sourceMatchId==='2425409').season='2025/26',x=>x.entries.find(e=>e.sourceMatchId==='2402287').season='2026/27',x=>x.entries.find(e=>e.sourceMatchId==='2425409').sourceMatchId='2425408']){
  const copy=clone(changed);mutate(copy.policies.find(p=>p.competitionSlug==='de-regionalliga-west'))
  assert.throws(()=>validateHistoricalStatisticsRegistry(copy),/season|override|registry/i)
 }
})

for (const policy of registry.policies) for (const entry of policy.entries) {
  test(`classifies exact reviewed report ${entry.sourceMatchId} without supplying individual statistics`, () => {
    const result = classify(policy, entry)
    assert.equal(result.kind, 'unavailable_historical')
    assert.deepEqual(result.exception, entry)
    assert.match(result.policySha256, /^[a-f0-9]{64}$/)
    assert.equal(result.policySha256, historicalStatisticsPolicySha256(policy))
    assert.equal('z' in result, false)
  })
}

test('unregistered normal report receives no exemption', () => {
  assert.deepEqual(classify(hr, { ...hr.entries[0], sourceMatchId: 'new-future-report' }), { kind: 'normal' })
  assert.deepEqual(classifyHistoricalStatistics({ competition: { slug: 'hr-hnl', source: 'hns' }, fixture: { sourceMatchId: 'other' } }), { kind: 'normal' })
})

for (const [field, value] of Object.entries({ sourceCompetitionId: 'other', sourcePhase: 'guessed', sourceRound: 2, playedOn: '2026-08-24', homeSourceClubId: '649', awaySourceClubId: '1274', sourceUrl: 'https://example.com/', season: '2025/26', observedHomeScore: 0, observedAwayScore: 0 })) {
  test(`registered report rejects drift in ${field}`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { fixture: { ...fixtureFor(hr, hr.entries[0]), [field]: value } }), /identity|fixture/i)
  })
}

test('registered report refuses raw bytes different from approved packet', () => {
  assert.throws(() => classify(hr, hr.entries[0], { rawSha256: '0'.repeat(64) }), /hash|sha/i)
})
for (const patch of [{ slug: 'hr-hnl' }, { source: 'dfb' }, { source_policy: null }]) {
  test(`registered policy cannot exempt another competition tuple ${JSON.stringify(patch)}`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { competition: { ...competitionFor(hr), ...patch } }), /competition|policy|provider/i)
  })
}
for (const firstFantasyPlayedOn of [undefined, 'invalid', '2026-08-23', '2026-08-22']) {
  test(`requires a valid strictly later first fantasy date (${firstFantasyPlayedOn})`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { competition: { ...competitionFor(hr), firstFantasyPlayedOn } }), /fantasy|prelaunch|date/i)
  })
}

test('caller cannot invent or alter the reviewed policy', () => {
  const changed = clone(hr); changed.entries[0].rawSha256 = '0'.repeat(64)
  assert.throws(() => classify(changed), /reviewed|policy/i)
  assert.throws(() => classify({ ...hr, id: 'invented' }), /reviewed|policy/i)
})

test('canonical hash ignores object property insertion order and covers approved metadata', () => {
  const reversed = Object.fromEntries(Object.entries(hr).reverse())
  assert.equal(historicalStatisticsPolicySha256(hr), historicalStatisticsPolicySha256(reversed))
  assert.notEqual(historicalStatisticsPolicySha256(hr), historicalStatisticsPolicySha256({ ...hr, approvalReference: 'changed' }))
})

test('canonical policy lookup is immutable and isolated by competition', () => {
  const value = getHistoricalStatisticsPolicy('hr-prva-hnlz')
  assert.deepEqual(value, hr)
  assert.equal(getHistoricalStatisticsPolicy('hr-hnl'), null)
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.entries) && Object.isFrozen(value.entries[0]))
})

test('registry rejects duplicate identities and malformed descriptors', () => {
  for (const mutate of [
    r => r.policies[0].entries.push(clone(r.policies[0].entries[0])),
    r => { r.policies[0].entries[0].rawSha256 = 'missing' },
    r => { r.policies[0].recordedAt = 'not-a-date' },
    r => { r.policies[0].entries[0].playedOn = '2026-02-31' },
    r => { r.policies[0].entries[0].observedHomeScore = -1 },
    r => { r.policies[0].entries[0].sourceRound = 0 },
    r => { r.policies[0].approvalReference = '' },
  ]) {
    const copy = clone(registry); mutate(copy)
    assert.throws(() => validateHistoricalStatisticsRegistry(copy), /registry|policy|entry|descriptor/i)
  }
})

for (const competition of [
  { slug:'wrong-slug', source:'hns', source_policy:'hr-hnlz-v1' },
  { slug:'wrong-slug', source:'hns', source_policy:'unreviewed-v99' },
  { source:'hns', source_policy:'hr-hnlz-v1' },
  { slug:'hr-prva-hnlz', source:'hns', source_policy:'unreviewed-v99' },
  { slug:'hr-hnl', source:'hns', source_policy:'' },
]) {
  test(`omitted policy cannot turn an invalid opt-in tuple into normal stats ${JSON.stringify(competition)}`, () => {
    assert.throws(() => classifyHistoricalStatistics({competition, fixture:fixtureFor(hr,hr.entries[0]), rawSha256:hr.entries[0].rawSha256}), /policy|competition|provider/i)
  })
}

for (const competition of [
  {slug:'hr-hnl',source:'hns'},
  {slug:'hr-hnl',source:'hns',source_policy:null},
  {source:'hns'},
  {slug:'de-another-league',source:'dfb',source_policy:null},
]) {
  test(`known provider/match identity cannot become ordinary under another tuple ${JSON.stringify(competition)}`, () => {
    const policy = competition.source === 'dfb' ? de : hr
    assert.throws(() => classifyHistoricalStatistics({competition, fixture:fixtureFor(policy,policy.entries[0]), rawSha256:policy.entries[0].rawSha256}), /policy|competition|provider/i)
  })
}

test('unregistered ordinary provider identity still follows strict normal parsing', () => {
  assert.deepEqual(classifyHistoricalStatistics({competition:{slug:'hr-hnl',source:'hns',source_policy:null},fixture:{sourceMatchId:'unregistered'}}), {kind:'normal'})
})

test('migration-pinned canonical policy bodies and hashes match the single reviewed JSON registry', () => {
  const sql = seedSql
  const seeds = [...sql.matchAll(/\('([^']+)','([a-f0-9]{64})','((?:''|[^'])*)'::jsonb\)/g)]
  const legacy=seeds.filter(m=>m[1]==='de-dfb-west-2025-historical-unavailable-v1')
  assert.equal(legacy.length,1)
  assert.equal(legacy[0][2],'fc72bd2cbd6f9f6ea914efccb392fe44e941666affff8b10af69ddbe79709f26')
  assert.equal(historicalStatisticsPolicySha256(JSON.parse(legacy[0][3].replaceAll("''","'"))),legacy[0][2])
  assert.equal(seeds.length,registry.policies.length+legacy.length)
  for (const policy of registry.policies) {
    const seed=seeds.find(m=>m[1]===policy.id)
    assert.ok(seed,`missing DB policy ${policy.id}`)
    assert.equal(seed[2],historicalStatisticsPolicySha256(policy))
    assert.deepEqual(JSON.parse(seed[3].replaceAll("''","'")),policy)
  }
})

for (const policy of registry.policies.filter(p=>p.provider==='fcf')) for (const entry of policy.entries) for (const field of ['homeSourceCategoryId','awaySourceCategoryId']) {
  test(`FCF native category binding cannot drift ${entry.sourceMatchId} ${field}`, () => {
    assert.throws(()=>classify(policy,entry,{fixture:{...fixtureFor(policy,entry),[field]:'unreviewed-category'}}),/identity|category|fixture/i)
  })
}

test('FCF registry requires both native category identities',()=>{
  for(const field of ['homeSourceCategoryId','awaySourceCategoryId']) {
    const copy=clone(registry);delete copy.policies.find(p=>p.provider==='fcf').entries[0][field]
    assert.throws(()=>validateHistoricalStatisticsRegistry(copy),/category|entry/i)
  }
})

test('reviewed club bindings cover every approved source club/category and retain exact receipt proofs',()=>{
  const bindings=JSON.parse(readFileSync(new URL('../policies/historical-statistics-club-bindings.json',import.meta.url))).bindings
  const sql=seedSql
  const keys=new Set()
  for(const binding of bindings) {
    const key=[binding.provider,binding.sourceClubId,binding.sourceCategoryId??''].join(':')
    assert.ok(!keys.has(key),`duplicate ${key}`);keys.add(key)
    assert.ok(binding.canonicalNames.length && binding.canonicalNames.every(n=>typeof n==='string'&&n.trim()))
    assert.ok(binding.proofs.length)
    for(const proof of binding.proofs) {
      const entry=registry.policies.filter(p=>p.provider===binding.provider).flatMap(p=>p.entries).find(e=>e.sourceMatchId===proof.sourceMatchId)
      assert.ok(entry);assert.equal(proof.sourceUrl,entry.sourceUrl);assert.equal(proof.rawSha256,entry.rawSha256)
    }
    const q=s=>"'"+s.replaceAll("'","''")+"'"
    const values=[binding.provider,binding.sourceClubId,binding.sourceCategoryId??''].map(q).join(',')+`,\\s*${reEscape(q(binding.countryCode))},\\s*array\\[${binding.canonicalNames.map(name=>reEscape(q(name))).join(',')}\\],\\s*${reEscape(q(JSON.stringify(binding.proofs)))}(?:::jsonb)?`
    assert.ok(new RegExp(values).test(sql),`missing exact SQL binding ${key}`)
  }
  for(const policy of registry.policies)for(const entry of policy.entries)for(const side of ['home','away'])assert.ok(keys.has([policy.provider,entry[`${side}SourceClubId`],entry[`${side}SourceCategoryId`]??''].join(':')))
})

test('new RO and MD admissions pin exact composite proof, season and native tuple',()=>{
 const expected=[
  ['ro-ab-l4-s2','hlf',501,'judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b',['8b7af269-2420-4534-9af2-f3cd51852f15']],
  ['md-liga-2','fmf',1107,'liga-2-1782306996/877','md-liga-2-historical-unavailable-2026-10-23-v1','95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e',['50422','50481']],
 ]
 for(const [slug,provider,id,code,policyId,sha,matchIds] of expected){
  const policy=getHistoricalStatisticsPolicy(slug)
  assert.ok(policy,`${slug} must be registered`)
  assert.equal(policy.provider,provider);assert.equal(policy.competitionId,id);assert.equal(policy.sourceLeagueCode,code);assert.equal(policy.id,policyId);assert.equal(historicalStatisticsPolicySha256(policy),sha)
  assert.deepEqual(policy.entries.map(e=>e.sourceMatchId),matchIds)
  assert.ok(policy.entries.every(e=>e.season===undefined || e.season==='2026/27'))
  assert.ok(policy.entries.every(e=>e.sourceProof&&e.rawSha256))
  const competition=competitionFor(policy)
  assert.equal(classify(policy,policy.entries[0]).kind,'unavailable_historical')
  assert.throws(()=>classify(policy,policy.entries[0],{competition:{...competition,id:id+1}}),/tuple|binding|competition/i)
  assert.throws(()=>classify(policy,policy.entries[0],{fixture:{...fixtureFor(policy,policy.entries[0]),sourceProof:{...policy.entries[0].sourceProof,pdfPublished:true}}}),/identity|fixture/i)
 }
 const md=getHistoricalStatisticsPolicy('md-liga-2')
 assert.ok(md.entries.every(e=>e.sourceProof.pdfPublished===false&&e.sourceProof.clubIdentityKind==='published_name'))
 assert.ok(md.entries.every(e=>e.homeSourceClubId&&e.awaySourceClubId))
})
