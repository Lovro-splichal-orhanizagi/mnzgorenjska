// Besedila e-pošte za `posli-opomnik`, v jeziku lige.
//
// Brez Deno API-jev in brez omrežja, da ga `npm run smoke` lahko uvozi in
// preveri vse jezikovne različice. Edge funkcija ne uvaža iz `src/` (pri
// objavi mora ostati samostojna), zato sta preslikavi država → jezik in
// država → časovni pas tu podvojeni; smoke preveri, da se jezik ujema z
// `JEZIK_DRZAVE` iz `src/lib/drzavaUgib.ts`.
//
// Jezik določa DRŽAVA LIGE, ne človek: funkcija vsakič obdela eno ligo, zato
// dobi Slovenec v slovaški ligi slovaški mail — tako kot vidi slovaški
// vmesnik, ko odpre povezavo `?t=sk-…`. Kdor ima ekipi v obeh državah, dobi
// dva ločena maila, vsakega v jeziku svoje lige.

export type Jezik = 'sl' | 'sk' | 'hr'

/** Jezik države lige (enako kot `JEZIK_DRZAVE` v vmesniku). */
export const JEZIK_DRZAVE: Record<string, Jezik> = { SI: 'sl', SK: 'sk', HR: 'hr' }
/** Časovni pas, v katerem so roki lige. */
export const PAS_DRZAVE: Record<string, string> = {
  SI: 'Europe/Ljubljana',
  SK: 'Europe/Bratislava',
  HR: 'Europe/Zagreb',
}
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', sk: 'sk-SK', hr: 'hr-HR' }

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
  if (j === 'hr') return prvo ? `Bok, ${esc(prvo)}!` : 'Bok!'
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

const ODJAVA: Record<Jezik, string> = {
  sl: 'Ne želim več opomnikov',
  sk: 'Nechcem už dostávať pripomienky',
  hr: 'Ne želim više primati podsjetnike',
}

const nogaOdjave = (j: Jezik, odjava: string) =>
  ` ·
        <a href="${odjava}" style="color:#94a3b8;">${ODJAVA[j]}</a>`

// --- opomnik: ekipe ni ali ni popolna ---------------------------------------

