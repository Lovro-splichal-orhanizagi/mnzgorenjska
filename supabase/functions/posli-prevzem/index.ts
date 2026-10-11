// Edge Function: posli-prevzem
//
// Klubu sporoči, da je kdo prevzel profil njegovega igralca ("To sem jaz"),
// z enkratno povezavo za potrditev ali zavrnitev (`/claim#<žeton>`, velja 14
// dni). Komu in kateri zahtevki, odloči SQL `prevzem_za_posto_klubu`: naslov
// iz `klub_stik` (brez `ne_zeli` in `napacen_mail`), en mail na klub na dan,
// žeton v bazi le zgoščen. Vsak mail gre v `email_log` in `klub_stik_posta`
// (vrsta `drugo`), da ga vidijo vsi, ki pišejo klubom.
//
// Kliče ga le stroj (servisni ključ). URNIKA ŠE NI: preden ga vklopiš, se
// odloči, ali samodejni mail klubu velja kot stik po pravilih iz CLAUDE.md
// (Pošta klubom). Ročni zagon:
//   curl -X POST https://api.slff.eu/functions/v1/posli-prevzem \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -d '{"suho":true}'
//
// Skrivnosti so iste kot pri posli-opomnik (SMTP_HOST, SMTP_USER, SMTP_PASS,
// EMAIL_FROM); novih ni. Objava: scripts/hetzner/objavi-funkcije.sh posli-prevzem
//
// Jezik: slovenščina za slovenske klube, sicer angleščina. TODO: jezik
// države lige kot v posli-opomnik/sporocila.ts.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import nodemailer from 'npm:nodemailer@6.9.16'

interface Vrstica {
  zahtevek_id: number
  zeton: string
  email: string
  klub: string
  igralec: string
  liga_slug: string
  liga: string
  drzava: string | null
  prosilec: string | null
  expires_at: string
  klub_stik_id: number
}

const smtp = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'mail.slff.eu',
  port: 465,
  secure: true,
  auth: { user: Deno.env.get('SMTP_USER') ?? 'noreply@slff.eu', pass: Deno.env.get('SMTP_PASS') },
})

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function sestavi(v: Vrstica): { naslov: string; html: string; besedilo: string } {
  const povezava = `https://slff.eu/claim#${v.zeton}`
  const prosilec = v.prosilec ?? '?'
  const do = new Date(v.expires_at).toLocaleDateString(v.drzava === 'SI' ? 'sl-SI' : 'en-GB')
  if (v.drzava === 'SI') {
    const besedilo =
      `Pozdravljeni,\n\nuporabnik ${prosilec} na SLFF (slff.eu) trdi, da je igralec ${v.igralec} ` +
      `vašega kluba ${v.klub} (${v.liga}). Če ga poznate, prosimo, potrdite ali zavrnite:\n\n${povezava}\n\n` +
      `Povezava velja do ${do} in le enkrat. Potrjen igralec lahko na svojem profilu doda vzdevek, ` +
      `fotografijo in opis; uradnih podatkov iz zapisnikov ne more spreminjati.\n\nSLFF`
    return {
      naslov: `Je ${v.igralec} vaš igralec?`,
      besedilo,
      html:
        `<p>Pozdravljeni,</p><p>uporabnik <b>${esc(prosilec)}</b> na SLFF (slff.eu) trdi, da je igralec ` +
        `<b>${esc(v.igralec)}</b> vašega kluba ${esc(v.klub)} (${esc(v.liga)}).</p>` +
        `<p><a href="${povezava}">Potrdite ali zavrnite</a></p>` +
        `<p>Povezava velja do ${do} in le enkrat. Potrjen igralec lahko na svojem profilu doda vzdevek, ` +
        `fotografijo in opis; uradnih podatkov iz zapisnikov ne more spreminjati.</p><p>SLFF</p>`,
    }
  }
  const besedilo =
    `Hello,\n\nthe SLFF user ${prosilec} (slff.eu) says they are ${v.igralec}, a player of your club ` +
    `${v.klub} (${v.liga}). If you know them, please confirm or reject:\n\n${povezava}\n\n` +
    `The link is valid until ${do} and works once. A confirmed player can add a nickname, photo and short bio ` +
    `to their profile; official match report data cannot be changed.\n\nSLFF`
  return {
    naslov: `Is ${v.igralec} your player?`,
    besedilo,
    html:
      `<p>Hello,</p><p>the SLFF user <b>${esc(prosilec)}</b> (slff.eu) says they are <b>${esc(v.igralec)}</b>, ` +
      `a player of your club ${esc(v.klub)} (${esc(v.liga)}).</p>` +
      `<p><a href="${povezava}">Confirm or reject</a></p>` +
      `<p>The link is valid until ${do} and works once. A confirmed player can add a nickname, photo and short ` +
      `bio to their profile; official match report data cannot be changed.</p><p>SLFF</p>`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null)
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY')
  const auth = req.headers.get('Authorization') ?? ''
  if (![SERVICE_KEY, SECRET_KEY].filter(Boolean).some((k) => auth === `Bearer ${k}`))
    return json({ error: 'Samo servisni ključ.' }, 403)

  const vhod = (await req.json().catch(() => ({}))) as { suho?: boolean; najvec?: number }
  const service = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
  if (vhod.suho) {
    const { count, error } = await service
      .from('zahtevki_igralca')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cakajoc')
      .eq('spor', false)
    if (error) return json({ error: error.message }, 500)
    return json({ suho: true, cakajocih: count })
  }
  if (!Deno.env.get('SMTP_PASS')) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)

  // Žetoni nastanejo ob klicu; mail, ki ne uspe, pusti žeton neuporabljen
  // (zahtevek čaka naprej na poznavalca, soigralce ali admina).
  const { data, error } = await service.rpc('prevzem_za_posto_klubu', { p_najvec: vhod.najvec ?? 20 })
  if (error) return json({ error: error.message }, 500)
  const vrstice = (data ?? []) as Vrstica[]
  const FROM = Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>'
  let poslano = 0
  for (const v of vrstice) {
    const s = sestavi(v)
    let napaka: string | null = null
    let id: string | null = null
    try {
      const r = await smtp.sendMail({
        from: FROM,
        to: v.email,
        subject: s.naslov,
        html: s.html,
        text: s.besedilo,
        replyTo: Deno.env.get('EMAIL_REPLY_TO') || undefined,
      })
      id = r.messageId
      poslano++
    } catch (e) {
      napaka = String(e)
    }
    await service.from('email_log').insert({ email: v.email, vrsta: 'prevzem-klub', resend_id: id, napaka })
    if (!napaka)
      await service.from('klub_stik_posta').insert({
        stik_id: v.klub_stik_id,
        vrsta: 'drugo',
        zadeva: s.naslov,
        poslal: 'SLFF (samodejno, prevzem profila)',
        opomba: `zahtevek ${v.zahtevek_id}`,
        za: v.email,
        // Brez žetona: v bazi je le njegova zgoščena vrednost.
        telo: s.besedilo.replaceAll(v.zeton, '…'),
      })
  }
  return json({ kandidati: vrstice.length, poslano })
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
