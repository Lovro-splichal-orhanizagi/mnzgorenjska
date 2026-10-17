// Public, versioned event evidence stored in matches.import_warnings.
export const UNATTRIBUTED_YELLOW_PREFIX='SLFF_UNATTRIBUTED_YELLOW_V1:'
const fields=['source','matchId','sourceUrl','side','clock','minute','reason','eventSha256','ordinal','profileId']
function valid(e){
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==fields.length||fields.some(k=>!Object.hasOwn(e,k)))return false
 if(e.source!=='dfb'||!/^de-dfb-\d{1,12}$/.test(e.matchId)||![0,1].includes(e.side)||!['unknown-role','player-coach'].includes(e.reason))return false
 if(typeof e.eventSha256!=='string'||!/[a-f0-9]{64}/.test(e.eventSha256)||e.eventSha256.length!==64||!Number.isInteger(e.ordinal)||e.ordinal<0||e.ordinal>1000)return false
 if(e.profileId!==null&&(typeof e.profileId!=='string'||!/^\d{1,12}$/.test(e.profileId)))return false
 const clock=typeof e.clock==='string'&&e.clock.match(/^(\d{1,2})(?:\+([1-9]|[12]\d|3\d)| ([1-9]|[12]\d|30))?'$/)
 if(!clock||+clock[1]>90||e.minute!==+clock[1])return false
 if(typeof e.sourceUrl!=='string'||e.sourceUrl.length>500)return false
 const url=e.sourceUrl.match(/^https:\/\/datencenter\.dfb\.de\/datencenter\/regionalliga-(?:nord|west|suedwest|bayern)\/\d{4}-\d{4}\/\d+(?:-spieltag)?\/[a-z0-9-]+-(\d+)$/)
 return !!url&&e.matchId===`de-dfb-${url[1]}`
}
export function encodeUnattributedYellow(event){
 if(!valid(event))throw new TypeError('Invalid unattributed-yellow evidence')
 const warning=UNATTRIBUTED_YELLOW_PREFIX+JSON.stringify(Object.fromEntries(fields.map(k=>[k,event[k]])))
 if(warning.length>2048)throw new TypeError('Unattributed-yellow evidence exceeds limit')
 return warning
}
export function parseUnattributedYellow(warning){
 if(typeof warning!=='string'||warning.length>2048||!warning.startsWith(UNATTRIBUTED_YELLOW_PREFIX))return null
 try{const e=JSON.parse(warning.slice(UNATTRIBUTED_YELLOW_PREFIX.length));return valid(e)?e:null}catch{return null}
}
export function unattributedYellowEvents(warnings){
 if(!Array.isArray(warnings))return []
 const seen=new Set(),events=[]
 for(const w of warnings){const e=parseUnattributedYellow(w);if(!e)continue;const key=encodeUnattributedYellow(e);if(!seen.has(key)){seen.add(key);events.push(e)}}
 return events
}
