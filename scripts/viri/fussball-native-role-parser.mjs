// Native-only prototype: original source collector/parser and wire-v1 validator
// stay unchanged. A closed role extension binds the internal one-byte edits;
// the envelope's source bundle, revision and event keys use ORIGINAL bytes.
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './fussball-statistika.mjs'
import {buildFussballCardEnvelope,validateFussballCardEnvelope,replayFussballCardEnvelope} from './fussball-card-envelope.mjs'
import {normalizeFussballReport} from '../fussball-import.mjs'
const protocol='fussball-native-captain-keeper-v1',role='<div class="goal-keeper"><span class="k">T</span></div>',captain='<div class="captain"><span class="c">C</span></div>',sha=b=>createHash('sha256').update(b).digest('hex')
const need=(ok,s)=>{if(!ok)throw Object.assign(Error('fussball native role: '+s),{code:'FUSSBALL_NATIVE_ROLE_INVALID'})},plain=v=>v&&Object.getPrototypeOf(v)===Object.prototype
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const exact=(v,keys)=>plain(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',')
const rawText=new Set(['script','style','textarea','title','xmp','iframe','noembed','noframes','plaintext']),voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])
const inertTags=new Set(['template','svg','math','noscript','head']),space=c=>/[\t\n\f\r ]/.test(c??'')
// Tokenize attributes once, outside quoted values. A data-* name or a quoted
// class/href-looking string is never a class/href attribute.
function tagToken(open){
 let i=1,closing=false;if(open[i]==='/'){closing=true;i++}
 const name=open.slice(i).match(/^[A-Za-z][A-Za-z0-9:-]*/)?.[0];if(!name)return null;i+=name.length
 need(space(open[i])||open[i]==='>'||open.slice(i)==='/>','malformed tag name')
 const attributes=[];let selfClosing=false
 while(i<open.length){
  while(space(open[i]))i++
  if(open[i]==='>'){need(i===open.length-1,'trailing tag bytes');break}
  if(open.slice(i)==='/>'){selfClosing=true;break}
  need(!closing,'attributes on closing tag');const start=i
  while(i<open.length&&!space(open[i])&&!['=','/','>','"',"'",'<','`'].includes(open[i]))i++
  need(i>start,'malformed attribute name');const key=open.slice(start,i).toLowerCase();while(space(open[i]))i++
  let value=''
  if(open[i]==='='){
   i++;while(space(open[i]))i++
   const quote=open[i]
   if(quote==='"'||quote==="'"){const end=open.indexOf(quote,++i);need(end>=i,'unterminated attribute value');value=open.slice(i,end);i=end+1}
   else{const start=i;while(i<open.length&&!space(open[i])&&open[i]!=='>')i++;value=open.slice(start,i);need(value.length>0&&!/["'<=>`]/.test(value),'malformed unquoted attribute value')}
   need(space(open[i])||open[i]==='>'||open.slice(i)==='/>','unseparated attributes')
  }
  attributes.push({name:key,value})
 }
 return {tag:name.toLowerCase(),closing,selfClosing,attributes}
}
function inert(node){
 for(let n=node;n;n=n.parent)if(inertTags.has(n.tag)||n.tag.includes(':')||n.attributes.some(a=>a.name==='xmlns'||a.name.startsWith('xmlns:')))return true
 return false
}
/** Keep offsets in original text. Comments/rawtext never form live nodes. No
 * browser correction or inferred wrappers are accepted for the witnessed role. */
function liveNodes(html){
 const nodes=[],stack=[];let i=0
 while(i<html.length){
  const start=html.indexOf('<',i);if(start<0)break
  if(html.startsWith('<!--',start)){const end=html.indexOf('-->',start+4);need(end>=0,'unterminated comment');i=end+3;continue}
  let end=start+1,quote=null
  for(;end<html.length;end++){const c=html[end];if(quote){if(c===quote)quote=null}else if(c==='"'||c==="'")quote=c;else if(c==='>')break}
  need(end<html.length,'unterminated tag');const open=html.slice(start,end+1),token=tagToken(open)
  i=end+1;if(!token)continue;const {tag,attributes}=token
  if(token.closing){const n=stack.pop();need(n&&n.tag===tag,'unbalanced live markup');n.end=i;continue}
  if(rawText.has(tag)){const close=new RegExp('</'+tag+'\\s*>','ig');close.lastIndex=i;const found=close.exec(html);need(found,'unterminated rawtext');i=close.lastIndex;continue}
  const node={tag,attributes,start,open,end:i,parent:stack.at(-1)};nodes.push(node)
  if(!voidTags.has(tag)&&!token.selfClosing)stack.push(node)
 }
 need(stack.length===0,'unbalanced live markup');return nodes
}
function normalizedLineup(html){
 if(typeof html!=='string'||!html.includes(role))return {html,proof:null}
 const nodes=liveNodes(html),targets=nodes.filter(n=>n.tag==='div'&&html.slice(n.start,n.end)===role),edits=[]
 for(const n of targets){
  const a=n.parent;if(a?.tag!=='a'||inert(a))continue
  const classes=a.attributes.filter(a=>a.name==='class'),hrefs=a.attributes.filter(a=>a.name==='href'),tokens=new Set((classes[0]?.value??'').split(/\s+/))
  if(classes.length!==1||hrefs.length!==1||!tokens.has('player-wrapper')||tokens.has('home')===tokens.has('away')||!hrefs[0].value.startsWith('https://www.fussball.de/spielerprofil/'))continue
  const siblings=nodes.filter(x=>x.parent===a),captains=siblings.filter(x=>html.slice(x.start,x.end)===captain)
  if(captains.length!==1)continue
  need(targets.filter(x=>x.parent===a).length===1,'duplicate live goalkeeper role')
  // A second c/T marker on this same player is ambiguous even though the old
  // parser's Boolean role flag would otherwise collapse it.
  need(!nodes.some(x=>x.tag==='span'&&x.start>a.start&&x.end<a.end&&html.slice(x.start,x.end)==='<span class="c">T</span>'),'conflicting existing goalkeeper marker')
  edits.push(n.start+role.indexOf('<span class="k">')+'<span class="'.length)
 }
 if(!edits.length)return {html,proof:null}
 const chars=html.split('');for(const offset of edits){need(chars[offset]==='k','exact role class byte required');chars[offset]='c'}
 const normalized=chars.join('');need(Buffer.byteLength(normalized)===Buffer.byteLength(html),'normalization changed source length')
 return {html:normalized,proof:{version:1,protocol,originalLineupSha256:sha(html),normalizedLineupSha256:sha(normalized),replacementOffsets:edits.map(i=>Buffer.byteLength(html.slice(0,i)))}}
}
/** Pure original-byte role DATA only. No report parse, clock, IO or capability. */
export function inspectFussballNativeRoleEvidence(lineupHtml){
 need(typeof lineupHtml==='string'&&Buffer.byteLength(lineupHtml)<=8*1024*1024,'bounded original lineup text required')
 return structuredClone(normalizedLineup(lineupHtml).proof)
}
export function razberiNativeFantasyZapisnik(mainHtml,lineupHtml,options={}){
 need(plain(options)&&Object.keys(options).every(k=>['fonts','id','lineupId','cardPolicy','season','cardRecipients'].includes(k)),'closed fixed parser options required')
 const normalized=normalizedLineup(lineupHtml),result=razberiFantasyZapisnik(mainHtml,normalized.html,options)
 if(!normalized.proof)return result
 need(options.cardPolicy==='community-v1'&&result.cardEnvelope,'explicit native community envelope required')
 const sourceUrl=result.cardEnvelope.sourceUrl
 result.cardEnvelope={...buildFussballCardEnvelope(mainHtml,lineupHtml,{fonts:options.fonts,id:options.id,season:options.season,result,sourceUrl}),nativeRoleParser:normalized.proof}
 return result
}
/** No success flag, injected parser or clock. Source authenticity is a later
 * private hosted-boundary duty; this validator proves original-byte semantics. */
export function validateFussballNativeRoleEnvelope(envelope){
 if(!Object.hasOwn(envelope??{},'nativeRoleParser'))return validateFussballCardEnvelope(envelope)
 const e=envelope,p=e.nativeRoleParser,b=e.bundle
 need(e.version===1&&exact(p,['version','protocol','originalLineupSha256','normalizedLineupSha256','replacementOffsets'])&&p.version===1&&p.protocol===protocol&&Array.isArray(p.replacementOffsets)&&p.replacementOffsets.length>0&&p.replacementOffsets.length<=80&&p.replacementOffsets.every((v,i)=>Number.isSafeInteger(v)&&v>=0&&(!i||v>p.replacementOffsets[i-1])),'closed native role protocol required')
 need(b&&Array.isArray(b.fonts)&&b.fonts.length<=128,'bounded original bundle required');let total=0
 const unpack=r=>{need(r&&typeof r.base64==='string'&&r.base64.length<=Math.ceil(8*1024*1024/3)*4&&/^[a-f0-9]{64}$/.test(r.sha256??''),'bounded original row required');const bytes=Buffer.from(r.base64,'base64');total+=bytes.length;need(bytes.toString('base64')===r.base64&&sha(bytes)===r.sha256&&total<=8*1024*1024,'original source bytes/hash differ');return bytes}
 const report=unpack(b.report),lineup=unpack(b.lineup),fonts=Object.create(null)
 for(const f of b.fonts){need(/^[a-z0-9]{8}$/.test(f.fontId??'')&&!fonts[f.fontId],'unique observed fonts required');fonts[f.fontId]={bytes:unpack(f),sha256:f.sha256}}
 const decoder=new TextDecoder('utf-8',{fatal:true}),mainHtml=decoder.decode(report),lineupHtml=decoder.decode(lineup),result=razberiNativeFantasyZapisnik(mainHtml,lineupHtml,{fonts,id:e.matchId,lineupId:e.matchId,season:e.season,cardPolicy:'community-v1'})
 need(canonical(result.cardEnvelope)===canonical(e),'whole native envelope differs from original bytes')
 return {cardEnvelope:result.cardEnvelope,result,mainHtml,lineupHtml,fonts}
}
export function replayFussballNativeRoleEnvelope(envelope,resolutions={}){
 if(!Object.hasOwn(envelope??{},'nativeRoleParser'))return replayFussballCardEnvelope(envelope,resolutions)
 const verified=validateFussballNativeRoleEnvelope(envelope),e=verified.cardEnvelope;need(plain(resolutions),'recipient resolution object required');const recipients={}
 for(const [eventKey,sourceId]of Object.entries(resolutions)){const card=e.cards.find(c=>c.eventKey===eventKey),p=e.roster.find(p=>p.sourceId===sourceId);need(card&&card.officialSourceId===null&&p&&p.side===card.side,'unknown/official event or invalid same-side recipient');recipients[card.ordinal]=sourceId}
 const result=razberiNativeFantasyZapisnik(verified.mainHtml,verified.lineupHtml,{id:e.matchId,lineupId:e.matchId,fonts:verified.fonts,season:e.season,cardPolicy:'community-v1',cardRecipients:recipients});need(!result.statisticsPending,'unresolved red recipients remain pending')
 const fixture={id:e.matchId,zapisnikId:e.reportId,url:e.sourceUrl,krog:e.round,datum:e.date,ura:e.time,domaci:e.homeName,gostje:e.awayName,rezultat:e.score}
 return normalizeFussballReport({fixture,result},fixture,e.season)
}
