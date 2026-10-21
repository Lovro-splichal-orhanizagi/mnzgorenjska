import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const moduleURL = new URL('./mfa-nl-offline-guard.mjs', import.meta.url)
test('sealed replay serves retained MFA bytes and forbids missing, foreign or mutating provider requests', async () => {
  assert.ok(existsSync(moduleURL))
  const { installMfaSealedGuard } = await import(moduleURL)
  const dir = mkdtempSync(join(tmpdir(), 'slff-mfa-offline-test-')), calls = [], original = globalThis.fetch
  writeFileSync(join(dir, 'tekma-123-izid.json'), '{"homeScore":"2"}')
  globalThis.fetch = async (...args) => { calls.push(args); return new Response('{}') }
  try {
    installMfaSealedGuard({ league: 'mt-nl2', cacheRoot: dir, logPath: join(dir, 'reads.jsonl'), databaseURL: 'https://db.example' })
    const r = await fetch('https://api.mfa.com.mt/api/matches/123/result')
    assert.equal(await r.text(), '{"homeScore":"2"}')
    await fetch('https://db.example/rest/v1/players', { method: 'POST', body: '{}' })
    for (const [url, options] of [['https://api.mfa.com.mt/api/matches/124/result', {}], ['https://api.mfa.com.mt/api/competitions/58539/standings?season=2026', {}], ['https://api.mfa.com.mt/api/matches/123/result', { method: 'POST' }], ['https://external.example/', {}]]) {
      await assert.rejects(fetch(url, options), /MFA sealed replay/)
    }
    assert.equal(calls.length, 1, 'only the database request reaches the real transport')
    const log = JSON.parse(readFileSync(join(dir, 'reads.jsonl'), 'utf8').trim())
    assert.equal(log.actualProviderRequests, 0)
    assert.equal(log.file, 'tekma-123-izid.json')
  } finally { globalThis.fetch = original; rmSync(dir, { recursive: true, force: true }) }
})

