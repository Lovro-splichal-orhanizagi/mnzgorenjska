// Edge Function: posli-opomnik
//
// Poslje e-poštni opomnik uporabnikom, ki v izbrani ligi še nimajo veljavne
// fantasy ekipe. Kdo dobi mail, določi RPC admin_uporabniki v bazi — enak
// vir kot admin stran, da UI in server vidita isto sliko.
//
// Zahteva se dostopa preko admin računa (Authorization: Bearer <access_token>);
// funkcija to preveri z is_admin() klicem prek anon supabase klienta.
//
// Vsak poskus pošiljanja se zapiše v tabelo email_log — z ali brez napake.
// Tabela služi za dvoje: 1) da ne pošljemo istega opomnika dvakrat v 3 dneh
// (glej funkcijo nedavni_opomnik), 2) za sledenje in reševanje težav, če
// kdo reče "nisem dobil".
//
// Skrivnosti pridemo iz Supabase env: RESEND_API_KEY, EMAIL_FROM, in privzeto
// nastavljeni SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (dodeljena vsem edge
// funkcijam avtomatsko).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Zahteva {
  competition_id: number
  test_email?: string // če je nastavljen, gre samo test mail nanj (za preizkus)
  suho?: boolean // dry-run: samo prešteje, ne pošilja
  // 'opomnik'   — kdor ekipe še nima
  // 'opozorilo' — kdor ekipo IMA, a se ob roku ne bo zaklenila
  // 'poznavalec' — odobrena prosnja: enemu cloveku (user_id), samo admin
  vrsta?: 'opomnik' | 'opozorilo' | 'poznavalec'
  user_id?: string
  obseg?: 'klub' | 'liga'
  // Koliko dni pred rokom opozarjamo. Privzeto 2; nastavljivo, da se da
  // suho preveriti, koga bi zajelo sirse okno.
  dni?: number
}

interface Uporabnik {
  user_id: string
  email: string
  display_name: string | null
  team_id: number | null
  ekipa_veljavna: boolean
  // samo pri opozorilu
  team_name?: string | null
  round_id?: number | null
  round_number?: number | null
  deadline_at?: string | null
  razlog?: string | null
}

interface ResendOdgovor {
  id?: string
  message?: string
  name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')
    return json({ error: 'Samo POST.' }, 405)

  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Manjka Authorization.' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'SLFF <noreply@slff.eu>'

