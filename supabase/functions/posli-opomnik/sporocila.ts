// Besedila e-pošte za `posli-opomnik`, v jeziku lige.
//
// Brez Deno API-jev in brez omrežja, da ga `npm run smoke` lahko uvozi in
// preveri obe jezikovni različici. Edge funkcija ne uvaža iz `src/` (pri
// objavi mora ostati samostojna), zato sta preslikavi država → jezik in
// država → časovni pas tu podvojeni; smoke preveri, da se jezik ujema z
// `JEZIK_DRZAVE` iz `src/lib/drzavaUgib.ts`.
//
// Jezik določa DRŽAVA LIGE, ne človek: funkcija vsakič obdela eno ligo, zato
// dobi Slovenec v slovaški ligi slovaški mail — tako kot vidi slovaški
// vmesnik, ko odpre povezavo `?t=sk-…`. Kdor ima ekipi v obeh državah, dobi
// dva ločena maila, vsakega v jeziku svoje lige.

export type Jezik = 'sl' | 'sk'

/** Jezik države lige (enako kot `JEZIK_DRZAVE` v vmesniku). */
export const JEZIK_DRZAVE: Record<string, Jezik> = { SI: 'sl', SK: 'sk' }
/** Časovni pas, v katerem so roki lige. */
export const PAS_DRZAVE: Record<string, string> = {
  SI: 'Europe/Ljubljana',
  SK: 'Europe/Bratislava',
}
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', sk: 'sk-SK' }

export const SITE = 'https://slff.eu'

export interface Liga {
  slug: string
  /** Kratko ime lige (`short_name`), gre v zadevo. */
  oznaka: string
  /** Polno ime lige (za poznavalca). */
  ime?: string
  /** Koda države (`competitions_view.country_code`). */
  drzava: string | null
}

export interface Sporocilo {
  naslov: string
  html: string
  /** Odjava od opomnikov (glava List-Unsubscribe); ni je pri poznavalcu. */
  odjava?: string
}

export const jezikLige = (liga: Pick<Liga, 'drzava'>): Jezik =>
  JEZIK_DRZAVE[liga.drzava ?? 'SI'] ?? 'sl'

/**
 * Povezave v mailu. `?t=` izbere ligo — in z njo jezik vmesnika — tudi
 * na napravi, ki je stran še ni odprla.
 */
export function povezave(slug: string) {
  const t = `?t=${encodeURIComponent(slug)}`
  return {
    ekipa: `${SITE}/my-team${t}`,
    odjava: `${SITE}/reminders${t}`,
    pozicije: `${SITE}/positions${t}`,
    asistence: `${SITE}/assists${t}`,
  }
}

/** Rok v jeziku in časovnem pasu lige, npr. "sobota 3. 10. 10:00". */
export function izpisRoka(iso: string, liga: Pick<Liga, 'drzava'>): string {
  return new Date(iso).toLocaleString(LOKALE[jezikLige(liga)], {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PAS_DRZAVE[liga.drzava ?? 'SI'] ?? PAS_DRZAVE.SI,
  })
}

// Ime, ime ekipe in razlog napiše uporabnik (ali izhajajo iz njegovih
// podatkov), zato v HTML ne gredo surovi.
export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const pozdrav = (j: Jezik, ime: string | null | undefined) => {
  const prvo = ime?.trim().split(' ')[0]
  if (j === 'sk') return prvo ? `Ahoj, ${esc(prvo)}!` : 'Ahoj!'
  return prvo ? `Živjo, ${esc(prvo)}!` : 'Živjo!'
}

const GUMB =
  'display: inline-block; background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 12px 20px; border-radius: 10px;'

