// Edge Function: posli-opomnik
//
// Poslje e-poštni opomnik uporabnikom, ki v izbrani ligi še nimajo veljavne
// fantasy ekipe. Kdo dobi mail, določi RPC kandidati_za_opomnik — isti za
// admin gumb in za urnik. `admin_uporabniki` vrne VSE račune (tudi tiste, ki
// igrajo samo v drugih ligah) in za pošiljanje ni primeren.
//
// Zahteva se dostopa preko admin računa (Authorization: Bearer <access_token>);
// funkcija to preveri z is_admin() klicem prek anon supabase klienta.
//
// Vsak poskus pošiljanja se zapiše v tabelo email_log — z ali brez napake.
// Tabela služi za dvoje: 1) da ne pošljemo istega opomnika dvakrat v 3 dneh
// (glej funkcijo nedavni_opomnik), 2) za sledenje in reševanje težav, če
// kdo reče "nisem dobil".
//
// Kdor ima mobilno aplikacijo, dobi isto sporočilo še kot potisno obvestilo
// (push.ts, skrivnost FIREBASE_SERVICE_ACCOUNT). Kanala sta neodvisna:
// pošta gre, če ni `profiles.brez_opomnikov`, push, če ni `brez_push`.
// `opomnik-push` je samo potisno obvestilo ("še nimaš ekipe", dan pred rokom).
//
// Pošta gre prek SMTP (Mailcow na mail.slff.eu, port 465 — Supabase
// Cloud zapre 25 in 587). Skrivnosti iz env: SMTP_HOST, SMTP_USER, SMTP_PASS,
// EMAIL_FROM (naslov mora biti SMTP_USER, sicer ga Mailcow zavrne), in privzeto
// nastavljeni SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (dodeljena vsem edge
// funkcijam avtomatsko).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import {
  JEZIK_DRZAVE,
  esc,
  sestaviOpomnik,
  sestaviOpomnikBrezEkipe,
  sestaviOpomnikBrezLige,
  sestaviLigaZivi,
  sestaviOpozorilo,
  sestaviIzstopKluba,
  sestaviPopravekPozicije,
  sestaviPoznavalca,
  sestaviPushOpomnik,
  sestaviPivo7dni,
  sestaviAnketoPlacila,
  jezikAnkete,
  sestaviNovostMiniLig,
  sestaviOpozoriloOdsotnih,
  sestaviTedenskiPregled,
  type Liga,
  type PregledKroga,
  type Sporocilo,
} from './sporocila.ts'
import { posljiPush, pushNastavljen, type Obvestilo } from './push.ts'
import nodemailer from 'npm:nodemailer@6.9.16'
import { sledi } from '../_shared/napake.ts'

// Anketa plačila (SLF-211): Lovro, 30. 10. 2026, okoli 50 ročno izbranih.
const ANKETA_MEJA = 50

const VRSTE = ['opomnik', 'opozorilo', 'poznavalec', 'popravek-pozicije', 'izstop-kluba', 'opomnik-push', 'tedenski-pregled', 'dobrodoslica', 'brez-ekipe', 'liga-zivi', 'pivo-7dni', 'novost-mini-lige', 'opozorilo-odsotni', 'anketa-placila'] as const
type Vrsta = (typeof VRSTE)[number]

// Besedila so v `sporocila.ts`, v jeziku DRŽAVE LIGE (slovaška liga →
// slovaški mail). Povezave nosijo `?t=<liga>`, da se stran odpre v pravi ligi
// in jeziku; odjava vodi na `/reminders?t=<liga>`.

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
  // 'popravek-pozicije' — lastnikom ekip z igralci iz `player_ids`, ki smo
  //   jim popravili napacno pozicijo (lazni vratarji); samo urnik
  // 'izstop-kluba' — lastnikom ekip z igralci kluba, ki je izstopil iz lige
  //   (`players.izstopil_at`); samo urnik
  // 'opomnik-push' — samo push: kdor v ligi nima ekipe, rok je v 24 urah;
  //   samo urnik
  // 'tedenski-pregled' — po koncanem krogu vsakemu lastniku ekipe tocke,
  //   mesto in kapetan (`tedenski_pregled_ekip`); samo urnik
  vrsta?: Vrsta
  user_id?: string
  player_ids?: number[]
  obseg?: 'klub' | 'liga'
  // Koliko dni pred rokom opozarjamo. Privzeto 2; nastavljivo, da se da
  // suho preveriti, koga bi zajelo sirse okno.
  dni?: number
  // Varovalka: ce je kandidatov vec, ne poslje nicesar in vrne 409. Preveri
  // se PRED prvim mailom, ne po njem.
  najvec?: number
  // Največ poslanih v tem klicu (dnevna kvota ponudnika); ostali naslednji dan.
  najvec_poslati?: number
  // 'anketa-placila' iz administracije: natanko odkljukani uporabniki (do ANKETA_MEJA).
  user_ids?: string[]
}

interface Uporabnik {
  user_id: string
  email: string | null
  // vklopljena kanala (glej `kandidati_za_*`)
  email_vklop: boolean
  push_vklop: boolean
  display_name: string | null
  team_id: number | null
  ekipa_veljavna: boolean
  // samo pri opomniku: jezik prijave (za mail brez lige)
  jezik?: string | null
  // samo pri opozorilu
  team_name?: string | null
  round_id?: number | null
  round_number?: number | null
  deadline_at?: string | null
  razlog?: string | null
}

