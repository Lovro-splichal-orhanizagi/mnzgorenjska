// Literal FCF public navigation only. Conservative scanner copied from the
// reviewed native lexical boundary; no browser correction/entity URL guessing.
const need=(v,m)=>{if(!v)throw Error('FCF_G9_LINKS_HOLD: '+m)}
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
  const foreign=tag==='svg'||tag==='math'||stack.some(n=>n.tag==='svg'||n.tag==='math')
  need(!token.selfClosing||voidTags.has(tag)||foreign,'self-closing nonvoid HTML tag')
  if(rawText.has(tag)&&!token.selfClosing){const close=new RegExp('</'+tag+'\\s*>','ig');close.lastIndex=i;const found=close.exec(html);need(found,'unterminated rawtext');i=close.lastIndex;continue}
  const node={tag,attributes,start,open,end:i,parent:stack.at(-1)};nodes.push(node)
  if(!voidTags.has(tag)&&!token.selfClosing)stack.push(node)
 }
 need(stack.length===0,'unbalanced live markup');return nodes
}

export function fcfG9CalendarObservedLinks(bytes,location=null){
 need(Buffer.isBuffer(bytes)&&bytes.length<=2*1024*1024,'bounded original entity required')
 const out=new Set(),accept=v=>{if(typeof v!=='string'||v.length>2048||/[\x00-\x20\x7f%\\#]/.test(v)||/&(?:[a-z]+|#\d+|#x[a-f0-9]+);/i.test(v))return;const absolute=v.startsWith('/ca/competicio/')?'https://www.fcf.cat'+v:v;if(!absolute.startsWith('https://www.fcf.cat/ca/competicio/'))return;try{const u=new URL(absolute);if(u.origin==='https://www.fcf.cat'&&u.href===absolute&&u.pathname.startsWith('/ca/competicio/')&&!/\/(?:api|_next)(?:\/|$)/i.test(u.pathname))out.add(absolute)}catch{}}
 if(location!==null)accept(location)
 for(const n of liveNodes(new TextDecoder('utf8',{fatal:true}).decode(bytes)))if(n.tag==='a'&&!inert(n)){const attrs=n.attributes.filter(a=>a.name==='href');if(attrs.length===1)accept(attrs[0].value)}
 return [...out].sort()
}
