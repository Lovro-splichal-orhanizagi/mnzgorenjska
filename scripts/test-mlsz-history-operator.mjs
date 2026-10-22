import test from'node:test'
import assert from'node:assert/strict'
import{execFileSync}from'node:child_process'
import{createHash}from'node:crypto'
import{verifyMlszReceipt}from'./mlsz-history-operator.mjs'
const sha='a'.repeat(40),hash=x=>createHash('sha256').update(x).digest('hex')
const body=JSON.stringify({schemaVersion:1,mode:'prepare',mainCommit:sha,data:{beforeSha256:'b'.repeat(64)}})
const bytes=execFileSync('python3',['-c',"import sys,zipfile,io; b=io.BytesIO(); z=zipfile.ZipFile(b,'w'); z.writestr('prepare.json',sys.stdin.read());z.close();sys.stdout.buffer.write(b.getvalue())"],{input:body})
const run={id:123,status:'completed',conclusion:'success',run_attempt:1,head_sha:sha,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/mlsz-reviewed-history.yml',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
const artifact={name:'mlsz-history-123',expired:false,size_in_bytes:bytes.length,digest:'sha256:'+hash(bytes),workflow_run:{id:123,head_sha:sha}}
test('MLSZ operator accepts only pinned first-attempt receipt bytes',()=>{assert.equal(verifyMlszReceipt({run,artifact,bytes,kind:'prepare',main:sha,approved:hash(body)}).mode,'prepare')})
test('MLSZ operator rejects run/attempt/main/receipt/archive drift before use',()=>{
 for(const patch of[{run:{...run,run_attempt:2}},{run:{...run,head_branch:'foreign'}},{run:{...run,conclusion:'failure'}},{artifact:{...artifact,digest:'sha256:'+'0'.repeat(64)}},{approved:'0'.repeat(64)},{kind:'preview'}])assert.throws(()=>verifyMlszReceipt({run,artifact,bytes,kind:'prepare',main:sha,approved:hash(body),...patch}))
})
