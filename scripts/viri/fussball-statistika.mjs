// Offline, report-only statistics. This is intentionally not a source adapter.
import {createHash} from 'node:crypto'
import {parseFussballEventClock, razberiZapisnik} from './fussball.mjs'

class ReportError extends Error {
 constructor(reason,code='FUSSBALL_REPORT_UNSUPPORTED'){super(`fussball statistika: ${reason}`);this.name='FussballReportError';this.code=code}
}
const fail=reason=>{throw new ReportError(reason)}
const requireProof=(condition,reason)=>{if(!condition)fail(reason)}
const hash=raw=>createHash('sha256').update(raw).digest('hex')
const decode=s=>s.replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(?:rsquo|apos);/g,"'").replace(/&nbsp;/g,' ')

// Discover actual opening tags without interpreting comment/raw-text contents
// or markup-shaped attribute values as elements. Keep original source offsets;
// strict subtree parsing and row hashes still consume the unchanged raw HTML.
function liveTags(html,{trackForeign=false}={}){
 const foreign=[]
 const tags=[],rawText=new Set(['script','style','title','textarea','iframe','xmp','noembed','noframes','noscript'])
 let cursor=0,inHead=false,templates=0,heads=0,headEnds=0
 while(cursor<html.length){
  const start=html.indexOf('<',cursor);if(start<0)break
  if(html.startsWith('<!--',start)){
   const close=/--!?>/g;close.lastIndex=start+4
   requireProof(close.exec(html),'odrezan komentar HTML');cursor=close.lastIndex;continue
  }
  // A doctype's quoted public/system identifier can itself contain > or markup.
  if(/^<!doctype\b/i.test(html.slice(start))){
   let end=start+2,quote=null
   for(;end<html.length;end++){
    const c=html[end]
    if(quote){if(c===quote)quote=null}else if(c==='"'||c==="'")quote=c;else if(c==='>')break
   }
   requireProof(end<html.length,'odrezan doctype HTML');cursor=end+1;continue
  }
  // HTML bogus comments (including <?...> and HTML CDATA declarations) end
  // at the first >; their markup-shaped contents cannot open an element.
  if(html.startsWith('<!',start)||html.startsWith('<?',start)){
   const end=html.indexOf('>',start+2)
   requireProof(end>=0,'odrezana deklaracija HTML');cursor=end+1;continue
  }
  const prefix=/^<(\/?)([a-z][a-z0-9:-]*)(?=[\s/>])/i.exec(html.slice(start))
  if(!prefix){cursor=start+1;continue}
  let end=start+prefix[0].length,quote=null
  for(;end<html.length;end++){
   const c=html[end]
   if(quote){if(c===quote)quote=null}else if(c==='"'||c==="'")quote=c;else if(c==='>')break
  }
  requireProof(end<html.length,'odrezana oznaka HTML');end++
  const tag=prefix[2].toLowerCase(),closing=!!prefix[1],attrs=Object.create(null)
  const body=html.slice(start+prefix[0].length,end-1).replace(/\/\s*$/,'')
  const attr=/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy
  let position=0
  while(position<body.length){
   if(!body.slice(position).trim())break
   attr.lastIndex=position;const m=attr.exec(body)
   requireProof(m&&!closing,'nepodprti atributi oznake HTML')
   const key=m[1].toLowerCase();requireProof(!Object.hasOwn(attrs,key),'podvojen atribut HTML')
   attrs[key]=m[2]??m[3]??m[4]??null;position=attr.lastIndex
  }
  if(tag==='template')templates+=closing?-1:1
  requireProof(templates>=0,'neveljavna meja predloge HTML')
  if(!templates){
   const foreignTag=['svg','math'].includes(tag)
   if(trackForeign&&foreignTag){
    if(closing)requireProof(foreign.pop()===tag,'neujemajoča tuja meja HTML')
    else if(!/\/\s*>$/.test(html.slice(start,end)))foreign.push(tag)
   }
   if(tag==='head'){
    if(closing){requireProof(inHead,'neveljaven zaključek glave HTML');headEnds++;inHead=false}
    else{requireProof(!inHead&&!heads,'podvojena glava HTML');heads++;inHead=true}
   }
   if(!closing)tags.push({tag,attrs,start,end,inHead,...(trackForeign?{foreignContext:foreign.length>0||foreignTag}:{})})
  }
  cursor=end
  if(!closing&&rawText.has(tag)){
   const close=new RegExp(`</${tag}\\s*>`,'gi');close.lastIndex=cursor
   requireProof(close.exec(html),'odrezana surova vsebina HTML');cursor=close.lastIndex
  }else if(!closing&&tag==='plaintext')cursor=html.length
 }
 requireProof(!trackForeign||!foreign.length,'odrezan tuji kontekst HTML')
 requireProof(!templates&&heads===1&&headEnds===1,'manjka enolična živa glava HTML')
 return tags
}
function sourceUrl(tags,id){
 const head=tags.filter(t=>t.inHead),canonical=head.filter(t=>t.tag==='link'&&t.attrs.rel==='canonical'),og=head.filter(t=>t.tag==='meta'&&t.attrs.property==='og:url')
 requireProof(canonical.length===1&&og.length===1,'manjka enolična živa identiteta zapisnika')
 const ownId=url=>url?.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]
 requireProof(ownId(canonical[0].attrs.href)===id&&ownId(og[0].attrs.content)===id,'živa identiteta zapisnika se ne ujema')
 return canonical[0].attrs.href
}

