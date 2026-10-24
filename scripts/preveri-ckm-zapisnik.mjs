#!/usr/bin/env node
// Local-only CKM evidence screen. No imports from runtime/database/transport modules.
import { readFileSync, statSync } from 'node:fs'
import { parseCkmReport } from './viri/ckm-report.mjs'

try {
  const args = process.argv.slice(2), values = new Map()
  if (args.length !== 4) throw new Error('uporaba: --datoteka <lokalni.html> --url <opazovani-naslov-tekme>')
  for (let i = 0; i < args.length; i += 2) {
    if (!['--datoteka', '--url'].includes(args[i]) || values.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('zahtevana sta enkratna --datoteka in --url')
    }
    values.set(args[i], args[i + 1])
  }
  if (!values.has('--datoteka') || !values.has('--url')) throw new Error('zahtevana sta --datoteka in --url')
  const file = values.get('--datoteka')
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(file)) throw new Error('--datoteka mora biti lokalna datoteka, ne URL')
  const stat = statSync(file)
  if (!stat.isFile() || stat.size > 2_000_000) throw new Error('zahtevana je lokalna datoteka, velika največ 2 MB')
  const result = parseCkmReport(readFileSync(file, 'utf8'), { url: values.get('--url') })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = result.reportStatistikaPripravljena ? 0 : 2
} catch (error) {
  process.stderr.write(`ckm: ${error.message}\n`)
  process.exitCode = 1
}
