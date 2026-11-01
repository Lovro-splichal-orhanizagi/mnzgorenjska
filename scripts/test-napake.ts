// Preizkus čiščenja dogodkov napak (SLF-245, docs/napake.md): npm run test:napake
// Nobena skrivnost ali osebni podatek iz spodnjega dogodka ne sme preživeti.
import assert from 'node:assert/strict'
import { pocisti, pocistiDogodek } from '../supabase/functions/_shared/napake-cistilo.ts'

const SKRIVNO = [
  'janez.novak@example.com', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123', 'sb_secret_AbC123xyz',
  'sk_live_51Hxyz', 'whsec_abc123', 'token_hash=pkce_9f8e7d', 'abc123refresh', '193.2.1.66',
  '+386 41 234 567', '0e1f2a3b-4c5d-6e7f-8091-a2b3c4d5e6f7', 'geslo123', 'sejni-piskotek', 'tajna-koda',
]

const dogodek = {
  message: 'Napaka za janez.novak@example.com pri https://slff.eu/auth/confirm?token_hash=pkce_9f8e7d&type=signup',
  user: { id: '0e1f2a3b-4c5d-6e7f-8091-a2b3c4d5e6f7', email: 'janez.novak@example.com', ip_address: '193.2.1.66' },
  request: {
    url: 'https://slff.eu/novo-geslo#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123&refresh_token=abc123refresh',
    headers: { Authorization: 'Bearer sb_secret_AbC123xyz', Cookie: 'sejni-piskotek' },
    cookies: { sb: 'sejni-piskotek' },
    query_string: 'code=tajna-koda',
    data: { password: 'geslo123' },
  },
  exception: { values: [{ type: 'TypeError', value: 'klic 193.2.1.66 s ključem sk_live_51Hxyz, whsec_abc123, telefon +386 41 234 567', stacktrace: { frames: [{ filename: 'https://slff.eu/assets/index-abc.js', lineno: 10 }] } }] },
  breadcrumbs: [{ category: 'fetch', data: { url: '/rest/v1/profiles?id=eq.0e1f2a3b-4c5d-6e7f-8091-a2b3c4d5e6f7&apikey=sb_secret_AbC123xyz' } }],
  extra: { apikey: 'sb_secret_AbC123xyz', opomba: 'Bearer abc123refresh' },
  release: '0b528f3c', timestamp: 1798800000,
}

const cist = pocistiDogodek(dogodek)
const besedilo = JSON.stringify(cist)
for (const s of SKRIVNO) assert.ok(!besedilo.includes(s), `ostalo: ${s}\n${besedilo}`)
assert.equal(cist.user, undefined)
assert.deepEqual(Object.keys(cist.request ?? {}), ['url'])
assert.equal(cist.request?.url, 'https://slff.eu/novo-geslo')
assert.equal(cist.exception.values[0].type, 'TypeError')
assert.equal(cist.exception.values[0].stacktrace.frames[0].lineno, 10)
assert.equal(cist.breadcrumbs[0].data.url, '/rest/v1/profiles')
assert.equal(cist.release, '0b528f3c')
// Datumi, različice in imena ostanejo berljivi.
assert.equal(pocisti('krog 2026-11-01, različica 11.10.0, igralec Šenčur'), 'krog 2026-11-01, različica 11.10.0, igralec Šenčur')
console.log('napake: čiščenje OK')
