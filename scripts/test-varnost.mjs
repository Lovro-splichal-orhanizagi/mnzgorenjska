// Izolirane regresije pravic in rokov. Vsi podatki zivijo v transakciji,
// ki se vedno razveljavi; omreznih ali produkcijskih kljucev ne potrebujemo.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/tests/varnost.sql', import.meta.url), 'utf8')
try {
  execFileSync('docker', [
    'exec', '-i', process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_mnzgorenjska',
    'psql', '-U', 'postgres', '-d', process.env.SUPABASE_TEST_DB ?? 'postgres',
    '-X', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
} catch {
  process.exitCode = 1
}
