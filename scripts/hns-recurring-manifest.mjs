// Read-only inventory for one UTC-day collection. Never embeds a database credential.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

export function buildRecurringManifest({competitions,matches,now,priorSnapshot}) {
  assert.match(now,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/,'UTC timestamp required')
  const time=Date.parse(now);assert.ok(Number.isFinite(time),'invalid clock')
  const toDate=new Date(time).toISOString().slice(0,10)
  const fromDate=new Date(Date.parse(toDate+'T00:00:00Z')-13*86400000).toISOString().slice(0,10)
  assert.ok(fromDate>='2026-07-01'&&toDate<='2027-06-30','review next season before collection')
  const ids=new Set(),slugs=new Set(),codes=new Set(),leagues=[]
  for(const c of competitions){
    if(!c.active||c.source!=='hns'||c.slug==='hr-prva-hnlz'||c.source_policy)continue
    assert.equal(c.countries?.code,'HR');assert.ok(Number.isSafeInteger(c.id)&&c.id>0)
    assert.match(c.slug,/^hr-[a-z0-9-]+$/);assert.match(c.source_league_code,/^\d+$/)
    assert.ok(!ids.has(c.id)&&!slugs.has(c.slug)&&!codes.has(c.source_league_code),'duplicate league identity')
    ids.add(c.id);slugs.add(c.slug);codes.add(c.source_league_code)
    const completed=[...new Set(matches.filter(m=>m.rounds?.competition_id===c.id&&m.rounds.season==='2026/27'&&m.imported_at&&/^\d+$/.test(String(m.zapisnik_id))).map(m=>String(m.zapisnik_id)))].sort()
    leagues.push({id:c.id,slug:c.slug,code:c.source_league_code,completed})
  }
  assert.equal(leagues.length,139,'Review changed eligible HNS inventory before collection')
  const finished=new Set()
  if(priorSnapshot!==undefined){
    assert.ok(priorSnapshot&&typeof priorSnapshot==='object','invalid prior snapshot')
    for(const [key,value] of Object.entries({schema:2,source:'hns',mode:'recurring',season:'2026/27'}))assert.equal(priorSnapshot[key],value,'invalid prior snapshot '+key)
    assert.ok(Array.isArray(priorSnapshot.leagues),'prior snapshot leagues required')
    const seen=new Set()
    for(const prior of priorSnapshot.leagues){
      assert.ok(prior&&typeof prior==='object','invalid prior league')
      assert.ok(!seen.has(prior.id),'duplicate prior league identity');seen.add(prior.id)
      const current=leagues.find(l=>l.id===prior.id)
      assert.ok(current&&current.slug===prior.slug&&current.code===prior.code,'prior league identity differs from fresh inventory')
      assert.ok(prior.finished===undefined||typeof prior.finished==='boolean','invalid prior completion state')
      if(prior.finished===true)finished.add(prior.id)
    }
  }
  // Only carry ordering across cycles, never captures, completed IDs or other state.
  const ordered=[...leagues.filter(l=>!finished.has(l.id)),...leagues.filter(l=>finished.has(l.id))]
  return {schema:2,source:'hns',mode:'recurring',season:'2026/27',fromDate,toDate,createdAt:now,expiresAt:new Date(time+86400000).toISOString(),leagues:ordered}
}

// Completed source IDs are season-wide: a changed source date must not make an
// already-imported report eligible for automatic correction in a later window.
export async function readRecurringCompletedMatches(db){
  const matches=[]
  for(let offset=0;;offset+=1000){
    const {data,error}=await db.from('matches').select('id,zapisnik_id,imported_at,played_on,rounds!inner(competition_id,season,competitions!inner(source,active))').eq('rounds.competitions.source','hns').eq('rounds.competitions.active',true).eq('rounds.season','2026/27').not('imported_at','is',null).order('id').range(offset,offset+999)
    if(error)throw Error(error.message)
    matches.push(...data)
    if(data.length<1000)return matches
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {positionals,values}=parseArgs({allowPositionals:true,options:{'prior-snapshot':{type:'string'}}})
  assert.equal(positionals.length,1,'Usage: node scripts/hns-recurring-manifest.mjs <new-output.json> [--prior-snapshot <latest.json>]')
  const priorSnapshot=values['prior-snapshot']?JSON.parse(readFileSync(values['prior-snapshot'],'utf8')):undefined
  const {createClient}=await import('@supabase/supabase-js')
  const env=Object.fromEntries(readFileSync(new URL('../.env.production',import.meta.url),'utf8').split('\n').filter(x=>x.startsWith('VITE_')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).trim()]}))
  assert.ok(env.VITE_SUPABASE_URL&&env.VITE_SUPABASE_ANON_KEY,'public Supabase configuration required')
  const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}})
  const {data:competitions,error}=await db.from('competitions').select('id,slug,active,source,source_league_code,source_policy,countries!inner(code)').eq('active',true).eq('source','hns').order('sort_order').order('slug')
  if(error)throw Error(error.message)
  const now=new Date().toISOString()
  buildRecurringManifest({competitions,matches:[],now,priorSnapshot}) // Validate reviewed inventory before paging.
  const matches=await readRecurringCompletedMatches(db)
  const manifest=buildRecurringManifest({competitions,matches,now,priorSnapshot})
  writeFileSync(positionals[0],JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'})
  console.log(JSON.stringify({leagues:manifest.leagues.length,fromDate:manifest.fromDate,toDate:manifest.toDate,completed:manifest.leagues.reduce((n,l)=>n+l.completed.length,0),output:positionals[0]}))
}