sledi('posli-opomnik')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')
    return json({ error: 'Samo POST.' }, 405)

  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Manjka Authorization.' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SMTP_PASS = Deno.env.get('SMTP_PASS')
  const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>'

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
  // Neznana vrsta se zavrne: starejša funkcija je vsako neznano vrsto obravnavala
  // kot množični opomnik po pošti. Ob neusklajeni namestitvi naj raje odpove.
  if (!VRSTE.includes(vrsta)) return json({ error: `Neznana vrsta: ${vrsta}.` }, 400)
  if ((vrsta === 'opozorilo' || vrsta === 'opomnik-push' || vrsta === 'tedenski-pregled' || vrsta === 'opozorilo-odsotni') && !jeStroj)
    return json(
      { error: 'Opozorilo poslje samo urnik (servisni kljuc).' },
      403,
    )
  // Dobrodošlica dan po registraciji (mail in push "sestavi ekipo"): ni vezana na
  // ligo; kdo jo dobi, določi `kandidati_za_dobrodoslico` (enkrat na človeka).
  // `najvec_poslati` omeji kos: funkcija ima 60 s, mail traja ~4 s.
  // `brez-ekipe`: do trije opomniki po dobrodošlici (`kandidati_za_opomnik_brez_ekipe`
  // določi urnik), z ligo in rokom, če ju poznamo.
  if (vrsta === 'dobrodoslica' || vrsta === 'brez-ekipe') {
    if (!jeStroj) return json({ error: 'Dobrodošlico pošlje samo urnik (servisni ključ).' }, 403)
    if (!SMTP_PASS && !suho) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const service2 = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await service2.rpc(
      vrsta === 'dobrodoslica' ? 'kandidati_za_dobrodoslico' : 'kandidati_za_opomnik_brez_ekipe',
      { p_najvec: suho ? 1000 : Math.min(vhod.najvec_poslati ?? 10, 20) },
    )
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      user_id: string; email: string; display_name: string | null; jezik: string | null; drzava?: string | null
      email_vklop: boolean; push_vklop: boolean
      competition_id?: number | null; liga_slug?: string | null; liga_oznaka?: string | null; liga_drzava?: string | null
      rok?: string | null
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    let poslanih = 0
    let poslano = 0
    for (const u of kand) {
      const drzava = u.drzava ?? u.liga_drzava
      const jezik = u.jezik ?? (drzava ? JEZIK_DRZAVE[drzava] : null) ?? 'en'
      const liga: Liga | null = u.liga_slug ? { slug: u.liga_slug, oznaka: u.liga_oznaka ?? '', drzava: u.liga_drzava ?? null } : null
      const sporocilo = await sOdjavo(service2, u.user_id, vrsta === 'dobrodoslica'
        ? sestaviOpomnikBrezLige(jezik, { display_name: u.display_name })
        : sestaviOpomnikBrezEkipe(jezik, { display_name: u.display_name, liga, rok: u.rok ?? null }))
      let rez: { id?: string; napaka?: string } = {}
      const zaPosto = u.email_vklop && !!u.email
      if (zaPosto) {
        if (poslanih > 0) await new Promise((r) => setTimeout(r, 600))
        rez = await poslji(EMAIL_FROM, u.email, sporocilo)
        if (!rez.napaka) poslanih++
      }
      const pot = `/my-team?sestavi=1${liga ? `&t=${encodeURIComponent(liga.slug)}` : ''}`
      const push = u.push_vklop ? await posljiPush(service2, u.user_id, vObvestilo(sporocilo, pot)) : 0
      const izid = izidKanalov(zaPosto, rez, push)
      if (!izid.napaka) poslano++
      await service2.from('email_log').insert({
        user_id: u.user_id,
        email: u.email ?? '',
        vrsta,
        competition_id: u.competition_id ?? null,
        resend_id: rez.id ?? null,
        ...izid,
      })
    }
    return json({ kandidati_stevilo: kand.length, poslano, poslanih_mailov: poslanih, preskoceno: kand.length - poslano })
  }

  // `pivo-7dni`: teden po prvi (nehišni, nemladinski) ekipi en sproščen mail
  // "SLFF je brezplačen … plačaš eno pivo?". Kdo ga dobi, določi
  // `kandidati_za_pivo_7dni` (enkrat na človeka, brez odjavljenih). Le pošta:
  // povezava na pivo v aplikaciji ni dovoljena (trgovini, glej Pivo.tsx).
  if (vrsta === 'pivo-7dni') {
    if (!jeStroj) return json({ error: 'Pivo pošlje samo urnik (servisni ključ).' }, 403)
    if (!SMTP_PASS && !suho) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const service4 = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await service4.rpc('kandidati_za_pivo_7dni', {
      p_najvec: suho ? 1000 : Math.min(vhod.najvec_poslati ?? 10, 20),
    })
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      user_id: string; email: string; display_name: string | null
      competition_id: number; liga_slug: string; liga_oznaka: string; liga_drzava: string | null
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    let poslano = 0
    for (const u of kand) {
      if (poslano > 0) await new Promise((r) => setTimeout(r, 600))
      const liga: Liga = { slug: u.liga_slug, oznaka: u.liga_oznaka, drzava: u.liga_drzava }
      const sporocilo = await sOdjavo(service4, u.user_id, sestaviPivo7dni(liga, { display_name: u.display_name }))
      const rez = await poslji(EMAIL_FROM, u.email, sporocilo, Deno.env.get('EMAIL_REPLY_TO'))
      if (!rez.napaka) poslano++
      await service4.from('email_log').insert({
        user_id: u.user_id,
        email: u.email,
        vrsta,
        competition_id: u.competition_id,
        resend_id: rez.id ?? null,
        napaka: rez.napaka ?? null,
      })
    }
    return json({ kandidati_stevilo: kand.length, poslano, preskoceno: kand.length - poslano })
  }

  // `anketa-placila` (SLF-211): enkratna anketa natanko tistim, ki jih admin
  // odkljuka v administraciji (`user_ids`, do ANKETA_MEJA); največ 10 na klic,
  // ANKETA_MEJA skupaj (email_log). Admin naslove že vidi v tabeli, odgovor pa vrne le števila in
  // razloge preskoka.
  if (vrsta === 'anketa-placila' && Array.isArray(vhod.user_ids)) {
    const suhoA = suho !== false
    const ids = [...new Set(vhod.user_ids.filter((x) => typeof x === 'string'))]
    if (!ids.length || ids.length > ANKETA_MEJA) return json({ error: `Izberi od 1 do ${ANKETA_MEJA} uporabnikov.` }, 400)
    // Anketa gre samo od info@slff.eu (Lovro, 30. 10. 2026), z lastno prijavo v nabiralnik
    // info@; brez nje ne pošlje nič (ne noreply@, ne reply-to kot nadomestek).
    const infoPripravljen = !!INFO_SMTP_PASS
    if (!infoPripravljen && !suhoA)
      return json({ error: 'Pošiljatelj info@slff.eu ni nastavljen (INFO_SMTP_PASS). Nič ni poslano.' }, 500)
    const db = createClient(SUPABASE_URL, SERVICE_KEY)
    const poslanih = async () => {
      const { data, error } = await db.rpc('anketa_placila_poslanih')
      if (error) throw new Error(error.message)
      return Number(data ?? 0)
    }
    const prej = await poslanih().catch((e) => e as Error)
    if (prej instanceof Error) return json({ error: prej.message }, 500)
    const { data, error } = await db.rpc('prejemniki_ankete', { p_ids: ids, p_competition_id: competition_id ?? null })
    if (error) return json({ error: error.message }, 500)
    const vsi = ((data ?? []) as Array<{
      user_id: string; email: string; display_name: string | null
      competition_id: number; liga_slug: string; liga_oznaka: string; liga_drzava: string | null
      razlog: string | null
    }>).map((u) => (!u.razlog && !u.liga_slug ? { ...u, razlog: 'ni_lige' } : u)) // brez lige bi odjava dobila ?t=null
    const preskoceni: Record<string, number> = {}
    for (const u of vsi) if (u.razlog) preskoceni[u.razlog] = (preskoceni[u.razlog] ?? 0) + 1
    const neznanih = ids.length - vsi.length
    if (neznanih) preskoceni.ni_racuna = neznanih
    const kand = vsi.filter((u) => !u.razlog)
    const jeziki: Record<string, number> = {}
    for (const u of kand) {
      const j = jezikAnkete({ drzava: u.liga_drzava })
      jeziki[j] = (jeziki[j] ?? 0) + 1
    }
    const povzetek = { posiljatelj: ANKETA_FROM, posiljatelj_pripravljen: infoPripravljen, izbranih: ids.length, kandidati_stevilo: kand.length, preskoceni, jeziki, ze_poslanih: prej, meja: ANKETA_MEJA }
    if (suhoA) return json({ suho: true, ...povzetek })
    // ANKETA_MEJA skupaj (SLF-211); funkcija ima 60 s, mail traja ~4 s, zato 10 na klic.
    const prostih = Math.max(0, ANKETA_MEJA - prej)
    let poslano = 0
    let napak = 0
    let zasedenih = 0
    for (const u of kand.slice(0, Math.min(prostih, 10))) {
      if (poslano + napak > 0) await new Promise((r) => setTimeout(r, 500))
      const liga: Liga = { slug: u.liga_slug, oznaka: u.liga_oznaka, drzava: u.liga_drzava }
      const sporocilo = await sOdjavo(db, u.user_id, sestaviAnketoPlacila(liga, { display_name: u.display_name }))
      // Zasedba pod zaklepom (SQL): sočasen klic istemu ne pošlje še enkrat, meja velja za vse klice.
      const { data: zid, error: zErr } = await db.rpc('anketa_placila_zasedi', {
        p_user_id: u.user_id, p_email: u.email, p_competition_id: u.competition_id, p_meja: ANKETA_MEJA,
      })
      if (zErr) return json({ error: `email_log: ${zErr.message}`, poslano, napak }, 500)
      if (Number(zid) === -1) break
      if (Number(zid) === 0) { zasedenih++; continue }
      const rez = await poslji(ANKETA_FROM, u.email, sporocilo, undefined, smtpInfo)
      if (rez.napaka) napak++
      else poslano++
      const { error: logErr } = await db.from('email_log')
        .update({ resend_id: rez.id ?? null, napaka: rez.napaka ?? null, poslano_at: new Date().toISOString() })
        .eq('id', Number(zid))
      // Vrstica ostane 'poteka': človek je blokiran, raje kot da dobi dva maila.
      if (logErr) return json({ error: `email_log: ${logErr.message}`, poslano, napak }, 500)
    }
    // Poslano potrdi email_log, ne števec v zanki.
    const potem = await poslanih().catch(() => null)
    return json({
      ...povzetek,
      poslano,
      napak,
      zasedenih,
      // Neuspeli ostanejo izbrani za ponovni poskus (največ trije, glej SQL).
      ostalo: Math.max(0, Math.min(kand.length, prostih) - poslano - zasedenih),
      cez_mejo: kand.length > prostih,
      ze_poslanih: potem,
    })
  }

  // Brez izbora ni ankete: strežnik nikogar ne izbere sam (Lovro, 30. 10. 2026).
  if (vrsta === 'anketa-placila') return json({ error: 'Anketa gre le izbranim v administraciji (user_ids).' }, 400)

  // `novost-mini-lige`: enkratno obvestilo o dvobojih in napovedih v mini
  // ligah (26. 10. 2026), vsem z nehišno ekipo (`kandidati_za_novost_mini_lig`).
  // Ob mailu še potisno obvestilo uporabnikom aplikacije (brez `brez_push`).
  if (vrsta === 'novost-mini-lige') {
    if (!jeStroj) return json({ error: 'Novost pošlje samo delovni tok (servisni ključ).' }, 403)
    if (!SMTP_PASS && !suho) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const service5 = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await service5.rpc('kandidati_za_novost_mini_lig', {
      p_najvec: suho ? 10000 : Math.min(vhod.najvec_poslati ?? 10, 20),
    })
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      user_id: string; email: string; display_name: string | null; v_mini_ligi: boolean
      competition_id: number; liga_slug: string; liga_oznaka: string; liga_drzava: string | null
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    let poslano = 0
    let push = 0
    for (const u of kand) {
      if (poslano > 0) await new Promise((r) => setTimeout(r, 600))
      const liga: Liga = { slug: u.liga_slug, oznaka: u.liga_oznaka, drzava: u.liga_drzava }
      const sporocilo = sestaviNovostMiniLig(liga, { display_name: u.display_name, v_mini_ligi: u.v_mini_ligi })
      const rez = await poslji(EMAIL_FROM, u.email, await sOdjavo(service5, u.user_id, sporocilo), Deno.env.get('EMAIL_REPLY_TO'))
      if (!rez.napaka) {
        poslano++
        const { data: pr } = await service5.from('profiles').select('brez_push').eq('id', u.user_id).maybeSingle()
        if (!pr?.brez_push && pushNastavljen())
          push += await posljiPush(service5, u.user_id, vObvestilo(sporocilo, `/${u.v_mini_ligi ? 'mini-leagues' : 'predictions'}?t=${u.liga_slug}`)).catch(() => 0)
      }
      await service5.from('email_log').insert({
        user_id: u.user_id,
        email: u.email,
        vrsta,
        competition_id: u.competition_id,
        resend_id: rez.id ?? null,
        napaka: rez.napaka ?? null,
      })
    }
    return json({ kandidati_stevilo: kand.length, poslano, push, preskoceno: kand.length - poslano })
  }

  // `liga-zivi`: enkratno obvestilo na željo "Moje lige ni", ko je liga
  // aktivna (`kandidati_za_zivo_ligo`). Ob uspehu `zelja_lige_poslana`
  // pobriše e-naslov; neuspeh se poskusi še dvakrat.
  if (vrsta === 'liga-zivi') {
    if (!jeStroj) return json({ error: 'Obvestilo o ligi pošlje samo urnik (servisni ključ).' }, 403)
    if (!SMTP_PASS && !suho) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const service3 = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await service3.rpc('kandidati_za_zivo_ligo', {
      p_najvec: suho ? 1000 : Math.min(vhod.najvec_poslati ?? 10, 20),
    })
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      id: number; email: string; display_name: string | null; jezik: string | null
      liga_slug: string; liga_oznaka: string; liga_drzava: string | null
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    let poslano = 0
    for (const z of kand) {
      if (poslano > 0) await new Promise((r) => setTimeout(r, 600))
      const liga: Liga = { slug: z.liga_slug, oznaka: z.liga_oznaka, drzava: z.liga_drzava }
      const rez = await poslji(EMAIL_FROM, z.email, sestaviLigaZivi(z.jezik, { display_name: z.display_name, liga }))
      if (!rez.napaka) poslano++
      await service3.rpc('zelja_lige_poslana', { p_id: z.id, p_uspeh: !rez.napaka })
    }
    return json({ kandidati_stevilo: kand.length, poslano, preskoceno: kand.length - poslano })
  }

  if (!competition_id)
    return json({ error: 'Manjka competition_id.' }, 400)

  // Odobritev poznavalca: en mail enemu cloveku, klice ga admin ob odobritvi.
  // Redko (nekaj na teden), zato ne obremeni kvote.
  if (vrsta === 'poznavalec') {
    if (jeStroj) return json({ error: 'Poznavalca odobri clovek, ne urnik.' }, 403)
    if (!vhod.user_id) return json({ error: 'Manjka user_id.' }, 400)
    if (!SMTP_PASS) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const service0 = createClient(SUPABASE_URL, SERVICE_KEY)
    const [{ data: u }, { data: pr }, liga0] = await Promise.all([
      service0.auth.admin.getUserById(vhod.user_id),
      service0.from('profiles').select('display_name, insider_team_id').eq('id', vhod.user_id).maybeSingle(),
      preberiLigo(service0, competition_id),
    ])
    const email = u?.user?.email
    if (!email) return json({ error: 'Uporabnik nima e-naslova.' }, 404)
    let klub: string | null = null
    if (vhod.obseg === 'klub' && pr?.insider_team_id) {
      const { data: t } = await service0.from('teams').select('name').eq('id', pr.insider_team_id).maybeSingle()
      klub = t?.name ?? null
    }
    const rez = await poslji(
      EMAIL_FROM,
      email,
      sestaviPoznavalca(liga0, {
        display_name: pr?.display_name ?? null,
        obseg: vhod.obseg ?? 'liga',
        klub,
      }),
      // Odgovor naj pride cloveku, ne na noreply: prosnja je pogovor.
      Deno.env.get('EMAIL_REPLY_TO'),
    )
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

  // Samo push: pošte ne pošilja, zato ne potrebuje SMTP_PASS.
  if (vrsta === 'opomnik-push') {
    const service1 = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await service1.rpc('kandidati_za_push_opomnik', {
      p_competition_id: competition_id,
    })
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      user_id: string; email: string; display_name: string | null; deadline_at: string; round_id: number
      jezik: string | null; ima_ekipo: boolean
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    // Brez Firebase skrivnosti ni kaj poslati — ne polni dnevnika z napakami vsako uro.
    if (!pushNastavljen()) return json({ error: 'Push ni nastavljen (FIREBASE_SERVICE_ACCOUNT).' }, 500)
    if (typeof vhod.najvec === 'number' && kand.length > vhod.najvec)
      return json({ error: `Preveč kandidatov (${kand.length}, meja ${vhod.najvec}). Nič ni bilo poslano.`, kandidati_stevilo: kand.length }, 409)
    const liga1 = await preberiLigo(service1, competition_id)
    let poslano = 0
    for (const u of kand) {
      // Kdor nima ekipe nikjer, ni "v" privzeti ligi: isto povabilo kot mail brez lige.
      const o = u.ima_ekipo
        ? { ...sestaviPushOpomnik(liga1, u.deadline_at), url: `/my-team?t=${liga1.slug}` }
        : vObvestilo(sestaviOpomnikBrezLige(u.jezik, { display_name: u.display_name }), '/my-team?sestavi=1')
      const n = await posljiPush(service1, u.user_id, o)
      if (n) poslano++
      await service1.from('email_log').insert({
        user_id: u.user_id,
        email: u.email,
        vrsta: 'opomnik-push',
        kanal: 'push',
        competition_id,
        round_id: u.round_id,
        napaka: n ? null : 'push ni dostavljen',
      })
    }
    return json({ kandidati_stevilo: kand.length, poslano, preskoceno: kand.length - poslano })
  }

  // Ključ za pošto zahtevamo šele, kadar bomo res pošiljali. Suhi tek obstaja
  // prav zato, da se pred vklopom urnika preverijo številke — če bi padel na
  // manjkajočem ključu, bi bila varovalka neuporabna ravno takrat, ko je
  // najbolj potrebna.
  if (!SMTP_PASS && !suho)
    return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)

  // Service role rabimo za pisanje v email_log, za branje nastavitev in za
  // seznam kandidatov — `kandidati_*` so odprti samo servisni vlogi. Da je
  // človek admin, smo preverili zgoraj.
  const service = createClient(SUPABASE_URL, SERVICE_KEY)

  // Liga za predlogo: ime, šifra za povezave in država za jezik.
  const liga = await preberiLigo(service, competition_id)

  // Test režim gre PRED branjem uporabnikov: testni gumb obstaja zato, da
  // preveri samo dostavo pošte, in ne sme pasti zaradi česa drugega.
  if (test_email) {
    if (!SMTP_PASS)
      return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
    const rez = await poslji(
      EMAIL_FROM,
      test_email,
      sestaviOpomnik(liga, { display_name: 'Test', rok: await naslednjiRok(service, competition_id) }),
    )
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

  // Tedenski pregled: po koncanem krogu en mail na ekipo. Kdo ga dobi in kaj
  // pise, doloci `tedenski_pregled_ekip` (tudi da ga za isti krog ne dobi
  // dvakrat). Od 26. 10. 2026 gre ob mailu še potisno obvestilo (le enkrat na
  // krog, ker mail za isti krog ne gre dvakrat) z dvoboji in napovedmi.
  if (vrsta === 'tedenski-pregled') {
    const { data, error } = await service.rpc('tedenski_pregled_ekip', { p_competition_id: competition_id })
    if (error) return json({ error: error.message }, 500)
    const vrstice = (data ?? []) as Array<PregledKroga & {
      user_id: string; email: string; fantasy_team_id: number; round_id: number
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: vrstice.length, krog: vrstice[0]?.krog ?? null })
    if (typeof vhod.najvec === 'number' && vrstice.length > vhod.najvec)
      return json({ error: `Preveč ekip (${vrstice.length}, meja ${vhod.najvec}). Nič ni bilo poslano.`, kandidati_stevilo: vrstice.length }, 409)

    // Dnevna mera za nov strežnik: ostali pridejo ob naslednjem zagonu
    // (poslanim `tedenski_pregled_ekip` istega kroga ne vrne več).
    const zdaj = typeof vhod.najvec_poslati === 'number' ? vrstice.slice(0, vhod.najvec_poslati) : vrstice
    const rezultati: Array<{ ekipa: number; ok: boolean; razlog?: string; push?: number }> = []
    for (const v of zdaj) {
      // Mini lige (26. 10. 2026): končani dvoboji kroga (največ trije) in
      // točke napovedi. Napaka pri branju ne ustavi maila — ostane brez njiju.
      // Namigi za naslednji krog (kapetan, igralci brez minute, pripomočki).
      // Kralj napovedi kroga v ligi in mini ligah (27. 10. 2026).
      const [{ data: dv }, { data: np }, { data: pr }, { data: nm }, { data: kr }] = await Promise.all([
        service.rpc('dvoboji_ekipe', { p_ekipa: v.fantasy_team_id, p_krog: v.krog }),
        service.rpc('povzetek_napovedi_kroga', { p_user_id: v.user_id, p_round_id: v.round_id }),
        service.from('profiles').select('brez_push').eq('id', v.user_id).maybeSingle(),
        service.rpc('namigi_ekipe', { p_ekipa: v.fantasy_team_id, p_round_id: v.round_id }),
        service.rpc('kralj_napovedi_kroga', { p_user_id: v.user_id, p_round_id: v.round_id }),
      ])
      // deno-lint-ignore no-explicit-any
      const dvoboji = ((dv ?? []) as any[]).filter((d) => d.koncan && d.izid).slice(0, 3).map((d) => ({
        mini_liga: String(d.mini_liga),
        nasprotnik: d.nasprotnik_id == null ? null : String(d.nasprotnik),
        tocke: Number(d.tocke),
        tocke_nasprotnika: Number(d.tocke_nasprotnika),
        izid: d.izid as 'zmaga' | 'remi' | 'poraz',
      }))
      // deno-lint-ignore no-explicit-any
      const n = (Array.isArray(np) ? np[0] : np) as any
      const napovedi = n && Number(n.ocenjenih) > 0 ? { tocke: Number(n.tocke), tocnih: Number(n.tocnih) } : null
      // Vrstica brez mini lige je liga sama (v mailu njena oznaka).
      // deno-lint-ignore no-explicit-any
      const kralj = ((kr ?? []) as any[]).map((k) => (k.mini_liga_id == null ? null : String(k.mini_liga)))
      // deno-lint-ignore no-explicit-any
      const h = (Array.isArray(nm) ? nm[0] : nm) as any
      const namigi = h
        ? {
          kapetan_ni_igral: h.kapetan_ni_igral ?? null,
          ni_igralo: Number(h.ni_igralo ?? 0),
          prosti_prestopi: Number(h.prosti_prestopi ?? 3),
          cipi: (h.cipi ?? []) as Array<'wildcard' | 'klop_plus'>,
        }
        : null
      const sporocilo = sestaviTedenskiPregled(liga, {
        ...v,
        tocke: Number(v.tocke),
        povprecje: v.povprecje == null ? null : Number(v.povprecje),
        najvec: v.najvec == null ? null : Number(v.najvec),
        kapetan_tocke: v.kapetan_tocke == null ? null : Number(v.kapetan_tocke),
        najboljsi_tocke: v.najboljsi_tocke == null ? null : Number(v.najboljsi_tocke),
        dvoboji,
        napovedi,
        kralj,
        namigi,
      })
      const rez = await poslji(
        EMAIL_FROM,
        v.email,
        await sOdjavo(service, v.user_id, sporocilo),
        Deno.env.get('EMAIL_REPLY_TO'),
      )
      // Ob mailu še potisno obvestilo (le aplikacija; brez `brez_push`).
      const push = !rez.napaka && !pr?.brez_push && pushNastavljen()
        ? await posljiPush(service, v.user_id, vObvestilo(sporocilo, `/my-team?t=${liga.slug}`)).catch(() => 0)
        : 0
      await service.from('email_log').insert({
        user_id: v.user_id,
        email: v.email,
        vrsta,
        competition_id,
        round_id: v.round_id,
        resend_id: rez.id ?? null,
        napaka: rez.napaka ?? null,
      })
      rezultati.push({ ekipa: v.fantasy_team_id, ok: !rez.napaka, razlog: rez.napaka, push })
    }
    return json({
      kandidati_stevilo: vrstice.length,
      krog: vrstice[0]?.krog ?? null,
      poslano: rezultati.filter((r) => r.ok).length,
      preskoceno: rezultati.filter((r) => !r.ok).length,
      odlozeno: vrstice.length - zdaj.length,
      rezultati,
    })
  }

  // Opozorilo pred rokom: o igralcu iz prve postave je javljena poškodba ali
  // odsotnost (po zadnji spremembi ekipe). Mail in push, enkrat na krog;
  // kdo ga dobi, določi `kandidati_za_opozorilo_odsotnih`.
  if (vrsta === 'opozorilo-odsotni') {
    const { data, error } = await service.rpc('kandidati_za_opozorilo_odsotnih', { p_competition_id: competition_id })
    if (error) return json({ error: error.message }, 500)
    const kand = (data ?? []) as Array<{
      user_id: string; email: string | null; display_name: string | null; team_id: number; round_id: number
      round_number: number; deadline_at: string; kapetan: string | null; odsotni: string[]
      email_vklop: boolean; push_vklop: boolean
    }>
    if (suho) return json({ suho: true, kandidati_stevilo: kand.length })
    if (typeof vhod.najvec === 'number' && kand.length > vhod.najvec)
      return json({ error: `Preveč kandidatov (${kand.length}, meja ${vhod.najvec}). Nič ni bilo poslano.`, kandidati_stevilo: kand.length }, 409)
    let poslano = 0
    for (const u of kand) {
      const sporocilo = await sOdjavo(service, u.user_id, sestaviOpozoriloOdsotnih(liga, {
        display_name: u.display_name,
        krog: u.round_number,
        rok: u.deadline_at,
        kapetan: u.kapetan,
        odsotni: u.odsotni ?? [],
      }))
      const zaPosto = u.email_vklop && !!u.email
      let rez: { id?: string; napaka?: string } = {}
      if (zaPosto) {
        if (poslano > 0) await new Promise((r) => setTimeout(r, 600))
        rez = await poslji(EMAIL_FROM, u.email!, sporocilo)
      }
      const push = u.push_vklop && pushNastavljen()
        ? await posljiPush(service, u.user_id, vObvestilo(sporocilo, `/my-team?t=${liga.slug}`)).catch(() => 0)
        : 0
      const izid = izidKanalov(zaPosto, rez, push)
      if (!izid.napaka) poslano++
      await service.from('email_log').insert({
        user_id: u.user_id,
        email: u.email ?? '',
        vrsta,
        competition_id,
        round_id: u.round_id,
        resend_id: rez.id ?? null,
        ...izid,
      })
    }
    return json({ kandidati_stevilo: kand.length, poslano, preskoceno: kand.length - poslano })
  }

  // Enkratni obvestili lastnikom ekip z dolocenimi igralci v kadru — en mail
  // na ekipo. Poslje ju le stroj (delovna tokova `popravek-pozicij.yml` in
  // `izstop-kluba.yml`).
  //   popravek-pozicije: igralci iz `player_ids` (lazni vratarji); vsakemu
  //     lastniku v ligi najvec enkrat,
  //   izstop-kluba: igralci z `izstopil_at`; lastniku znova le, ce je od
  //     zadnjega maila izstopil se kak klub.
  if (vrsta === 'popravek-pozicije' || vrsta === 'izstop-kluba') {
    if (!jeStroj) return json({ error: 'Enkratno obvestilo poslje samo delovni tok.' }, 403)
    let ids = (vhod.player_ids ?? []).filter((x) => Number.isInteger(x))
    if (vrsta === 'izstop-kluba') {
      const { data: izst, error: eIzst } = await service
        .from('players').select('id')
        .eq('competition_id', competition_id)
        .not('izstopil_at', 'is', null)
      if (eIzst) return json({ error: eIzst.message }, 500)
      ids = (izst ?? []).map((x) => x.id)
      if (!ids.length) return json({ suho, kandidati_stevilo: 0 })
    }
    if (!ids.length) return json({ error: 'Manjka player_ids.' }, 400)

    const { data: vrstice, error } = await service
      .from('fantasy_roster')
      .select('fantasy_team_id, players!inner(full_name, position, izstopil_at, teams(name)), fantasy_teams!inner(name, owner_id, competition_id)')
      .in('player_id', ids)
      .eq('fantasy_teams.competition_id', competition_id)
      // Hišne ekipe SLFF nimajo lastnika, ki bi mu pisali.
      .eq('fantasy_teams.hisna', false)
    if (error) return json({ error: error.message }, 500)

    type Ekipa = {
      owner_id: string
      team_name: string | null
      igralci: Array<{ ime: string; pozicija: string | null; klub: string | null }>
      zadnjiIzstop: string | null
    }
    const poEkipi = new Map<number, Ekipa>()
    // deno-lint-ignore no-explicit-any
    for (const v of (vrstice ?? []) as any[]) {
      const e: Ekipa = poEkipi.get(v.fantasy_team_id) ??
        { owner_id: v.fantasy_teams.owner_id, team_name: v.fantasy_teams.name, igralci: [], zadnjiIzstop: null }
      e.igralci.push({ ime: v.players.full_name, pozicija: v.players.position, klub: v.players.teams?.name ?? null })
      const izst: string | null = v.players.izstopil_at
      if (izst && (!e.zadnjiIzstop || izst > e.zadnjiIzstop)) e.zadnjiIzstop = izst
      poEkipi.set(v.fantasy_team_id, e)
    }

    if (suho) return json({ suho: true, kandidati_stevilo: poEkipi.size })
    if (typeof vhod.najvec === 'number' && poEkipi.size > vhod.najvec)
      return json({ error: `Preveč ekip (${poEkipi.size}, meja ${vhod.najvec}). Nič ni bilo poslano.`, kandidati_stevilo: poEkipi.size }, 409)

    const rezultati: Array<{ ekipa: number; ok: boolean; razlog?: string }> = []
    const rok = vrsta === 'izstop-kluba' ? await naslednjiRok(service, competition_id) : null
    for (const [ekipa, e] of poEkipi) {
      let zeQ = service
        .from('email_log').select('id')
        .eq('user_id', e.owner_id).eq('vrsta', vrsta)
        .eq('competition_id', competition_id).is('napaka', null)
      if (vrsta === 'izstop-kluba' && e.zadnjiIzstop) zeQ = zeQ.gte('poslano_at', e.zadnjiIzstop)
      // Popravki pozicij pridejo v valovih (29. 9., 1. 10.) — lastnik dobi mail
      // za vsak val; ponovni zagon istega dne ga ne podvoji.
      if (vrsta === 'popravek-pozicije')
        zeQ = zeQ.gte('poslano_at', new Date(Date.now() - 86400000).toISOString())
      const { data: ze } = await zeQ.limit(1)
      if (ze?.length) {
        rezultati.push({ ekipa, ok: false, razlog: 'že poslano' })
        continue
      }
      const [{ data: u }, { data: pr }] = await Promise.all([
        service.auth.admin.getUserById(e.owner_id),
        service.from('profiles').select('display_name, brez_opomnikov, brez_push').eq('id', e.owner_id).maybeSingle(),
      ])
      const email = u?.user?.email ?? null
      const zaPosto = !!email && !pr?.brez_opomnikov
      if (!zaPosto && pr?.brez_push) {
        rezultati.push({ ekipa, ok: false, razlog: 'odjavljen' })
        continue
      }
      const podatki = { display_name: pr?.display_name ?? null, team_name: e.team_name, igralci: e.igralci }
      const sporociloEkipi = await sOdjavo(service, e.owner_id, vrsta === 'izstop-kluba'
        ? sestaviIzstopKluba(liga, { ...podatki, rok })
        : sestaviPopravekPozicije(liga, podatki))
      const rez: { id?: string; napaka?: string } = zaPosto
        ? await poslji(EMAIL_FROM, email!, sporociloEkipi, Deno.env.get('EMAIL_REPLY_TO'))
        : {}
      const push = pr?.brez_push ? 0 : await posljiPush(service, e.owner_id, vObvestilo(sporociloEkipi, `/my-team?t=${liga.slug}`))
      const izid = izidKanalov(zaPosto, rez, push)
      await service.from('email_log').insert({
        user_id: e.owner_id,
        email: email ?? '',
        vrsta,
        competition_id,
        resend_id: rez.id ?? null,
        ...izid,
      })
      rezultati.push({ ekipa, ok: !izid.napaka, razlog: izid.napaka ?? undefined })
    }
    return json({
      kandidati_stevilo: poEkipi.size,
      poslano: rezultati.filter((r) => r.ok).length,
      preskoceno: rezultati.filter((r) => !r.ok).length,
      rezultati,
    })
  }

  // Seznam: obe poti (človek in stroj) bereta isto funkcijo prek servisnega
  // klienta. Prej je človek bral `admin_uporabniki`, ki vrne vse račune — tudi
  // tiste, ki igrajo samo v drugi ligi — in opomnik bi dobili vsi.
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
      email: (u.email as string) ?? null,
      email_vklop: u.email_vklop as boolean,
      push_vklop: u.push_vklop as boolean,
      display_name: (u.display_name as string) ?? null,
      team_id: (u.team_id as number) ?? null,
      ekipa_veljavna: false,
      team_name: (u.team_name as string) ?? null,
      round_id: (u.round_id as number) ?? null,
      round_number: (u.round_number as number) ?? null,
      deadline_at: (u.deadline_at as string) ?? null,
      razlog: (u.razlog as string) ?? null,
    }))
  } else {
    const { data, error } = await service.rpc('kandidati_za_opomnik', {
      p_competition_id: competition_id,
    })
    if (error) return json({ error: error.message }, 500)
    kandidati = (data ?? []).map((u: {
      user_id: string; email: string | null; display_name: string | null; team_id: number | null
      jezik: string | null; email_vklop: boolean; push_vklop: boolean
    }) => ({ ...u, ekipa_veljavna: false }))
  }

  if (suho)
    return json({ suho: true, kandidati_stevilo: kandidati.length })

  // Varovalka pred pošiljanjem: nenadoma veliko kandidatov je skoraj vedno
  // napaka pri uvozu, ne pri ljudeh. Ustavi se, preden gre prvi mail.
  if (typeof vhod.najvec === 'number' && kandidati.length > vhod.najvec)
    return json(
      {
        error: `Preveč kandidatov (${kandidati.length}, meja ${vhod.najvec}). Nič ni bilo poslano.`,
        kandidati_stevilo: kandidati.length,
      },
      409,
    )

  // 4) Za vsakega: preveri, ali je nedavno dobil isti opomnik; če ne, pošlji.
  const rezultati: Array<{
    email: string | null
    ok: boolean
    razlog?: string
    resend_id?: string
  }> = []
  // Dnevna kvota ponudnika (3. 9. je kampanja obstala na "daily email sending
  // quota"). `najvec_poslati` omeji, koliko jih gre v tem klicu; ostali
  // pridejo naslednji dan — `nedavni_opomnik` poskrbi, da poslani ne dobijo
  // drugega. Premor drži hitrost zmerno — strežnik mail.slff.eu nosi tudi pošto
  // HelpStacka in ne sme izpasti kot pošiljatelj množične pošte.
  const meja = typeof vhod.najvec_poslati === 'number' ? Math.max(0, vhod.najvec_poslati) : Infinity
  let poslanih = 0
  // Rok naslednjega kroga za vrstico v opomniku (brez njega vrstice ni).
  const rok = vrsta === 'opozorilo' ? null : await naslednjiRok(service, competition_id)
  for (const u of kandidati) {
    // Kvota velja samo za pošto; kdor je le na pushu, gre skozi.
    if (u.email_vklop && poslanih >= meja) {
      rezultati.push({ email: u.email, ok: false, razlog: 'dnevna meja' })
      continue
    }
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

    const sporocilo = await sOdjavo(
      service,
      u.user_id,
      vrsta === 'opozorilo'
        ? sestaviOpozorilo(liga, u)
        : !u.team_id
          // Brez ekipe ni lige: povabilo k izbiri v jeziku prijave.
          ? sestaviOpomnikBrezLige(u.jezik, { display_name: u.display_name })
          : sestaviOpomnik(liga, { display_name: u.display_name, rok, razlog: await razlogEkipe(service, u.team_id) }),
    )
    let rez: { id?: string; napaka?: string } = {}
    const zaPosto = u.email_vklop && !!u.email
    if (zaPosto) {
      if (poslanih > 0) await new Promise((r) => setTimeout(r, 600))
      rez = await poslji(EMAIL_FROM, u.email!, sporocilo)
      if (!rez.napaka) poslanih++
    }
    // Isto sporočilo še na telefon (mobilna aplikacija), neodvisno od pošte.
    const push = u.push_vklop
      ? await posljiPush(service, u.user_id, vObvestilo(sporocilo, u.team_id ? `/my-team?t=${liga.slug}` : '/'))
      : 0
    const izid = izidKanalov(zaPosto, rez, push)

    await service.from('email_log').insert({
      user_id: u.user_id,
      email: u.email ?? '',
      vrsta: vrsta === 'opozorilo' ? 'opozorilo-postava' : 'opomnik-ekipa',
      competition_id,
      round_id: u.round_id ?? null,
      resend_id: rez.id ?? null,
      ...izid,
    })

    rezultati.push({
      email: u.email,
      ok: !izid.napaka,
      razlog: izid.napaka ?? undefined,
      resend_id: rez.id,
    })
  }

  return json({
    kandidati_stevilo: kandidati.length,
    poslano: rezultati.filter((r) => r.ok).length,
    // Proračun pošte šteje le maile; push ga ne porablja.
    poslanih_mailov: poslanih,
    preskoceno: rezultati.filter((r) => !r.ok).length,
    rezultati,
  })
})

