// Pure offline comparison helpers for the one-off audit. No DB or network access.
import {dodajStrelceSKlopi} from './zapisnik.mjs'

// Match the native importer's post-parser step, while retaining evidence of what
// was inferred. Never export names, registration numbers or warning strings.
export function withBenchScorers(z, parsedApps) {
 const apps=parsedApps.map(a=>({...a})),rawCount=apps.length
 const warningCount=dodajStrelceSKlopi(z,apps).length
 return {apps,rawCount,bench:{warning_count:warningCount,added:apps.slice(rawCount).map(a=>({
  side:a.ekipaIdx,shirt:a.st,minute_on:a.minutaOd,goals:a.goli,own_goals:a.avtogoli,
  source_goal_minutes:z.goli.filter(g=>g.ekipaIdx===a.ekipaIdx&&g.st===a.st).map(g=>g.minuta??null)
 }))}}
}

export const FIELDS=[['started','zacetnik'],['minute_on','minutaOd'],['minute_off','minutaDo'],['minutes_played','minute'],
 ['goals','goli'],['own_goals','avtogoli'],['penalties_scored','goliIzEnajstmetrovke'],['penalties_missed','zgreseneEnajstmetrovke'],
 ['yellow_cards','rumeni'],['red_cards','rdeci'],['goals_conceded','prejetiGoli'],['clean_sheet','cleanSheet']]

export function compareAppearances(apps,dbApps,homeTeamId,awayTeamId) {
 const side=a=>a.team_id===homeTeamId?0:a.team_id===awayTeamId?1:-1
 const key=(i,st)=>`${i}|${st}`,diffs=[],seen=new Set(),byKey=new Map()
 if(apps.length!==dbApps.length)diffs.push({problem:'count-mismatch',source:apps.length,db:dbApps.length})
 for(const [origin,rows,getSide,getShirt] of [
  ['source',apps,a=>a.ekipaIdx,a=>a.st],['db',dbApps,side,a=>a.shirt_number]
 ]){
  const keys=new Set()
  for(const a of rows){
   const i=getSide(a),st=getShirt(a),k=key(i,st)
   if(![0,1].includes(i)||st==null)diffs.push({origin,problem:'ambiguous-key',side:i,shirt:st??null})
   if(keys.has(k))diffs.push({origin,problem:'duplicate-key',side:i,shirt:st})
   keys.add(k)
  }
 }
 for(const a of dbApps)byKey.set(key(side(a),a.shirt_number),a)
 for(const x of apps){
  const k=key(x.ekipaIdx,x.st),a=byKey.get(k);seen.add(k)
  if(!a){diffs.push({side:x.ekipaIdx,shirt:x.st,problem:'missing-in-db'});continue}
  if(x.regSt!=null&&String(a.reg_st)!==String(x.regSt))diffs.push({side:x.ekipaIdx,shirt:x.st,field:'reg_st',problem:'differs'})
  for(const [col,src] of FIELDS)if(a[col]!==x[src])diffs.push({side:x.ekipaIdx,shirt:x.st,field:col,source:x[src],db:a[col]})
 }
 for(const [k,a] of byKey)if(!seen.has(k))diffs.push({side:side(a),shirt:a.shirt_number,problem:'extra-in-db'})
 return diffs
}
