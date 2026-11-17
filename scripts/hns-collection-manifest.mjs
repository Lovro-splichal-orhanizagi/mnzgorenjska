import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function buildCollectionManifest({ competitions, matches, now, from, to }) {
  assert.ok(Number.isFinite(Date.parse(now)))
  for (const d of [from,to]) assert.match(d,/^2026-11-\d\d$/)
  assert.ok(from <= to && Date.parse(to)-Date.parse(from) <= 14*86400000)
  const ids=new Set(), slugs=new Set(), codes=new Set()
  const leagues=[]
  for (const c of competitions) {
    if (!c.active || c.source !== 'hns' || c.slug === 'hr-prva-hnlz' || c.source_policy) continue
    assert.equal(c.countries?.code,'HR'); assert.ok(Number.isSafeInteger(c.id)&&c.id>0)
    assert.match(c.slug,/^hr-[a-z0-9-]+$/); assert.match(c.source_league_code,/^\d+$/)
    assert.ok(!ids.has(c.id)&&!slugs.has(c.slug)&&!codes.has(c.source_league_code),'duplicate league identity')
    ids.add(c.id);slugs.add(c.slug);codes.add(c.source_league_code)
    leagues.push({id:c.id,slug:c.slug,code:c.source_league_code,completed:[...new Set(matches.filter(m=>m.rounds?.competition_id===c.id&&m.rounds.season==='2026/27'&&m.imported_at&&/^\d+$/.test(String(m.zapisnik_id))).map(m=>String(m.zapisnik_id)))]})
  }
  return {schema:1,incident:'hns-20261117',source:'hns',season:'2026/27',from,to,createdAt:now,expiresAt:new Date(Date.parse(now)+7*86400000).toISOString(),leagues}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {createClient}=await import('@supabase/supabase-js')
  const env=Object.fromEntries(readFileSync(new URL('../.env.production',import.meta.url),'utf8').split('\n').filter(x=>x.startsWith('VITE_')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)]}))
  const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}})
  const {data:competitions,error}=await db.from('competitions').select('id,slug,active,source,source_league_code,source_policy,countries!inner(code)').eq('active',true).eq('source','hns').order('sort_order').order('slug')
  if(error)throw Error(error.message)
  assert.equal(competitions.length,139,'Review changed active HNS inventory before collection')
  const matches=[]
  for(let offset=0;;offset+=1000){
    const {data,error}=await db.from('matches').select('id,zapisnik_id,imported_at,played_on,rounds!inner(competition_id,season,competitions!inner(source,active))').eq('rounds.competitions.source','hns').eq('rounds.competitions.active',true).gte('played_on','2026-11-06').lte('played_on','2026-11-17').order('id').range(offset,offset+999)
    if(error)throw Error(error.message);matches.push(...data);if(data.length<1000)break
  }
  const manifest=buildCollectionManifest({competitions,matches,now:new Date().toISOString(),from:'2026-11-06',to:'2026-11-17'})
  assert.ok(process.argv[2],'output path required');writeFileSync(process.argv[2],JSON.stringify(manifest,null,2),{mode:0o600})
  console.log(JSON.stringify({leagues:manifest.leagues.length,matches:matches.length,imported:matches.filter(x=>x.imported_at).length,pending:matches.filter(x=>!x.imported_at).length,output:process.argv[2]}))
}