/**
 * Kanal in napaka za email_log. Vrstica brez napake šteje za poslano (enkrat
 * na krog oz. tri dni), zato je napaka le, kadar ni prišlo NIČ.
 */
function izidKanalov(
  zaPosto: boolean,
  rez: { napaka?: string },
  push: number,
): { kanal: 'email' | 'push' | 'oba'; napaka: string | null } {
  const mail = zaPosto && !rez.napaka
  return {
    kanal: mail ? (push ? 'oba' : 'email') : push ? 'push' : 'email',
    napaka: mail || push ? null : (rez.napaka ?? 'push ni dostavljen'),
  }
}

/**
 * Odjava brez prijave: povezavi v nogi (in glavi List-Unsubscribe) doda
 * uporabnika in podpisan žeton (`zeton_odjave`, ključ vidi le baza). Stran
 * /reminders z njima pokaže gumb za odjavo. Brez žetona ostane stara povezava,
 * ki zahteva prijavo.
 */
// deno-lint-ignore no-explicit-any
async function sOdjavo(db: any, userId: string, s: Sporocilo): Promise<Sporocilo> {
  if (!s.odjava) return s
  const { data: z } = await db.rpc('zeton_odjave', { p_user: userId })
  if (typeof z !== 'string' || !z) return s
  const url = new URL(s.odjava)
  url.searchParams.set('u', userId)
  url.searchParams.set('z', z)
  const nova = url.toString()
  return {
    ...s,
    odjava: nova,
    html: s.html.split(`href="${esc(s.odjava)}"`).join(`href="${esc(nova)}"`),
    // V čistopisu je odjava vrstica "<oznaka>: <url>" v nogi.
    besedilo: s.besedilo.split(`: ${s.odjava}\n`).join(`: ${nova}\n`),
  }
}