// Closed refusal grammar for the captured lineup fragment, not HTML repair.
// Every token must be consumed; only these ordinary HTML elements/attributes
// can carry core evidence. No raw-text, inert, foreign or custom context exists
// in this grammar, and attributes cannot contain markup-shaped source bytes.
function lineupProof(html){
 const allowed={div:['id','class'],a:['href','class'],span:['class','data-obfuscation','data-alt','data-responsive-image'],img:['src','alt'],h3:['class']}
 const tokens=/<[^>]*>|[^<]+/gy,stack=[],fontIds=new Set()
 let cursor=0,root=false
 while(cursor<html.length){
  tokens.lastIndex=cursor;const m=tokens.exec(html)
  requireProof(m,'nepodprta oznaka postave');cursor=tokens.lastIndex
  const token=m[0]
  if(!token.startsWith('<')){requireProof(stack.length||!token.trim(),'besedilo zunaj dokazne postave');continue}
  const close=token.match(/^<\/([a-z][a-z0-9]*)>$/)
  if(close){requireProof(stack.pop()===close[1],'neujemajoče meje dokazne postave');continue}
  const open=token.match(/^<([a-z][a-z0-9]*)((?:\s+[a-z][a-z0-9-]*="[^"<>]*")*)>$/)
  requireProof(open&&Object.hasOwn(allowed,open[1]),'nepodprta vrsta elementa dokazne postave')
  const tag=open[1],attrs=Object.create(null)
  for(const a of open[2].matchAll(/\s+([a-z][a-z0-9-]*)="([^"]*)"/g)){
   requireProof(allowed[tag].includes(a[1])&&!Object.hasOwn(attrs,a[1]),'nepodprt ali podvojen atribut dokazne postave')
   attrs[a[1]]=a[2]
  }
  if(Object.hasOwn(attrs,'data-obfuscation')){
   fontIds.add(attrs['data-obfuscation'])
  }
  if(!stack.length){
   requireProof(!root&&tag==='div'&&Object.keys(attrs).length===1&&attrs.id==='match_course_body','manjka enoličen koren dokazne postave');root=true
  }else{
   requireProof(!['span','h3'].includes(stack.at(-1)),'nepodprta vsebina listnega elementa postave')
   requireProof(!Object.hasOwn(attrs,'id'),'nepodprt notranji id postave')
  }
  requireProof(tag!=='a'||!stack.includes('a'),'gnezdene profilne povezave niso podprte')
  if(tag!=='img')stack.push(tag)
 }
 requireProof(root&&!stack.length,'odrezana dokazna postava')
 return [...fontIds].sort()
}

/** Font evidence is exposed only after the same closed lineup grammar used by the strict report validator. */
export function inspectFussballLineup(html){
 const ids=lineupProof(html)
 requireProof(ids.every(id=>/^[a-z0-9]{8}$/.test(id??'')),'neveljaven ID pisave dokazne postave')
 return ids
}
export {liveTags as fussballLiveTags}

// A small closed grammar, not a browser/HTML repair parser: every tag, attribute,
// non-whitespace text and child must be consumed by an explicitly known shape.
function tree(html,start){
 const stack=[],tokens=/<[^>]*>|[^<]+/g;tokens.lastIndex=start
 let m,root
 while((m=tokens.exec(html))){
  const token=m[0]
  if(token.startsWith('</')){
   const close=token.match(/^<\/([a-z][a-z0-9]*)>$/),n=stack.pop()
   requireProof(close&&n&&n.tag===close[1],'neujemajoče zaključne oznake dogodka')
   n.end=tokens.lastIndex
   if(!stack.length)return root
  }else if(token.startsWith('<')){
   const open=token.match(/^<([a-z][a-z0-9]*)((?:\s+[a-z][a-z0-9-]*="[^"<>]*")*)>$/)
   requireProof(open,'nepodprta oznaka ali atribut dogodka')
   const attrs=Object.create(null)
   for(const a of open[2].matchAll(/\s+([a-z][a-z0-9-]*)="([^"]*)"/g)){
    requireProof(!(a[1] in attrs),'podvojen atribut dogodka');attrs[a[1]]=a[2]
   }
   const n={tag:open[1],attrs,children:[],start:m.index}
   if(stack.length)stack.at(-1).children.push(n);else root=n
   stack.push(n)
  }else if(token.trim()){
   requireProof(stack.length,'besedilo zunaj dogodka');stack.at(-1).children.push(token.trim())
  }
 }
 fail('odrezan razdelek dogodkov')
}
function shape(n,tag,attrs={},count){
 requireProof(n&&typeof n==='object'&&n.tag===tag,`nepodprta struktura: pričakovan ${tag}`)
 requireProof(Object.keys(n.attrs).length===Object.keys(attrs).length&&Object.entries(attrs).every(([k,v])=>n.attrs[k]===v),`nepodprti atributi ${tag}`)
 if(count!=null)requireProof(n.children.length===count,`nepodprti podrejeni elementi ${tag}`)
 return n.children
}
const box=(n,cls,count)=>shape(n,'div',{class:cls},count)
function text(n,tag,attrs,pattern){const c=shape(n,tag,attrs,1);requireProof(typeof c[0]==='string'&&pattern.test(decode(c[0])),'nepodprto besedilo dogodka');return c[0]}
function cell(n){return box(box(n,n.attrs.class,1)[0],'valign-table',1)[0]}
function glyph(n){
 requireProof(/^[a-z0-9]+$/.test(n?.attrs?.['data-obfuscation']??''),'manjka obfuscation dokaz')
 text(n,'span',{'data-obfuscation':n.attrs['data-obfuscation']},/^[\uE000-\uF8FF ]+$/u)
}
function player(n,{goal=false}={}){
 const url=n?.attrs?.href,m=url?.match(/^https:\/\/www\.fussball\.de\/spielerprofil\/-\/(player-id|userid)\/([A-Z0-9]{32})$/)
 requireProof(m,'manjka točna profilna identiteta dogodka')
 const c=shape(n,'a',{href:url},goal?2:1)
 if(goal){
  const image=shape(c[0],'span',{class:'player-image table-image'},1)[0]
  const imageUrl=image?.attrs?.['data-responsive-image']
  requireProof(/^(?:https:\/\/cdn\.fussball\.de\/public\/[A-Z0-9]{32}\.stamp|\/\/www\.fussball\.de\/export\.media\/-\/action\/getPlayerImage\/format\/15\/image-id\/NPI_[0-9]{28}|https:\/\/images\.media\.fussball\.de\/userfiles\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9_-]+_p3\.jpg)$/.test(imageUrl??''),'nepodprta slika igralca')
  shape(image,'span',{'data-alt':'player-image','data-responsive-image':imageUrl},0)
 }
 const name=c.at(-1)
 if(name?.tag==='div'){for(const s of box(name,'player-name',goal?2:1))glyph(s)}else{requireProof(!goal,'manjka struktura imena strelca');glyph(name)}
 return `de-fussball-${m[1]}-${m[2]}`
}
function rawEvent(n,half,ordinal,html){
 const rowClass=n?.attrs?.class,match=/^row-event event-(left|right)( own-goal)?$/.exec(rowClass??'')
 requireProof(match,'nepodprt razred dogodka')
 const side=match[1]==='left'?0:1,explicitOwnGoal=match[2]!==undefined
 const columns=box(n,rowClass,3)
 const [pn,en,tn]=side===0?columns:[columns[2],columns[1],columns[0]]
 const pc=shape(cell(pn),'div',{class:'valign-cell'})
 box(pn,'column-player',1);box(en,'column-event',1);box(tn,'column-time',1)
 const ec=shape(cell(en),'div',{class:'valign-cell'},1)[0]
 const time=box(tn,'column-time',1)[0],color=time?.attrs?.class
 requireProof(['hexagon black','hexagon green'].includes(color),'nepodprt označevalec časa')
 const [icon,inner]=box(time,color,2);shape(icon,'span',{class:'icon-hexagon'},0)
 const clock=box(box(inner,'inner',1)[0],'valign-wrapper',1)[0]
 shape(clock,'div',{class:'valign-inner'})
 const rawClock=clock.children.map(child=>{
  if(typeof child==='string')return child
  const [value]=shape(child,'div',{},1)
  requireProof(typeof value==='string'&&/^\+\d{1,2}$/.test(value),'nepodprta oblika dodatka časa')
  return `<div>${value}</div>`
 }).join('')
 const parsedClock=parseFussballEventClock(rawClock)
 requireProof(parsedClock,'nepodprta minuta dogodka')
 const cas=rawClock,base=parsedClock.base,added=parsedClock.added
 requireProof(added<=30&&(half===1?base>=1&&base<=45:base>=46&&base<=90)&&(!added||base===(half===1?45:90)),'čas ne pripada podprtemu polčasu')
 const proof={ekipaIdx:side,cas,osnovnaMinuta:base,dodatek:added,minuta:Math.min(90,base),polcas:half,ordinal,eventSha256:hash(html.slice(n.start,n.end))}
 let vrsta,refs,enajstmetrovka=false,drugiRumeni=false
 if(ec.tag==='i'||ec.tag==='span'&&ec.attrs.class==='icon-stack'){
  requireProof(!explicitOwnGoal,'označevalec avtogola brez gola')
  const cls=ec.attrs.class
  if(cls==='icon-substitute'){
   shape(ec,'i',{class:cls},0);requireProof(pc.length===2,'nepodprta menjava')
   text(pc[0],'div',{},/^Auswechslung$/)
   const [incoming,outgoing]=box(pc[1],'substitute',2),oc=box(outgoing,'substitute',2)
   requireProof(oc[0]==='für','nepodprta smer menjave')
   refs=[player(incoming),player(oc[1])];vrsta='menjava'
  }else{
   let label
   if(ec.tag==='span'){
    const halves=shape(ec,'span',{class:'icon-stack'},2)
    shape(halves[0],'span',{class:'icon-card-half yellow-card'},0);shape(halves[1],'span',{class:'icon-card red-card'},0)
    vrsta='rdeci';drugiRumeni=true;label='Gelb-Rote Karte'
   }else{
    requireProof(['icon-card yellow-card','icon-card red-card'].includes(cls),'nepodprt karton: neznana ali mešana ikona')
    shape(ec,'i',{class:cls},0);vrsta=cls==='icon-card yellow-card'?'rumeni':'rdeci';label=vrsta==='rumeni'?'Gelbe Karte':'Rote Karte'
   }
   if(pc.length===1&&pc[0]===label){requireProof(vrsta==='rumeni','vir ne objavi prejemnika rdečega kartona');refs=[]}
   else{
    // Closed composition of observed label and substitution-profile grammar.
    // Positive compositions in tests are synthetic: retained LIVE card rows
    // remain anonymous and are never relabelled as named source evidence.
    requireProof(pc.length===2,'nepodprt pripisan ali spremenjen karton')
    text(pc[0],'div',{},new RegExp(`^${label}$`));refs=[player(pc[1])]
   }
  }
  requireProof(color==='hexagon black','neskladna barva dogodka')
 }else{
  const scores=box(ec,'even')
  requireProof(scores.length===3||scores.length===4,'nepodprti podrejeni elementi div')
  if(scores.length===4){
   text(scores[3],'span',{class:'event-info'},explicitOwnGoal?/^Eigentor$/:/^Strafstoßtor$/)
   enajstmetrovka=!explicitOwnGoal
  }else requireProof(!explicitOwnGoal,'manjka izrecna oznaka avtogola')
  for(const [i,cls] of [[0,'score-left'],[2,'score-right']]){
   const s=scores[i],font=s?.attrs?.['data-obfuscation']
   requireProof(/^[a-z0-9]+$/.test(font??''),'manjka pisava izida dogodka')
   text(s,'span',{'data-obfuscation':font,class:cls},/^[\uE000-\uF8FF]+$/u)
  }
  text(scores[1],'span',{class:'colon'},/^:$/)
  requireProof(pc.length===1&&color==='hexagon green','nepodprta oblika gola')
  refs=[player(pc[0],{goal:true})];vrsta='gol'
 }
 return {...proof,...(vrsta==='gol'?{enajstmetrovka}:{}),...(vrsta==='rdeci'?{drugiRumeni}:{}),vrsta,refs}
}
function keys(o,expected){requireProof(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===expected.length&&expected.every(k=>Object.hasOwn(o,k)),'nepodprta oblika obdobij hitrega pregleda')}
function summary(source){
 // JSON.parse alone erases duplicate keys, which could hide a contradictory
 // duration/type marker. The observed literal uses unescaped single quotes.
 requireProof(!source.includes('\\'),'nepodprt ubežni znak hitrega pregleda')
 const scopes=[]
 for(const m of source.matchAll(/'([^']*)'|[{}]/g)){
  if(m[0]==='{')scopes.push(new Set())
  else if(m[0]==='}')requireProof(scopes.pop(),'neveljavna obdobja hitrega pregleda')
  else if(/^\s*:/.test(source.slice(m.index+m[0].length))){
   const seen=scopes.at(-1)
   requireProof(seen&&!seen.has(m[1]),'podvojeno polje hitrega pregleda');seen.add(m[1])
  }
 }
 requireProof(scopes.length===0,'odrezana obdobja hitrega pregleda')
 try{return JSON.parse(source.replace(/'/g,'"'))}catch{fail('nepodprti podatki trajanja')}
}
function resultProof(html,z,raw,tags){
 const starts=tags.filter((t,i)=>t.tag==='div'&&t.attrs.class==='result'&&tags[i+1]?.tag==='span'&&tags[i+1].attrs.class==='end-result')
 requireProof(starts.length===1,'manjka enolična navadna oblika končnega izida')
 const [end,half]=box(tree(html,starts[0].start),'result',2),c=shape(end,'span',{class:'end-result'},4)
 for(const [i,cls] of [[0,'score-left'],[2,'score-right']]){
  const font=c[i]?.attrs?.['data-obfuscation']
  requireProof(/^[a-z0-9]+$/.test(font??''),'manjka pisava končnega izida')
  text(c[i],'span',{'data-obfuscation':font,class:cls},/^[\uE000-\uF8FF]+$/u)
 }
 text(c[1],'span',{class:'colon'},/^:$/)
 const verification=shape(c[3],'sub',{},2)
 requireProof(verification[0]==='&nbsp;','manjka preverjeni izid')
 shape(verification[1],'span',{class:'icon-verified'},0)
 const score=decode(text(half,'span',{class:'half-result'},/^\[\d{1,2} : \d{1,2}\]$/)).match(/^\[(\d+) : (\d+)\]$/)
 const count=raw.filter(e=>e.polcas===1&&e.vrsta==='gol').length,expected=count?z.goli[count-1].rezultat:{domaci:0,gostje:0}
 requireProof(+score[1]===expected.domaci&&+score[2]===expected.gostje,'neskladen objavljeni polčasni izid')
}
function events(html,tags){
 const starts=tags.filter(t=>t.tag==='div'&&t.attrs.class==='match-course')
 requireProof(starts.length===1,'razdelek poteka ni enoličen')
 const root=tree(html,starts[0].start),periods=box(root,'match-course',3),out=[]
 for(const [i,period] of periods.slice(0,2).entries()){
  const c=box(period,`${i?'second':'first'}-half ingame`,i?2:3)
  const rows=box(box(c[0],'events',1)[0],'container')
  for(const row of rows)out.push(rawEvent(row,i+1,out.length+1,html))
  text(c[1],'div',{class:'row-time'},i?/^90'$/:/^45'$/)
  if(!i)box(c[2],'arrow',0)
 }
 const final=box(box(periods[2],'final',1)[0],'headline',2)
 text(final[0],'h3',{},/^Abpfiff$/);text(final[1],'span',{},/^(?:[01]\d|2[0-3]):[0-5]\dUhr$/)
 const summaries=tags.filter(t=>Object.hasOwn(t.attrs,'data-match-events'))
 requireProof(summaries.length===1,'manjka enoličen dokaz trajanja')
 const evidence=summaries[0]
 requireProof(evidence.tag==='div'&&evidence.attrs.id==='rangescontainer'&&evidence.attrs.class==='ranges'&&Object.hasOwn(evidence.attrs,'data-match-quick-view')&&Object.keys(evidence.attrs).length===4,'nepodprta živa oblika dokaza trajanja')
 const q=summary(evidence.attrs['data-match-events'])
 keys(q,['durationSections','duration','extraTimeDuration','first-half','second-half'])
 requireProof(q.durationSections===2&&q.duration===90&&q.extraTimeDuration===0,'nepodprto trajanje tekme')
 for(const [i,name] of ['first-half','second-half'].entries()){
  const p=q[name];keys(p,['start','end','events'])
  requireProof(p.start===(i?45:0)&&p.end===(i?90:45)&&Array.isArray(p.events),'nepodprte meje obdobij')
  const actual=out.filter(e=>e.polcas===i+1)
  requireProof(actual.length===p.events.length,'neskladje števila dogodkov po polčasih')
  let previous=-1
  for(const [j,e] of actual.entries()){
   const raw=p.events[j];keys(raw,['time','type','team'])
   const clock=`${e.osnovnaMinuta}${e.dodatek?`+${e.dodatek}`:''}`
   const coarseAddedTime=[45,90].includes(e.osnovnaMinuta)&&raw.time===String(e.osnovnaMinuta)&&e.dodatek>=1&&e.dodatek<=30
   requireProof((raw.time===clock||coarseAddedTime)&&raw.type===(e.vrsta==='rdeci'?(e.drugiRumeni?'yellow-red-card':'red-card'):({gol:'goal',menjava:'substitute',rumeni:'yellow-card'})[e.vrsta])&&raw.team===(e.ekipaIdx?'away':'home'),'neskladje vrste, strani ali časa dogodka')
   const order=e.osnovnaMinuta*100+e.dodatek
   requireProof(order>=previous,'neurejeni izvorni časi');previous=order
  }
 }
 return out
}
function associate(z,raw){
 const queues={gol:[...z.goli],menjava:[...z.menjave],rumeni:[...z.nepripisaniKartoni],namedYellow:[...(z.rumeni??[])],rdeci:[...(z.rdeci??[])]}
 for(const e of raw){
  const event=queues[e.vrsta==='rumeni'&&e.refs.length?'namedYellow':e.vrsta].shift(),team=[z.domaci,z.gostje][e.ekipaIdx]
  requireProof(event&&event.minuta===e.minuta,'neujemanje surovega dogodka z validatorjem')
  if(e.vrsta==='gol')requireProof(event.virId===e.refs[0]&&event.rezultat&&(event.avtogol||event.ekipa===team.ime)&&event.enajstmetrovka===e.enajstmetrovka&&!(e.enajstmetrovka&&event.avtogol),'neujemanje identitete ali označevalca gola')
  else if(e.vrsta==='menjava')requireProof(event.ekipa===team.ime&&event.noter.virId===e.refs[0]&&event.ven.virId===e.refs[1],'neujemanje identitet menjave')
  else requireProof(event.ekipa===team.ime&&event.vrsta===e.vrsta&&(!e.refs.length||event.virId===e.refs[0])&&(e.vrsta!=='rdeci'||event.drugiRumeni===e.drugiRumeni),'neujemanje identitete ali vrste kartona')
 }
 requireProof(Object.values(queues).every(q=>!q.length),'nepovezan dogodek validatorja')
}
function appearances(z,raw){
 const teams=[z.domaci,z.gostje],roster=new Map(),active=new Set(),entered=new Set(),dismissed=new Set()
 for(const [side,t] of teams.entries())for(const p of [...t.postava,...t.rezerve]){
  const starter=t.postava.includes(p)
  roster.set(p.virId,{...p,ekipaIdx:side,zacetnik:starter,od:starter?0:null,do:90,rumeni:0,rdeci:0,redCardMinute:null,carded:false})
  if(starter){active.add(p.virId);entered.add(p.virId)}
 }
 // Equal raw clocks do not prove causal order. Disjoint substitutions commute;
 // any shared participant, or a scorer crossing an entry/exit, is unsupported.
 const groups=new Map()
 for(const e of raw){const k=`${e.polcas}:${e.osnovnaMinuta}:${e.dodatek}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
 for(const group of groups.values()){
  const used=new Set()
  for(const e of group.filter(e=>e.vrsta==='menjava'))for(const ref of e.refs){requireProof(!used.has(ref),'neenolične sočasne menjave');used.add(ref)}
  for(const e of group.filter(e=>e.vrsta==='gol'))requireProof(!used.has(e.refs[0]),'dvoumen čas strelca in menjave')
  const reds=new Set(group.filter(e=>e.vrsta==='rdeci').map(e=>e.refs[0]))
  for(const e of group.filter(e=>e.vrsta==='gol'))requireProof(!reds.has(e.refs[0]),'dvoumen čas strelca in izključitve')
  for(const e of group.filter(e=>['rumeni','rdeci'].includes(e.vrsta)&&e.refs.length))requireProof(!used.has(e.refs[0]),'dvoumen čas kartona in menjave')
 }
 for(const e of raw){
  if(e.vrsta==='gol')requireProof(active.has(e.refs[0]),'gol zunaj aktivnega intervala')
  if(['rumeni','rdeci'].includes(e.vrsta)&&e.refs.length){
   const p=roster.get(e.refs[0])
   requireProof(p&&p.ekipaIdx===e.ekipaIdx&&!dismissed.has(p.virId),'karton napačne strani ali že izključenega igralca')
   p.carded=true
   if(e.vrsta==='rumeni'){requireProof(p.rumeni===0,'drugi običajni rumeni brez izrecne izključitve');p.rumeni=1}
   else{
    requireProof(!e.drugiRumeni||p.rumeni===1,'drugi rumeni brez objavljenega predhodnega prvega rumenega')
    e.naIgriscu=active.has(p.virId);p.rdeci=1;p.redCardMinute=e.minuta;dismissed.add(p.virId)
    if(e.naIgriscu){requireProof(!p.vratar,'izključitev vratarja brez dokazane nove vloge vratarja');p.do=e.minuta;active.delete(p.virId)}
    requireProof([...active].filter(ref=>roster.get(ref).ekipaIdx===e.ekipaIdx).length>=7,'premalo aktivnih igralcev po izključitvi')
   }
  }
  if(e.vrsta!=='menjava')continue
  requireProof(e.osnovnaMinuta!==45&&(e.osnovnaMinuta!==46||e.polcas===2),'nepodprta dvoumna polčasna menjava')
  const [incoming,outgoing]=e.refs.map(ref=>roster.get(ref))
  requireProof(incoming&&outgoing&&incoming.ekipaIdx===e.ekipaIdx&&outgoing.ekipaIdx===e.ekipaIdx,'menjava napačne zgodovinske strani')
  requireProof(!entered.has(incoming.virId)&&active.has(outgoing.virId)&&!dismissed.has(incoming.virId),'ponovni vstop ali neveljaven izstop')
  requireProof(incoming.vratar===outgoing.vratar,'nepotrjena menjava vloge vratarja')
  outgoing.do=e.minuta;incoming.od=e.minuta
  active.delete(outgoing.virId);active.add(incoming.virId);entered.add(incoming.virId)
  for(const side of [0,1])requireProof([...active].filter(ref=>roster.get(ref).ekipaIdx===side&&roster.get(ref).vratar).length===1,'manjka enoličen aktivni vratar')
 }
 return [...roster.values()].filter(p=>p.od!=null||p.carded).map(p=>{
  if(p.od==null){p.od=0;p.do=0}
  requireProof(p.od<=p.do&&p.od>=0&&p.do<=90,'neveljaven interval nastopa')
  const goals=z.goli.filter(g=>g.virId===p.virId),conceded=p.ekipaIdx===0?z.rezultat.gostje:z.rezultat.domaci
  return {virId:p.virId,ekipaIdx:p.ekipaIdx,ekipa:teams[p.ekipaIdx].ime,st:p.st,ime:p.ime,regSt:null,pozicija:p.vratar?'GK':null,vratar:p.vratar,zacetnik:p.zacetnik,minutaOd:p.od,minutaDo:p.do,minute:p.do-p.od,goli:goals.filter(g=>!g.avtogol).length,goliIzEnajstmetrovke:goals.filter(g=>!g.avtogol&&g.enajstmetrovka).length,avtogoli:goals.filter(g=>g.avtogol).length,zgreseneEnajstmetrovke:0,rumeni:p.rumeni,rdeci:p.rdeci,...(p.carded?{redCardMinute:p.redCardMinute}:{}),prejetiGoli:conceded,cleanSheet:conceded===0}
 })
}

export function razberiFantasyZapisnik(mainHtml,lineupHtml,{fonts,id,lineupId}={}){
 try{
  requireProof(typeof mainHtml==='string'&&typeof lineupHtml==='string','zahtevani izvirni HTML nizi')
  requireProof(lineupId===id&&/^[A-Z0-9]{32}$/.test(lineupId??''),'manjka vezana identiteta zajema postave')
  lineupProof(lineupHtml)
  const tags=liveTags(mainHtml),virUrl=sourceUrl(tags,id)
  const z=razberiZapisnik(mainHtml,lineupHtml,{fonts,id,lineupId}),raw=events(mainHtml,tags)
  associate(z,raw)
  resultProof(mainHtml,z,raw,tags)
  const nastopi=appearances(z,raw)
  const dogodki=raw.map(({refs,...proof})=>({...proof,virId:refs[0]??null,virIds:refs,zapisnikId:z.zapisnikId,virUrl}))
  const nepripisaniRumeni=dogodki.filter(e=>e.vrsta==='rumeni'&&e.virId===null)
  if(dogodki.some(e=>['rumeni','rdeci'].includes(e.vrsta)&&e.virId!==null))for(const [key,type]of [['rumeni','rumeni'],['rdeci','rdeci']])z[key]=dogodki.filter(e=>e.vrsta===type&&e.virId!==null).map(e=>{const p=nastopi.find(p=>p.virId===e.virId);return {...e,ime:p.ime,ekipa:p.ekipa,st:p.st,regSt:null}})
  const opozorila=[`${nepripisaniRumeni.length} nepripisanih običajnih rumenih: vir ne objavi prejemnikov; ni ugibanih odbitkov. Statistika je potrjena samo za ta zapisnik; sezonski uvoz in vklop nista podprta.`]
  return {reportStatistikaPripravljena:true,sezonskiUvozPodprt:false,activationEligible:false,z,nastopi,nepripisaniRumeni,dogodki,opozorila}
 }catch(e){if(e instanceof ReportError)throw e;const failure=new ReportError(e.message,e.code==='FUSSBALL_REPORT_UNSUPPORTED'?e.code:'FUSSBALL_REPORT_INVALID');if(e.reason_code)Object.assign(failure,{reason_code:e.reason_code,dataHold:true});throw failure}
}
