import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container)throw Error('Set SUPABASE_DB_CONTAINER to an explicitly disposable migrated database')
for(const [slug,clubs,rounds]of[['de-regionalliga-nord',18,34],['de-regionalliga-bayern',19,38]])try{execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1','-v',`regional_slug=${slug}`,'-v',`current_clubs=${clubs}`,'-v',`current_rounds=${rounds}`],{input:readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8'),stdio:['pipe','inherit','inherit']})}catch{process.exitCode=1}
