// Samodejne objave za Instagram in Facebook: osnutek na Discord, nato objava.
// Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
//
// Vse objave so angleške (lastnik, 15. 10. 2026). Termina (ljubljanski čas):
// ponedeljek osnutek 04:00, objava 09:20–11:40 — vrtiljak vseh držav (igralec
// vikenda vsake); četrtek osnutek 12:00, objava 17:10–19:40 — dosežki tedna.
// Ostali dnevi (torek, sreda, petek, sobota, nedelja) imajo po dve vrsti, ki se
// menjata po sodem/lihem tednu ISO (TERMINI.vrsti, vsebinaVrste); torek in sobota
// sta reela (posnemiReel: video 1080 × 1920 z glasbo iz scripts/objave-glasba/).
// Mejnik: vsakih 1000 uporabnikov osnutek takoj, objava ~6 ur kasneje v oknu
// 09–20 (± 40 min). Ura objave je naključna (casObjave), veto vsaj 5 ur. Osnutek (dejstva, napis, prosojnice)
// gre v tabelo `objave` in na Discord s povezavo "Ustavi objavo"; ob roku ga
// delavec objavi na Instagram in Facebook (faza 2), če ga nihče ni ustavil in
// so nastavljeni ključi META_*. Brez njih se nič ne objavi (kot faza 1).
//
// 1. dejstva: SQL objava_drzave / objava_dosezki / objava_mejnik_dejstva (servisne) ali --dejstva datoteka.json,
// 2. napis: Claude (Messages API), vsako število in ime mora biti v dejstvih;
//    sicer še en poskus, nato predloga,
// 3. prosojnice: stran /objava (src/pages/Objava.tsx), posname jih Playwright,
// 4. osnutek: vrstica v `objave` (en na termin in teden) in Discord s slikami,
// 5. objava: ob roku (največ OBJAVA_ZAMUDA kasneje) Instagram in Facebook.
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DISCORD_OBJAVE_WEBHOOK,
//   OBJAVE_URL (stran s prosojnicami, privzeto https://slff.eu), OBJAVE_MAPA (slike),
//   OBJAVE_MEDIJI_URL (javni naslov mape slik, privzeto https://slff.eu/objave-mediji),
//   META_PAGE_TOKEN, META_PAGE_ID, META_IG_USER_ID, META_GRAPH_VERSION (privzeto v26.0)
//   node scripts/objave.mjs --zanka                    (delavec slff-objave: vsakih 10 minut)
//   node scripts/objave.mjs --slot pon                 (en osnutek zdaj)
//   node scripts/objave.mjs --slot mejnik [--suho --dejstva m.json]  (mejnik zdaj, če je dosežen)
//   node scripts/objave.mjs --slot cet --suho --dejstva d.json --url http://localhost:5173 [--mapa /tmp/objave-vzorec]
//     --suho: izpiše dejstva in napis, slike zapiše v --mapa; ne piše v bazo, ne pošlje na Discord
import { fileURLToPath } from 'node:url'
import { resolve, join, relative } from 'node:path'
import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createHash, randomBytes } from 'node:crypto'

export const MODEL = 'claude-sonnet-5-5'
// Vse objave so angleške; jezik ostane stolpec tabele.
export const JEZIK = 'en'
// Ura osnutka in osnovna ura objave (Ljubljana); `razpon` je naključni odmik
// objave v minutah (ponedeljek 09:20–11:40, četrtek 17:10–19:40), da objave
// niso vsak teden ob isti minuti.
// Ostali dnevi imajo dve vrsti (`vrsti`: teden A = sodi teden ISO, B = lihi),
// da se v dveh tednih zvrsti 12 različnih objav. Torek in sobota sta reela.
export const TERMINI = {
  pon: { dan: 0, osnutek: 4, objava: 10, razpon: [-40, 100] },
  tor: { dan: 1, osnutek: 5, objava: 12, razpon: [-45, 80], vrsti: ['ekipa', 'strelci'] },
  sre: { dan: 2, osnutek: 11, objava: 17.5, razpon: [-50, 70], vrsti: ['liga', 'drzava'] },
  cet: { dan: 3, osnutek: 12, objava: 18, razpon: [-50, 100] },
  pet: { dan: 4, osnutek: 9, objava: 16, razpon: [-45, 90], vrsti: ['kapetani', 'cene'] },
  sob: { dan: 5, osnutek: 4, objava: 10.5, razpon: [-50, 75], vrsti: ['predogled', 'pravila'] },
  ned: { dan: 6, osnutek: 12, objava: 19, razpon: [-45, 90], vrsti: ['stat', 'obramba'] },
}
// Vrste, ki so reel (video 1080 × 1920 z glasbo), ne vrtiljak.
export const REELI = new Set(['ekipa', 'strelci', 'predogled', 'pravila'])
// Liga tedna se ne ponovi prej kot v osmih tednih.
export const LIGA_PREMOR_TEDNOV = 8
const PAS = 'Europe/Ljubljana'
// Objava, ki je delavec ni objavil v dveh urah po roku (ni tekel), ostane neobjavljena.
export const OBJAVA_ZAMUDA = 2 * 3600e3
// Mejnik uporabnikov: vsakih KORAK; mejnik, ki je že več kot MEJNIK_ROK za nami, ni več novica.
export const MEJNIK_KORAK = 1000
export const MEJNIK_ROK = 300
// Človek ima za veto vsaj toliko časa med osnutkom na Discordu in objavo.
export const VETO = 5 * 3600e3
// Instagram Graph API sprejme največ 10 slik v vrtiljaku: do 8 držav z naslovnico
// in pozivom, 9 držav brez naslovnice (prosojnice() v src/pages/Objava.tsx).
export const NAJVEC_DRZAV = 9
// Četrtek: naslovnica + največ 6 dosežkov + poziv.
export const NAJVEC_DOSEZKOV = 6

// --- čas ----------------------------------------------------------------------