/** Zadeva maila kot naslov obvestila, predglava kot njegovo besedilo. */
function vObvestilo(s: Sporocilo, url: string): Obvestilo {
  return { naslov: s.naslov, besedilo: s.predglava || s.naslov, url }
}

/** Rok naslednjega kroga lige ali null. */
// deno-lint-ignore no-explicit-any
async function naslednjiRok(db: any, competitionId: number): Promise<string | null> {
  const { data } = await db
    .from('rounds')
    .select('deadline_at')
    .eq('competition_id', competitionId)
    .gt('deadline_at', new Date().toISOString())
    .order('deadline_at')
    .limit(1)
    .maybeSingle()
  return data?.deadline_at ?? null
}

/** Zakaj ekipa ni veljavna (slovensko, iz baze) ali null. */
// deno-lint-ignore no-explicit-any
async function razlogEkipe(db: any, teamId: number | null): Promise<string | null> {
  if (!teamId) return null
  const { data } = await db.rpc('razlog_neveljavne_ekipe', { p_team_id: teamId })
  return typeof data === 'string' && data ? data : null
}

/** Liga za predlogo; država določa jezik mail in časovni pas roka. */
async function preberiLigo(
  // deno-lint-ignore no-explicit-any
  db: any,
  id: number,
): Promise<Liga> {
  const { data } = await db
    .from('competitions_view')
    .select('slug, name, short_name, country_code')
    .eq('id', id)
    .maybeSingle()
  return {
    slug: data?.slug ?? '',
    oznaka: data?.short_name ?? '',
    ime: data?.name ?? '',
    drzava: data?.country_code ?? null,
  }
}