  // 1) Kdo kliče?
  //
  // Dve poti: človek (admin iz vmesnika) in stroj (urnik s service ključem).
  // Gumb v administraciji je delal, a ga je bilo treba pritisniti — zato je
  // zadnji opomnik odšel 3. septembra in nato nič. Urnik tega ne pozabi.
  //
  // Service ključ ima tako ali tako vse pravice, zato njegovo sprejemanje
  // ničesar ne odpira; primerjamo ga natanko, ne po predponi.
  //
  // Primerjati SAMO s `SUPABASE_SERVICE_ROLE_KEY` je premalo. Projekt ima dva
  // veljavna servisna ključa — starega (JWT `eyJ…`) in novega (`sb_secret_…`)
  // — okolje funkcije pa dobi le enega. Klic s tistim drugim je prišel do sem
  // in dobil "Samo administrator.", kar je zavajajoče: ključ je bil pravi,
  // le drugi od dveh. Zato sprejmemo oba znana zapisa.
  const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY')
  const strojniKljuci = [SERVICE_KEY, SECRET_KEY].filter(Boolean) as string[]
  const jeStroj = strojniKljuci.some((k) => auth === `Bearer ${k}`)
  const uporabnikov = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  })
  if (!jeStroj) {
    const { data: adminOk, error: adminErr } = await uporabnikov.rpc('is_admin')
    if (adminErr) return json({ error: adminErr.message }, 500)
    if (!adminOk) return json({ error: 'Samo administrator.' }, 403)
  }

  // 2) Parsiraj vhod.
  let vhod: Zahteva
  try {
    vhod = await req.json()
  } catch {
    return json({ error: 'Neveljaven JSON.' }, 400)
  }
  const { competition_id, test_email, suho } = vhod
  const vrsta = vhod.vrsta ?? 'opomnik'
  if (vrsta === 'opozorilo' && !jeStroj)
    return json(
      { error: 'Opozorilo poslje samo urnik (servisni kljuc).' },
      403,
    )
  if (!competition_id)
    return json({ error: 'Manjka competition_id.' }, 400)

  // Odobritev poznavalca: en mail enemu cloveku, klice ga admin ob odobritvi.
  // Redko (nekaj na teden), zato ne obremeni kvote.
  if (vrsta === 'poznavalec') {
    if (jeStroj) return json({ error: 'Poznavalca odobri clovek, ne urnik.' }, 403)
    if (!vhod.user_id) return json({ error: 'Manjka user_id.' }, 400)
    if (!RESEND_KEY) return json({ error: 'Pomanjkljiva nastavitev: RESEND_API_KEY.' }, 500)
    const service0 = createClient(SUPABASE_URL, SERVICE_KEY)
    const [{ data: u }, { data: pr }, { data: liga0 }] = await Promise.all([
      service0.auth.admin.getUserById(vhod.user_id),
      service0.from('profiles').select('display_name, insider_team_id').eq('id', vhod.user_id).maybeSingle(),
      service0.from('competitions').select('name').eq('id', competition_id).maybeSingle(),
    ])
    const email = u?.user?.email
    if (!email) return json({ error: 'Uporabnik nima e-naslova.' }, 404)
    let klub: string | null = null
    if (vhod.obseg === 'klub' && pr?.insider_team_id) {
      const { data: t } = await service0.from('teams').select('name').eq('id', pr.insider_team_id).maybeSingle()
      klub = t?.name ?? null
    }
    const rez = await posljiPoznavalcu(RESEND_KEY, EMAIL_FROM, email, {
      display_name: pr?.display_name ?? null,
      liga: liga0?.name ?? '',
      obseg: vhod.obseg ?? 'liga',
      klub,
    })
    await service0.from('email_log').insert({
      email,
      vrsta: 'poznavalec',
      competition_id,
      resend_id: rez.id ?? null,
      napaka: rez.napaka ?? null,
    })
    if (rez.napaka) return json({ error: rez.napaka }, 502)
    return json({ poslano: true, resend: rez })
  }

  // Ključ za pošto zahtevamo šele, kadar bomo res pošiljali. Suhi tek obstaja
  // prav zato, da se pred vklopom urnika preverijo številke — če bi padel na
  // manjkajočem ključu, bi bila varovalka neuporabna ravno takrat, ko je
  // najbolj potrebna.
  if (!RESEND_KEY && !suho)
    return json({ error: 'Pomanjkljiva nastavitev: RESEND_API_KEY.' }, 500)

  // Service role rabimo za pisanje v email_log in za branje nastavitev; za
  // seznam uporabnikov pa NE. `admin_uporabniki` je SECURITY DEFINER z
  // notranjim is_admin(), ta pa bere auth.uid() — pri service role ključu
  // uporabnika ni, zato je klic vedno padel s "Samo administrator lahko bere
  // uporabnike." in pošiljanje ni delovalo niti enkrat. Seznam beremo z
  // uporabnikovim tokenom; da je admin, smo preverili zgoraj.
  const service = createClient(SUPABASE_URL, SERVICE_KEY)

  // Podatek o ligi za predlogo
  const { data: liga } = await service
    .from('competitions')
    .select('slug, name, short_name')
    .eq('id', competition_id)
    .maybeSingle()
  const oznaka = liga?.short_name ?? ''

  // Test režim gre PRED branjem uporabnikov: testni gumb obstaja zato, da
  // preveri samo dostavo pošte, in ne sme pasti zaradi česa drugega.
  if (test_email) {
    if (!RESEND_KEY)
      return json({ error: 'Pomanjkljiva nastavitev: RESEND_API_KEY.' }, 500)
    const rez = await posljiEnega(RESEND_KEY, EMAIL_FROM, test_email, oznaka, {
      display_name: 'Test',
      brez_ekipe: false,
    })
    // Tudi test zabeležimo — ko kdo reče "nisem dobil", je prazen dnevnik
    // najslabši možni odgovor.
    await service.from('email_log').insert({
      email: test_email,
      vrsta: 'test',
      competition_id,
      resend_id: rez.id ?? null,
      napaka: rez.napaka ?? null,
    })
    return json({ test: true, resend: rez })
  }

  // Seznam: človek ga bere s svojim tokenom (`admin_uporabniki` zahteva
  // `is_admin()`, ta pa `auth.uid()`), stroj pa prek ločene funkcije — pri
  // service ključu uporabnika ni in prva pot vedno pade.
  let kandidati: Uporabnik[]
  if (vrsta === 'opozorilo') {
    // Opozorilo je vedno strojno: pove, da se ekipa ob roku ne bo zaklenila,
    // in tega ne sme poslati nihče "na roko" sredi tedna.
    const { data, error } = await service.rpc('kandidati_za_opozorilo', {
      p_competition_id: competition_id,
      p_dni: Math.min(Math.max(vhod.dni ?? 2, 1), 14),
    })
    if (error) return json({ error: error.message }, 500)
    kandidati = (data ?? []).map((u: Record<string, unknown>) => ({
      user_id: u.user_id as string,
      email: u.email as string,
      display_name: (u.display_name as string) ?? null,
      team_id: (u.team_id as number) ?? null,
      ekipa_veljavna: false,
      team_name: (u.team_name as string) ?? null,
      round_id: (u.round_id as number) ?? null,
      round_number: (u.round_number as number) ?? null,
      deadline_at: (u.deadline_at as string) ?? null,
      razlog: (u.razlog as string) ?? null,
    }))
  } else if (jeStroj) {
    const { data, error } = await service.rpc('kandidati_za_opomnik', {
      p_competition_id: competition_id,
    })
    if (error) return json({ error: error.message }, 500)
    kandidati = (data ?? []).map((u: {
      user_id: string; email: string; display_name: string | null; team_id: number | null
    }) => ({ ...u, ekipa_veljavna: false }))
  } else {
    const { data: vsi, error: rpcErr } = await uporabnikov.rpc(
      'admin_uporabniki',
      { p_competition_id: competition_id },
    )
    if (rpcErr) return json({ error: rpcErr.message }, 500)
    kandidati = (vsi ?? []).filter((u: Uporabnik) => !u.ekipa_veljavna && u.email)
  }

  if (suho)
    return json({ suho: true, kandidati_stevilo: kandidati.length })

  // 4) Za vsakega: preveri, ali je nedavno dobil isti opomnik; če ne, pošlji.
  const rezultati: Array<{
    email: string
    ok: boolean
    razlog?: string
    resend_id?: string
  }> = []
  for (const u of kandidati) {
    // Opozorilo se ne podvaja po krogu — za to poskrbi že
    // `kandidati_za_opozorilo`, ki pogleda v email_log. Opomnik pa po času.
    const { data: nedavni } =
      vrsta === 'opozorilo'
        ? { data: false }
        : await service.rpc('nedavni_opomnik', {
            p_user_id: u.user_id,
            p_competition_id: competition_id,
          })
    if (nedavni) {
      rezultati.push({ email: u.email, ok: false, razlog: 'nedavno poslano' })
      continue
    }

    const rez =
      vrsta === 'opozorilo'
        ? await posljiOpozorilo(RESEND_KEY, EMAIL_FROM, u.email, oznaka, u)
        : await posljiEnega(RESEND_KEY, EMAIL_FROM, u.email, oznaka, {
            display_name: u.display_name ?? '',
            brez_ekipe: !u.team_id,
          })

    await service.from('email_log').insert({
      user_id: u.user_id,
      email: u.email,
      vrsta: vrsta === 'opozorilo' ? 'opozorilo-postava' : 'opomnik-ekipa',
      competition_id,
      round_id: u.round_id ?? null,
      resend_id: rez.id ?? null,
      napaka: rez.napaka ?? null,
    })

    rezultati.push({
      email: u.email,
      ok: !rez.napaka,
      razlog: rez.napaka,
      resend_id: rez.id,
    })
  }

  return json({
    kandidati_stevilo: kandidati.length,
    poslano: rezultati.filter((r) => r.ok).length,
    preskoceno: rezultati.filter((r) => !r.ok).length,
    rezultati,
  })
})

