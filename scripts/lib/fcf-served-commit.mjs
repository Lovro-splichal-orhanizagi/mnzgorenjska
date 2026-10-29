// FCF-only conservative HTML marker check. No IO or source authority.
const whitespace=c=>/[\t\n\f\r ]/.test(c??'')
const rawText=new Set(['script','style','textarea','title','xmp','iframe','noembed','noframes','plaintext'])
const inert=new Set(['template','noscript','svg','math','select','frameset'])
function tagEnd(html,start){
 let quote=null
 for(let i=start;i<html.length;i++){
  const c=html[i]
  if(quote){if(c===quote)quote=null}
  else if(c==='"'||c==="'")quote=c
  else if(c==='>')return i
 }
 return -1
}
function token(html,start,end){
 let i=start+1,closing=false
 if(html[i]==='/'){closing=true;i++}
 const match=/^[a-z][a-z0-9:-]*/i.exec(html.slice(i,end));if(!match)return null
 const name=match[0].toLowerCase();i+=match[0].length
 if(closing)return html.slice(i,end).trim()===''?{name,closing,attributes:[]}:null
 if(i<end&&!whitespace(html[i])&&html[i]!=='/')return null
 const attributes=[]
 while(i<end){
  while(whitespace(html[i]))i++
  if(i===end)break
  if(html[i]==='/')return i+1===end?{name,closing,attributes}:null
  const begin=i
  while(i<end&&!/[\t\n\f\r =/>"'`<\x00]/.test(html[i]))i++
  if(i===begin)return null
  const attribute=html.slice(begin,i).toLowerCase();while(whitespace(html[i]))i++
  let value=null,quoted=false
  if(html[i]==='='){
   i++;while(whitespace(html[i]))i++
   const quote=html[i]
   if(quote==='"'||quote==="'"){
    quoted=true;const begin=++i;while(i<end&&html[i]!==quote)i++
    if(i===end)return null
    value=html.slice(begin,i++)
   }else{
    const begin=i;while(i<end&&!whitespace(html[i]))i++
    value=html.slice(begin,i);if(!value||/["'=<>`\x00]/.test(value))return null
   }
   if(i<end&&!whitespace(html[i])&&html[i]!=='/')return null
  }
  attributes.push({name:attribute,value,quoted})
 }
 return {name,closing,attributes}
}
export function matchesFcfServedCommit(html,expected){
 if(typeof html!=='string'||Buffer.byteLength(html)>1048576||typeof expected!=='string'||!/^[a-f0-9]{40}$/.test(expected))return false
 const markers=[],suppressed=[];let i=0
 while(i<html.length){
  const start=html.indexOf('<',i);if(start<0)break
  if(html.startsWith('<!--',start)){
   const end=html.indexOf('-->',start+4);if(end<0)return false
   i=end+3;continue
  }
  if(!/[a-z/!?]/i.test(html[start+1]??'')){i=start+1;continue}
  const end=tagEnd(html,start+1);if(end<0)return false
  i=end+1
  if(html[start+1]==='!'||html[start+1]==='?')continue
  const tag=token(html,start,end);if(!tag)return false
  if(tag.closing){
   const at=suppressed.lastIndexOf(tag.name)
   if(at>=0){if(at!==suppressed.length-1)return false;suppressed.pop()}
   continue
  }
  if(rawText.has(tag.name)){
   if(tag.name==='plaintext')break
   const close=new RegExp('</'+tag.name+'\\s*>','ig');close.lastIndex=i
   const match=close.exec(html);if(!match)return false
   i=close.lastIndex;continue
  }
  if(inert.has(tag.name)||tag.name.includes(':'))suppressed.push(tag.name)
  if(tag.name!=='meta'||suppressed.length)continue
  const names=tag.attributes.filter(a=>a.name==='name')
  if(!names.some(a=>a.value==='slff-commit'))continue
  const contents=tag.attributes.filter(a=>a.name==='content')
  markers.push(names.length===1&&contents.length===1&&names[0].quoted&&contents[0].quoted?contents[0].value:null)
 }
 return suppressed.length===0&&markers.length===1&&markers[0]===expected
}
