// Synthetic, rolled-back fixture. The production seed must be empty/inactive.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
try {
 execFileSync('docker',['exec','-i',process.env.SUPABASE_DB_CONTAINER??'supabase_db_mnzgorenjska','psql','-U','postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{
  input:readFileSync(new URL('../supabase/tests/vklop-nemcije.sql',import.meta.url),'utf8'),stdio:['pipe','inherit','inherit']})
}catch{process.exitCode=1}
