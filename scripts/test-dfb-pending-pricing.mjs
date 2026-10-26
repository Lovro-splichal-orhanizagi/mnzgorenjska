import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'

async function weekly({pending = [], rpcError = false, source = 'dfb', active = true, write = true} = {}) {
  const requests = []
  const competition = {id:7, slug:'de-regionalliga-nordost', name:'Test', active, source, source_league_code:'regionalliga-nordost/2026-2027', country_id:1}
  const server = createServer(async (req,res) => {
    const chunks=[]; for await (const chunk of req) chunks.push(chunk)
    requests.push({method:req.method, path:new URL(req.url,'http://test').pathname, body:Buffer.concat(chunks).toString()})
    res.setHeader('Content-Type','application/json')
    if(req.url.startsWith('/rest/v1/rpc/get_dfb_pending_reports')) {
      res.statusCode = rpcError ? 500 : 200
      res.end(JSON.stringify(rpcError ? {message:'pending inventory unavailable'} : pending)); return
    }
    if(req.url.startsWith('/rest/v1/competitions')) {res.end(JSON.stringify(competition));return}
    // Reaching players proves the gate allowed ordinary pricing to proceed.
    res.end('[]')
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {
    const args=[new URL('./ovrednoti-igralce.mjs',import.meta.url).pathname,'--tekmovanje',competition.slug,'--tedensko',...(write?['--pisi']:[])]
    const child=spawn(process.execPath,args,{env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${server.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'test'},stdio:['ignore','pipe','pipe']})
    let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b)
    const timer=setTimeout(()=>child.kill(),15000)
    const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)})
    clearTimeout(timer)
    return {code,output,requests}
  } finally {await new Promise(resolve=>server.close(resolve))}
}

test('actual weekly pricing defers a pending DFB league before reading provisional statistics or writing prices',async()=>{
  const r=await weekly({pending:[{report_id:'de-dfb-123'}]})
  assert.equal(r.code,0,r.output)
  assert.match(r.output,/DFB.*pending.*1/i)
  assert.deepEqual(r.requests.filter(x=>!x.path.endsWith('/competitions')).map(x=>x.path),['/rest/v1/rpc/get_dfb_pending_reports'])
  assert.deepEqual(JSON.parse(r.requests.at(-1).body),{p_competition_id:7,p_code:'regionalliga-nordost/2026-2027'})
})
for(const args of [{rpcError:true},{pending:null},{pending:{report_id:'de-dfb-123'}}]) {
  test('pending pricing inventory fails closed: '+JSON.stringify(args),async()=>{
    const r=await weekly(args)
    assert.notEqual(r.code,0,r.output)
    assert.ok(!r.requests.some(x=>x.path.endsWith('/players')))
  })
}
for(const args of [{},{source:'test'},{active:false},{write:false}]) {
  test('ordinary pricing proceeds when clear or outside automatic active DFB writes: '+JSON.stringify(args),async()=>{
    const r=await weekly(args)
    assert.equal(r.code,0,r.output)
    assert.ok(r.requests.some(x=>x.path.endsWith('/players')),r.output)
    assert.equal(r.requests.filter(x=>x.path.endsWith('/get_dfb_pending_reports')).length,Object.keys(args).length===0?1:0)
  })
}