/**
 * Odobrena prosnja za poznavalca. Pove, kaj je dobil, in postavi pravilo:
 * privilegij je zaupanje in se ob zlorabi vzame.
 */
async function posljiPoznavalcu(
  apiKey: string,
  from: string,
  to: string,
  meta: { display_name: string | null; liga: string; obseg: 'klub' | 'liga'; klub: string | null },
): Promise<{ id?: string; napaka?: string }> {
  const naslov = `SLFF — odobrili smo tvojo prošnjo za poznavalca`
  const uvod = meta.display_name ? `Živjo, ${meta.display_name.split(' ')[0]}!` : 'Živjo!'
  const kaj =
    meta.obseg === 'liga'
      ? `Od zdaj si <strong>poznavalec lige ${meta.liga}</strong>: tvoj glas sam potrdi pozicijo igralca ali asistenco, drugih glasov ni treba čakati.`
      : `Od zdaj si <strong>poznavalec kluba ${meta.klub ?? ''}</strong> v ligi ${meta.liga}: tvoj glas za igralce tega kluba šteje trojno.`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${uvod}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Hvala, da si se ponudil. ${kaj}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        Ena prošnja: to je zaupanje. Vnašaj samo tisto, kar zares veš, in ne prilagajaj podatkov svoji fantasy ekipi.
        Točke vseh v ligi so odvisne od tega. Če se izkaže, da so podatki namerno napačni, poznavalca izgubiš.
      </p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
        Pozicije urejaš na strani <a href="https://slff.eu/pozicije" style="color:#15803d;">Pozicije</a>
        (uveljavijo se vsak ponedeljek zjutraj), asistence na strani
        <a href="https://slff.eu/glasovanje" style="color:#15803d;">Asistence</a> (takoj).
        Igralca, ki pri klubu ne igra več, lahko označiš z "ne igra več".
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="https://slff.eu/pozicije" style="display: inline-block; background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 12px 20px; border-radius: 10px;">
          Odpri Pozicije →
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
        Če kaj ni jasno, odgovori na ta mail.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
        SLFF — Sunday League Fantasy Football · slff.eu
      </p>
    </div>
  `
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to, subject: naslov, html,
        // Odgovor naj pride cloveku, ne na noreply: prosnja je pogovor.
        ...(Deno.env.get('EMAIL_REPLY_TO') ? { reply_to: Deno.env.get('EMAIL_REPLY_TO') } : {}),
      }),
    })
    const odgovor: ResendOdgovor = await r.json()
    if (!r.ok) return { napaka: odgovor.message ?? `HTTP ${r.status}` }
    return { id: odgovor.id }
  } catch (e) {
    return { napaka: String(e) }
  }
}

async function posljiEnega(
  apiKey: string,
  from: string,
  to: string,
  ozn: string,
  meta: { display_name: string; brez_ekipe: boolean },
): Promise<{ id?: string; napaka?: string }> {
  const naslov = meta.brez_ekipe
    ? `SLFF ${ozn} — še nimaš ekipe za naslednji krog`
    : `SLFF ${ozn} — dokončaj ekipo pred naslednjim krogom`

  const uvod = meta.display_name
    ? `Živjo, ${meta.display_name.split(' ')[0]}!`
    : 'Živjo!'

  const glavno = meta.brez_ekipe
    ? `V ${ozn.toUpperCase()} še nimaš sestavljene fantasy ekipe. Brez nje v naslednjem krogu ne dobiš točk.`
    : `Tvoja fantasy ekipa v ${ozn.toUpperCase()} še ni popolna (manjka kader, kapetan, namestnik ali podobno). Brez veljavne ekipe v naslednjem krogu ne dobiš točk.`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${uvod}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${glavno}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="https://slff.eu/moja-ekipa" style="display: inline-block; background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 12px 20px; border-radius: 10px;">
          Sestavi / popravi ekipo →
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
        Če opomnika ne rabiš (ekipe letos ne boš sestavil/a), lahko ta mail ignoriraš.
        Naslednjič ti bomo pisali šele pred naslednjim krogom.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
        SLFF — Sunday League Fantasy Football · slff.eu
      </p>
    </div>
  `

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject: naslov, html }),
    })
    const odgovor: ResendOdgovor = await r.json()
    if (!r.ok) return { napaka: odgovor.message ?? `HTTP ${r.status}` }
    return { id: odgovor.id }
  } catch (e) {
    return { napaka: String(e) }
  }
}

