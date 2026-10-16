import test from 'node:test'
import assert from 'node:assert/strict'
import{ustvariAnonimniPrenos,jeJavniCookieGate}from'./viri/novanet-transport.mjs'
const gate='<html>\r\n<head>\r\n<title></title>\r\n</head>\r\n<body>\r\n<!--\r\n<h1>No se ha aceptado el cookie</h1>\r\n-->\r\n</body>\r\n</html>\r\n'
const url='https://www.futgal.es/pnfg/NPcd/NFG_CmpJornada?CodJornada=1'
test('only exact captured anonymous cookie gate is recognized',()=>{
 assert.equal(jeJavniCookieGate(gate),true)
 assert.equal(jeJavniCookieGate(gate.replace('</body>','<script>unknown()</script></body>')),false)
 assert.equal(jeJavniCookieGate('<h1>No se ha aceptado el cookie</h1>'),false)
})
test('public server-issued session cookie permits one retry and is reused per origin',async()=>{
 const calls=[]
 const fetchFn=async(u,o)=>{
  calls.push({u,cookie:new Headers(o.headers).get('cookie'),redirect:o.redirect})
  return calls.length===1?new Response(gate,{headers:{'set-cookie':'public_session=opaque-test; Path=/; HttpOnly; Secure'}}):new Response('valid page')
 }
 const read=ustvariAnonimniPrenos({fetchFn})
 assert.equal(await(await read(url)).text(),'valid page')
 await read(url)
 assert.equal(calls.length,3)
 assert.equal(calls[0].cookie,null)
 assert.equal(calls[1].cookie,'public_session=opaque-test')
 assert.equal(calls[2].cookie,'public_session=opaque-test')
 assert.ok(calls.every(c=>c.redirect==='manual'))
})
test('manual same-origin redirects capture intermediate cookies without cross-origin leak',async()=>{
 const calls=[]
 const read=ustvariAnonimniPrenos({fetchFn:async(u,o)=>{
  calls.push({u,cookie:new Headers(o.headers).get('cookie')})
  if(calls.length===1)return new Response(null,{status:302,headers:{location:'/pnfg/NPcd/final','set-cookie':'public_session=redirect-test; Path=/; Secure'}})
  return new Response('valid')
 }})
 assert.equal(await(await read(url)).text(),'valid')
 assert.equal(calls[1].cookie,'public_session=redirect-test')
 await read('https://www.futbolaragon.com/pnfg/NPcd/final')
 assert.equal(calls[2].cookie,null)
 const cross=ustvariAnonimniPrenos({fetchFn:async()=>new Response(null,{status:302,headers:{location:'https://elsewhere.example/'}})})
 await assert.rejects(cross(url),/same-origin|isti izvor/)
})
test('no issued cookie, repeated gate, challenges and denied statuses stop without another retry',async()=>{
 let calls=0
 const noCookie=ustvariAnonimniPrenos({fetchFn:async()=>{calls++;return new Response(gate)}})
 await assert.rejects(noCookie(url),/cookie|piškot/);assert.equal(calls,1)
 calls=0
 const repeated=ustvariAnonimniPrenos({fetchFn:async()=>{calls++;return new Response(gate,{headers:{'set-cookie':`public_session=test${calls}; Path=/`}})}})
 await assert.rejects(repeated(url),/cookie|piškot/);assert.equal(calls,2)
 for(const status of[401,403,429]){
  calls=0;const denied=ustvariAnonimniPrenos({fetchFn:async()=>{calls++;return new Response('denied',{status})}})
  await assert.rejects(denied(url),e=>e.zavrnitev&&e.status===status);assert.equal(calls,1)
 }
 calls=0;const challenge=ustvariAnonimniPrenos({jeIzziv:s=>s.includes('challenge-token'),fetchFn:async()=>{calls++;return new Response('challenge-token',{headers:{'set-cookie':'session=no-retry; Path=/'}})}})
 await assert.rejects(challenge(url),e=>e.zavrnitev);assert.equal(calls,1)
})
test('cookies respect path/domain/expiry and external user cookies are never imported',async()=>{
 let stage=0;const calls=[]
 const read=ustvariAnonimniPrenos({fetchFn:async(u,o)=>{
  calls.push(new Headers(o.headers).get('cookie'));stage++
  const headers=new Headers()
  if(stage===1){headers.append('set-cookie','scoped=test; Path=/only; Secure');headers.append('set-cookie','foreign=test; Domain=foreign.example; Path=/');headers.append('set-cookie','expired=test; Max-Age=0; Path=/')}
  return new Response('valid',{headers})
 }})
 await read(url,{headers:{cookie:'private_browser=must-not-import'}})
 await read(url)
 await read('https://www.futgal.es/only/page')
 assert.deepEqual(calls,[null,null,'scoped=test'])
})
test('redirects and response body size remain bounded',async()=>{
 let calls=0;const loop=ustvariAnonimniPrenos({maxPreusmeritev:2,fetchFn:async()=>{calls++;return new Response(null,{status:302,headers:{location:'/loop'}})}})
 await assert.rejects(loop(url),/preusmer|redirect/);assert.equal(calls,3)
 const large=ustvariAnonimniPrenos({najvecBajtov:4,fetchFn:async()=>new Response('12345')})
 await assert.rejects(large(url),/prevelik/)
})
test('source fetch bootstraps before charset decoding and preserves ISO text',async()=>{
 const {novanetFetch}=await import('./viri/novanet.mjs')
 const original=globalThis.fetch;let calls=0
 try{
  globalThis.fetch=async(u,o)=>{
   calls++
   if(calls===1)return new Response(gate,{headers:{'set-cookie':'public_transport_test=opaque; Path=/; Secure'}})
   assert.equal(new Headers(o.headers).get('cookie'),'public_transport_test=opaque')
   return new Response(new Uint8Array([0x3c,0x70,0x3e,0xf1,0x3c,0x2f,0x70,0x3e]),{headers:{'content-type':'text/html; charset=iso-8859-15'}})
  }
  assert.equal(await(await novanetFetch('https://transport-test.example/pnfg/')).text(),'<p>ñ</p>')
  assert.equal(calls,2)
 }finally{globalThis.fetch=original}
})
test('parent-domain cookies are accepted but remain bound to issuing origin',async()=>{
 const calls=[]
 const read=ustvariAnonimniPrenos({fetchFn:async(u,o)=>{
  calls.push(new Headers(o.headers).get('cookie'))
  return calls.length===1?new Response(gate,{headers:{'set-cookie':'public_parent=test; Domain=.futgal.es; Path=/; Secure'}}):new Response('valid')
 }})
 assert.equal(await(await read(url)).text(),'valid')
 await read('https://futgal.es/pnfg/other')
 assert.deepEqual(calls,[null,'public_parent=test',null])
})
test('errored denial bodies preserve explicit refusal and never enter shared retries',async()=>{
 const {prenesiSPonovitvami,pozabiPadle}=await import('./prenos.mjs')
 for(const status of[401,403,429]){
  let calls=0
  const transport=ustvariAnonimniPrenos({fetchFn:async()=>{
   calls++
   const stream=new ReadableStream({start(controller){controller.error(new TypeError('fetch failed',{cause:{code:'ECONNRESET'}}))}})
   return new Response(stream,{status})
  }})
  try{
   pozabiPadle()
   await assert.rejects(prenesiSPonovitvami(url,{fetchFn:transport,zamiki:[0],log:()=>{}}),e=>e.zavrnitev===true&&e.status===status)
   assert.equal(calls,1,`HTTP ${status} must never retry after failed body cancellation`)
  }finally{pozabiPadle()}
 }
})
