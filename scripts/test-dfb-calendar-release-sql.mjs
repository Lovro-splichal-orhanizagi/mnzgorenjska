// Explicit owned disposable database only; every fixture mutation rolls back.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {calendar} from './dfb-calendar-test-fixture.mjs'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
if(!container||!db)throw Error('Explicit disposable container AND database required')
const run=sql=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1','-v','regional_slug=de-regionalliga-nord','-v','current_clubs=18','-v','current_rounds=34'],{input:sql,stdio:['pipe','inherit','inherit']})
const receipt=JSON.parse(readFileSync(new URL('./viri/dfb-calendar-receipts.json',import.meta.url))),receiptSha256='e5940813944dced7845c3e6ca1eb87868ff4e241b82e24676e3f3aa1569c97b3'
for(const season of receipt.seasons){
 const fixtures=season.pairs.flatMap(p=>p.fixtures.map(({witnesses,...f})=>({...f,id:'de-dfb-'+f.id,calendarEvidence:{version:1,receiptSha256,code:season.code,fixture:f,witnesses:witnesses.map((w,i)=>({club:w.club,url:w.url,sha256:(i?'b':'a').repeat(64)}))}})))
 const m={version:4,provenanceVersion:1,calendarReceiptSha256:receiptSha256,slug:'de-'+season.code.split('/')[0],seasons:[{season:'2026/27',code:season.code,fixtures}]}
 const encoded=x=>Buffer.from(JSON.stringify(x)).toString('base64'),invoke=x=>`perform private_dfb_release.validate_calendar_v4(convert_from(decode('${encoded(x)}','base64'),'UTF8')::jsonb);`
 let sql='begin;\ndo $$begin '+invoke(m)+' end$$;\n'
 for(const change of [x=>x.calendarReceiptSha256='0'.repeat(64),x=>x.slug='de-regionalliga-bayern',x=>x.seasons[0].fixtures[0].round++,x=>x.seasons[0].fixtures[0].homeSourceClubId='wrong',x=>delete x.seasons[0].fixtures[0].calendarEvidence,x=>x.seasons[0].fixtures[0].calendarEvidence.witnesses[1]=x.seasons[0].fixtures[0].calendarEvidence.witnesses[0],x=>x.seasons[0].fixtures[0].calendarEvidence.witnesses[0].url+='?x',x=>x.seasons[0].fixtures[0].calendarEvidence.witnesses[0].sha256='bad',x=>x.seasons[0].fixtures[0].calendarEvidence.extra=true,x=>x.seasons[0].fixtures[0].id='de-dfb-9999999',x=>x.seasons[0].fixtures.pop(),x=>x.provenanceVersion=2]){
  const bad=structuredClone(m);change(bad)
  sql+=`do $$begin begin ${invoke(bad)} exception when others then if sqlerrm like 'DE_RELEASE:%'then return;end if;raise;end;raise exception 'Unexpected accepted calendar mutation';end$$;\n`
 }
 const replay=structuredClone(m);replay.provenanceVersion=2
 const section=replay.seasons[0],capturedAt=new Date().toISOString()
 Object.assign(section,{runId:'12345',jobId:'6789',documentsSha256:'c'.repeat(64),capturedAt})
 const execution={workflowSha256:'e'.repeat(64),parserSha256:'f'.repeat(64),artifactId:'33333',artifactDigest:'sha256:'+'a'.repeat(64)}
 replay.sourceCommit='a'.repeat(40);replay.parserSha256='b'.repeat(64)
 section.lineage={capture:{...execution,runId:'11111',jobId:'22222',commit:'d'.repeat(40),workflow:'.github/workflows/preveri-dfb-ligo.yml',step:'Tekoča sezona — brez baze',conclusion:'failure',indexSha256:'b'.repeat(64),documentsSha256:section.documentsSha256,capturedAt},replay:{...execution,runId:section.runId,jobId:section.jobId,commit:replay.sourceCommit,parserSha256:replay.parserSha256,workflow:'.github/workflows/ponovi-dfb-regijo.yml',step:'Ponovi sezono — brez omrežja in baze',generatedAt:capturedAt}}
 sql+='do $$begin '+invoke(replay)+' end$$;\n'
 run(sql+'rollback;')
}
if(process.argv.includes('--authority-only'))process.exit(0)
// The full persisted fixture must also traverse the anomalous calendar branch.
const season=calendar('nord'),names=[...new Set(season.fixtures.flatMap(f=>[f.home,f.away]))],q=x=>"'"+x.replaceAll("'","''")+"'"
const calendarRows=season.fixtures.map((f,i)=>`(1,${f.round},${i%9},${-927000-i},${q('de-dfb-'+f.id)},${names.indexOf(f.home)},${names.indexOf(f.away)},${f.round<=2})`).join(',')
const proofs=Object.fromEntries(season.fixtures.filter(f=>f.calendarEvidence).map(f=>['de-dfb-'+f.id,{homeSourceClubId:f.homeSourceClubId,awaySourceClubId:f.awaySourceClubId,calendarEvidence:f.calendarEvidence}]))
const proofJson=JSON.stringify(proofs)
// Reuse all existing persisted statistics/readiness/deadline mutations on v4.
let fixture=readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8')
fixture=fixture.replace('insert into teams(id,name,short_name,country_id)',names.map((name,i)=>`update de_clubs set name=${q(name)}where n=${i};`).join('\n')+'\ninsert into teams(id,name,short_name,country_id)')
fixture=fixture.replace('insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)',`delete from de_fixtures where s=1;insert into de_fixtures values ${calendarRows};\ninsert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)`)
fixture=fixture.replace('create function pg_temp.de_check(',`update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures}',(select jsonb_agg(f||coalesce(($proof$${proofJson}$proof$::jsonb)->(f->>'id'),'{}'::jsonb)order by (f->>'round')::int,f->>'id')from jsonb_array_elements(raw::jsonb#>'{seasons,1,fixtures}')f))::text;\ncreate function pg_temp.de_check(`)
fixture=fixture.replace('create function pg_temp.de_check(',`update de_manifest set raw=(raw::jsonb||jsonb_build_object('version',4,'provenanceVersion',1,'calendarReceiptSha256','${receiptSha256}'))::text;\ncreate function pg_temp.de_check(`)
run(fixture)
