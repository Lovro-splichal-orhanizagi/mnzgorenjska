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
  sestaviOpomnik,
  sestaviOpomnikBrezLige,
  sestaviOpozorilo,
  sestaviIzstopKluba,
  sestaviPopravekPozicije,
  sestaviPoznavalca,
  sestaviPushOpomnik,
  sestaviTedenskiPregled,
  type Liga,
  type PregledKroga,
  type Sporocilo,
} from './sporocila.ts'
import { posljiPush, pushNastavljen, type Obvestilo } from './push.ts'
import nodemailer from 'npm:nodemailer@6.9.16'

const VRSTE = ['opomnik', 'opozorilo', 'poznavalec', 'popravek-pozicije', 'izstop-kluba', 'opomnik-push', 'tedenski-pregled'] as const
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
  if ((vrsta === 'opozorilo' || vrsta === 'opomnik-push' || vrsta === 'tedenski-pregled') && !jeStroj)
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
      sestaviOpomnik(liga, { display_name: 'Test', brez_ekipe: false }),
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
  // dvakrat). Le posta: potisno obvestilo za pregled bi bilo prevec.
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
    const rezultati: Array<{ ekipa: number; ok: boolean; razlog?: string }> = []
    for (const v of zdaj) {
      const rez = await poslji(
        EMAIL_FROM,
        v.email,
        await sOdjavo(service, v.user_id, sestaviTedenskiPregled(liga, {
          ...v,
          tocke: Number(v.tocke),
          povprecje: v.povprecje == null ? null : Number(v.povprecje),
          najvec: v.najvec == null ? null : Number(v.najvec),
          kapetan_tocke: v.kapetan_tocke == null ? null : Number(v.kapetan_tocke),
          najboljsi_tocke: v.najboljsi_tocke == null ? null : Number(v.najboljsi_tocke),
        })),
        Deno.env.get('EMAIL_REPLY_TO'),
      )
      await service.from('email_log').insert({
        user_id: v.user_id,
        email: v.email,
        vrsta,
        competition_id,
        round_id: v.round_id,
        resend_id: rez.id ?? null,
        napaka: rez.napaka ?? null,
      })
      rezultati.push({ ekipa: v.fantasy_team_id, ok: !rez.napaka, razlog: rez.napaka })
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

    const poEkipi = new Map<number, {
      owner_id: string
      team_name: string | null
      igralci: Array<{ ime: string; pozicija: string | null; klub: string | null }>
      zadnjiIzstop: string | null
    }>()
    // deno-lint-ignore no-explicit-any
    for (const v of (vrstice ?? []) as any[]) {
      const e = poEkipi.get(v.fantasy_team_id) ??
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
      const sporociloEkipi = await sOdjavo(service, e.owner_id, (vrsta === 'izstop-kluba' ? sestaviIzstopKluba : sestaviPopravekPozicije)(
        liga,
        { display_name: pr?.display_name ?? null, team_name: e.team_name, igralci: e.igralci },
      ))
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
          : sestaviOpomnik(liga, { display_name: u.display_name, brez_ekipe: false }),
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
    html: s.html.split(`href="${s.odjava}"`).join(`href="${nova.replaceAll('&', '&amp;')}"`),
  }
}

/** Zadeva maila "SLFF GNL — tvoja ekipa …" kot naslov in besedilo obvestila. */
function vObvestilo(s: Sporocilo, url: string): Obvestilo {
  const [naslov, ...ostalo] = s.naslov.split(' — ')
  return { naslov, besedilo: ostalo.join(' — ') || s.naslov, url }
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

/** `id` je Message-ID; v email_log gre v stolpec `resend_id` (ime iz časa Resenda). */
async function poslji(
  from: string,
  to: string,
  s: Sporocilo,
  replyTo?: string,
): Promise<{ id?: string; napaka?: string }> {
  try {
    const r = await smtp.sendMail({
      from, to, subject: s.naslov, html: s.html,
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
