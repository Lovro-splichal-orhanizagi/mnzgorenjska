// In-memory identity only; serialized flags never select the retry client.
export const FUSSBALL_V4_RETRY_POLICY=Object.freeze({id:'baden-v4-transient-v1',maximumAttempts:3})
const codes=new Set(['ETIMEDOUT','ENETUNREACH','ECONNRESET','EAI_AGAIN'])
const own=(o,k)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d&&Object.hasOwn(d,'value')?d.value:undefined}
export function fussballV4TransportFailure(error){
 if(!error||Object.getPrototypeOf(error)!==TypeError.prototype)return null
 const seen=new Set();let count=0
 const visit=(e,depth)=>{
  if(!(e instanceof Error)||seen.has(e)||depth>4||++count>8)throw Error('unsupported')
  seen.add(e)
  const prototype=Object.getPrototypeOf(e),name=prototype===AggregateError.prototype?'AggregateError':prototype===TypeError.prototype?'TypeError':prototype===Error.prototype?'Error':null
  if(!name)throw Error('unsupported')
  const code=own(e,'code'),cause=own(e,'cause'),errors=own(e,'errors')
  if(code!==undefined&&!codes.has(code))throw Error('unsupported')
  const node={name,...(code?{code}:{})}
  if(cause!==undefined)node.cause=visit(cause,depth+1)
  if(name==='AggregateError'){
   if(!Array.isArray(errors)||errors.length<1||errors.length>4)throw Error('unsupported')
   node.errors=errors.map(e=>visit(e,depth+1))
  }else if(errors!==undefined)throw Error('unsupported')
  if(!node.cause&&!node.errors&&!code)throw Error('untyped')
  return node
 }
 try{return {version:1,chain:visit(error,0)}}catch{return null}
}
export function restoreFussballV4TransportFailure(evidence){
 let count=0
 const restore=(n,depth)=>{
  if(!n||Object.getPrototypeOf(n)!==Object.prototype||depth>4||++count>8||!['TypeError','AggregateError','Error'].includes(n.name)||Object.keys(n).some(k=>!['name','code','cause','errors'].includes(k))||n.code!==undefined&&!codes.has(n.code))throw Error('invalid retry transport evidence')
  if(n.name==='AggregateError'&&(!Array.isArray(n.errors)||!n.errors.length||n.errors.length>4)||n.name!=='AggregateError'&&Object.hasOwn(n,'errors'))throw Error('invalid retry aggregate')
  const e=n.name==='AggregateError'?new AggregateError(n.errors.map(x=>restore(x,depth+1)),'connect failure'):n.name==='TypeError'?new TypeError('connect failure'):new Error('connect failure')
  if(n.code!==undefined)e.code=n.code
  if(n.cause!==undefined)e.cause=restore(n.cause,depth+1)
  return e
 }
 if(!evidence||Object.keys(evidence).sort().join(',')!=='chain,version'||evidence.version!==1||evidence.chain?.name!=='TypeError')throw Error('invalid retry evidence')
 const e=restore(evidence.chain,0)
 if(JSON.stringify(fussballV4TransportFailure(e))!==JSON.stringify(evidence))throw Error('noncanonical retry evidence')
 return e
}