function ovoj(vsebina: string, noga: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
      ${vsebina}
      <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
        SLFF — Sunday League Fantasy Football · slff.eu${noga}
      </p>
    </div>
  `
}

const nogaOdjave = (j: Jezik, odjava: string) =>
  ` ·
        <a href="${odjava}" style="color:#94a3b8;">${
          j === 'sk' ? 'Nechcem už dostávať pripomienky' : 'Ne želim več opomnikov'
        }</a>`

// --- opomnik: ekipe ni ali ni popolna ---------------------------------------

export function sestaviOpomnik(
  liga: Liga,
  meta: { display_name: string | null; brez_ekipe: boolean },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const OZN = esc(ozn.toUpperCase())

  const B = j === 'sk'
    ? {
        naslov: meta.brez_ekipe
          ? `SLFF ${ozn} — ešte nemáš tím na ďalšie kolo`
          : `SLFF ${ozn} — dokonči tím pred ďalším kolom`,
        glavno: meta.brez_ekipe
          ? `V lige ${OZN} ešte nemáš zostavený fantasy tím. Bez neho v ďalšom kole nezískaš body.`
          : `Tvoj fantasy tím v lige ${OZN} ešte nie je úplný (chýba káder, kapitán, zástupca kapitána a podobne). Bez platného tímu v ďalšom kole nezískaš body.`,
        gumb: 'Zostav / oprav tím →',
        opomba:
          'Ak pripomienku nepotrebuješ (tím v tejto sezóne zostavovať nebudeš), tento e-mail môžeš ignorovať. Nabudúce ti napíšeme až pred ďalším kolom.',
      }
    : {
        naslov: meta.brez_ekipe
          ? `SLFF ${ozn} — še nimaš ekipe za naslednji krog`
          : `SLFF ${ozn} — dokončaj ekipo pred naslednjim krogom`,
        glavno: meta.brez_ekipe
          ? `V ${OZN} še nimaš sestavljene fantasy ekipe. Brez nje v naslednjem krogu ne dobiš točk.`
          : `Tvoja fantasy ekipa v ${OZN} še ni popolna (manjka kader, kapetan, namestnik ali podobno). Brez veljavne ekipe v naslednjem krogu ne dobiš točk.`,
        gumb: 'Sestavi / popravi ekipo →',
        opomba:
          'Če opomnika ne rabiš (ekipe letos ne boš sestavil/a), lahko ta mail ignoriraš. Naslednjič ti bomo pisali šele pred naslednjim krogom.',
      }

  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.glavno}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${p.ekipa}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.opomba}</p>`,
    nogaOdjave(j, p.odjava),
  )
  return { naslov: B.naslov, html, odjava: p.odjava }
}

// --- opomnik brez lige: človek še nima nobene ekipe -------------------------
// Kdor nima nobene ekipe, nima lige — "privzeta" liga je le najbolj živa, ne
// njegova. Zato mail ne imenuje lige, ampak povabi k izbiri. Jezik je jezik
// prijave (`jezik` v metapodatkih); slovaški prijavi vodita na /sk.

