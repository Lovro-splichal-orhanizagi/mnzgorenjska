// Edge Function: trgovina-posta
//
// Mail kupcu trgovine (shop.slff.eu) v jeziku naročila (sl, en):
//
//   {"vrsta": "potrditev", "narocilo_id": <id>}  po plačilu (kliče stripe-webhook)
//   {"vrsta": "poslano", "narocilo_id": <id>}    po vnosu sledilne številke (kliče
//     admin iz /admin po trgovina_admin_poslano)
//
// Kliče le servis (Bearer servisni ključ) ali admin (Bearer <access_token>,
// preveri `is_admin`); anonimni klic dobi 403. Naročilo da
// `trgovina_narocilo_za_posto` (servis). Potrditev le za placano/poslano,
// odposlano le za poslano s sledilno številko. Mail gre v `email_log`
// (vrsta trgovina-potrditev, trgovina-poslano).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SMTP_HOST,
// SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_REPLY_TO (kot posli-opomnik),
// SHOP_URL (neobvezno, privzeto https://shop.slff.eu).
// Objava: scripts/hetzner/objavi-funkcije.sh trgovina-posta

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import nodemailer from 'npm:nodemailer@6.9.16'
import { type Narocilo, sestaviMail } from './sporocila.ts'

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
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

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

  const vhod = ((await req.json().catch(() => null)) ?? {}) as { vrsta?: string; narocilo_id?: number }
  const vrsta = vhod.vrsta
  if (vrsta !== 'potrditev' && vrsta !== 'poslano') return json({ error: 'vrsta: potrditev ali poslano.' }, 400)
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
  const sme = vrsta === 'poslano' ? n.stanje === 'poslano' && !!n.sledilna : ['placano', 'poslano'].includes(n.stanje)
  if (!sme) return json({ error: `Naročilo je v stanju ${n.stanje}.`, hint: 'trgovina-stanje' }, 400)

  const s = sestaviMail(vrsta, n, (Deno.env.get('SHOP_URL') ?? 'https://shop.slff.eu').replace(/\/$/, ''))
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
    napaka = String(e)
  }
  await service.from('email_log').insert({ user_id: n.user_id, email: n.email, vrsta: `trgovina-${vrsta}`, resend_id: id, napaka })
  if (napaka) {
    console.error('trgovina-posta: smtp', napaka)
    return json({ error: 'Mail ni odšel.' }, 502)
  }
  return json({ poslano: 1 })
})
