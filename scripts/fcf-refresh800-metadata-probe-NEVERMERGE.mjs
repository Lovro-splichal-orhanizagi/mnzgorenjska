// NEVER MERGE. Only bounded own-repository GitHub metadata GETs; no source or database operation.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {assertFcfRefresh800JobGraph} from './fcf-refresh800-execution.mjs';
const names=['cache-export','missing-inventory-seed','missing-inventory-approval','missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt','target-approval','cleanup-originals','target-mapping','cleanup-prepare','cleanup-apply','target-import','target-price','target-check','target-activate','target-recover','future-target-approval','missing-inventory','refresh800-capture'];
const phase=process.argv[2],e=process.env;if(!['reserve','wait','capture'].includes(phase)||e.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.GITHUB_REF!=='refs/heads/codex/fcf-refresh800-metadata-probe-20261030'||e.GITHUB_RUN_ATTEMPT!=='1'||!/^\d+$/.test(e.GITHUB_RUN_ID)||!/^[a-f0-9]{40}$/.test(e.GITHUB_SHA))throw Error('fixed diagnostic execution only');
mkdirSync('fcf-metadata-probe',{recursive:true});
for(let sample=0;sample<12;sample++){
 const jobs=JSON.parse(execFileSync('gh',['api','--method','GET',`repos/Lovro-splichal-orhanizagi/mnzgorenjska/actions/runs/${e.GITHUB_RUN_ID}/attempts/1/jobs?per_page=100&page=1`],{encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}));
 if(!Array.isArray(jobs.jobs)||jobs.total_count!==jobs.jobs.length||jobs.jobs.length>100)throw Error('complete bounded own-job graph required');
 let accepted=false,reason=null;try{assertFcfRefresh800JobGraph({run:{id:Number(e.GITHUB_RUN_ID),head_sha:e.GITHUB_SHA},jobs:jobs.jobs,terminal:false,expectedJobNames:names,phase});accepted=true}catch(error){reason=error.message;if(!reason.startsWith('FCF_REFRESH800_EXECUTION: '))throw error}
 const result={phase,sample,observedUTC:new Date().toISOString(),accepted,reason,providerRequests:0,sourceAuthority:false,actualJobs:jobs};writeFileSync(`fcf-metadata-probe/${phase}-${String(sample).padStart(2,'0')}.json`,JSON.stringify(result)+'\n',{flag:'wx'});console.log(JSON.stringify({phase,sample,accepted,reason,providerRequests:0,sourceAuthority:false,steps:jobs.jobs.find(j=>j.name==='refresh800-capture')?.steps?.map(s=>({name:s.name,status:s.status,conclusion:s.conclusion}))}));
 if(accepted)break;if(sample<11)await new Promise(resolve=>setTimeout(resolve,10000));
}