export function sestaviOpomnikBrezLige(
  jezik: string | null | undefined,
  meta: { display_name: string | null },
): Sporocilo {
  const j: Jezik = jezik === 'sk' ? 'sk' : 'sl'
  const vstop = j === 'sk' ? `${SITE}/sk` : SITE
  const odjava = `${SITE}/reminders`
  const B = j === 'sk'
    ? {
        naslov: 'SLFF — vyber si ligu a zostav tím',
        glavno: 'Zaregistroval/a si sa, ale ešte nemáš fantasy tím. Vyber si ligu, ktorú sleduješ, zostav 15 hráčov a zbieraj body už v ďalšom kole.',
        gumb: 'Vybrať ligu →',
        opomba: 'Ak tím zostavovať nebudeš, tento e-mail môžeš ignorovať.',
      }
    : {
        naslov: 'SLFF — izberi svojo ligo in sestavi ekipo',
        glavno: 'Prijavil/a si se, a še nimaš fantasy ekipe. Izberi ligo, ki jo spremljaš — od 1. SNL do regionalnih lig po vsej Sloveniji — sestavi 15 igralcev in zbiraj točke že v naslednjem krogu.',
        gumb: 'Izberi ligo →',
        opomba: 'Če ekipe ne boš sestavil/a, lahko ta mail ignoriraš.',
      }
  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.glavno}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${vstop}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.opomba}</p>`,
    nogaOdjave(j, odjava),
  )
  return { naslov: B.naslov, html, odjava }
}

// --- opozorilo: ekipa se ob roku ne bo zaklenila ----------------------------

export function sestaviOpozorilo(
  liga: Liga,
  u: {
    display_name: string | null
    team_name?: string | null
    round_number?: number | null
    deadline_at?: string | null
    razlog?: string | null
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const ekipa = `<strong>${esc(u.team_name ?? '')}</strong>`
  const rok = u.deadline_at ? `<strong>${izpisRoka(u.deadline_at, liga)}</strong>` : null
  const razlog = esc(prevediRazlog(u.razlog, j))

  const B = j === 'sk'
    ? (() => {
        const kolo = u.round_number ? `${u.round_number}. kolo` : 'ďalšie kolo'
        return {
          naslov: `SLFF ${ozn} — tvoj tím nezíska body za ${kolo}`,
          glavno: `Tím ${ekipa} nespĺňa pravidlá, preto sa pre ${kolo} neuzamkne a nezíska v ňom body.`,
          rok: rok && `Opraviť ho môžeš do uzávierky: ${rok}.`,
          gumb: 'Oprav tím →',
          opomba:
            'Inak sa tím prenáša z kola do kola sám a nemusíš robiť nič — píšeme ti len vtedy, keď sa to nedá.',
        }
      })()
    : (() => {
        const krog = u.round_number ? `${u.round_number}. krog` : 'naslednji krog'
        return {
          naslov: `SLFF ${ozn} — tvoja ekipa se ${krog} ne bo zaklenila`,
          glavno: `Ekipa ${ekipa} se za ${krog} ne bo zaklenila, zato v njem ne bi dobila točk.`,
          rok: rok && `Popraviti jo je mogoče do ${rok}.`,
          gumb: 'Popravi ekipo →',
          opomba:
            'Sicer se ekipa prenaša iz kroga v krog sama in ti ni treba storiti ničesar — pišemo ti samo takrat, kadar se ne bo mogla.',
        }
      })()

  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, u.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px;">${B.glavno}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px; padding: 12px; background: #fef2f2; border-left: 3px solid #f87171; border-radius: 6px;">
        ${razlog}
      </p>
      ${B.rok ? `<p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.rok}</p>` : ''}
      <p style="text-align: center; margin: 24px 0;">
        <a href="${p.ekipa}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.opomba}</p>`,
    nogaOdjave(j, p.odjava),
  )
  return { naslov: B.naslov, html, odjava: p.odjava }
}

// --- odobren poznavalec -----------------------------------------------------

