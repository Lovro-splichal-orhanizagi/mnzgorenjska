// Izolirane regresije pravic in rokov. Vsi podatki zivijo v transakciji,
// ki se vedno razveljavi; omreznih ali produkcijskih kljucev ne potrebujemo.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const sql = ['varnost.sql', 'claim-referral-priority.sql', 'klub-dodaja-igralce.sql', 'omejitve-uporabnikov.sql']
  .map((file) => readFileSync(new URL(`../supabase/tests/${file}`, import.meta.url), 'utf8'))
  .join('\n')
try {
  execFileSync('docker', [
    'exec', '-i', process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_mnzgorenjska',
    'psql', '-U', 'postgres', '-d', process.env.SUPABASE_TEST_DB ?? 'postgres',
    '-X', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
  execFileSync(process.execPath, [new URL('./test-claim-referral-race.mjs', import.meta.url).pathname], {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_DB_CONTAINER: process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_mnzgorenjska' },
  })
} catch {
  process.exitCode = 1
}