export function sestaviOpomnik(
  liga: Liga,
  meta: { display_name: string | null; brez_ekipe: boolean },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const OZN = esc(ozn.toUpperCase())

  const B = {
    sk: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn} — ešte nemáš tím na ďalšie kolo`
        : `SLFF ${ozn} — dokonči tím pred ďalším kolom`,
      glavno: meta.brez_ekipe
        ? `V lige ${OZN} ešte nemáš zostavený fantasy tím. Bez neho v ďalšom kole nezískaš body.`
        : `Tvoj fantasy tím v lige ${OZN} ešte nie je úplný (chýba káder, kapitán, zástupca kapitána a podobne). Bez platného tímu v ďalšom kole nezískaš body.`,
      gumb: 'Zostav / oprav tím →',
      opomba:
        'Ak pripomienku nepotrebuješ (tím v tejto sezóne zostavovať nebudeš), tento e-mail môžeš ignorovať. Nabudúce ti napíšeme až pred ďalším kolom.',
    },
    hr: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: još nemaš momčad za sljedeće kolo`
        : `SLFF ${ozn}: dovrši momčad prije sljedećeg kola`,
      glavno: meta.brez_ekipe
        ? `U ligi ${OZN} još nemaš složenu fantasy momčad. Bez nje u sljedećem kolu nećeš dobiti bodove.`
        : `Tvoja fantasy momčad u ligi ${OZN} još nije potpuna (nedostaje sastav, kapetan, zamjenik kapetana ili slično). Bez valjane momčadi u sljedećem kolu nećeš dobiti bodove.`,
      gumb: 'Složi / popravi momčad →',
      opomba:
        'Ako ti podsjetnik ne treba (ove sezone nećeš slagati momčad), ovaj e-mail možeš zanemariti. Sljedeći put javit ćemo ti se tek prije sljedećeg kola.',
    },
    sl: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn} — še nimaš ekipe za naslednji krog`
        : `SLFF ${ozn} — dokončaj ekipo pred naslednjim krogom`,
      glavno: meta.brez_ekipe
        ? `V ${OZN} še nimaš sestavljene fantasy ekipe. Brez nje v naslednjem krogu ne dobiš točk.`
        : `Tvoja fantasy ekipa v ${OZN} še ni popolna (manjka kader, kapetan, namestnik ali podobno). Brez veljavne ekipe v naslednjem krogu ne dobiš točk.`,
      gumb: 'Sestavi / popravi ekipo →',
      opomba:
        'Če opomnika ne rabiš (ekipe letos ne boš sestavil/a), lahko ta mail ignoriraš. Naslednjič ti bomo pisali šele pred naslednjim krogom.',
    },
  }[j]

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

// --- push opomnik: še nimaš ekipe, rok je jutri -----------------------------
// Samo potisno obvestilo (brez maila), zato le naslov in kratko besedilo.

export function sestaviPushOpomnik(
  liga: Liga,
  rok: string,
): { naslov: string; besedilo: string } {
  const kdaj = izpisRoka(rok, liga)
  const ozn = liga.oznaka
  return {
    sk: { naslov: `SLFF ${ozn}: ešte nemáš tím`, besedilo: `Uzávierka kola je ${kdaj}. Zostav tím, aby si získal body.` },
    hr: { naslov: `SLFF ${ozn}: još nemaš momčad`, besedilo: `Rok za kolo je ${kdaj}. Složi momčad kako bi skupljao bodove.` },
    sl: { naslov: `SLFF ${ozn}: še nimaš ekipe`, besedilo: `Rok za krog je ${kdaj}. Sestavi ekipo, da dobiš točke.` },
  }[jezikLige(liga)]
}

// --- opomnik brez lige: človek še nima nobene ekipe -------------------------
// Kdor nima nobene ekipe, nima lige — "privzeta" liga je le najbolj živa, ne
// njegova. Zato mail ne imenuje lige, ampak povabi k izbiri. Jezik je jezik
// prijave (`jezik` v metapodatkih); slovaški prijavi vodita na /sk.

export function sestaviOpomnikBrezLige(
  jezik: string | null | undefined,
  meta: { display_name: string | null },
): Sporocilo {
  const j: Jezik = jezik === 'sk' || jezik === 'hr' ? jezik : 'sl'
  // Naravnost na Mojo ekipo s predlogom (`?sestavi=1`): ekipa je ob odprtju
  // že sestavljena, ostane le Shrani. Državo in ligo ugane stran (IP, jezik).
  const vstop = `${SITE}/my-team?sestavi=1`
  const odjava = `${SITE}/reminders`
  const B = {
    sk: {
      naslov: 'SLFF — vyber si ligu a zostav tím',
      glavno: 'Zaregistroval/a si sa, ale ešte nemáš fantasy tím. Tím ti zostavíme jedným klikom, vymeň, koho chceš, a ulož. Body zbieraš už v ďalšom kole.',
      gumb: 'Zostav mi tím →',
      opomba: 'Ak tím zostavovať nebudeš, tento e-mail môžeš ignorovať.',
    },
    hr: {
      naslov: 'SLFF: odaberi svoju ligu i složi momčad',
      glavno: 'Registrirao/la si se, ali još nemaš fantasy momčad. Momčad ti složimo jednim klikom, zamijeni koga želiš i spremi. Bodove skupljaš već u sljedećem kolu.',
      gumb: 'Složi mi momčad →',
      opomba: 'Ako nećeš slagati momčad, ovaj e-mail možeš zanemariti.',
    },
    sl: {
      naslov: 'SLFF — izberi svojo ligo in sestavi ekipo',
      glavno: 'Prijavil/a si se, a še nimaš fantasy ekipe. Ekipo ti sestavimo v enem kliku, zamenjaj, kogar hočeš, in shrani. Točke zbiraš že v naslednjem krogu.',
      gumb: 'Sestavi mi ekipo →',
      opomba: 'Če ekipe ne boš sestavil/a, lahko ta mail ignoriraš.',
    },
  }[j]
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

  const B = {
    sk: () => {
      const kolo = u.round_number ? `${u.round_number}. kolo` : 'ďalšie kolo'
      return {
        naslov: `SLFF ${ozn} — tvoj tím nezíska body za ${kolo}`,
        glavno: `Tím ${ekipa} nespĺňa pravidlá, preto sa pre ${kolo} neuzamkne a nezíska v ňom body.`,
        rok: rok && `Opraviť ho môžeš do uzávierky: ${rok}.`,
        gumb: 'Oprav tím →',
        opomba:
          'Inak sa tím prenáša z kola do kola sám a nemusíš robiť nič — píšeme ti len vtedy, keď sa to nedá.',
      }
    },
    hr: () => {
      const kolo = u.round_number ? `${u.round_number}. kolo` : 'sljedeće kolo'
      return {
        naslov: `SLFF ${ozn}: tvoja momčad neće dobiti bodove za ${kolo}`,
        glavno: `Momčad ${ekipa} ne ispunjava pravila, zato se za ${kolo} neće zaključati i u njemu neće dobiti bodove.`,
        rok: rok && `Popraviti je možeš do roka: ${rok}.`,
        gumb: 'Popravi momčad →',
        opomba:
          'Inače se momčad sama prenosi iz kola u kolo i ne moraš ništa raditi. Pišemo ti samo kad to nije moguće.',
      }
    },
    sl: () => {
      const krog = u.round_number ? `${u.round_number}. krog` : 'naslednji krog'
      return {
        naslov: `SLFF ${ozn} — tvoja ekipa se ${krog} ne bo zaklenila`,
        glavno: `Ekipa ${ekipa} se za ${krog} ne bo zaklenila, zato v njem ne bi dobila točk.`,
        rok: rok && `Popraviti jo je mogoče do ${rok}.`,
        gumb: 'Popravi ekipo →',
        opomba:
          'Sicer se ekipa prenaša iz kroga v krog sama in ti ni treba storiti ničesar — pišemo ti samo takrat, kadar se ne bo mogla.',
      }
    },
  }[j]()

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
  // slovaški poznavalec dela samo z asistencami. Na Hrvaškem kot pri nas.
  const B = {
    sk: {
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
    },
    hr: {
      naslov: 'SLFF: odobrili smo tvoj zahtjev za poznavatelja',
      kaj:
        meta.obseg === 'liga'
          ? `Od sada si <strong>poznavatelj lige ${imeLige}</strong>: tvoj glas sam potvrđuje poziciju igrača ili asistenciju, ne treba čekati druge glasove.`
          : `Od sada si <strong>poznavatelj kluba ${klub}</strong> u ligi ${imeLige}: tvoj glas za igrače tog kluba vrijedi trostruko.`,
      hvala: 'Hvala što si se ponudio.',
      prosnja:
        'Jedna molba: ovo je povjerenje. Unosi samo ono što stvarno znaš i ne prilagođavaj podatke svojoj fantasy momčadi. O tome ovise bodovi svih u ligi. Ako se pokaže da su podaci namjerno netočni, gubiš status poznavatelja.',
      kje: `Pozicije uređuješ na stranici <a href="${p.pozicije}" style="color:#15803d;">Pozicije</a>
        (primjenjuju se svakog ponedjeljka ujutro), asistencije na stranici
        <a href="${p.asistence}" style="color:#15803d;">Asistencije</a> (odmah).
        Igrača koji više ne igra za klub možeš označiti s "više ne igra".`,
      gumb: 'Otvori Pozicije →',
      gumbUrl: p.pozicije,
      vprasanja: 'Ako ti nešto nije jasno, odgovori na ovaj e-mail.',
    },
    sl: {
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
    },
  }[j]

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
const POZICIJA_HR: Record<string, string> = { DEF: 'branič', MID: 'vezni', FWD: 'napadač' }
const POZICIJA: Record<Jezik, Record<string, string>> = { sl: POZICIJA_SL, sk: POZICIJA_SK, hr: POZICIJA_HR }

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
      const poz = POZICIJA[j][i.pozicija ?? '']
      const ime = `<strong>${esc(i.ime)}</strong>`
      if (j === 'sk') return poz ? `${ime} (teraz ${poz})` : ime
      if (j === 'hr') return poz ? `${ime} (sada ${poz})` : ime
      return poz ? `${ime} (zdaj ${poz})` : ime
    })
    .join(', ')

  const B = {
    sk: {
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
    },
    hr: {
      naslov: `SLFF ${ozn}: ispravak pozicije igrača u tvojoj momčadi`,
      glavno:
        `U tvojoj momčadi ${ekipa ? `<strong>${ekipa}</strong> ` : ''}imaš igrača ${kdo}, ` +
        'kojeg smo greškom vodili kao vratara. Zapisnik utakmice jednom ga je označio kao vratara, ' +
        'ali on zapravo igra u polju. Ispravili smo mu poziciju.',
      body:
        'Što to znači za tebe: u tvom sastavu ostaje na mjestu vratara, pa je momčad i dalje valjana ' +
        'i ne moraš ništa raditi. Bodove pak od sada dobiva kao igrač iz polja, a bodovi zadnjeg ' +
        'kola već su preračunati. Ako ga prodaš, na njegovo mjesto morat ćeš kupiti vratara.',
      gumb: 'Otvori moju momčad →',
      opomba: 'Ispričavamo se zbog pogreške.',
    },
    sl: {
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
    },
  }[j]

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

  const B = {
    sk: {
      naslov: `SLFF ${ozn} — klub tvojho hráča odstúpil zo súťaže`,
      glavno:
        `Klub ${klubi} odstúpil zo súťaže. ` +
        `${ekipa ? `V tíme <strong>${ekipa}</strong> máš` : 'V tíme máš'} jeho hráčov: ${kdo}.`,
      body:
        'Títo hráči už nebudú hrať, takže za nich už nezískaš body. Tím zostáva platný a ostatní hráči ' +
        'body získavajú normálne — odporúčame ich však vymeniť pred najbližšou uzávierkou. ' +
        'Body, ktoré už získali v odohraných zápasoch, ti zostávajú. Kúpiť ich už nemôže nikto.',
      gumb: 'Vymeniť hráčov →',
    },
    hr: {
      naslov: `SLFF ${ozn}: klub tvog igrača istupio je iz lige`,
      glavno:
        `Klub ${klubi} istupio je iz lige. ` +
        `${ekipa ? `U momčadi <strong>${ekipa}</strong> imaš` : 'U momčadi imaš'} njegove igrače: ${kdo}.`,
      body:
        'Ti igrači više neće igrati, pa za njih više nećeš dobivati bodove. Momčad ostaje valjana, a ostali ' +
        'igrači bodove dobivaju normalno. Ipak ti preporučujemo da ih zamijeniš prije sljedećeg roka. ' +
        'Bodovi koje su već osvojili na odigranim utakmicama ostaju ti. Više ih nitko ne može kupiti.',
      gumb: 'Zamijeni igrače →',
    },
    sl: {
      naslov: `SLFF ${ozn} — klub tvojega igralca je izstopil iz lige`,
      glavno:
        `Klub ${klubi} je izstopil iz lige. ` +
        `${ekipa ? `V ekipi <strong>${ekipa}</strong> imaš` : 'V ekipi imaš'} njegove igralce: ${kdo}.`,
      body:
        'Ti igralci ne bodo več igrali, zato zanje ne boš več dobil točk. Ekipa ostane veljavna in ostali ' +
        'igralci točke dobivajo normalno — priporočamo pa, da jih zamenjaš pred naslednjim rokom. ' +
        'Točke, ki so jih že dobili na odigranih tekmah, ti ostanejo. Kupiti jih ne more nihče več.',
      gumb: 'Zamenjaj igralce →',
    },
  }[j]

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

// --- tedenski pregled: tvoj krog --------------------------------------------
// Po končanem krogu: točke, mesto na lestvici lige, kapetan, najboljši igralec.
// Brez čestitk za vsako ceno: pohvala le, če je ekipa zbrala največ v ligi.

export interface PregledKroga {
  display_name: string | null
  ekipa: string
  krog: number
  tocke: number
  mesto: number
  /** Mesto pred krogom; null, če ekipa prej ni imela točk. */
  mesto_prej: number | null
  ekip: number
  povprecje: number | null
  najvec: number | null
  kapetan: string | null
  kapetan_tocke: number | null
  najboljsi: string | null
  najboljsi_tocke: number | null
}

/** Slovenska množina po zadnjih dveh mestih: 1 / 2 / 3–4 / ostalo. */
const slMn = (n: number, ena: string, dve: string, tri: string, vec: string) => {
  const s = Math.abs(n) % 100
  return s === 1 ? ena : s === 2 ? dve : s === 3 || s === 4 ? tri : vec
}

export function sestaviTedenskiPregled(liga: Liga, m: PregledKroga): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const OZN = esc(ozn.toUpperCase())
  const st = (n: number) => n.toLocaleString(LOKALE[j], { maximumFractionDigits: 1 })
  const cela = (n: number) => Number.isInteger(n) ? n : 5 // decimalke: množina "ostalo"
  const tock = (n: number) =>
    `${st(n)} ${
      j === 'sk'
        ? skMn(cela(n), 'bod', 'body', 'bodov')
        : j === 'hr'
          ? hrMn(cela(n), 'bod', 'boda', 'bodova')
          : slMn(cela(n), 'točka', 'točki', 'točke', 'točk')
    }`
  const ekipa = `<strong>${esc(m.ekipa)}</strong>`
  const premik = m.mesto_prej == null ? 0 : m.mesto_prej - m.mesto
  const premikZnak = premik > 0 ? ` (+${premik})` : premik < 0 ? ` (${premik})` : ''
  const najboljsiVLigi = m.najvec != null && m.tocke >= m.najvec && m.ekip > 1
  const najboljsiNiKapetan = m.najboljsi && m.najboljsi !== m.kapetan

  const B = {
    sk: {
      naslov: `SLFF ${ozn}: ${m.krog}. kolo, ${tock(m.tocke)}, ${m.mesto}. miesto${premikZnak}`,
      glavno: `Tvoj tím ${ekipa} získal v ${m.krog}. kole v lige ${OZN} <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Priemer ligy: ${st(m.povprecje)}, najviac: ${st(m.najvec)}.` : '',
      top: 'Najviac bodov v celej lige v tomto kole.',
      mesto: `V tabuľke si na <strong>${m.mesto}. mieste</strong> z ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (predtým ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Kapitán ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Najlepší v tíme: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Priprav tím na ďalšie kolo →',
      odjava: 'Nechcem už dostávať e-maily',
    },
    hr: {
      naslov: `SLFF ${ozn}: ${m.krog}. kolo, ${tock(m.tocke)}, ${m.mesto}. mjesto${premikZnak}`,
      glavno: `Tvoja momčad ${ekipa} osvojila je u ${m.krog}. kolu lige ${OZN} <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Prosjek lige: ${st(m.povprecje)}, najviše: ${st(m.najvec)}.` : '',
      top: 'Najviše bodova u cijeloj ligi u ovom kolu.',
      mesto: `Na ljestvici si <strong>${m.mesto}.</strong> od ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (prije ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Kapetan ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Najbolji u momčadi: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Pripremi momčad za sljedeće kolo →',
      odjava: 'Ne želim više primati e-mailove',
    },
    sl: {
      naslov: `SLFF ${ozn} — ${m.krog}. krog: ${tock(m.tocke)}, ${m.mesto}. mesto${premikZnak}`,
      glavno: `Tvoja ekipa ${ekipa} je v ${m.krog}. krogu ${OZN} zbrala <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Povprečje lige: ${st(m.povprecje)}, največ: ${st(m.najvec)}.` : '',
      top: 'Največ točk v vsej ligi v tem krogu.',
      mesto: `Na lestvici si <strong>${m.mesto}.</strong> od ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (prej ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Kapetan ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Najboljši v ekipi: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Pripravi ekipo za naslednji krog →',
      odjava: 'Ne želim več e-pošte',
    },
  }[j]

  const vrstica = (t: string, slog = 'font-size: 15px; line-height: 1.5; margin: 0 0 10px;') =>
    t ? `<p style="${slog}">${t}</p>` : ''
  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, m.display_name)}</p>
      ${vrstica(B.glavno)}
      ${najboljsiVLigi ? vrstica(`<strong>${B.top}</strong>`) : ''}
      ${vrstica(B.liga, 'font-size: 13px; color: #64748b; margin: 0 0 16px;')}
      ${vrstica(B.mesto)}
      ${vrstica(B.kapetan)}
      ${vrstica(B.najboljsi)}
      <p style="text-align: center; margin: 24px 0;">
        <a href="${p.ekipa}" style="${GUMB}">${B.gumb}</a>
      </p>`,
    ` ·
        <a href="${p.odjava}" style="color:#94a3b8;">${B.odjava}</a>`,
  )
  return { naslov: B.naslov, html, odjava: p.odjava }
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
 * `'en'` rabi le vmesnik (angleški obiskovalec) — pošta je vedno sl/sk/hr.
 */
export function prevediRazlog(razlog: string | null | undefined, j: Jezik | 'en'): string {
  if (j === 'sl') return razlog ?? 'Kader ni veljaven.'
  if (j === 'en') return razlogVAngliscini(razlog)
  if (j === 'hr') return razlogVHrvascini(razlog)
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

/** Hrvaška množina: 1, 21 … / 2–4, 22–24 … / ostalo (brez 11–14). */
const hrMn = (n: number, one: string, few: string, other: string) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? few
      : other

/** Isti razlogi v hrvaščini (za hrvaški mail in vmesnik). */
function razlogVHrvascini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastav nije valjan.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "U sastavu je 1 igrač / su 3 igrača / je 14 igrača".
  const igraca = (n: number) => hrMn(n, `je ${n} igrač`, `su ${n} igrača`, `je ${n} igrača`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Momčad je prazna, u sastavu nema nijednog igrača.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `U sastavu ${igraca(Number(m[1]))} umjesto ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `U sastavu su igrači koji više nisu aktivni: ${m[1]}. Njihov klub ove sezone ne igra ili je igrač otišao.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Iz kluba ${m[1]} imaš ${m[2]} igrača, a dopušteno je najviše ${m[3]}. ` +
      'To se može dogoditi i bez tvoje promjene: ako igrač tijekom sezone prijeđe u klub iz kojeg već imaš igrače.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Za ${m[1]} igrača nije poznata pozicija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastav mora imati 2 vratara, 5 braniča, 5 veznih i 3 napadača; ima ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `U prvoj postavi ${igraca(Number(m[1]))} umjesto ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Momčad nema točno jednog kapetana.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Momčad nema točno jednog zamjenika kapetana.'
  return 'Momčad ne ispunjava pravila. Pogledaj detalje u Mojoj momčadi.'
}