export function sestaviPoznavalca(
  liga: Liga,
  meta: { display_name: string | null; obseg: 'klub' | 'liga'; klub: string | null },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const imeLige = esc(liga.ime ?? liga.oznaka)
  const klub = esc(meta.klub ?? '')

  // Na Slovaškem pozicij ne izbira skupnost (prinese jih zapisnik), zato
  // slovaški poznavalec dela samo z asistencami.
  const B = j === 'sk'
    ? {
        naslov: 'SLFF — schválili sme tvoju žiadosť o status znalca',
        kaj:
          meta.obseg === 'liga'
            ? `Odteraz si <strong>znalcom ligy ${imeLige}</strong>: tvoj hlas sám potvrdí asistenciu, na ďalšie hlasy netreba čakať.`
            : `Odteraz si <strong>znalcom klubu ${klub}</strong> v lige ${imeLige}: tvoj hlas za hráčov tohto klubu má trojnásobnú váhu.`,
        hvala: 'Ďakujeme, že si sa ponúkol.',
        prosnja:
          'Jedna prosba: je to prejav dôvery. Zadávaj len to, čo naozaj vieš, a neprispôsobuj údaje svojmu fantasy tímu. Závisia od toho body všetkých v lige. Ak sa ukáže, že údaje sú úmyselne nesprávne, status znalca stratíš.',
        kje: `Asistencie zadávaš na stránke <a href="${p.asistence}" style="color:#15803d;">Asistencie</a> (platia hneď).`,
        gumb: 'Otvoriť Asistencie →',
        gumbUrl: p.asistence,
        vprasanja: 'Ak ti niečo nie je jasné, odpovedz na tento e-mail.',
      }
    : {
        naslov: 'SLFF — odobrili smo tvojo prošnjo za poznavalca',
        kaj:
          meta.obseg === 'liga'
            ? `Od zdaj si <strong>poznavalec lige ${imeLige}</strong>: tvoj glas sam potrdi pozicijo igralca ali asistenco, drugih glasov ni treba čakati.`
            : `Od zdaj si <strong>poznavalec kluba ${klub}</strong> v ligi ${imeLige}: tvoj glas za igralce tega kluba šteje trojno.`,
        hvala: 'Hvala, da si se ponudil.',
        prosnja:
          'Ena prošnja: to je zaupanje. Vnašaj samo tisto, kar zares veš, in ne prilagajaj podatkov svoji fantasy ekipi. Točke vseh v ligi so odvisne od tega. Če se izkaže, da so podatki namerno napačni, poznavalca izgubiš.',
        kje: `Pozicije urejaš na strani <a href="${p.pozicije}" style="color:#15803d;">Pozicije</a>
        (uveljavijo se vsak ponedeljek zjutraj), asistence na strani
        <a href="${p.asistence}" style="color:#15803d;">Asistence</a> (takoj).
        Igralca, ki pri klubu ne igra več, lahko označiš z "ne igra več".`,
        gumb: 'Odpri Pozicije →',
        gumbUrl: p.pozicije,
        vprasanja: 'Če kaj ni jasno, odgovori na ta mail.',
      }

  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">${B.hvala} ${B.kaj}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">${B.prosnja}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.kje}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${B.gumbUrl}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.vprasanja}</p>`,
    '',
  )
  return { naslov: B.naslov, html }
}

// --- popravek pozicije: lažni vratar ---------------------------------------
//
// Zapisnik je igralca iz polja enkrat označil z (V) in uvoz ga je prekrstil v
// vratarja. Pozicijo smo popravili; lastnik, ki ga ima v kadru, mora vedeti,
// da odslej zbira točke kot igralec iz polja. Kvota kadra se sodi po poziciji
// ob nakupu, ki jo igralec obdrži, dokler ostane v kadru — ekipa ostane
// veljavna, ob prodaji pa ga mora nadomestiti vratar.

const POZICIJA_SL: Record<string, string> = { DEF: 'branilec', MID: 'vezist', FWD: 'napadalec' }
const POZICIJA_SK: Record<string, string> = { DEF: 'obranca', MID: 'záložník', FWD: 'útočník' }

export function sestaviPopravekPozicije(
  liga: Liga,
  meta: {
    display_name: string | null
    team_name: string | null
    igralci: Array<{ ime: string; pozicija: string | null }>
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const ekipa = esc(meta.team_name ?? '')
  const kdo = meta.igralci
    .map((i) => {
      const poz = (j === 'sk' ? POZICIJA_SK : POZICIJA_SL)[i.pozicija ?? '']
      const ime = `<strong>${esc(i.ime)}</strong>`
      if (j === 'sk') return poz ? `${ime} (teraz ${poz})` : ime
      return poz ? `${ime} (zdaj ${poz})` : ime
    })
    .join(', ')

  const B = j === 'sk'
    ? {
        naslov: `SLFF ${ozn} — oprava pozície hráča v tvojom tíme`,
        glavno:
          `V tvojom tíme ${ekipa ? `<strong>${ekipa}</strong> ` : ''}máš hráča ${kdo}, ` +
          'ktorého sme mali omylom vedeného ako brankára. Zápis zo zápasu ho raz označil ako brankára, ' +
          'v skutočnosti však hrá v poli. Jeho pozíciu sme opravili.',
        body:
          'Čo to pre teba znamená: v tvojom kádri zostáva na mieste brankára, takže tím je naďalej platný ' +
          'a nemusíš nič robiť. Body však odteraz získava ako hráč v poli — body posledného kola sú už ' +
          'prepočítané. Ak ho predáš, na jeho miesto bude treba kúpiť brankára.',
        gumb: 'Otvoriť môj tím →',
        opomba: 'Ospravedlňujeme sa za chybu.',
      }
    : {
        naslov: `SLFF ${ozn} — popravek pozicije igralca v tvoji ekipi`,
        glavno:
          `V tvoji ekipi ${ekipa ? `<strong>${ekipa}</strong> ` : ''}imaš igralca ${kdo}, ` +
          'ki smo ga imeli pomotoma zapisanega kot vratarja. Zapisnik tekme ga je enkrat označil kot vratarja, ' +
          'v resnici pa igra v polju. Njegovo pozicijo smo popravili.',
        body:
          'Kaj to pomeni zate: v tvojem kadru ostaja na mestu vratarja, zato je ekipa še vedno veljavna ' +
          'in ti ni treba storiti ničesar. Točke pa odslej dobiva kot igralec iz polja — točke zadnjega ' +
          'kroga so že preračunane. Če ga boš prodal/a, bo treba na njegovo mesto kupiti vratarja.',
        gumb: 'Odpri mojo ekipo →',
        opomba: 'Opravičujemo se za napako.',
      }

  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px;">${B.glavno}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.body}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${p.ekipa}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.opomba}</p>`,
    '',
  )
  return { naslov: B.naslov, html }
}

