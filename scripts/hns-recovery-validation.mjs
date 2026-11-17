import {razpakiraj} from './klubi.mjs'
import assert from 'node:assert/strict'
import {vrsticeRazporeda,vZapisnik,jeIzziv,jeTehnicnaNedostopnost,izidSeUjema,sImenomIzRazporeda,kljucKlubaHr,jeKontumacija,IME_KLUBA} from './viri/hns.mjs'
export function usableHtml(html){assert.ok(!jeIzziv(html)&&!jeTehnicnaNedostopnost(html)&&/<html[\s>]/i.test(html),'not a usable HTML document')}
export function schedule(html){usableHtml(html);const f=vrsticeRazporeda(html);assert.ok(f.length,'empty schedule');assert.equal(new Set(f.map(x=>x.id)).size,f.length,'duplicate fixture');return f}
export function competitionName(html){return razpakiraj(html.match(/<title[^>]*>([^<]+) - Hrvatski nogometni savez<\/title>/i)?.[1]??'')}
export function report(html,f,code,parentName=''){
 usableHtml(html);assert.match(String(f.id),/^\d+$/);assert.match(String(code),/^\d+$/)
 // HNS does not embed the report ID. Bind its requested URL through the
 // captured schedule and independently match competition, round, date and clubs.
 const header=html.match(/<div class="competition-title">([\s\S]*?)<\/h2>/)?.[1]??''
 // Aggregate league schedules can list first/second phase fixtures. HNS
 // publishes the reports under a child competition ID. Bind that child to the
 // captured parent's exact season-bearing name plus its explicit phase suffix.
 const link=header.match(/<a href="https:\/\/semafor\.hns\.family\/natjecanja\/(\d+)\/[^"\s]*">([^<]+)<\/a>/)
 const childName=razpakiraj(link?.[2]??'')
 const phaseSuffix=childName.startsWith(parentName)?childName.slice(parentName.length):''
 const phase=!!parentName&&/26\/27$/.test(parentName)&&/^ [1-4]\. DIO$/.test(phaseSuffix)
 assert.ok(link&&(link[1]===String(code)||phase),'competition header mismatch')
 const z=vZapisnik(html,{id:String(f.id),url:`https://semafor.hns.family/utakmice/${f.id}/x/`})
 if(!z)return {quality:{complete:false,reason:jeKontumacija(html,f.izid)?'forfeit':'unpublished-or-incomplete'},z:null}
 const aliases={617:['NK Ponikve'],2573:['NK Polet','NK Polet (SK)'],1329:['NK Sveti Đurađ'],209:['NK Dragovoljac'],178362:['NK Borac'],40074:['NK Podravac'],40262:['NK Otok']}
 for(const [side,id] of [['domaci',f.domaciId],['gostje',f.gostjeId]]){
  const actual=kljucKlubaHr(z[side].ime),expected=kljucKlubaHr(f[side])
  assert.ok(actual===expected||(f[side]===IME_KLUBA[id]&&(aliases[id]??[]).some(name=>kljucKlubaHr(name)===actual)),'source club identity mismatch')
 }
 sImenomIzRazporeda(z,f);assert.equal(z.datum,f.datum);assert.equal(z.krog,f.krog);assert.ok(z.rezultat&&f.izid&&izidSeUjema(z,f.izid),'score mismatch')
 assert.equal(kljucKlubaHr(z.domaci.ime),kljucKlubaHr(f.domaci));assert.equal(kljucKlubaHr(z.gostje.ime),kljucKlubaHr(f.gostje))
 assert.equal(z.opozorila.length,0,'parser warnings require review')
 assert.ok([z.domaci,z.gostje].every(e=>e.postava.length>=7&&e.postava.length<=11&&e.postava.filter(p=>p.pozicija==='GK').length===1),'incomplete starters')
 return {quality:{complete:true,date:z.datum,score:z.rezultat,starters:[z.domaci.postava.length,z.gostje.postava.length]},z}
}