async function posljiOpozorilo(
  apiKey: string,
  from: string,
  to: string,
  ozn: string,
  u: Uporabnik,
): Promise<{ id?: string; napaka?: string }> {
  const uvod = u.display_name
    ? `Živjo, ${u.display_name.split(' ')[0]}!`
    : 'Živjo!'
  const krog = u.round_number ? `${u.round_number}. krog` : 'naslednji krog'
  const rok = u.deadline_at
    ? new Date(u.deadline_at).toLocaleString('sl-SI', {
        weekday: 'long',
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Ljubljana',
      })
    : null

  const naslov = `SLFF ${ozn} — tvoja ekipa se ${krog} ne bo zaklenila`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${uvod}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
        Ekipa <strong>${u.team_name ?? ''}</strong> se za ${krog} ne bo zaklenila,
        zato v njem ne bi dobila točk.
      </p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px; padding: 12px; background: #fef2f2; border-left: 3px solid #f87171; border-radius: 6px;">
        ${u.razlog ?? 'Kader ni veljaven.'}
      </p>
      ${
        rok
          ? `<p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">Popraviti jo je mogoče do <strong>${rok}</strong>.</p>`
          : ''
      }
      <p style="text-align: center; margin: 24px 0;">
        <a href="https://slff.eu/moja-ekipa" style="display: inline-block; background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 12px 20px; border-radius: 10px;">
          Popravi ekipo →
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
        Sicer se ekipa prenaša iz kroga v krog sama in ti ni treba storiti ničesar —
        pišemo ti samo takrat, kadar se ne bo mogla.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
        SLFF — Sunday League Fantasy Football · slff.eu
      </p>
    </div>
  `

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject: naslov, html }),
    })
    const odgovor: ResendOdgovor = await r.json()
    if (!r.ok) return { napaka: odgovor.message ?? `HTTP ${r.status}` }
    return { id: odgovor.id }
  } catch (e) {
    return { napaka: String(e) }
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