// Sanitized retained metadata; the optional full-cache test below proves original bytes.
const metadataFixture=()=>readFileSync(new URL('./vzorci/mt-mfa-tekma-50921298.json',import.meta.url))
const hash=async body=>(await import('node:crypto')).createHash('sha256').update(body).digest('hex')
test('bare metadata replays retained generic bytes when canonical po-sifri was never persisted',async()=>{
 const{installMfaSealedGuard}=await import(moduleURL),dir=mkdtempSync(join(tmpdir(),'slff-mfa-metadata-')),original=globalThis.fetch,body=metadataFixture();let http=0
 assert.equal(await hash(body),'9865e1f5f224c9eb3692453fd39cb59499e3a9a92c4cbcccfca64686c9f8fb93')
 writeFileSync(join(dir,'tekma-50921298.json'),body);globalThis.fetch=()=>{http++;throw Error('HTTP forbidden')}
 try{
  installMfaSealedGuard({league:'mt-nl1',cacheRoot:dir,logPath:join(dir,'reads.jsonl'),databaseURL:'https://db.example'})
  assert.deepEqual(Buffer.from(await(await fetch('https://api.mfa.com.mt/api/matches/50921298')).arrayBuffer()),body)
  const log=JSON.parse(readFileSync(join(dir,'reads.jsonl'),'utf8'));assert.equal(log.file,'tekma-50921298.json');assert.equal(log.sha256,await hash(body));assert.equal(log.actualProviderRequests,0);assert.equal(http,0)
 }finally{globalThis.fetch=original;rmSync(dir,{recursive:true,force:true})}
})
test('metadata fallback never overrides canonical bytes or bypasses unsafe, corrupt or missing cache refusal',async()=>{
 const{installMfaSealedGuard}=await import(moduleURL),dir=mkdtempSync(join(tmpdir(),'slff-mfa-metadata-safety-')),original=globalThis.fetch;let http=0
 globalThis.fetch=()=>{http++;throw Error('HTTP forbidden')}
 const canonical=join(dir,'po-sifri-50921298.json'),generic=join(dir,'tekma-50921298.json'),url='https://api.mfa.com.mt/api/matches/50921298'
 try{
  installMfaSealedGuard({league:'mt-nl1',cacheRoot:dir,logPath:join(dir,'reads.jsonl'),databaseURL:'https://db.example'})
  writeFileSync(generic,metadataFixture());writeFileSync(canonical,'{"ni":404}')
  assert.equal(await(await fetch(url)).text(),'{"ni":404}')
  writeFileSync(canonical,'not JSON');await assert.rejects(fetch(url),/invalid cached JSON/)
  rmSync(canonical);symlinkSync(generic,canonical);await assert.rejects(fetch(url),/unsafe cached body/);rmSync(canonical)
  writeFileSync(generic,'not JSON');await assert.rejects(fetch(url),/invalid cached JSON/);rmSync(generic)
  symlinkSync(new URL('./vzorci/mt-mfa-tekma-50921298.json',import.meta.url),generic);await assert.rejects(fetch(url),/unsafe cached body/);rmSync(generic)
  await assert.rejects(fetch(url),/missing authenticated cached body/)
  writeFileSync(generic,metadataFixture());await assert.rejects(fetch(url+'/result'),/missing authenticated cached body/);await assert.rejects(fetch(url+'/lineup'),/missing authenticated cached body/)
  assert.equal(http,0)
 }finally{globalThis.fetch=original;rmSync(dir,{recursive:true,force:true})}
})
const retainedRoot=process.env.MFA_NL_RETAINED_ROOT
for(const[league,type,path,migration]of[
 ['mt-nl1','2601267','mt-nl1-cache-audit-39654281589/files/cache','20261021200100_mfa_nl1_source_contract.sql'],
 ['mt-nl2','6234492','nl2-public-capture-39655969899/files/audit/cache','20261021203100_mfa_nl2_source_contract.sql'],
])test(`ordinary full ${league} archive and current discovery uses actual sealed guard with zero HTTP`,{skip:!retainedRoot},async()=>{
 const{installMfaSealedGuard}=await import(moduleURL),{vseTekme,razcleniRazpored,mfaFetch}=await import('./viri/mfa.mjs'),{historicalStatisticsPolicySha256:sha}=await import('./lib/historical-statistics-policy.mjs')
 const sql=readFileSync(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'),contract=JSON.parse(sql.match(/\$contract\$(.*?)\$contract\$/s)[1]),dir=mkdtempSync(join(tmpdir(),'slff-mfa-inventory-')),original=globalThis.fetch;let http=0
 globalThis.fetch=()=>{http++;throw Error('HTTP forbidden')}
 try{
  installMfaSealedGuard({league,cacheRoot:join(retainedRoot,path),logPath:join(dir,'reads.jsonl'),databaseURL:'https://db.example'})
  const counts=[]
  for(const year of[2026,2027]){
   const schedule=razcleniRazpored(await vseTekme(type+'/'+year,async url=>(await mfaFetch(url)).text(),{mapa:null})),rows=schedule.flatMap(r=>r.tekme.map(t=>({sourceMatchId:String(t.mfaId),round:r.stevilka,playedOn:t.datum,homeName:t.domaci,awayName:t.gostje,played:t.odigrana})))
   if(year===2027)assert.deepEqual(rows.map(sha).sort(),contract.currentFixtures.map(sha).sort())
   else assert.deepEqual(rows.filter(t=>t.played).map(t=>'mt'+t.sourceMatchId).sort(),contract.reports.filter(r=>r.season==='2025/26').map(r=>r.reportId).sort())
   counts.push({year,fixtures:rows.length,played:rows.filter(t=>t.played).length,rounds:schedule.length})
  }
  if(league==='mt-nl1'){
   const body=readFileSync(join(retainedRoot,path,'tekma-50921298.json'));assert.equal(await hash(body),'e4c431ab6878ff3689c3b233fe658d6d9a8154f8c9f0c1635a8055e2ffd393ee')
   assert.deepEqual(Buffer.from(await(await fetch('https://api.mfa.com.mt/api/matches/50921298')).arrayBuffer()),body)
  }
  assert.equal(http,0);const logs=readFileSync(join(dir,'reads.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.ok(logs.length>0&&logs.every(l=>l.actualProviderRequests===0))
  console.log(JSON.stringify({league,counts,sealedReads:logs.length,actualProviderRequests:http}))
 }finally{globalThis.fetch=original;rmSync(dir,{recursive:true,force:true})}
})