export const dodajDni = (datum, n) => new Date(Date.parse(`${datum}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)

/** Ljubljanski datum (YYYY-MM-DD) trenutka. */
export const datumLj = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: PAS }).format(d)

/** Ponedeljek tedna, v katerem je datum. */
export function ponedeljek(datum) {
  const dan = new Date(`${datum}T00:00:00Z`).getUTCDay()
  return dodajDni(datum, -((dan + 6) % 7))
}

/** Trenutek, ko je v Ljubljani `datum` ob `ura`:`minuta` (poletni in zimski čas). */
export function vLjubljani(datum, ura, minuta = 0) {
  const kot = Date.parse(`${datum}T${String(ura).padStart(2, '0')}:${String(minuta).padStart(2, '0')}:00Z`)
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(kot)).map((p) => [p.type, p.value]),
  )
  const lokalno = Date.parse(`${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:00Z`)
  return new Date(kot - (lokalno - kot))
}

/** Termin tedna: kdaj osnutek, osnovna ura objave in zadnja možna (z odmikom). */
export function termin(slot, teden) {
  const t = TERMINI[slot]
  const dan = dodajDni(teden, t.dan)
  const objavaOb = vLjubljani(dan, Math.floor(t.objava), Math.round((t.objava % 1) * 60))
  return { osnutekOb: vLjubljani(dan, t.osnutek), objavaOb, najkasneje: new Date(objavaOb.getTime() + t.razpon[1] * 60e3) }
}

/**
 * Termini, katerih osnutek je zdaj na vrsti: od ure osnutka, dokler do
 * najkasnejše objave ostane VETO. Zamujen termin se ne nadoknadi.
 */
export function terminiZdaj(zdaj) {
  const teden = ponedeljek(datumLj(zdaj))
  return Object.keys(TERMINI)
    .map((slot) => ({ slot, teden, ...termin(slot, teden) }))
    .filter((x) => zdaj >= x.osnutekOb && zdaj.getTime() + VETO <= x.najkasneje.getTime())
}

/**
 * Čas objave, kot bi ga izbral človek: osnova + naključni odmik iz razpona
 * (minute, ne večkratnik 5), ne prej kot VETO po osnutku, v oknu
 * 08:30–21:29 Ljubljana. `rng` vrne [0, 1) (preizkus ga poda).
 */
export function casObjave(osnova, [od, doo], zdaj, rng = Math.random) {
  const min = 60e3
  let t = Math.round((osnova.getTime() + (od + rng() * (doo - od)) * min) / min) * min
  t = Math.max(t, Math.ceil((zdaj.getTime() + VETO) / min) * min)
  const dan = datumLj(new Date(t))
  t = Math.min(Math.max(t, vLjubljani(dan, 8, 30).getTime()), vLjubljani(dan, 21, 29).getTime())
  if (new Date(t).getUTCMinutes() % 5 === 0) t += min
  return new Date(t)
}

/** Teden ISO 8601 datuma (četrtek tedna odloči leto). */
export function tedenISO(datum) {
  const cet = Date.parse(`${dodajDni(ponedeljek(datum), 3)}T00:00:00Z`)
  return Math.floor((cet - Date.UTC(new Date(cet).getUTCFullYear(), 0, 1)) / 86400e3 / 7) + 1
}

/** Vrsta objave termina: sodi teden ISO prva (A), lihi druga (B); pon in cet sta vrsta zase. */
export const vrstaTermina = (slot, teden) => TERMINI[slot]?.vrsti?.[tedenISO(teden) % 2] ?? slot

/** Okno tekem [od, do) vrste glede na ponedeljek tedna; `od` null = sezona do `do`. */
const OKNA = {
  ekipa: [-7, 0], strelci: [null, 1], liga: [-14, 2], drzava: [-7, 2], kapetani: [null, 4], cene: [-3, 4],
  predogled: [5, 7], stat: [-1, 6], obramba: [null, 6],
}
export const oknoVrste = (vrsta, teden) => {
  const [od, doo] = OKNA[vrsta]
  return { od: od == null ? null : dodajDni(teden, od), do: dodajDni(teden, doo) }
}

/** Okno tekem [od, do): ponedeljek prejšnji teden, četrtek zadnjih sedem dni. */
export const okno = (slot, teden) =>
  slot === 'pon' ? { od: dodajDni(teden, -7), do: teden } : { od: dodajDni(teden, -4), do: dodajDni(teden, 3) }

/** Obdobje okna za prosojnice in napis: "5–11 Oct 2026". */
export const obdobje = (od, doo) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .formatRange(new Date(`${od}T00:00:00Z`), new Date(`${dodajDni(doo, -1)}T00:00:00Z`))

// --- mejnik uporabnikov ---------------------------------------------------------

/**
 * Mejnik (večkratnik MEJNIK_KORAK), ki ga je število uporabnikov ravnokar
 * doseglo; null, če ga ni ali je že MEJNIK_ROK za nami (mejniki, preseženi pred
 * uvedbo, se ne objavijo).
 */
export function dosezenMejnik(uporabnikov) {
  const m = Math.floor(Number(uporabnikov) / MEJNIK_KORAK) * MEJNIK_KORAK
  return m > 0 && uporabnikov - m < MEJNIK_ROK ? m : null
}

/** Osnova objave mejnika: 6 ur po osnutku, premaknjena naprej v okno 09:00–20:00 (Ljubljana). */
export function objavaMejnika(zdaj) {
  const ob = new Date(zdaj.getTime() + 6 * 3600e3)
  const dan = datumLj(ob)
  const ura = Number(new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hour: '2-digit', hourCycle: 'h23' }).format(ob))
  if (ura < 9) return vLjubljani(dan, 9)
  if (ura >= 20) return vLjubljani(dodajDni(dan, 1), 9)
  return ob
}

/** Vsebina mejnika (prosojnice berejo `mejnik`). */
export const vsebinaMejnika = (d, mejnik) => ({
  slot: 'mejnik', mejnik: { mejnik, uporabnikov: d.uporabnikov, drzav: d.drzav, lig: d.lig, ekip: d.ekip },
})

// --- vsebina ------------------------------------------------------------------

/** "Priimek Ime" → "Ime Priimek" (kot prikazniIme v src/lib/pomozno.ts). */
export const prikaz = (ime) => {
  const d = String(ime ?? '').trim().split(/\s+/)
  return d.length < 2 ? String(ime ?? '') : `${d.slice(1).join(' ')} ${d[0]}`
}

/** Angleško ime države (SI → Slovenia). */
export const imeDrzave = (koda) => (koda ? new Intl.DisplayNames(['en'], { type: 'region' }).of(koda) : undefined)

/** Zastava iz kode države (SI → 🇸🇮). */
export const zastava = (koda) => String.fromCodePoint(...[...String(koda).toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))

const stevilo = (x) => Number(x ?? 0)

/**
 * Ponedeljek: vrtiljak držav iz objava_drzave (SQL je že izločil države brez
 * novice in jih uredil po uporabnikih). Vrne null, če ni nobene.
 */
export function vsebinaDrzav(d) {
  const drzave = (d.drzave ?? []).filter((x) => x.igralci?.length).slice(0, NAJVEC_DRZAV).map((x) => {
    const [prvi, ...ostali] = x.igralci
    return {
      koda: x.drzava, ime: imeDrzave(x.drzava), zastava: zastava(x.drzava),
      igralec: { ...prvi, tocke: stevilo(prvi.tocke), goli: stevilo(prvi.goli) },
      drugi: ostali.map((o) => ({ ime: o.ime, klub: o.klub, tocke: stevilo(o.tocke) })),
    }
  })
  return drzave.length ? { slot: 'pon', obdobje: obdobje(d.od, d.do), drzave } : null
}

// Vrstni red kategorij dosežkov (prvi so najboljše zgodbe); igralec le enkrat.
const KATEGORIJE = [
  ['hattrick', 'hattrick', 2], ['najvec_tock', 'najvec', 1], ['rekord_lige', 'rekord', 1],
  ['vratar_gol', 'vratar', 1], ['cista_mreza', 'cistaMreza', 1], ['skok', 'skok', 1],
]

/**
 * Četrtek: dosežki tedna iz objava_dosezki. Igralci najprej (vsak enkrat),
 * nato skupnost (anonimno). Brez dosežka igralca ni objave (null).
 */
export function vsebinaDosezkov(d) {
  const skupnost = []
  if (d.manager_tedna?.tocke > 0) {
    skupnost.push({ vrsta: 'manager', tocke: stevilo(d.manager_tedna.tocke), drzava: imeDrzave(d.manager_tedna.drzava), zastava: zastava(d.manager_tedna.drzava) })
  }
  if (d.novih_upraviteljev > 0) skupnost.push({ vrsta: 'novi', stevilo: stevilo(d.novih_upraviteljev), uporabnikov: stevilo(d.uporabnikov) })
  const videni = new Set()
  const igralci = []
  for (const [kljuc, vrsta, koliko] of KATEGORIJE) {
    for (const x of (d[kljuc] ?? []).filter((x) => !videni.has(`${x.ime}|${x.klub}`)).slice(0, koliko)) {
      videni.add(`${x.ime}|${x.klub}`)
      const o = { vrsta, ...x, drzava: imeDrzave(x.drzava), zastava: zastava(x.drzava) }
      for (const k of ['tocke', 'goli', 'prej', 'staro', 'novo', 'niz', 'krog']) if (k in o) o[k] = stevilo(o[k])
      igralci.push(o)
    }
  }
  if (!igralci.length) return null
  const dosezki = [...igralci.slice(0, NAJVEC_DOSEZKOV - Math.min(skupnost.length, 2)), ...skupnost].slice(0, NAJVEC_DOSEZKOV)
  return { slot: 'cet', obdobje: obdobje(d.od, d.do), dosezki }
}

// --- vsebina dni od torka do nedelje ---------------------------------------------

// Pravila igre za reel "How to play". Kopija src/lib/pravila.ts in tockovanje.ts
// (delavec na strežniku nima src/); smoke preveri, da se ujemata.
export const PRAVILA = {
  kader: 15, prvih: 11, proracun: 100, izKluba: 3, kapetan: 3, asistenca: 3, minute: 2,
  pozicije: { GK: 2, DEF: 5, MID: 5, FWD: 3 },
  gol: { GK: 10, DEF: 6, MID: 5, FWD: 4 }, cista: { GK: 5, DEF: 4 },
}

// Reel "How to play" ima tri teme, da se lihi tedni (B) ne ponavljajo: kader in
// proračun, točke, kapetan in pripomočki. Zaporedna liha tedna imata drugo temo.
export const TEME_PRAVIL = ['kader', 'tocke', 'kapetan']
export const temaPravil = (teden) => TEME_PRAVIL[Math.floor(tedenISO(teden) / 2) % TEME_PRAVIL.length]

// Postave ekipe tedna (branilci-vezisti-napadalci); izbere se tista z največ točkami.
const FORMACIJE = [[3, 4, 3], [3, 5, 2], [4, 3, 3], [4, 4, 2], [4, 5, 1], [5, 3, 2], [5, 4, 1]]

/** Igralec z angleškim imenom države, zastavo in števili namesto nizov. */
const zDrzavo = (x) => {
  const o = { ...x, drzava: imeDrzave(x.drzava), zastava: x.drzava ? zastava(x.drzava) : undefined }
  for (const k of ['tocke', 'goli', 'cena', 'staro', 'novo', 'krog', 'ciste', 'tekem', 'prejeti']) if (o[k] != null) o[k] = stevilo(o[k])
  if (o.po_krogih) o.po_krogih = o.po_krogih.map(stevilo)
  return o
}

/** "Sat 24 Oct" */
const dan = (datum) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${datum}T00:00:00Z`))

/** Ekipa tedna: najboljša formacija iz petih najboljših po poziciji (SQL). */
export function izberiEkipo(igralci) {
  const po = (p) => igralci.filter((x) => x.pozicija === p).sort((a, b) => stevilo(b.tocke) - stevilo(a.tocke))
  const [gk, def, mid, fwd] = ['GK', 'DEF', 'MID', 'FWD'].map(po)
  if (!gk.length) return null
  let naj = null
  for (const [d, m, f] of FORMACIJE) {
    if (def.length < d || mid.length < m || fwd.length < f) continue
    const xi = [gk[0], ...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)]
    const vsota = xi.reduce((s, x) => s + stevilo(x.tocke), 0)
    if (!naj || vsota > naj.vsota) naj = { formacija: `${d}-${m}-${f}`, igralci: xi, vsota }
  }
  return naj && { formacija: naj.formacija, igralci: naj.igralci.map(zDrzavo), tocke: naj.vsota }
}

/**
 * Vsebina vrste od torka do nedelje iz dejstev SQL; null, ko ni novice (takrat
 * dan izpade, polnila ni). Reeli dobijo `bpm` za ritem prizorov.
 */
export function vsebinaVrste(d, vrsta, slot) {
  const v = { slot, vrsta, ...(REELI.has(vrsta) ? { bpm: d.bpm ?? 124 } : {}) }
  const seznam = (k, n) => (d[k] ?? []).slice(0, n).map(zDrzavo)
  switch (vrsta) {
    case 'ekipa': {
      const e = izberiEkipo(d.igralci ?? [])
      return e && e.tocke > 0 ? { ...v, obdobje: obdobje(d.od, d.do), ekipa: e } : null
    }
    case 'strelci': {
      const s = seznam('igralci', 5)
      return s.length >= 3 ? { ...v, strelci: s } : null
    }
    case 'liga': {
      const l = d.liga
      if (!l?.lestvica?.length) return null
      return {
        ...v,
        liga: {
          ...l, drzava: imeDrzave(l.drzava), zastava: zastava(l.drzava), krog: stevilo(l.krog), upraviteljev: stevilo(l.upraviteljev),
          lestvica: l.lestvica.map((x) => ({ ...x, mesto: stevilo(x.mesto), tocke: stevilo(x.tocke), tekme: stevilo(x.tekme), razlika: stevilo(x.razlika) })),
          strelec: l.strelec ? { ...l.strelec, goli: stevilo(l.strelec.goli) } : null,
        },
      }
    }
    case 'drzava': {
      const x = d.drzava
      if (!x?.igralci?.length) return null
      const [prvi, ...ostali] = x.igralci
      return {
        ...v, obdobje: obdobje(d.od, d.do),
        drzavaTedna: {
          koda: x.drzava, ime: imeDrzave(x.drzava), zastava: zastava(x.drzava),
          lig: stevilo(x.aktivnih_lig), upraviteljev: stevilo(x.uporabnikov), ekip: stevilo(x.ekip),
          igralec: { ...prvi, tocke: stevilo(prvi.tocke), goli: stevilo(prvi.goli) },
          drugi: ostali.map((o) => ({ ime: o.ime, klub: o.klub, tocke: stevilo(o.tocke) })),
        },
      }
    }
    case 'kapetani': {
      const s = seznam('igralci', 5)
      return s.length && s[0].tocke >= 10 ? { ...v, igralci: s } : null
    }
    case 'cene': {
      const s = seznam('igralci', 5)
      return s.length ? { ...v, obdobje: obdobje(d.od, d.do), igralci: s } : null
    }
    case 'predogled': {
      const tekme = (d.tekme ?? []).slice(0, 4).map((t) => ({
        ...t, drzava: imeDrzave(t.drzava), zastava: zastava(t.drzava), dan: dan(t.datum),
        domaci: { ...t.domaci, mesto: stevilo(t.domaci.mesto), tocke: stevilo(t.domaci.tocke) },
        gostje: { ...t.gostje, mesto: stevilo(t.gostje.mesto), tocke: stevilo(t.gostje.tocke) },
      }))
      return tekme.length ? { ...v, obdobje: obdobje(d.od, d.do), tekme } : null
    }
    case 'pravila':
      return { ...v, pravila: { ...PRAVILA, tema: TEME_PRAVIL.includes(d.tema) ? d.tema : TEME_PRAVIL[0] } }
    case 'stat': {
      if (!(stevilo(d.tekem) > 0)) return null
      const t = d.tekma
      return {
        ...v, obdobje: obdobje(d.od, d.do),
        stat: {
          golov: stevilo(d.golov), tekem: stevilo(d.tekem), lig: stevilo(d.lig), drzav: stevilo(d.drzav),
          naTekmo: Math.round((stevilo(d.golov) / stevilo(d.tekem)) * 10) / 10,
          tekma: t ? { ...t, drzava: imeDrzave(t.drzava), zastava: zastava(t.drzava), goli_domaci: stevilo(t.goli_domaci), goli_gostje: stevilo(t.goli_gostje) } : null,
        },
      }
    }
    case 'obramba': {
      const ekipe = seznam('ekipe', 5)
      const vratarji = seznam('vratarji', 5)
      return ekipe.length || vratarji.length ? { ...v, obramba: { ekipe, vratarji } } : null
    }
  }
  return null
}

