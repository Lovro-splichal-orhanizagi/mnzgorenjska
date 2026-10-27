// CLI-only metadata, never source evidence, a network classification or admission.
// Read only data descriptors: messages, stacks, addresses and custom getters are
// deliberately ignored. Bounds apply to depth, nodes, aggregate fanout and output.
const names=new Set(['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','EvalError','AggregateError','AbortError','TimeoutError','SystemError','UndiciError','ConnectTimeoutError','HeadersTimeoutError','BodyTimeoutError','SocketError','RequestAbortedError','ClientClosedError','ClientDestroyedError'])
const codes=new Set(['ECONNRESET','ECONNREFUSED','ECONNABORTED','ENOTFOUND','EAI_AGAIN','EAI_FAIL','ETIMEDOUT','EHOSTUNREACH','ENETUNREACH','EPIPE','EADDRNOTAVAIL','ESOCKETTIMEDOUT','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_SSL_WRONG_VERSION_NUMBER','ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION','ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET','UND_ERR_ABORTED','UND_ERR_DESTROYED','UND_ERR_CLOSED','UND_ERR_REQ_CONTENT_LENGTH_MISMATCH','UND_ERR_RES_CONTENT_LENGTH_MISMATCH','UND_ERR_RES_EXCEEDED_MAX_SIZE','HPE_HEADER_OVERFLOW','Z_DATA_ERROR'])
const domName=typeof DOMException==='function'?Object.getOwnPropertyDescriptor(DOMException.prototype,'name')?.get:null
const array=value=>{try{return Array.isArray(value)}catch{return false}}
const object=x=>x!==null&&(typeof x==='object'||typeof x==='function')
function data(value,key,inherited=false){
 try{
  for(let depth=0;object(value)&&depth<(inherited?5:1);depth++,value=Object.getPrototypeOf(value)){
   const d=Object.getOwnPropertyDescriptor(value,key)
   if(d)return Object.hasOwn(d,'value')?d.value:undefined
  }
 }catch{}
}
export function formatFussballErrorDiagnostic(error){
 const seen=new WeakSet(),errors=[];let visited=0,truncated=false
 const visit=(value,depth)=>{
  if(!object(value)||seen.has(value))return
  if(depth>4||visited>=8){truncated=true;return}
  seen.add(value);visited++
  const item={};let name=data(value,'name',true)
  // Invoke only the native branded DOMException getter, never a caller getter.
  if(name===undefined&&domName){try{name=domName.call(value)}catch{}}
  if(names.has(name))item.name=name
  for(const key of ['code','errno']){const code=data(value,key);if(codes.has(code))item[key]=code}
  if(Object.keys(item).length)errors.push(item)
  visit(data(value,'cause'),depth+1)
  const aggregate=data(value,'errors')
  if(array(aggregate)){
   const length=data(aggregate,'length')
   if(Number.isSafeInteger(length)&&length>=0){
    if(length>8)truncated=true
    for(let i=0;i<Math.min(length,8);i++)visit(data(aggregate,String(i)),depth+1)
   }
  }
 }
 visit(error,0)
 if(!errors.length)return null
 // Eight bounded records from fixed string allowlists keep this below2048 chars.
 return 'fussball error diagnostic metadata: '+JSON.stringify({version:1,errors,truncated})
}
