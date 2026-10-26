// Discovery from retained original bytes only. A menu link establishes an
// observed pairing, not the target page's identity or complete season coverage.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {fussballLiveTags} from './viri/fussball-statistika.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
import {fussballRoundScope,fussballCanonicalRoundLocation} from './lib/fussball-capture.mjs'
import {parseFussballLeagueCode} from './fussball-import.mjs'
const requireProof=(ok,message)=>{if(!ok)throw Error(`fussball season links: ${message}`)}
function label(text,current){
 const m=/^Saison\s+(\d{2}|20\d{2})\/(\d{2}|20\d{2})$/.exec(text.trim())
 requireProof(m,'unsupported season label')
 let year=Number(m[1]);if(m[1].length===2){year=2000+year;if(year>current+1)year-=100}
 requireProof(year>=1900&&year<=current+1&&Number(m[2])===(m[2].length===2?(year+1)%100:year+1),'invalid season progression')
 return `${year}/${String((year+1)%100).padStart(2,'0')}`
}
export function extractFussballSeasonLinks(html,{staffel,season,canonicalStaffel=staffel}={}){
 parseFussballLeagueCode(`${staffel}:${season}`)
 const page=inspectFussballPage(html,{kind:'round',staffel:canonicalStaffel})
 const tags=fussballLiveTags(html,{trackForeign:true})
 const selects=tags.filter(t=>!t.inHead&&!t.foreignContext&&t.tag==='select'&&t.attrs.name==='saison')
 requireProof(selects.length===1,'one live page-scoped season selector required')
 const select=selects[0],close=/<\/select\s*>/gi;close.lastIndex=select.end
 const end=close.exec(html)?.index;requireProof(end!==undefined,'unterminated season selector')
 const options=tags.filter(t=>t.tag==='option'&&t.start>=select.end&&t.start<end)
 requireProof(options.length>0,'empty season selector')
 let cursor=select.end,selected=null;const seasons=[],ids=new Set(),years=new Set()
 for(const option of options){
  requireProof(!html.slice(cursor,option.start).trim(),'unsupported content inside season selector')
  const finish=/<\/option\s*>/gi;finish.lastIndex=option.end
  const closing=finish.exec(html);requireProof(closing&&closing.index<end,'unterminated season option')
  const raw=html.slice(option.end,closing.index);requireProof(!raw.includes('<'),'unsupported season option markup')
  const year=label(raw,Number(season.slice(0,4))),url=option.attrs['data-href'],scope=fussballRoundScope(url)
  requireProof(scope&&scope.round===null&&scope.date===null,'season option must bind a public same-host league seed')
  requireProof(!ids.has(scope.staffel)&&!years.has(year),'ambiguous duplicate season or league identity')
  ids.add(scope.staffel);years.add(year)
  const entry={staffel:scope.staffel,season:year,code:scope.staffel+':'+year,seedUrl:url};seasons.push(entry)
  if(Object.hasOwn(option.attrs,'selected')){requireProof(selected===null,'multiple selected seasons');selected=entry}
  cursor=finish.lastIndex
 }
 requireProof(!html.slice(cursor,end).trim(),'unparsed season selector content')
 requireProof(selected?.staffel===staffel&&selected.season===season,'selected season differs from current page binding')
 const previousYear=Number(season.slice(0,4))-1,previous=seasons.find(s=>Number(s.season.slice(0,4))===previousYear)??null
 return {current:{...selected,url:page.url},seasons,previous,source_sha256:createHash('sha256').update(html).digest('hex')}
}

// The retained archive serves its own selected season/form, but deliberately
// points canonical+OG at the CURRENT season. Admit only this explicitly bound
// adjacent-season family; normal round/report discovery keeps its strict rule.
export function inspectFussballArchivePage(html,{archive,current}={}){
 parseFussballLeagueCode(`${archive?.staffel}:${archive?.season}`)
 parseFussballLeagueCode(`${current?.staffel}:${current?.season}`)
 const a=fussballRoundScope(archive.seedUrl),c=fussballRoundScope(current.seedUrl)
 requireProof(a?.staffel===archive.staffel&&a.round===null&&a.date===null&&c?.staffel===current.staffel&&c.round===null&&c.date===null&&archive.staffel!==current.staffel&&Number(archive.season.slice(0,4))+1===Number(current.season.slice(0,4)),'invalid adjacent archive family')
 const page=inspectFussballPage(html,{kind:'round',staffel:current.staffel})
 requireProof(page.url===current.seedUrl,'archive SEO canonical differs from reviewed current parent')
 const links=extractFussballSeasonLinks(html,{staffel:archive.staffel,season:archive.season,canonicalStaffel:current.staffel})
 requireProof(links.seasons.some(s=>s.staffel===current.staffel&&s.season===current.season),'archive selector omits its current parent')
 const tags=fussballLiveTags(html,{trackForeign:true}),forms=tags.filter(t=>!t.inHead&&!t.foreignContext&&t.tag==='form'&&t.attrs['data-ajax-trigger']==='onchange'&&t.attrs['data-ajax-resource']===archive.seedUrl)
 requireProof(forms.length===1,'archive form does not bind its reviewed source URL')
 const selector=tags.find(t=>t.tag==='select'&&t.attrs.name==='saison'),end=/<\/form\s*>/gi;end.lastIndex=forms[0].end
 const close=end.exec(html)?.index
 requireProof(selector&&selector.start>forms[0].end&&close>selector.end,'season selector is not inside the archive form')
 return {...page,url:archive.seedUrl,canonicalUrl:page.url,archiveOf:current.staffel}
}

// One byte-bound, reviewed terminal301 observation. This is offline alias
// evidence only: the HTTP client continues to refuse redirects without follow.
export function fussballArchiveSeedAlias(archive,current){
 const observed=archive.observedSeedUrl??archive.seedUrl
 if(observed===archive.seedUrl)return null
 const proof=JSON.parse(readFileSync(new URL('./vzorci/de-fussball-baden-archive-20261026.json',import.meta.url)))
 const raw=JSON.stringify(proof.redirectProbeManifest)+'\n'
 const attempt=proof.redirectProbeManifest.snapshot.attempts[0],alias=proof.redirect
 requireProof(createHash('sha256').update(raw).digest('hex')===alias.manifestSha256&&attempt.url===alias.from&&attempt.canonicalLocation===alias.to&&attempt.httpStatus===alias.status&&attempt.startedAt===alias.startedAt&&attempt.status==='failed'&&proof.redirectProbeManifest.snapshot.requests===1,'reviewed redirect original differs')
 requireProof(['seedUrl','staffel','season'].every(k=>current[k]===proof.current[k]&&archive[k]===proof.archive[k])&&observed===proof.observedSeedUrl&&alias.from===observed&&alias.to===archive.seedUrl&&fussballCanonicalRoundLocation(observed,archive.seedUrl,alias.status)===archive.seedUrl,'unobserved archive seed alias')
 return alias
}
