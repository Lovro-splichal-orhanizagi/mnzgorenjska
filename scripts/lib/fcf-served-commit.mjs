// FCF-only logical1MiB/single-marker check. No IO or source authority.
export function matchesFcfServedCommit(html,expected){
 if(typeof html!=='string'||Buffer.byteLength(html)>1048576||typeof expected!=='string'||!/^[a-f0-9]{40}$/.test(expected))return false
 const markers=[]
 for(const tag of html.matchAll(/<meta\b[^>]*>/gi)){
  const attributes=[...tag[0].matchAll(/([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map(m=>({name:m[1].toLowerCase(),value:m[2]??m[3]??m[4],quoted:m[4]===undefined})),names=attributes.filter(a=>a.name==='name')
  if(!names.some(a=>a.value==='slff-commit'))continue
  const contents=attributes.filter(a=>a.name==='content');markers.push(names.length===1&&contents.length===1&&names[0].quoted&&contents[0].quoted?contents[0].value:null)
 }
 return markers.length===1&&markers[0]===expected
}
