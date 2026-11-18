// Recurring schedule identity uses explicit page controls, never a guessed title season.
import assert from 'node:assert/strict'
import {razpakiraj} from './klubi.mjs'
import {schedule,competitionName} from './hns-recovery-validation.mjs'

function attribute(tag,name){
  return tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(["\'])(.*?)\\1','i'))?.[2]
}
function options(html,id){
  const controls=[...html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)].filter(x=>attribute(x[1],'id')===id)
  assert.equal(controls.length,1,'one '+id+' control required')
  return [...controls[0][2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(x=>({value:attribute(x[1],'value'),name:razpakiraj(x[2]),selected:/(?:^|\s)selected(?:\s|=|$)/i.test(x[1])}))
}
export function recurringSchedule(html,code){
  assert.match(String(code),/^\d+$/,'requested competition code required')
  const selected=options(html,'season').filter(x=>x.selected)
  assert.equal(selected.length,1,'one selected season required')
  assert.equal(selected[0].value,'2026/2027','schedule selected season mismatch')
  assert.equal(selected[0].name,'2026/27','schedule season label mismatch')
  const parentName=competitionName(html)
  assert.ok(parentName,'schedule title required')
  const competitions=options(html,'cid').map(x=>({...x,code:x.value?.match(/^https:\/\/semafor\.hns\.family\/natjecanja\/(\d+)\/[^"<>]+\/$/)?.[1]}))
  const selectedCompetitions=competitions.filter(x=>x.selected)
  assert.ok(selectedCompetitions.length<=1,'ambiguous selected competition')
  if(selectedCompetitions.length)assert.equal(selectedCompetitions[0].code,String(code),'selected competition mismatch')
  assert.ok(competitions.some(x=>x.code===String(code)&&x.name===parentName),'schedule title/competition option mismatch')
  // HNS does not mark cid selected on these pages. Its current-page detail links
  // independently distinguish the page from other competitions in that dropdown.
  const detailCodes=[...html.matchAll(/<div\b[^>]*class=["']viewall["'][^>]*>\s*<a\b[^>]*href=["'](?:https:\/\/semafor\.hns\.family)?\/natjecanja\/(\d+)\/[^"'<>]*\/detaljno\/(?:\?[^"'<>]*)?["']/gi)].map(x=>x[1])
  assert.ok(detailCodes.length>0&&detailCodes.every(x=>x===String(code)),'schedule detail competition mismatch')
  return {fixtures:schedule(html),parentName,season:'2026/27',competitionCode:String(code)}
}