/** Povezava v napisu; liga tedna vodi naravnost v svojo ligo. */
export const povezava = (v) => (v?.liga?.slug ? `https://slff.eu/?t=${v.liga.slug}&src=ig` : 'https://slff.eu/?src=ig')

// Naslovi dosežkov v napisu in predlogi (prosojnice imajo svoje v slovarju).
const NASLOV = {
  hattrick: 'Hat-trick hero', najvec: 'Top score of the week', rekord: 'League record', vratar: 'Keeper on the scoresheet',
  cistaMreza: 'Clean-sheet streak', skok: 'Price rise', manager: 'Manager of the week', novi: 'New managers',
}

const igralecEn = (x) => ({ name: prikaz(x.ime), club: x.klub, league: x.liga, country: x.drzava })
const POZICIJA_EN = { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward' }
const CTA = (v) => `👉 Pick your Sunday XI: ${povezava(v)}`

/**
 * Vrste od torka do nedelje: dejstva za Clauda (le kar je na prosojnicah),
 * vrstice predloge napisa (brez Clauda), navodilo za napis in oznaka za Discord.
 */
export const NAPISI = {
  ekipa: {
    oznaka: 'ekipa tedna (reel)',
    poziv: 'The facts are the team of the week: the best XI across Europe\'s Sunday leagues last weekend. One short opener, then name the top scorer of the XI and a couple of others with points. Do not list all eleven.',
    dejstva: (v) => ({
      weekend: v.obdobje, formation: v.ekipa.formacija, total_points: v.ekipa.tocke,
      team_of_the_week: v.ekipa.igralci.map((x) => ({ position: x.pozicija, ...igralecEn(x), points: x.tocke, goals: x.goli })),
    }),
    vrstice: (v) => {
      const naj = [...v.ekipa.igralci].sort((a, b) => b.tocke - a.tocke)[0]
      return [`🏟️ Team of the Week, ${v.obdobje} (${v.ekipa.formacija})`, '',
        ...v.ekipa.igralci.map((x) => `${x.zastava} ${x.pozicija} ${prikaz(x.ime)} (${x.klub}), ${tock(x.tocke)}`),
        '', `⭐ ${prikaz(naj.ime)} leads the XI with ${tock(naj.tocke)}.`]
    },
  },
  strelci: {
    oznaka: 'strelci sezone (reel)',
    poziv: 'The facts are the top scorers of the season across Europe\'s Sunday leagues, in rank order. One short opener, then one line per scorer with rank, name, club and goals.',
    dejstva: (v) => ({ top_scorers_this_season: v.strelci.map((x, i) => ({ rank: i + 1, ...igralecEn(x), goals: x.goli })) }),
    vrstice: (v) => ['🥇 Top scorers in Europe\'s Sunday leagues this season', '',
      ...v.strelci.map((x, i) => `${i + 1}. ${x.zastava} ${prikaz(x.ime)} (${x.klub}), ${goli(x.goli)}`)],
  },
  liga: {
    oznaka: 'liga tedna',
    poziv: 'The facts are the league spotlight: one league, its top 3 in the real table and its top scorer. One short opener about the league, a line for the top 3, a line for the top scorer, and invite people to join this league\'s fantasy game.',
    dejstva: (v) => {
      const l = v.liga
      return {
        league: l.ime, league_short: l.kratko, country: l.drzava, flag: l.zastava, after_round: l.krog, fantasy_managers: l.upraviteljev,
        top_3: l.lestvica.map((x) => ({ position: x.mesto, club: x.ime, points: x.tocke, played: x.tekme })),
        ...(l.strelec ? { top_scorer: { name: prikaz(l.strelec.ime), club: l.strelec.klub, goals: l.strelec.goli } } : {}),
      }
    },
    vrstice: (v) => {
      const l = v.liga
      return [`${l.zastava} League spotlight: ${l.ime} (${l.drzava})`, '',
        ...l.lestvica.map((x) => `${x.mesto}. ${x.ime}, ${tock(x.tocke)}`),
        ...(l.strelec ? ['', `⚽ Top scorer: ${prikaz(l.strelec.ime)} (${l.strelec.klub}), ${goli(l.strelec.goli)}`] : [])]
    },
    cta: (v) => `👉 Join the ${v.liga.kratko} fantasy league: ${povezava(v)}`,
  },
  drzava: {
    oznaka: 'država tedna',
    poziv: 'The facts are the country spotlight: one country with its active leagues, fantasy managers and the best player of the last round. One short opener, a line with the numbers, a line for the player.',
    dejstva: (v) => {
      const x = v.drzavaTedna
      return {
        country: x.ime, flag: x.zastava, active_leagues: x.lig, fantasy_managers: x.upraviteljev, fantasy_teams: x.ekip,
        player_of_the_round: { name: prikaz(x.igralec.ime), club: x.igralec.klub, league: x.igralec.liga, points: x.igralec.tocke, goals: x.igralec.goli },
      }
    },
    vrstice: (v) => {
      const x = v.drzavaTedna
      return [`${x.zastava} Country spotlight: ${x.ime}`, '', `${x.lig} leagues, ${x.upraviteljev} managers, ${x.ekip} fantasy teams.`,
        `⭐ Player of the round: ${prikaz(x.igralec.ime)} (${x.igralec.klub}), ${tock(x.igralec.tocke)}`]
    },
  },
  kapetani: {
    oznaka: 'kapetani (forma)',
    poziv: 'The facts are captain picks for this weekend: the players in the best form across Europe (points in their last three rounds). One short opener, then one line per player with points and price. Captain points count triple.',
    dejstva: (v) => ({
      captain_multiplier: PRAVILA.kapetan, rounds: 3,
      captain_picks: v.igralci.map((x) => ({ ...igralecEn(x), position: POZICIJA_EN[x.pozicija], points_last_3_rounds: x.tocke, price_million: x.cena })),
    }),
    vrstice: (v) => ['©️ Captain picks: the form players of Europe\'s Sunday leagues', '',
      ...v.igralci.map((x) => `${x.zastava} ${prikaz(x.ime)} (${x.klub}), ${tock(x.tocke)} in 3 rounds, €${x.cena}M`)],
  },
  cene: {
    oznaka: 'dvigi cen',
    poziv: 'The facts are the biggest price rises of the week in fantasy prices (in millions of euros). One short opener, then one line per player with old and new price. Only celebrate.',
    dejstva: (v) => ({ week: v.obdobje, price_risers: v.igralci.map((x) => ({ ...igralecEn(x), old_price_million: x.staro, new_price_million: x.novo })) }),
    vrstice: (v) => [`📈 Price risers, ${v.obdobje}`, '', ...v.igralci.map((x) => `${x.zastava} ${prikaz(x.ime)} (${x.klub}), €${x.staro}M → €${x.novo}M`)],
  },
  predogled: {
    oznaka: 'predogled vikenda (reel)',
    poziv: 'The facts are the most interesting fixtures of this weekend in Europe\'s Sunday leagues, with table positions. One short opener, then one line per fixture: the two clubs and their table positions.',
    dejstva: (v) => ({
      weekend: v.obdobje,
      fixtures: v.tekme.map((t) => ({ league: t.liga, country: t.drzava, flag: t.zastava, day: t.dan,
        home: { club: t.domaci.ime, table_position: t.domaci.mesto, points: t.domaci.tocke },
        away: { club: t.gostje.ime, table_position: t.gostje.mesto, points: t.gostje.tocke } })),
    }),
    vrstice: (v) => [`🔥 Weekend preview, ${v.obdobje}`, '',
      ...v.tekme.map((t) => `${t.zastava} ${t.domaci.ime} (${t.domaci.mesto}.) vs ${t.gostje.ime} (${t.gostje.mesto}.), ${t.liga}`)],
  },
  pravila: {
    oznaka: 'kako se igra (reel)',
    poziv: 'The facts are one part of the SLFF rules (the "topic"). Explain that part in a few short, fun lines; do not add rules that are not in the facts.',
    dejstva: (v) => {
      const p = v.pravila
      if (p.tema === 'tocke') {
        return {
          topic: 'scoring', goal_points: { goalkeeper: p.gol.GK, defender: p.gol.DEF, midfielder: p.gol.MID, forward: p.gol.FWD },
          clean_sheet_points: { goalkeeper: p.cista.GK, defender: p.cista.DEF }, assist_points: p.asistenca, points_for_60_minutes: p.minute,
        }
      }
      if (p.tema === 'kapetan') {
        return {
          topic: 'captain and chips', captain_points_multiplier: p.kapetan,
          vice_captain: 'takes the armband if the captain does not play', chips: ['Wildcard', 'Bench+'],
        }
      }
      return {
        topic: 'squad and budget', squad_players: p.kader, starting_players: p.prvih, budget_million_euro: p.proracun,
        max_players_per_club: p.izKluba, squad_by_position: p.pozicije,
      }
    },
    vrstice: (v) => {
      const p = v.pravila
      if (p.tema === 'tocke') {
        return ['📋 How to play SLFF: points', '', `⚽ A goal: ${p.gol.FWD} (FWD) to ${p.gol.GK} (GK) points.`,
          `🧤 A clean sheet: GK ${p.cista.GK}, DEF ${p.cista.DEF}.`, `🅰️ An assist: ${p.asistenca}. Playing 60 minutes: ${p.minute}.`]
      }
      if (p.tema === 'kapetan') {
        return ['📋 How to play SLFF: captain and chips', '', `©️ Your captain scores ×${p.kapetan}.`,
          '🔁 The vice-captain takes the armband if the captain does not play.', '🃏 Chips: Wildcard and Bench+.']
      }
      return ['📋 How to play SLFF: your squad', '', `👕 Pick ${p.kader} players with €${p.proracun}M, ${p.prvih} start.`,
        `🧩 ${p.pozicije.GK} GK, ${p.pozicije.DEF} DEF, ${p.pozicije.MID} MID, ${p.pozicije.FWD} FWD.`, `🏟️ At most ${p.izKluba} from one club.`]
    },
  },
  stat: {
    oznaka: 'številka tedna',
    poziv: 'The facts are the stat of the week across Europe\'s Sunday leagues: goals, matches, leagues and countries, and maybe a goal-fest match of the week where both teams scored at least three. A celebratory, fun tone.',
    dejstva: (v) => {
      const s = v.stat
      return {
        week: v.obdobje, goals: s.golov, matches: s.tekem, leagues: s.lig, countries: s.drzav, goals_per_match: s.naTekmo,
        ...(s.tekma ? { goal_fest: { league: s.tekma.liga, country: s.tekma.drzava, home: s.tekma.domaci, away: s.tekma.gostje, score: `${s.tekma.goli_domaci}-${s.tekma.goli_gostje}` } } : {}),
      }
    },
    vrstice: (v) => {
      const s = v.stat
      return [`📊 Stat of the week, ${v.obdobje}`, '', `⚽ ${s.golov.toLocaleString('en-GB')} goals in ${s.tekem.toLocaleString('en-GB')} matches, ${s.lig} leagues, ${s.drzav} countries.`,
        `That is ${s.naTekmo} goals per match.`,
        ...(s.tekma ? [`🎆 Goal fest: ${s.tekma.domaci} ${s.tekma.goli_domaci}-${s.tekma.goli_gostje} ${s.tekma.gostje} (${s.tekma.liga})`] : [])]
    },
  },
  obramba: {
    oznaka: 'najboljše obrambe',
    poziv: 'The facts are the best defences of the season: clubs with the fewest goals conceded per match and goalkeepers with the most clean sheets. One short opener, then a short line for the top club and the top goalkeeper, maybe one more each.',
    dejstva: (v) => ({
      tightest_defences: v.obramba.ekipe.map((x) => ({ club: x.ime, league: x.liga, country: x.drzava, played: x.tekem, conceded: x.prejeti })),
      clean_sheet_kings: v.obramba.vratarji.map((x) => ({ ...igralecEn(x), clean_sheets: x.ciste })),
    }),
    vrstice: (v) => ['🧱 Best defences of the season', '',
      ...v.obramba.ekipe.map((x) => `${x.zastava} ${x.ime}: ${x.prejeti} conceded in ${x.tekem} matches`),
      ...(v.obramba.vratarji.length ? ['', '🧤 Clean-sheet kings', ...v.obramba.vratarji.map((x) => `${x.zastava} ${prikaz(x.ime)} (${x.klub}), ${x.ciste} clean sheets`)] : [])],
  },
}

/** Kar dobi Claude: imena v prikazni obliki, brez grbov in id-jev. */
export function dejstvaZaNapis(v) {
  if (v.mejnik) {
    const m = v.mejnik
    return { milestone_users: m.mejnik, users_now: m.uporabnikov, countries: m.drzav, active_leagues: m.lig, fantasy_teams: m.ekip }
  }
  if (v.vrsta && NAPISI[v.vrsta]) return NAPISI[v.vrsta].dejstva(v)
  if (v.drzave) {
    return {
      weekend: v.obdobje,
      countries: v.drzave.map((x) => ({
        country: x.ime, flag: x.zastava,
        player_of_the_round: { name: prikaz(x.igralec.ime), club: x.igralec.klub, league: x.igralec.liga, round: x.igralec.krog, points: x.igralec.tocke, goals: x.igralec.goli },
        runners_up: x.drugi.map((o) => ({ name: prikaz(o.ime), club: o.klub, points: o.tocke })),
      })),
    }
  }
  return {
    week: v.obdobje,
    achievements: v.dosezki.map((x) => {
      const o = { achievement: NASLOV[x.vrsta] }
      if (x.ime) Object.assign(o, { name: prikaz(x.ime), club: x.klub, league: x.liga })
      if (x.drzava) Object.assign(o, { country: x.drzava, flag: x.zastava })
      const polja = { goli: 'goals', tocke: 'points', krog: 'round', prej: 'previous_record', staro: 'old_price', novo: 'new_price', niz: 'clean_sheets_in_a_row', stevilo: 'new_managers', uporabnikov: 'managers_total' }
      for (const [k, en] of Object.entries(polja)) if (x[k] !== undefined) o[en] = x[k]
      if (x.vrsta === 'manager') o.note = 'anonymous fantasy manager, never named'
      return o
    }),
  }
}

// --- preverba napisa ------------------------------------------------------------

// Angleško: "4,000" je tisoč (vejica loči tisočice), "8.2" decimalka.
const STEVILO = /\d{1,3}(?:,\d{3})+(?!\d)|\d+(?:\.\d+)?/g
const normaliziraj = (s) => String(Number(s.replace(/,/g, '')))
// Besede z veliko začetnico, ki niso imena iz dejstev, a so v (angleškem) napisu dovoljene.
const DOVOLJENE = ['SLFF', 'XI', 'Ideal', 'Fantasy', 'Instagram', 'Facebook', 'Europe', 'MVP', 'GOAT', 'OK', 'Round', 'Player', 'League',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Thank', 'Thanks',
  'Weekend', 'Week', 'Achievements', 'Pick', 'Team', 'Captain', 'Captains', 'Price', 'Risers', 'Preview', 'Spotlight',
  'Defence', 'Defences', 'Clean', 'Sheet', 'Sheets', 'Stat', 'Goals', 'Rules', 'How', 'Top', 'Scorers', 'Season', 'Country',
  'Kings', 'Join', 'Build', 'Golden', 'Boot', 'GK', 'DEF', 'MID', 'FWD', 'Sat', 'Sun', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Match']

/**
 * Napis sme omeniti le števila in imena iz dejstev. Vrne seznam tujih
 * (prazen = v redu). Povezave in ključniki (#…) se ne preverjajo. Ime je
 * beseda z veliko začetnico sredi stavka; svojilni 's odpade, zloženka
 * ("Sunday-league") je znana, če je znan vsak del.
 */
export function preveriNapis(napis, dejstva) {
  const besedilo = String(napis).replace(/https?:\/\/\S+/g, ' ').replace(/#[\p{L}\p{N}_]+/gu, ' ')
  const vir = JSON.stringify(dejstva)
  const stevila = new Set((vir.match(STEVILO) ?? []).map(normaliziraj))
  // Okrajšave ("St.") veljajo tudi brez pike, kot jih vidi spodnje iskanje besed.
  const besede = new Set([...(vir.match(/[\p{L}][\p{L}'’.-]*/gu) ?? []), ...DOVOLJENE].flatMap((b) => [b, b.replace(/\.+$/, '')]).map((b) => b.toLowerCase()))
  const znana = (z) => {
    const brez = z.replace(/['’]s$/, '')
    return besede.has(brez.toLowerCase()) || brez.split('-').every((d) => !/^\p{Lu}/u.test(d) || besede.has(d.toLowerCase()))
  }
  const tuje = []
  for (const s of besedilo.match(STEVILO) ?? []) if (!stevila.has(normaliziraj(s))) tuje.push(s)
  for (const m of besedilo.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
    const z = m[0]
    // Začetek stavka ali vrstice (tudi za čustvenčkom) je izvzet.
    const sredi = /[\p{L}\p{N},;]$/u.test(besedilo.slice(0, m.index).trimEnd())
    if (/^\p{Lu}/u.test(z) && z.length >= 2 && sredi && !znana(z)) tuje.push(z)
  }
  return [...new Set(tuje)]
}

// --- napis ----------------------------------------------------------------------

const goli = (n) => `${n} ${n === 1 ? 'goal' : 'goals'}`
const tock = (n) => `${n} ${n === 1 ? 'point' : 'points'}`
const cenaEn = (x) => `€${x}M`

/** Vrednost dosežka v predlogi napisa (angleško). */
export function vrednostDosezka(x) {
  switch (x.vrsta) {
    case 'hattrick':
    case 'vratar': return goli(x.goli)
    case 'najvec': return tock(x.tocke)
    case 'rekord': return `${tock(x.tocke)}, previous record ${x.prej}`
    case 'cistaMreza': return `${x.niz} clean sheets in a row`
    case 'skok': return `${cenaEn(x.staro)} → ${cenaEn(x.novo)}`
    case 'manager': return `a manager in ${x.drzava} scored ${tock(x.tocke)}`
    case 'novi': return `${x.stevilo} new managers joined, ${x.uporabnikov.toLocaleString('en-GB')} in total`
  }
}

/** Napis brez Clauda: suha dejstva, vedno pravilna. */
export function predlogaNapisa(v) {
  const vrstice = []
  if (v.vrsta && NAPISI[v.vrsta]) {
    const n = NAPISI[v.vrsta]
    vrstice.push(...n.vrstice(v), '', (n.cta ?? CTA)(v))
  } else if (v.mejnik) {
    const m = v.mejnik
    vrstice.push(`🎉 ${m.mejnik.toLocaleString('en-GB')} managers on SLFF! Thank you all.`,
      `⚽ ${m.lig} leagues in ${m.drzav} countries, ${m.ekip.toLocaleString('en-GB')} fantasy teams.`,
      '', `👉 Build your team: ${povezava(v)}`)
  } else if (v.drzave) {
    vrstice.push(`⚽ Weekend in Europe's Sunday leagues, ${v.obdobje}`, '')
    for (const x of v.drzave) vrstice.push(`${x.zastava} ${x.ime}: ${prikaz(x.igralec.ime)} (${x.igralec.klub}), ${tock(x.igralec.tocke)}`)
    vrstice.push('', `👉 Pick your Sunday XI: ${povezava(v)}`)
  } else {
    vrstice.push(`🏆 Achievements of the week, ${v.obdobje}`, '')
    for (const x of v.dosezki) {
      vrstice.push(`${x.zastava ?? '⭐'} ${NASLOV[x.vrsta]}: ${x.ime ? `${prikaz(x.ime)} (${x.klub}), ` : ''}${vrednostDosezka(x)}`)
    }
    vrstice.push('', `👉 Pick your Sunday XI: ${povezava(v)}`)
  }
  vrstice.push('', '#SLFF #fantasyfootball #football')
  return vrstice.join('\n')
}

export function sistemskiPoziv(link, slot, vrsta) {
  const vsebina = NAPISI[vrsta]?.poziv ?? {
    mejnik: 'This post celebrates SLFF reaching milestone_users users. Thank the community warmly; you may mention the countries, active leagues and fantasy teams counts. Write numbers from 1,000 up with a thousands comma (4,000). At most 6 short lines plus hashtags.',
    pon: "The facts are last weekend's top players in Europe's Sunday leagues, one entry per country. Write one short opener line, then exactly one line per country in the given order: its flag, the country name and its player of the round with points. Nothing else per country.",
    cet: 'The facts are the achievements of the week. Write one short opener line, then one short line per achievement in the given order. A fantasy manager is always anonymous: say "a manager in <country>", never a name.',
  }[slot]
  return [
    'You write Instagram/Facebook captions for SLFF, a free fantasy football game for amateur and regional leagues (slff.eu).',
    'Write in English. Tone: goofy, warm, a bit cheeky, Sunday-league humour, never mean to a player. Keep every line short.',
    vsebina,
    'Use ONLY the facts in the user message. Every number and every player, club, league or country name you write must appear in the facts exactly as given.',
    'Do not invent results, opponents, dates, minutes, nicknames or anything else. Do not mention any user, fantasy team or manager by name.',
    'Only celebrate: every player, club and league in the post is praised. Never point out a bad performance, a price drop or a mistake.',
    'Humour comes from Sunday-league life in general (muddy pitches, Monday-morning legs, the post-match beer, the bus to the away game), never at a named person.',
    `End with a call to action and this exact link on its own line: ${link}`,
    'Then 3 to 6 hashtags (include #SLFF). Plain text, emojis allowed, no markdown.',
  ].join('\n')
}

async function klicClaude(kljuc, sistem, sporocilo) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': kljuc, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: sistem, messages: [{ role: 'user', content: sporocilo }] }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const o = await r.json()
  // Model najprej razmišlja; odrezan napis ne sme naprej.
  if (o.stop_reason === 'max_tokens') throw new Error('Anthropic: napis odrezan (max_tokens)')
  return o.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
}

/** Napis: Claude dvakrat, nato predloga. Vrne { napis, vir, zavrnjeno }. */
export async function napis(v, kljuc, klic = klicClaude) {
  const dejstva = dejstvaZaNapis(v)
  const link = povezava(v)
  const zavrnjeno = []
  if (kljuc) {
    for (let poskus = 0; poskus < 2; poskus++) {
      try {
        let besedilo = await klic(kljuc, sistemskiPoziv(link, v.slot, v.vrsta), `Facts (JSON):\n${JSON.stringify(dejstva, null, 2)}`)
        const tuje = preveriNapis(besedilo, dejstva)
        if (!tuje.length) {
          if (!besedilo.includes(link)) besedilo += `\n\n${link}`
          return { napis: besedilo, vir: 'claude', zavrnjeno }
        }
        zavrnjeno.push({ besedilo, tuje })
      } catch (e) {
        zavrnjeno.push({ napaka: e.message })
      }
    }
  }
  return { napis: predlogaNapisa(v), vir: 'predloga', zavrnjeno }
}

// --- prosojnice -------------------------------------------------------------------

/** Posname prosojnice strani /objava; vrne poti JPEG (Instagram sprejme le JPEG). */
export async function posnemi(v, url, mapa) {
  const { chromium } = await import('playwright')
  await mkdir(mapa, { recursive: true })
  const brskalnik = await chromium.launch({ headless: true })
  try {
    // Na strežniku slff.eu kaže nase (/etc/hosts), Caddy pa ima Cloudflarov izvorni certifikat,
    // ki mu brskalnik ne zaupa. Stran beremo le z lastnega strežnika.
    const ctx = await brskalnik.newContext({ viewport: { width: 1080, height: 1350 }, ignoreHTTPSErrors: true })
    // Statistika obiska (Umami) ne šteje robota.
    await ctx.route(/stats\.slff\.eu/, (r) => r.abort())
    await ctx.addInitScript(([vsebina, j]) => {
      window.__OBJAVA__ = vsebina
      localStorage.setItem('slff-jezik-izbran', j)
    }, [v, JEZIK])
    const stran = await ctx.newPage()
    const poti = []
    let n = 1
    for (let i = 0; i < n; i++) {
      await stran.goto(`${url}/objava?slide=${i}`, { waitUntil: 'networkidle' })
      await stran.locator('#prosojnica').waitFor()
      await stran.evaluate(() => document.fonts.ready)
      if (i === 0) n = Number(await stran.evaluate(() => document.documentElement.dataset.prosojnic)) || 1
      const pot = join(mapa, `${i + 1}.jpg`)
      await stran.locator('#prosojnica').screenshot({ path: pot, type: 'jpeg', quality: 90 })
      poti.push(pot)
    }
    return poti
  } finally {
    await brskalnik.close()
  }
}

// --- reel (video z glasbo) ---------------------------------------------------------

// Skladbe z licenco, ki dovoli rabo v videih na družbenih omrežjih (README v mapi).
export const MAPA_GLASBE = fileURLToPath(new URL('./objave-glasba/', import.meta.url))
const FPS = 30

/** Najmanj nedavno rabljena skladba: nikoli rabljena najprej, nato najstarejša raba. */
export function najmanjRabljena(datoteke, rabe) {
  const zadnja = new Map()
  for (const r of rabe) zadnja.set(r.glasba, Math.max(zadnja.get(r.glasba) ?? 0, Date.parse(r.ustvarjeno)))
  return [...datoteke].sort((a, b) => (zadnja.get(a) ?? 0) - (zadnja.get(b) ?? 0) || a.localeCompare(b))[0] ?? null
}

/** Začetek skladbe v sekundah (0–12, desetinke), iz semena reela. */
export const zacetekGlasbe = (seme) => (seme % 121) / 10

/** Skladba iz scripts/objave-glasba/ (mp3, m4a, wav); null = sintetizirana zanka. */
export async function izberiGlasbo(db, mapa = MAPA_GLASBE) {
  const datoteke = (await readdir(mapa).catch(() => [])).filter((f) => /\.(mp3|m4a|wav)$/i.test(f))
  if (!datoteke.length) return null
  if (!db) return datoteke[Math.floor(Math.random() * datoteke.length)]
  const { data, error } = await db.from('objave').select('glasba, ustvarjeno').in('glasba', datoteke)
  if (error) throw new Error(`objave glasba: ${error.message}`)
  return najmanjRabljena(datoteke, data ?? [])
}

/** Ponovljivo naključje (mulberry32). */
function nakljucje(seme) {
  let a = seme >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Akordi (polton od tonike, mol?) in vzorci basa/akordov po šestnajstinkah takta.
const NAPREDOVANJA = [
  [[0, 0], [7, 0], [9, 1], [5, 0]], [[9, 1], [5, 0], [0, 0], [7, 0]], [[0, 0], [9, 1], [5, 0], [7, 0]],
  [[0, 1], [8, 0], [3, 0], [10, 0]], [[0, 1], [10, 0], [8, 0], [7, 0]],
]
const BAS = ['1010101010101010', '1001001010010010', '1000101010001011', '1011001010110010']
const AKORDI = ['0010001000100010', '0000100000001000', '0010000100100001', '0001001000010010']

/**
 * Brez licenčnih skrbi: kratka plesna zanka (boben, hi-hat, bas, akordi,
 * arpeggio), ~124 BPM, seme da vsakemu reelu drugo tonaliteto in vzorce.
 * Vrne WAV (44,1 kHz, 16 bit, stereo).
 */
export function sintetiziraj({ trajanje, bpm = 124, seme = 1 }) {
  const hz = 44100
  const n = Math.ceil(trajanje * hz)
  const L = new Float32Array(n)
  const R = new Float32Array(n)
  const rnd = nakljucje(seme)
  const izberi = (a) => a[Math.floor(rnd() * a.length)]
  const tonika = 40 + Math.floor(rnd() * 8) // E2–B2
  const napr = izberi(NAPREDOVANJA)
  const bas = izberi(BAS)
  const akordi = izberi(AKORDI)
  const arp = Array.from({ length: 16 }, () => rnd() < 0.45)
  const valovanje = rnd() < 0.5 ? 'zaga' : 'kvadrat'
  const f = (midi) => 440 * 2 ** ((midi - 69) / 12)
  const korak = 60 / bpm / 4
  const dodaj = (zacetek, dolzina, glas, pan = 0) => {
    const i0 = Math.floor(zacetek * hz)
    const m = Math.min(Math.floor(dolzina * hz), n - i0)
    for (let i = 0; i < m; i++) {
      const x = glas(i / hz, i)
      L[i0 + i] += x * (1 - pan)
      R[i0 + i] += x * (1 + pan)
    }
  }
  const sum = () => rnd() * 2 - 1
  const val = (faza) => (valovanje === 'zaga' ? 2 * (faza % 1) - 1 : faza % 1 < 0.5 ? 0.7 : -0.7)
  const korakov = Math.ceil(trajanje / korak)
  for (let s = 0; s < korakov; s++) {
    const t = s * korak
    const v16 = s % 16
    const takt = Math.floor(s / 16)
    const [stopnja, mol] = napr[takt % 4]
    const uvod = takt === 0 // prvi takt brez basa in bobna: zagon
    // Boben na vsako dobo, ploskanje na 2 in 4, hi-hat na osminke (odprt na "in").
    if (!uvod && v16 % 4 === 0) {
      let faza = 0
      dodaj(t, 0.35, (x) => {
        faza += (48 + 110 * Math.exp(-x * 28)) / hz
        return Math.sin(2 * Math.PI * faza) * Math.exp(-x * 7) * 0.95
      })
    }
    if (!uvod && (v16 === 4 || v16 === 12)) dodaj(t, 0.22, (x) => (sum() * 0.5 + Math.sin(2 * Math.PI * 190 * x) * 0.3) * Math.exp(-x * 18) * 0.6)
    if (v16 % 2 === 0) {
      let prej = 0
      const odprt = v16 % 4 === 2
      dodaj(t, odprt ? 0.18 : 0.05, (x) => {
        const s0 = sum()
        const y = s0 - prej
        prej = s0
        return y * Math.exp(-x * (odprt ? 22 : 70)) * 0.13
      }, v16 % 4 === 2 ? 0.3 : -0.3)
    }
    // Bas (oktava pod toniko), sledi akordu.
    if (!uvod && bas[v16] === '1') {
      const fr = f(tonika + stopnja - 12 * (stopnja > 6 ? 1 : 0))
      let lp = 0
      dodaj(t, korak * 1.8, (x) => {
        lp += (val(fr * x) - lp) * 0.08
        return lp * Math.exp(-x * 5) * 0.5
      })
    }
    // Akordi (trizvok, dva rahlo razglašena glasova, levo in desno).
    if (akordi[v16] === '1') {
      const koren = tonika + 24 + stopnja
      for (const [i, int] of [0, mol ? 3 : 4, 7].entries()) {
        const fr = f(koren + int)
        let lp = 0
        dodaj(t, korak * 2.5, (x) => {
          lp += ((val(fr * x) + val(fr * 1.006 * x)) / 2 - lp) * 0.2
          return lp * Math.exp(-x * 9) * 0.11
        }, (i - 1) * 0.4)
      }
    }
    // Arpeggio (zvonček) v drugi polovici in naprej.
    if (takt >= 1 && arp[v16]) {
      const ton = tonika + 36 + stopnja + [0, mol ? 3 : 4, 7, 12][v16 % 4]
      dodaj(t, korak * 1.5, (x) => Math.sin(2 * Math.PI * f(ton) * x) * Math.exp(-x * 14) * 0.12, (v16 % 3 - 1) * 0.5)
    }
  }
  // Mehka nasičenost in izenačitev.
  let vrh = 0
  for (let i = 0; i < n; i++) {
    L[i] = Math.tanh(L[i] * 1.3)
    R[i] = Math.tanh(R[i] * 1.3)
    vrh = Math.max(vrh, Math.abs(L[i]), Math.abs(R[i]))
  }
  const k = vrh > 0 ? 0.6 / vrh : 1 // tišje od skladb (−14 LUFS)
  const wav = Buffer.alloc(44 + n * 4)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + n * 4, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(2, 22)
  wav.writeUInt32LE(hz, 24)
  wav.writeUInt32LE(hz * 4, 28)
  wav.writeUInt16LE(4, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    wav.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4)
    wav.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4)
  }
  return wav
}

/**
 * Posname reel strani /objava?reel=1: animacije (CSS in WAAPI) ustavi in vsako
 * sličico nastavi na točen čas, zato je video gladek tudi na počasnem
 * strežniku. Sličice gredo v ffmpeg (H.264 + AAC, 30 fps, faststart).
 * Vrne [video.mp4, naslovnica.jpg].
 */
// Reel: Instagram sprejme 3–90 s; vse posnetje mora končati v REEL_ROK.
export const REEL_TRAJANJE = [3, 90]
export const REEL_ROK = 6 * 60e3

/** Največja poraba pomnilnika procesa v MB (Linux: /proc/<pid>/status VmHWM); null drugje. */
async function vrhPomnilnika(pid) {
  try {
    const m = (await readFile(`/proc/${pid}/status`, 'utf8')).match(/VmHWM:\s+(\d+) kB/)
    return m ? Math.round(Number(m[1]) / 1024) : null
  } catch {
    return null
  }
}

/**
 * Posname reel strani /objava?reel=1: animacije (CSS in WAAPI) ustavi in vsako
 * sličico nastavi na točen čas, zato je video gladek tudi na počasnem
 * strežniku. Sličice gredo v ffmpeg (H.264 + AAC, 30 fps, faststart).
 * Neuspeh (ffmpeg, brskalnik, REEL_ROK) vrže napako; ffmpeg in brskalnik se
 * vedno ustavita. Vrne [video.mp4, naslovnica.jpg].
 */
export async function posnemiReel(v, url, mapa, { glasba = null, seme = 1, rok = REEL_ROK } = {}) {
  const { chromium } = await import('playwright')
  await mkdir(mapa, { recursive: true })
  const brskalnik = await chromium.launch({ headless: true })
  let ff = null
  let casovnik
  const prekinitev = new Promise((_, ne) => {
    casovnik = setTimeout(() => ne(new Error(`reel: posnetje ni končalo v ${Math.round(rok / 1000)} s`)), rok)
  })
  const posnemi = async () => {
    const ctx = await brskalnik.newContext({ viewport: { width: 1080, height: 1920 }, ignoreHTTPSErrors: true })
    await ctx.route(/stats\.slff\.eu/, (r) => r.abort())
    await ctx.addInitScript(([vsebina, j]) => {
      window.__OBJAVA__ = vsebina
      localStorage.setItem('slff-jezik-izbran', j)
    }, [v, JEZIK])
    const stran = await ctx.newPage()
    await stran.goto(`${url}/objava?reel=1`, { waitUntil: 'networkidle' })
    await stran.locator('#prosojnica').waitFor()
    await stran.waitForFunction(() => document.documentElement.dataset.trajanje)
    await stran.evaluate(() => document.fonts.ready)
    await stran.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
    const trajanje = Number(await stran.evaluate(() => document.documentElement.dataset.trajanje))
    if (!(trajanje >= REEL_TRAJANJE[0] && trajanje <= REEL_TRAJANJE[1])) throw new Error(`reel: trajanje ${trajanje} s ni med ${REEL_TRAJANJE.join(' in ')} s`)
    const naslovnicaOb = Number(await stran.evaluate(() => document.documentElement.dataset.naslovnica ?? 1.5))
    let zvok
    if (glasba) zvok = join(MAPA_GLASBE, glasba)
    else {
      zvok = join(mapa, 'glasba.wav')
      await writeFile(zvok, sintetiziraj({ trajanje, bpm: v.bpm, seme }))
    }
    const video = join(mapa, 'reel.mp4')
    const naslovnica = join(mapa, 'naslovnica.jpg')
    // Strežnik ima eno jedro in 1,5 GB: hiter preset, ena nit, kratek pogled naprej.
    ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      // Skladba (30 s): naključen začetek v prvih 12 s, da reeli z isto skladbo zvenijo drugače.
      ...(glasba ? ['-stream_loop', '-1', '-ss', String(zacetekGlasbe(seme)), '-accurate_seek'] : []), '-i', zvok,
      '-map', '0:v:0', '-map', '1:a:0', '-t', String(trajanje),
      '-af', `afade=t=in:st=0:d=0.4,afade=t=out:st=${Math.max(trajanje - 1.5, 0)}:d=1.5`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-threads', '1', '-x264-params', 'rc-lookahead=10', '-crf', '21',
      '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2),
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', video,
    ], { stdio: ['pipe', 'ignore', 'pipe'] })
    let napaka = ''
    ff.stderr.on('data', (x) => { napaka = (napaka + x).slice(-2000) })
    // Zgodnji izhod ffmpeg: zapis v cev da EPIPE, ki ne sme podreti delavca.
    ff.stdin.on('error', () => {})
    const konec = new Promise((ok, ne) => {
      ff.on('error', ne)
      ff.on('close', (koda) => (koda === 0 ? ok() : ne(new Error(`ffmpeg ${koda}: ${napaka.slice(-500)}`))))
    })
    konec.catch(() => {}) // obdelamo spodaj; brez tega bi zgodnja napaka postala neobdelana
    let koncan = false
    konec.then(() => { koncan = true }, () => { koncan = true })
    let vrhFf = null
    const slik = Math.round(trajanje * FPS)
    for (let i = 0; i < slik; i++) {
      if (koncan) await konec // ffmpeg je odšel pred koncem: vrže njegovo napako
      await stran.evaluate((ms) => {
        for (const a of document.getAnimations()) {
          a.pause()
          a.currentTime = ms
        }
      }, (i * 1000) / FPS)
      const slika = await stran.screenshot({ type: 'jpeg', quality: 92 })
      if (i === Math.round(naslovnicaOb * FPS)) await writeFile(naslovnica, slika)
      if (!ff.stdin.write(slika)) await Promise.race([new Promise((r) => ff.stdin.once('drain', r)), konec])
      if (i % FPS === 0) vrhFf = (await vrhPomnilnika(ff.pid)) ?? vrhFf
    }
    ff.stdin.end()
    await konec
    const mb = (x) => (x == null ? '?' : `${x} MB`)
    console.log(`${new Date().toISOString()} Reel ${v.vrsta}: ${slik} sličic, pomnilnik vrh node ${mb(Math.round(process.resourceUsage().maxRSS / 1024))}, ffmpeg ${mb(vrhFf)}`)
    return [video, naslovnica]
  }
  const delo = posnemi()
  delo.catch(() => {}) // po prekinitvi se delo konča z napako zaprtega brskalnika; ta ni več pomembna
  try {
    return await Promise.race([delo, prekinitev])
  } finally {
    clearTimeout(casovnik)
    if (ff && ff.exitCode === null) ff.kill('SIGKILL')
    await brskalnik.close().catch(() => {})
  }
}


// --- Discord ------------------------------------------------------------------------

/** Povzetek dejstev za človeka (Discord, --suho). */
export function povzetek(v) {
  if (v.vrsta && NAPISI[v.vrsta]) return NAPISI[v.vrsta].vrstice(v).filter(Boolean).join('\n')
  if (v.mejnik) {
    const m = v.mejnik
    return `Mejnik: ${m.mejnik} uporabnikov (zdaj ${m.uporabnikov}), ${m.drzav} držav, ${m.lig} aktivnih lig, ${m.ekip} ekip`
  }
  const vr = [v.obdobje]
  if (v.drzave) {
    for (const x of v.drzave) {
      const i = x.igralec
      vr.push(`${x.koda}: ${prikaz(i.ime)} (${i.klub}, ${i.liga}, ${i.krog}. krog) ${i.tocke} t, ${i.goli} gol.; `
        + x.drugi.map((o) => `${prikaz(o.ime)} ${o.tocke}`).join(', '))
    }
  } else {
    for (const x of v.dosezki) vr.push(`${x.vrsta}: ${x.ime ? `${prikaz(x.ime)} (${x.klub}, ${x.liga}) ` : ''}${vrednostDosezka(x)}`)
  }
  return vr.join('\n')
}

// Discord brez Nitra sprejme do 10 MB na sporočilo; večji video gre kot povezava.
export const DISCORD_NAJVEC = 9.5e6

/** Priponke osnutka: slike (JPEG) in video (MP4); prevelik video je povezava. */
async function vDiscord(webhook, { naslov, napis: besedilo, povzetek: pov, poti, povezave = {} }) {
  const obrazec = new FormData()
  const vec = []
  let i = 0
  let skupaj = 0
  for (const pot of poti) {
    const mp4 = pot.endsWith('.mp4')
    // Meja velja za vse priponke skupaj; kar je ne prestane, gre kot povezava.
    const velikost = (await stat(pot)).size
    if (skupaj + velikost > DISCORD_NAJVEC) {
      vec.push(`${mp4 ? '🎬 Video' : '🖼️ Slika'} (prevelik za Discord): <${povezave[pot] ?? pot}>`)
      continue
    }
    skupaj += velikost
    obrazec.append(`files[${i}]`, new Blob([await readFile(pot)], { type: mp4 ? 'video/mp4' : 'image/jpeg' }), mp4 ? 'reel.mp4' : `${i + 1}.jpg`)
    i++
  }
  obrazec.append('payload_json', JSON.stringify({
    content: `${naslov}\n${vec.map((x) => `${x}\n`).join('')}\`\`\`\n${pov.slice(0, 1600)}\n\`\`\``,
    embeds: [{ title: 'Napis', description: besedilo.slice(0, 4000) }],
    allowed_mentions: { parse: [] },
  }))
  const r = await fetch(webhook, { method: 'POST', body: obrazec })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
}

async function sporociDiscord(webhook, content) {
  if (!webhook) return
  const r = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
  })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
}

// --- ustavitev ------------------------------------------------------------------

/** sha256 žetona, kot ga računa SQL ustavi_objavo (hex). */
export const hashZetona = (zeton) => createHash('sha256').update(zeton, 'utf8').digest('hex')

/** Enkraten žeton (256 bitov) in povezava; # ne gre v dnevnike strežnika. */
export function novZeton(url) {
  const zeton = randomBytes(32).toString('base64url')
  return { zeton, hash: hashZetona(zeton), povezava: `${url}/objava#ustavi=${zeton}` }
}

// --- objava (Meta) ----------------------------------------------------------------

export const metaNastavljena = (env) => Boolean(env.META_PAGE_TOKEN && env.META_PAGE_ID && env.META_IG_USER_ID)

/** Ali je osnutek zdaj za objavo: viden na Discordu, ni ustavljen, rok je mimo, a ne več kot OBJAVA_ZAMUDA. */
export function zaObjavo(o, zdaj) {
  const rok = Date.parse(o.objava_ob)
  return o.stanje === 'osnutek' && Boolean(o.discord_at) && zdaj >= rok && zdaj - rok <= OBJAVA_ZAMUDA
}

/** Javni naslov slike: <base>/<mapa osnutka>/<n>.jpg (Caddy, /objave-mediji/). */
export const javniUrl = (pot, mapa, base) =>
  `${base.replace(/\/$/, '')}/${relative(mapa, pot).split(/[\\/]/).map(encodeURIComponent).join('/')}`

const grafOsnova = (env) => `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v26.0'}`

/** Klic Graph API (POST obrazec ali GET); napaka Mete postane Error brez žetona. */
async function graf(f, osnova, pot, parametri, metoda = 'POST') {
  const telo = new URLSearchParams(parametri)
  const r = metoda === 'GET' ? await f(`${osnova}/${pot}?${telo}`) : await f(`${osnova}/${pot}`, { method: 'POST', body: telo })
  const o = await r.json().catch(() => ({}))
  if (!r.ok || o.error) throw new Error(`Meta ${pot}: ${o.error?.message ?? r.status}`)
  return o
}

/** Počaka, da je vsebnik Instagrama pripravljen (FINISHED), največ `krat` × 10 s (5 minut, video 10). */
async function pripravljen(f, osnova, id, token, cakajMs, krat = 30) {
  for (let i = 0; i < krat; i++) {
    const { status_code: s } = await graf(f, osnova, id, { fields: 'status_code', access_token: token }, 'GET')
    if (s === 'FINISHED') return
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`Meta vsebnik ${id}: ${s}`)
    await cakajMs(10e3)
  }
  throw new Error(`Meta vsebnik ${id}: ni pripravljen v ${krat / 6} minutah`)
}

/** Instagram: ena slika ali vrtiljak (največ 10). Vrne povezavo do objave. */
export async function objaviInstagram({ slike, napis: besedilo, env, f = fetch, cakajMs = cakaj }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const ig = env.META_IG_USER_ID
  let vsebnik
  if (slike.length === 1) {
    vsebnik = (await graf(f, osnova, `${ig}/media`, { image_url: slike[0], caption: besedilo, access_token: token })).id
  } else {
    const otroci = []
    for (const url of slike.slice(0, 10)) {
      otroci.push((await graf(f, osnova, `${ig}/media`, { image_url: url, is_carousel_item: 'true', access_token: token })).id)
    }
    for (const id of otroci) await pripravljen(f, osnova, id, token, cakajMs)
    vsebnik = (await graf(f, osnova, `${ig}/media`, { media_type: 'CAROUSEL', children: otroci.join(','), caption: besedilo, access_token: token })).id
  }
  await pripravljen(f, osnova, vsebnik, token, cakajMs)
  const { id } = await graf(f, osnova, `${ig}/media_publish`, { creation_id: vsebnik, access_token: token })
  const { permalink } = await graf(f, osnova, id, { fields: 'permalink', access_token: token }, 'GET')
  return permalink ?? `instagram:${id}`
}

/** Facebook stran: neobjavljene fotografije, nato ena objava z njimi. Vrne povezavo. */
export async function objaviFacebook({ slike, napis: besedilo, env, f = fetch }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const stran = env.META_PAGE_ID
  const priloge = {}
  for (const [i, url] of slike.entries()) {
    const { id } = await graf(f, osnova, `${stran}/photos`, { url, published: 'false', access_token: token })
    priloge[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })
  }
  const { id } = await graf(f, osnova, `${stran}/feed`, { message: besedilo, ...priloge, access_token: token })
  const { permalink_url: url } = await graf(f, osnova, id, { fields: 'permalink_url', access_token: token }, 'GET')
  return url ?? `https://www.facebook.com/${id}`
}

/** Instagram reel: en vsebnik REELS z videom (in naslovnico), nato objava. */
export async function objaviInstagramReel({ video, naslovnica, napis: besedilo, env, f = fetch, cakajMs = cakaj }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const ig = env.META_IG_USER_ID
  const { id: vsebnik } = await graf(f, osnova, `${ig}/media`, {
    media_type: 'REELS', video_url: video, ...(naslovnica ? { cover_url: naslovnica } : {}), caption: besedilo, share_to_feed: 'true', access_token: token,
  })
  await pripravljen(f, osnova, vsebnik, token, cakajMs, 60)
  const { id } = await graf(f, osnova, `${ig}/media_publish`, { creation_id: vsebnik, access_token: token })
  const { permalink } = await graf(f, osnova, id, { fields: 'permalink', access_token: token }, 'GET')
  return permalink ?? `instagram:${id}`
}

/**
 * Facebook reel strani: začetek nalaganja, Facebook sam prenese video z
 * naslova (rupload, `file_url`), konec z objavo. Vrne povezavo.
 */
export async function objaviFacebookReel({ video, napis: besedilo, env, f = fetch, cakajMs = cakaj }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const stran = env.META_PAGE_ID
  const { video_id: id } = await graf(f, osnova, `${stran}/video_reels`, { upload_phase: 'start', access_token: token })
  const r = await f(`https://rupload.facebook.com/video-upload/${env.META_GRAPH_VERSION || 'v26.0'}/${id}`, {
    method: 'POST', headers: { Authorization: `OAuth ${token}`, file_url: video },
  })
  const o = await r.json().catch(() => ({}))
  if (!r.ok || o.error || !o.success) throw new Error(`Meta rupload: ${o.error?.message ?? o.debug_info?.message ?? r.status}`)
  await graf(f, osnova, `${stran}/video_reels`, { upload_phase: 'finish', video_id: id, video_state: 'PUBLISHED', description: besedilo, access_token: token })
  // Facebook video obdela sam; počakamo, da je objavljen ali da javi napako (največ 10 minut).
  for (let i = 0; ; i++) {
    const { status: s = {} } = await graf(f, osnova, id, { fields: 'status', access_token: token }, 'GET')
    if (s.video_status === 'error' || s.processing_phase?.status === 'error' || s.publishing_phase?.status === 'error') {
      throw new Error(`Meta reel ${id}: ${s.processing_phase?.error?.message ?? s.publishing_phase?.error?.message ?? 'napaka obdelave'}`)
    }
    if (s.video_status === 'ready' && (!s.publishing_phase || s.publishing_phase.status === 'complete')) break
    if (i >= 59) throw new Error(`Meta reel ${id}: ni objavljen v 10 minutah`)
    await cakajMs(10e3)
  }
  const { permalink_url: url } = await graf(f, osnova, id, { fields: 'permalink_url', access_token: token }, 'GET').catch(() => ({}))
  return url ? new URL(url, 'https://www.facebook.com').href : `https://www.facebook.com/reel/${id}`
}

// --- osnutek ------------------------------------------------------------------------

const RPC = {
  pon: 'objava_drzave', cet: 'objava_dosezki', ekipa: 'objava_ekipa_tedna', strelci: 'objava_strelci', liga: 'objava_liga',
  drzava: 'objava_drzava', kapetani: 'objava_forma', cene: 'objava_cene', predogled: 'objava_tekme', stat: 'objava_stat',
  obramba: 'objava_obramba',
}

/** Lige (ali države) srednih objav zadnjih LIGA_PREMOR_TEDNOV tednov: ne ponovijo se. */
async function nedavneSrede(db, stolpec, teden) {
  const { data, error } = await db.from('objave').select(stolpec).eq('slot', 'sre').gte('teden', dodajDni(teden, -7 * LIGA_PREMOR_TEDNOV))
  if (error) throw new Error(`objave: ${error.message}`)
  return [...new Set((data ?? []).map((x) => x[stolpec]).filter(Boolean))]
}

/**
 * Dejstva termina: ponedeljek po državah (objava_drzave), četrtek dosežki
 * (objava_dosezki), ostali dnevi po vrsti tedna (RPC); pravila ne rabijo baze.
 */
async function dejstvaTermina(db, slot, teden, vrsta = slot) {
  if (vrsta === 'pravila') return { tema: temaPravil(teden) }
  const { od, do: doo } = TERMINI[slot].vrsti ? oknoVrste(vrsta, teden) : okno(slot, teden)
  const p = { ...(od ? { p_od: od } : {}), p_do: doo }
  const klic = async (x) => {
    const { data, error } = await db.rpc(RPC[vrsta], x)
    if (error) throw new Error(`${RPC[vrsta]}: ${error.message}`)
    return data
  }
  if (vrsta === 'liga') return klic({ ...p, p_izkljuci: await nedavneSrede(db, 'liga', teden) })
  if (vrsta === 'drzava') {
    // Država se lahko ponovi, ko so vse druge že bile.
    const d = await klic({ ...p, p_izkljuci: await nedavneSrede(db, 'drzava', teden) })
    return d?.drzava ? d : klic({ ...p, p_izkljuci: [] })
  }
  return klic(p)
}

/** Vsebina termina iz dejstev; null, ko ni novice. */
export const vsebinaTermina = (d, slot) => (slot === 'pon' ? vsebinaDrzav(d) : vsebinaDosezkov(d))

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

// Osnutek, ki pade (reel, Claude, Discord), zanka poskusi največ trikrat na termin in teden.
export const NAJVEC_POSKUSOV = 3
export const smeZnova = (neuspehi, kljuc) => (neuspehi.get(kljuc) ?? 0) < NAJVEC_POSKUSOV

const log = (s) => console.log(`${new Date().toISOString()} ${s}`)

/** Izdela osnutek termina (pon, cet) ali mejnika. Vrne true, če je nastal (ali bi v --suho). */
export async function osnutek({ db, slot, teden, vrsta, dejstva, suho, url, mapa, env, zdaj = new Date() }) {
  const obstaja = async (stolpec, vrednost) => {
    if (suho) return false
    const { data, error } = await db.from('objave').select('id').eq('slot', slot).eq(stolpec, vrednost).maybeSingle()
    if (error) throw new Error(`objave: ${error.message}`)
    return Boolean(data)
  }
  let d, v, osnova, razpon, mejnik = null
  if (slot === 'mejnik') {
    if (dejstva) d = dejstva
    else {
      const { data, error } = await db.rpc('objava_mejnik_dejstva')
      if (error) throw new Error(`objava_mejnik_dejstva: ${error.message}`)
      d = data
    }
    mejnik = dosezenMejnik(d.uporabnikov)
    if (!mejnik || (await obstaja('mejnik', mejnik))) return false
    v = vsebinaMejnika(d, mejnik)
    osnova = objavaMejnika(zdaj)
    razpon = [-40, 40]
  } else {
    if (await obstaja('teden', teden)) return false
    vrsta ??= vrstaTermina(slot, teden)
    d = dejstva ?? (await dejstvaTermina(db, slot, teden, vrsta))
    v = d && (TERMINI[slot].vrsti ? vsebinaVrste(d, vrsta, slot) : vsebinaTermina(d, slot))
    if (!v) {
      log(`Objava ${slot} ${teden} (${vrsta}): ni novice, osnutka ni.`)
      return false
    }
    osnova = termin(slot, teden).objavaOb
    razpon = TERMINI[slot].razpon
  }
  const jezik = JEZIK
  const oznaka = mejnik ? `mejnik ${mejnik}` : NAPISI[v.vrsta]?.oznaka ?? (slot === 'pon' ? 'države' : 'dosežki tedna')
  // Najprej slike ali reel (lahko padejo), šele nato Claude: neuspel poskus ne stane napisa.
  // Naključni del: slike so javne (/objave-mediji/), osnutek pa naj se ne da uganiti.
  const pot = join(mapa, `${teden}-${slot}-${randomBytes(6).toString('hex')}`)
  let glasba = null
  let poti
  if (REELI.has(v.vrsta)) {
    const skladba = await izberiGlasbo(suho ? null : db)
    const seme = randomBytes(4).readUInt32LE()
    glasba = skladba ?? `sinteza:${seme}`
    poti = await posnemiReel(v, url, pot, { glasba: skladba, seme })
  } else {
    poti = await posnemi(v, url, pot)
  }
  const n = await napis(v, env.ANTHROPIC_API_KEY)
  const pov = povzetek(v)
  // Čas objave šele zdaj (po napisu in slikah), da veto res traja VETO.
  const objavaOb = casObjave(osnova, razpon, new Date(Math.max(zdaj.getTime(), Date.now())))
  if (suho) {
    console.log(`--- ${slot} ${teden} (${oznaka}, ${jezik}), objava ${objavaOb.toISOString()}`)
    console.log(pov)
    console.log(`--- napis (${n.vir}):\n${n.napis}`)
    for (const z of n.zavrnjeno) console.log('--- zavrnjen poskus:', JSON.stringify(z))
    console.log(`--- ${glasba ? `reel (glasba: ${glasba})` : 'prosojnice'}:\n${poti.join('\n')}`)
    return true
  }
  const z = novZeton(url)
  const { data: vrstica, error } = await db.from('objave').insert({
    slot, teden, mejnik, vrsta: v.vrsta ?? slot, glasba, drzava: v.drzavaTedna?.koda ?? null, jezik, liga: v.liga?.slug ?? null,
    dejstva: d, napis: n.napis, napis_vir: n.vir, mediji: poti, objava_ob: objavaOb.toISOString(), ustavi_zeton_hash: z.hash,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return false // drug zagon je bil hitrejši
    throw new Error(`objave: ${error.message}`)
  }
  try {
    if (!env.DISCORD_OBJAVE_WEBHOOK) throw new Error('manjka DISCORD_OBJAVE_WEBHOOK')
    const kdaj = new Intl.DateTimeFormat('sl-SI', { timeZone: PAS, dateStyle: 'short', timeStyle: 'short' }).format(objavaOb)
    // <…> skrije predogled povezave; ustavi pa šele gumb na strani.
    const kaj = metaNastavljena(env)
      ? `objava na Instagram in Facebook ${kdaj}, če je ne ustaviš.\n⛔ Ustavi objavo: <${z.povezava}>`
      : `objava ${kdaj}. Meta ni nastavljena: nič se ne objavi samo.`
    await vDiscord(env.DISCORD_OBJAVE_WEBHOOK, {
      naslov: `📝 **Osnutek objave #${vrstica.id}** (${oznaka}, napis: ${n.vir}) — ${kaj}`,
      napis: n.napis, povzetek: pov, poti,
      povezave: Object.fromEntries(poti.map((p) => [p, javniUrl(p, mapa, env.OBJAVE_MEDIJI_URL || 'https://slff.eu/objave-mediji')])),
    })
  } catch (e) {
    // Osnutek, ki ga človek ni videl, se nikoli ne objavi.
    await db.from('objave').update({ stanje: 'napaka', napaka: e.message }).eq('id', vrstica.id)
    throw e
  }
  // Brez tega se osnutek ne objavi (zaObjavo): človek ga mora videti.
  const { error: e2 } = await db.from('objave').update({ discord_at: new Date().toISOString() }).eq('id', vrstica.id)
  if (e2) throw new Error(`objave discord_at: ${e2.message}`)
  log(`Objava ${slot} ${teden}: osnutek #${vrstica.id} na Discordu.`)
  return true
}

/**
 * Objavi osnutke, ki so na vrsti. Vrstico najprej prevzame (osnutek →
 * objavljanje, pogojno), zato se nikoli ne objavi dvakrat; neuspeh je
 * `napaka` in se ne ponovi sam (Meta je morda že objavila del).
 */
export async function objaviZapadle({ db, env, mapa, zdaj = Date.now(), f = fetch, cakajMs = cakaj }) {
  const { data, error } = await db.from('objave').select('id, stanje, objava_ob, discord_at, napis, mediji')
    .eq('stanje', 'osnutek').lte('objava_ob', new Date(zdaj).toISOString())
    .gte('objava_ob', new Date(zdaj - OBJAVA_ZAMUDA).toISOString())
  if (error) throw new Error(`objave: ${error.message}`)
  for (const o of (data ?? []).filter((x) => zaObjavo(x, zdaj))) {
    if (!metaNastavljena(env)) {
      log(`Objava #${o.id}: META_* ni nastavljen, ne objavim.`)
      continue
    }
    const { data: prevzeta, error: e1 } = await db.from('objave').update({ stanje: 'objavljanje' })
      .eq('id', o.id).eq('stanje', 'osnutek').select('id')
    if (e1 || !prevzeta?.length) continue
    const base = env.OBJAVE_MEDIJI_URL || 'https://slff.eu/objave-mediji'
    const slike = o.mediji.map((p) => javniUrl(p, mapa, base))
    const izid = {}
    let napaka = null
    try {
      if (slike[0]?.endsWith('.mp4')) {
        const [video, naslovnica] = slike
        izid.ig_povezava = await objaviInstagramReel({ video, naslovnica, napis: o.napis, env, f, cakajMs })
        izid.fb_povezava = await objaviFacebookReel({ video, napis: o.napis, env, f, cakajMs })
      } else {
        izid.ig_povezava = await objaviInstagram({ slike, napis: o.napis, env, f, cakajMs })
        izid.fb_povezava = await objaviFacebook({ slike, napis: o.napis, env, f })
      }
    } catch (e) {
      napaka = e.message
    }
    const { error: e3 } = await db.from('objave').update(napaka
      ? { ...izid, stanje: 'napaka', napaka }
      : { ...izid, stanje: 'objavljeno', objavljeno_at: new Date().toISOString() }).eq('id', o.id)
    if (e3) log(`Objava #${o.id}: zapis stanja ni uspel: ${e3.message}`)
    const povezave = [izid.ig_povezava && `Instagram: <${izid.ig_povezava}>`, izid.fb_povezava && `Facebook: <${izid.fb_povezava}>`]
      .filter(Boolean).join('\n')
    const sporocilo = napaka
      ? `❌ **Objava #${o.id} ni uspela:** ${napaka}${povezave ? `\nŽe objavljeno:\n${povezave}` : ''}\nNe ponovi se sama.`
      : `✅ **Objava #${o.id} je objavljena.**\n${povezave}`
    log(sporocilo.replace(/\n/g, ' '))
    await sporociDiscord(env.DISCORD_OBJAVE_WEBHOOK, sporocilo).catch((e) => log(`Discord: ${e.message}`))
  }
}

async function main() {
  const arg = (ime) => {
    const i = process.argv.indexOf(ime)
    return i >= 0 ? process.argv[i + 1] : undefined
  }
  const env = process.env
  const suho = process.argv.includes('--suho')
  const zanka = process.argv.includes('--zanka') && !suho
  const url = (arg('--url') ?? env.OBJAVE_URL ?? 'https://slff.eu').replace(/\/$/, '')
  const mapa = arg('--mapa') ?? env.OBJAVE_MAPA ?? join(tmpdir(), 'objave-vzorec')
  const dejstva = arg('--dejstva') ? JSON.parse(await readFile(arg('--dejstva'), 'utf8')) : null
  let db = null
  if (!dejstva || !suho) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY (brez baze: --suho --dejstva datoteka.json).')
      if (zanka) await cakaj(10 * 60e3)
      process.exit(1)
    }
    const { createClient } = await import('@supabase/supabase-js')
    db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  }
  if (!zanka) {
    const slot = arg('--slot')
    if (!(slot in TERMINI) && slot !== 'mejnik') {
      console.error(`Uporaba: --slot ${Object.keys(TERMINI).join('|')}|mejnik [--vrsta …] [--suho] [--dejstva d.json] [--url …] [--mapa …], ali --zanka`)
      process.exit(2)
    }
    const teden = ponedeljek(datumLj(new Date()))
    // Vrsta: --vrsta, sicer iz vzorca dejstev ("vrsta"), sicer po tednu.
    const vrsta = arg('--vrsta') ?? dejstva?.vrsta
    await osnutek({ db, slot, teden, vrsta, dejstva, suho, url, mapa, env })
    return
  }
  log('Objave: zanka teče (vsakih 10 minut).')
  // Neuspeli poskusi po terminu in tednu: največ NAJVEC_POSKUSOV, nato termin ta teden izpade.
  const neuspehi = new Map()
  for (;;) {
    const zdaj = new Date()
    // Mejnik uporabnikov: vsak obhod pogleda, ali je dosežen (osnutek enkrat na mejnik).
    for (const t of [...terminiZdaj(zdaj), { slot: 'mejnik', teden: ponedeljek(datumLj(zdaj)) }]) {
      const kljuc = `${t.slot} ${t.teden}`
      if (!smeZnova(neuspehi, kljuc)) continue
      try {
        await osnutek({ db, slot: t.slot, teden: t.teden, suho: false, url, mapa, env })
      } catch (e) {
        neuspehi.set(kljuc, (neuspehi.get(kljuc) ?? 0) + 1)
        console.error(`Objava ${kljuc} ni uspela (${neuspehi.get(kljuc)}. poskus od ${NAJVEC_POSKUSOV}): ${e.message}`)
      }
    }
    try {
      await objaviZapadle({ db, env, mapa })
    } catch (e) {
      console.error(`Objavljanje: ${e.message}`)
    }
    await cakaj(10 * 60e3)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