// Ena povezava za ves paket (pool), ne nova za vsak mail.
const smtp = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'mail.slff.eu',
  port: 465,
  secure: true,
  pool: true,
  auth: { user: Deno.env.get('SMTP_USER') ?? 'noreply@slff.eu', pass: Deno.env.get('SMTP_PASS') },
})

// Anketa plačila (SLF-211) gre od info@slff.eu: lastna prijava, ker Mailcow zahteva,
// da je From isti kot prijavljeni nabiralnik. Odgovori pridejo naravnost v info@.
const ANKETA_FROM = 'SLFF <info@slff.eu>'
const INFO_SMTP_PASS = Deno.env.get('INFO_SMTP_PASS')
const smtpInfo = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'mail.slff.eu',
  port: 465,
  secure: true,
  pool: true,
  auth: { user: 'info@slff.eu', pass: INFO_SMTP_PASS },
})

/** `id` je Message-ID; v email_log gre v stolpec `resend_id` (ime iz časa Resenda). */
async function poslji(
  from: string,
  to: string,
  s: Sporocilo,
  replyTo?: string,
  prek = smtp,
): Promise<{ id?: string; napaka?: string }> {
  try {
    const r = await prek.sendMail({
      from, to, subject: s.naslov, text: s.besedilo, html: s.html,
      ...(replyTo ? { replyTo } : {}),
      // Odjava z enim klikom v poštnem odjemalcu vodi na isto stran.
      ...(s.odjava ? { list: { unsubscribe: s.odjava } } : {}),
    })
    return { id: r.messageId }
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
