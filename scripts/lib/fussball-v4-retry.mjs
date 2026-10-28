import {isNativeError,isProxy} from 'node:util/types'

// In-memory identity only; serialized flags never select the retry client.
export const FUSSBALL_V4_RETRY_POLICY=Object.freeze({id:'baden-v4-transient-v1',maximumAttempts:3})
const codes=new Set(['ETIMEDOUT','ENETUNREACH','ECONNRESET','EAI_AGAIN'])
const own=(o,k)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d&&Object.hasOwn(d,'value')?d.value:undefined}
const nativeAccessor=(d,name,source)=>d&&d.enumerable===false&&d.configurable===true&&d.set===undefined&&typeof d.get==='function'&&!isProxy(d.get)&&Object.getPrototypeOf(d.get)===Function.prototype&&own(d.get,'name')===name&&own(d.get,'length')===0&&Function.prototype.toString.call(d.get)===source
function transportErrorName(error){
 if(!isNativeError(error)||isProxy(error))return null
 const prototype=Object.getPrototypeOf(error)
 const exact=p=>p===AggregateError.prototype?'AggregateError':p===TypeError.prototype?'TypeError':p===Error.prototype?'Error':null
 const name=exact(prototype)
 if(name)return name
 if(!prototype||isProxy(prototype))return null
 const parentName=exact(Object.getPrototypeOf(prototype)),keys=Reflect.ownKeys(prototype)
 if(!parentName||keys.length<1||keys.length>2||!keys.includes('constructor'))return null
 // Node 22's transparent native error shims use these exact accessors. Inspect
 // descriptors/source only: never invoke constructor or marker getters. An
 // identical structural clone may canonicalize; this grants bounded typed
 // pre-response retries only, never source/native admission authority.
 if(!nativeAccessor(Object.getOwnPropertyDescriptor(prototype,'constructor'),'get constructor',`get ['constructor']() {\n    return ${parentName};\n  }`))return null
 if(keys.length===2){
  const marker=keys.find(k=>k!=='constructor')
  if(typeof marker!=='symbol'||marker.description!=='kIsNodeError'||Symbol.keyFor(marker)!==undefined||!nativeAccessor(Object.getOwnPropertyDescriptor(prototype,marker),'get [kIsNodeError]','get [kIsNodeError]() {\n    return true;\n  }'))return null
 }
 return parentName
}
export function fussballV4TransportFailure(error){
 if(!isNativeError(error)||isProxy(error)||Object.getPrototypeOf(error)!==TypeError.prototype)return null
 const seen=new Set();let count=0
 const visit=(e,depth)=>{
  if(!isNativeError(e)||isProxy(e)||seen.has(e)||depth>4||++count>8)throw Error('unsupported')
  seen.add(e)
  const name=transportErrorName(e)
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