// --- izstop kluba ------------------------------------------------------------
//
// Klub je med sezono izstopil iz lige (Tržič 2012, mladinci, 2026/27). Igralec
// ostane v kadru in ekipa je z njim veljavna, točk pa ne bo več dobival —
// lastnik mora to izvedeti, sicer igra z mrtvim mestom do konca sezone.

export function sestaviIzstopKluba(
  liga: Liga,
  meta: {
    display_name: string | null
    team_name: string | null
    igralci: Array<{ ime: string; klub?: string | null }>
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const ekipa = esc(meta.team_name ?? '')
  const klubi = [...new Set(meta.igralci.map((i) => i.klub).filter((k): k is string => !!k))]
    .map((k) => `<strong>${esc(k)}</strong>`)
    .join(', ')
  const kdo = meta.igralci.map((i) => `<strong>${esc(i.ime)}</strong>`).join(', ')

  const B = j === 'sk'
    ? {
        naslov: `SLFF ${ozn} — klub tvojho hráča odstúpil zo súťaže`,
        glavno:
          `Klub ${klubi} odstúpil zo súťaže. ` +
          `${ekipa ? `V tíme <strong>${ekipa}</strong> máš` : 'V tíme máš'} jeho hráčov: ${kdo}.`,
        body:
          'Títo hráči už nebudú hrať, takže za nich už nezískaš body. Tím zostáva platný a ostatní hráči ' +
          'body získavajú normálne — odporúčame ich však vymeniť pred najbližšou uzávierkou. ' +
          'Body, ktoré už získali v odohraných zápasoch, ti zostávajú. Kúpiť ich už nemôže nikto.',
        gumb: 'Vymeniť hráčov →',
      }
    : {
        naslov: `SLFF ${ozn} — klub tvojega igralca je izstopil iz lige`,
        glavno:
          `Klub ${klubi} je izstopil iz lige. ` +
          `${ekipa ? `V ekipi <strong>${ekipa}</strong> imaš` : 'V ekipi imaš'} njegove igralce: ${kdo}.`,
        body:
          'Ti igralci ne bodo več igrali, zato zanje ne boš več dobil točk. Ekipa ostane veljavna in ostali ' +
          'igralci točke dobivajo normalno — priporočamo pa, da jih zamenjaš pred naslednjim rokom. ' +
          'Točke, ki so jih že dobili na odigranih tekmah, ti ostanejo. Kupiti jih ne more nihče več.',
        gumb: 'Zamenjaj igralce →',
      }

  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px;">${B.glavno}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">${B.body}</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${p.ekipa}" style="${GUMB}">${B.gumb}</a>
      </p>`,
    '',
  )
  return { naslov: B.naslov, html }
}

// --- razlog neveljavne ekipe ------------------------------------------------

/** Slovaška množina: 1 / 2–4 / ostalo. */
const skMn = (n: number, one: string, few: string, other: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : other

/**
 * Razlog iz `razlog_neveljavne_ekipe` je slovenski stavek. Za slovaški mail
 * ga prepoznamo po obliki in prevedemo; neznano obliko (SQL se je spremenil)
 * nadomesti splošen stavek, da v slovaškem mailu ni slovenščine.
 *
 * `'en'` rabi le vmesnik (angleški obiskovalec) — pošta je vedno sl/sk.
 */
export function prevediRazlog(razlog: string | null | undefined, j: Jezik | 'en'): string {
  if (j === 'sl') return razlog ?? 'Kader ni veljaven.'
  if (j === 'en') return razlogVAngliscini(razlog)
  if (!razlog) return 'Káder nie je platný.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tím je prázdny — nemá žiadny káder.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/))) {
    const n = Number(m[1])
    return skMn(n, `V kádri je ${n} hráč`, `V kádri sú ${n} hráči`, `V kádri je ${n} hráčov`) +
      ` namiesto ${m[2]}.`
  }
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `V kádri sú hráči, ktorí už nie sú aktívni: ${m[1]}. Ich klub v tejto sezóne nehrá alebo hráč odišiel.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} máš ${m[2]} hráčov, povolení sú ${m[3]}. ` +
      'Môže sa to stať aj bez tvojej zmeny — ak hráč počas sezóny prestúpi do klubu, z ktorého už nejakých máš.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/))) {
    const n = Number(m[1])
    return n === 1 ? 'Pri 1 hráčovi nie je známa pozícia.' : `Pri ${n} hráčoch nie je známa pozícia.`
  }
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Káder musí mať 2 brankárov, 5 obrancov, 5 záložníkov a 3 útočníkov; má ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/))) {
    const n = Number(m[1])
    return skMn(
      n,
      `V základnej zostave je ${n} hráč`,
      `V základnej zostave sú ${n} hráči`,
      `V základnej zostave je ${n} hráčov`,
    ) + ` namiesto ${m[2]}.`
  }
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tím nemá práve jedného kapitána.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tím nemá práve jedného zástupcu kapitána.'
  return 'Tím nespĺňa pravidlá — pozri si podrobnosti v sekcii Môj tím.'
}

/** Isti razlogi v angleščini (za angleški vmesnik). */
function razlogVAngliscini(razlog: string | null | undefined): string {
  if (!razlog) return 'The squad is not valid.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const igralcev = (n: number) => (n === 1 ? '1 player' : `${n} players`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'The team is empty — there is no squad.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `The squad has ${igralcev(Number(m[1]))} instead of ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Your squad has players who are no longer active: ${m[1]}. Their club isn't playing this season or the player has left.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `You have ${m[2]} players from ${m[1]}; ${m[3]} are allowed. ` +
      'This can happen without any change of yours — if a player transfers mid-season to a club you already have players from.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `The position of ${igralcev(Number(m[1]))} is unknown.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `The squad must have 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards; it has ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `The starting XI has ${igralcev(Number(m[1]))} instead of ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'The team does not have exactly one captain.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'The team does not have exactly one vice-captain.'
  return 'The team breaks the rules — see My Team for details.'
}
