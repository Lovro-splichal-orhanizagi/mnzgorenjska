// Edge Function: trgovina-posta
//
// Mail kupcu trgovine (shop.slff.eu) v jeziku naročila (sl, en):
//
//   {"vrsta": "potrditev", "narocilo_id": <id>}  po plačilu (kliče stripe-webhook)
//   {"vrsta": "poslano", "narocilo_id": <id>}    po vnosu sledilne številke (kliče
//     admin iz /admin po trgovina_admin_poslano)
//   {"vrsta": "bon", "narocilo_id": <id>, "kode": [{"koda", "znesek", "velja_do"}]}
//     darilni boni (le servis: kode v čistopisu ima le stripe-webhook, baza hrani zgoščene)
//
// Kliče le servis (Bearer servisni ključ) ali admin (Bearer <access_token>,
// preveri `is_admin`); anonimni klic dobi 403. Naročilo da
// `trgovina_narocilo_za_posto` (servis). Potrditev in boni le za plačana (jePlacanoAktivno),
// odposlano le za poslano s sledilno številko. Mail gre v `email_log`
// (vrsta trgovina-potrditev, trgovina-poslano, trgovina-bon).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SMTP_HOST,
// SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_REPLY_TO (kot posli-opomnik),
// SHOP_URL (neobvezno, privzeto https://shop.slff.eu).
// Objava: scripts/hetzner/objavi-funkcije.sh trgovina-posta

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import nodemailer from 'npm:nodemailer@6.9.16'
import { type Bon, type Narocilo, sestaviMail } from './sporocila.ts'
import { jePlacanoAktivno } from '../_shared/trgovina-stanja.ts'
import { sledi } from '../_shared/napake.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const smtp = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'mail.slff.eu',
  port: 465,
  secure: true,
  auth: { user: Deno.env.get('SMTP_USER') ?? 'noreply@slff.eu', pass: Deno.env.get('SMTP_PASS') },
  // Webhook čaka 8 s: mail ne sme viseti dlje.
  connectionTimeout: 6000,
  greetingTimeout: 6000,
  socketTimeout: 6000,
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

sledi('trgovina-posta')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const URL_ = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const auth = req.headers.get('Authorization') ?? ''
  const jeStroj = [SERVICE_KEY, Deno.env.get('SUPABASE_SECRET_KEY')].filter(Boolean).some((k) => auth === `Bearer ${k}`)
  if (!jeStroj) {
    if (!auth) return json({ error: 'Samo administrator.' }, 403)
    const uporabnik = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: admin } = await uporabnik.rpc('is_admin')
    if (admin !== true) return json({ error: 'Samo administrator.' }, 403)
  }

  const vhod = ((await req.json().catch(() => null)) ?? {}) as { vrsta?: string; narocilo_id?: number; kode?: unknown }
  const vrsta = vhod.vrsta
  if (vrsta !== 'potrditev' && vrsta !== 'poslano' && vrsta !== 'bon') return json({ error: 'vrsta: potrditev, poslano ali bon.' }, 400)
  const kode = (Array.isArray(vhod.kode) ? vhod.kode : []) as Bon[]
  if (vrsta === 'bon') {
    if (!jeStroj) return json({ error: 'Samo servis.' }, 403)
    const ok = kode.length > 0 && kode.every((k) => typeof k?.koda === 'string' && Number.isInteger(k.znesek) && typeof k.velja_do === 'string')
    if (!ok) return json({ error: 'kode: [{koda, znesek, velja_do}].' }, 400)
  }
  if (!Number.isInteger(vhod.narocilo_id)) return json({ error: 'narocilo_id: številka naročila.' }, 400)
  if (!Deno.env.get('SMTP_PASS')) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)

  const service = createClient(URL_, SERVICE_KEY)
  const { data, error } = await service.rpc('trgovina_narocilo_za_posto', { p_id: vhod.narocilo_id })
  if (error) {
    console.error('trgovina-posta: naročilo', error)
    return json({ error: 'Naročila ni bilo mogoče prebrati.' }, 500)
  }
  const n = data as (Narocilo & { user_id: string | null }) | null
  if (!n?.email) return json({ error: 'Naročila ni ali nima e-naslova.' }, 400)
  const sme = vrsta === 'poslano' ? n.stanje === 'poslano' && !!n.sledilna : jePlacanoAktivno(n.stanje)
  if (!sme) return json({ error: `Naročilo je v stanju ${n.stanje}.`, hint: 'trgovina-stanje' }, 400)

  const s = sestaviMail(vrsta, n, (Deno.env.get('SHOP_URL') ?? 'https://shop.slff.eu').replace(/\/$/, ''), kode)
  let napaka: string | null = null
  let id: string | null = null
  try {
    const r = await smtp.sendMail({
      from: Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>',
      to: n.email,
      subject: s.naslov,
      html: s.html,
      text: s.besedilo,
      replyTo: Deno.env.get('EMAIL_REPLY_TO') || 'SLFF <info@slff.eu>',
    })
    id = r.messageId
  } catch (e) {
    // Le koda: besedilo napake SMTP lahko vsebuje naslov prejemnika.
    const x = e as { responseCode?: number; code?: string }
    napaka = `smtp ${x.responseCode ?? ''} ${x.code ?? ''}`.trim()
  }
  await service.from('email_log').insert({ user_id: n.user_id, email: n.email, vrsta: `trgovina-${vrsta}`, resend_id: id, napaka })
  if (napaka) {
    console.error('trgovina-posta: smtp', napaka)
    return json({ error: 'Mail ni odšel.' }, 502)
  }
  return json({ poslano: 1 })
})
