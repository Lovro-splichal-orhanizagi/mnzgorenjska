import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {extractFussballSeasonLinks,inspectFussballArchivePage} from './fussball-season-links.mjs'
import {createFussballCaptureClient,fussballCanonicalRoundLocation} from './lib/fussball-capture.mjs'
const staffel='031AVH9TIC000004VS5489BTVSK8S3O6-G',season='2026/27'
const archive='02TC3RCRHK000004VS5489BTVVQ0O654-G'
const original=readFileSync(new URL('./vzorci/de-fussball-schleswig-round16-20261024.html',import.meta.url),'utf8')
test('retained live season selector resolves abbreviated previous season without any network',()=>{
 const result=extractFussballSeasonLinks(original,{staffel,season})
 assert.deepEqual(result.previous,{staffel:archive,season:'2025/26',code:archive+':2025/26',seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+archive})
 assert.match(result.source_sha256,/^[a-f0-9]{64}$/)
 assert.equal(result.current.staffel,staffel)
})
test('full-year labels resolve to the same observed tuple; malformed and ambiguous labels fail closed',()=>{
 assert.equal(extractFussballSeasonLinks(original.replace('Saison 25/26','Saison 2025/2026'),{staffel,season}).previous.staffel,archive)
 for(const html of [original.replace('Saison 25/26','Saison 25/27'),original.replace('Saison 24/25','Saison 25/26'),original.replace('selected="selected"',''),original.replace(staffel+'">Saison 26/27',staffel+'">Saison 25/26')])assert.throws(()=>extractFussballSeasonLinks(html,{staffel,season}))
})
test('inert foreign selectors cannot supply archive evidence',()=>{
 const selector=original.match(/<select size="1" name="saison">[\s\S]*?<\/select>/)[0]
 const html=original.replace(selector,selector.replace(/<option data-href="[^\"]+">Saison 25\/26<\/option>/,''))
 const injected=html.replace('</body>',`<template>${selector}</template><script>const example=${JSON.stringify(selector)}</script><!--${selector}--></body>`)
 assert.equal(extractFussballSeasonLinks(injected,{staffel,season}).previous,null)
})
test('selected league, canonical page and same-host route are all bound',()=>{
 for(const html of [original.replace(archive,'https://evil.test/'+archive),original.replace('name="saison"','name="other"'),original.replace('https://www.fussball.de/spieltag/-/staffel/'+archive,'http://www.fussball.de/spieltag/-/staffel/'+archive),original.replace('</body>',original.match(/<select size="1" name="saison">[\s\S]*?<\/select>/)[0]+'</body>')])assert.throws(()=>extractFussballSeasonLinks(html,{staffel,season}))
 assert.throws(()=>extractFussballSeasonLinks(original,{staffel:archive,season:'2025/26'}))
})
test('a terminal 301 can preserve only an observed same-league canonical seed, without following it',async()=>{
 const from='https://www.fussball.de/spieltag/-/staffel/'+archive,to='https://www.fussball.de/spieltag/observed-archive/-/staffel/'+archive
 assert.equal(fussballCanonicalRoundLocation(from,to,301),to)
 for(const location of [to+'?token=private',to.replace('www.fussball.de','evil.test'),to.replace(archive,staffel),to.replace('https://','https://user:secret@'),to.replace('/staffel/','/spieltag/1/staffel/')])assert.equal(fussballCanonicalRoundLocation(from,location,301),null)
 assert.equal(fussballCanonicalRoundLocation(from,to,302),null)
 let calls=0;const client=createFussballCaptureClient({maxRequests:1,fetchFn:async()=>{calls++;return new Response(null,{status:301,headers:{location:to}})}})
 await assert.rejects(client.read(from,'round'),/redirect refused/)
 assert.equal(calls,1);assert.equal(client.snapshot().attempts[0].canonicalLocation,to);assert.equal(client.snapshot().stopped,true)
})
test('archive identity uses the observed selected season and form, with an explicitly bound current SEO canonical',()=>{
 const html=readFileSync(new URL('./vzorci/de-fussball-schleswig-archive-20261026.html',import.meta.url),'utf8')
 const seedUrl='https://www.fussball.de/spieltag/flens-oberliga-schleswig-holstein-oberliga-schleswig-holstein-herren-saison2526-schleswig-holstein/-/staffel/'+archive
 const current={staffel,season,seedUrl:'https://www.fussball.de/spieltag/flens-oberliga-schleswig-holstein-oberliga-schleswig-holstein-herren-saison2627-schleswig-holstein/-/staffel/'+staffel}
 const options={archive:{staffel:archive,season:'2025/26',seedUrl},current}
 const result=inspectFussballArchivePage(html,options)
 assert.equal(result.url,seedUrl);assert.equal(result.canonicalUrl,current.seedUrl)
 for(const broken of [html.replace('Saison 25/26</option>','Saison 24/25</option>'),html.replace('name="saison"','name="unknown"'),html.replace('data-ajax-resource="'+seedUrl+'"','data-ajax-resource="'+current.seedUrl+'"')])assert.throws(()=>inspectFussballArchivePage(broken,options))
 assert.throws(()=>inspectFussballArchivePage(html,{...options,current:{...current,staffel:'A'.repeat(32)+'-G'}}))
})
