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

export type Jezik = 'sl' | 'sk' | 'hr' | 'cs' | 'hu' | 'de' | 'sr' | 'ro' | 'et' | 'pl' | 'es' | 'lv' | 'mk'

/** Jezik države lige (enako kot `JEZIK_DRZAVE` v vmesniku). */
export const JEZIK_DRZAVE: Record<string, Jezik> = { SI: 'sl', SK: 'sk', HR: 'hr', CZ: 'cs', HU: 'hu', AT: 'de', DE: 'de', RS: 'sr', RO: 'ro', EE: 'et', PL: 'pl', ES: 'es', LV: 'lv', MK: 'mk' }
/** Časovni pas, v katerem so roki lige. */
export const PAS_DRZAVE: Record<string, string> = {
  SI: 'Europe/Ljubljana',
  SK: 'Europe/Bratislava',
  HR: 'Europe/Zagreb',
  CZ: 'Europe/Prague',
  HU: 'Europe/Budapest',
  AT: 'Europe/Vienna',
  DE: 'Europe/Berlin',
  RS: 'Europe/Belgrade',
  RO: 'Europe/Bucharest',
  EE: 'Europe/Tallinn',
  PL: 'Europe/Warsaw',
  ES: 'Europe/Madrid',
  LV: 'Europe/Riga',
  MK: 'Europe/Skopje',
}
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', sk: 'sk-SK', hr: 'hr-HR', cs: 'cs-CZ', hu: 'hu-HU', de: 'de-AT', sr: 'sr-Latn-RS', ro: 'ro-RO', et: 'et-EE', pl: 'pl-PL', es: 'es-ES', lv: 'lv-LV', mk: 'mk-MK' }

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

const pozdrav = (j: Jezik | 'en', ime: string | null | undefined) => {
  const prvo = ime?.trim().split(' ')[0]
  if (j === 'sk' || j === 'cs') return prvo ? `Ahoj, ${esc(prvo)}!` : 'Ahoj!'
  if (j === 'hr') return prvo ? `Bok, ${esc(prvo)}!` : 'Bok!'
  if (j === 'hu') return prvo ? `Szia, ${esc(prvo)}!` : 'Szia!'
  if (j === 'de') return prvo ? `Servus, ${esc(prvo)}!` : 'Servus!'
  if (j === 'sr') return prvo ? `Zdravo, ${esc(prvo)}!` : 'Zdravo!'
  if (j === 'ro') return prvo ? `Salut, ${esc(prvo)}!` : 'Salut!'
  if (j === 'et') return prvo ? `Tere, ${esc(prvo)}!` : 'Tere!'
  if (j === 'lv') return prvo ? `Sveiki, ${esc(prvo)}!` : 'Sveiki!'
  if (j === 'mk') return prvo ? `Здраво, ${esc(prvo)}!` : 'Здраво!'
  if (j === 'pl') return prvo ? `Cześć, ${esc(prvo)}!` : 'Cześć!'
  if (j === 'es') return prvo ? `¡Hola, ${esc(prvo)}!` : '¡Hola!'
  if (j === 'en') return prvo ? `Hi ${esc(prvo)},` : 'Hi,'
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

const ODJAVA: Record<Jezik | 'en', string> = {
  sl: 'Ne želim več opomnikov',
  en: 'Stop these reminders',
  sk: 'Nechcem už dostávať pripomienky',
  hr: 'Ne želim više primati podsjetnike',
  cs: 'Nechci už dostávat připomínky',
  hu: 'Nem kérek több emlékeztetőt',
  de: 'Keine Erinnerungen mehr',
  sr: 'Ne želim više da primam podsetnike',
  ro: 'Nu mai vreau mementouri',
  et: 'Ma ei soovi enam meeldetuletusi',
  lv: 'Vairs nevēlos saņemt atgādinājumus',
  pl: 'Nie chcę więcej przypomnień',
  es: 'No quiero más recordatorios',
  mk: 'Не сакам повеќе потсетници',
}

const nogaOdjave = (j: Jezik | 'en', odjava: string) =>
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
    cs: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: ještě nemáš tým na další kolo`
        : `SLFF ${ozn}: dokonči tým před dalším kolem`,
      glavno: meta.brez_ekipe
        ? `V lize ${OZN} ještě nemáš sestavený fantasy tým. Bez něj v dalším kole nezískáš body.`
        : `Tvůj fantasy tým v lize ${OZN} ještě není kompletní (chybí soupiska, kapitán, zástupce kapitána a podobně). Bez platného týmu v dalším kole nezískáš body.`,
      gumb: 'Sestav / oprav tým →',
      opomba:
        'Pokud připomínku nepotřebuješ (tým v této sezóně skládat nebudeš), tento e-mail můžeš ignorovat. Příště ti napíšeme až před dalším kolem.',
    },
    // Madžarščina: ime lige stoji samostojno, da ga ni treba sklanjati.
    hu: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: még nincs csapatod a következő fordulóra`
        : `SLFF ${ozn}: fejezd be a csapatodat a következő forduló előtt`,
      glavno: meta.brez_ekipe
        ? `Még nem raktad össze a fantasy csapatodat ebben a bajnokságban: ${OZN}. Enélkül a következő fordulóban nem szerzel pontot.`
        : `A fantasy csapatod még nem teljes ebben a bajnokságban: ${OZN} (hiányzik a keret, a csapatkapitány, az alkapitány vagy hasonló). Érvényes csapat nélkül a következő fordulóban nem szerzel pontot.`,
      gumb: 'Csapat összeállítása / javítása →',
      opomba:
        'Ha nincs szükséged az emlékeztetőre (idén nem raksz össze csapatot), nyugodtan hagyd figyelmen kívül ezt az e-mailt. Legközelebb csak a következő forduló előtt írunk.',
    },
    // Nemščina: ime lige za dvopičjem, brez sklanjanja.
    de: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: du hast noch kein Team für die nächste Runde`
        : `SLFF ${ozn}: vervollständige dein Team vor der nächsten Runde`,
      glavno: meta.brez_ekipe
        ? `Du hast in dieser Liga noch kein Fantasy-Team zusammengestellt: ${OZN}. Ohne Team holst du in der nächsten Runde keine Punkte.`
        : `Dein Fantasy-Team in dieser Liga ist noch nicht vollständig: ${OZN} (es fehlt der Kader, der Kapitän, der Vizekapitän oder Ähnliches). Ohne gültiges Team holst du in der nächsten Runde keine Punkte.`,
      gumb: 'Team zusammenstellen / korrigieren →',
      opomba:
        'Wenn du die Erinnerung nicht brauchst (du stellst heuer kein Team zusammen), kannst du diese E-Mail ignorieren. Wir melden uns erst wieder vor der nächsten Runde.',
    },
    // Srbščina (ekavica, latinica): kot hrvaščina, ime lige za "u ligi".
    sr: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: još nemaš tim za sledeće kolo`
        : `SLFF ${ozn}: dovrši tim pre sledećeg kola`,
      glavno: meta.brez_ekipe
        ? `U ligi ${OZN} još nemaš sastavljen fantasy tim. Bez njega u sledećem kolu nećeš osvojiti bodove.`
        : `Tvoj fantasy tim u ligi ${OZN} još nije potpun (nedostaje sastav, kapiten, zamenik kapitena ili slično). Bez ispravnog tima u sledećem kolu nećeš osvojiti bodove.`,
      gumb: 'Sastavi / popravi tim →',
      opomba:
        'Ako ti podsetnik ne treba (ove sezone nećeš sastavljati tim), ovaj imejl možeš da zanemariš. Sledeći put ćemo ti se javiti tek pred sledeće kolo.',
    },
    // Romunščina: ime lige za "liga", brez sklanjanja.
    ro: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: încă nu ai echipă pentru etapa următoare`
        : `SLFF ${ozn}: completează-ți echipa înainte de etapa următoare`,
      glavno: meta.brez_ekipe
        ? `Încă nu ți-ai făcut echipa fantasy în liga ${OZN}. Fără ea nu primești puncte în etapa următoare.`
        : `Echipa ta fantasy din liga ${OZN} nu este încă completă (lipsește lotul, căpitanul, vicecăpitanul sau ceva asemănător). Fără o echipă validă nu primești puncte în etapa următoare.`,
      gumb: 'Fă / corectează echipa →',
      opomba:
        'Dacă nu ai nevoie de memento (nu îți faci echipă în acest sezon), poți ignora acest e-mail. Data viitoare îți scriem abia înainte de etapa următoare.',
    },
    // Estonščina: ime lige stoji samostojno za dvopičjem, da ga ni treba sklanjati.
    et: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: sul pole veel järgmiseks vooruks meeskonda`
        : `SLFF ${ozn}: täienda oma meeskonda enne järgmist vooru`,
      glavno: meta.brez_ekipe
        ? `Sul pole veel fantaasiameeskonda (liiga: ${OZN}). Ilma selleta ei saa sa järgmises voorus punkte.`
        : `Sinu fantaasiameeskond (liiga: ${OZN}) pole veel täielik (puudub koosseis, kapten, asekapten vms). Nõuetekohase meeskonnata ei saa sa järgmises voorus punkte.`,
      gumb: 'Pane kokku / paranda meeskond →',
      opomba:
        'Kui sul meeldetuletust vaja pole (sel hooajal sa meeskonda kokku ei pane), võid selle kirja tähelepanuta jätta. Järgmine kord kirjutame sulle alles enne järgmist vooru.',
    },
    // Poljščina: ime lige stoji samostojno za dvopičjem, da ga ni treba sklanjati.
    pl: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: nie masz jeszcze drużyny na następną kolejkę`
        : `SLFF ${ozn}: uzupełnij drużynę przed następną kolejką`,
      glavno: meta.brez_ekipe
        ? `Nie masz jeszcze drużyny fantasy (liga: ${OZN}). Bez niej w następnej kolejce nie zdobędziesz punktów.`
        : `Twoja drużyna fantasy (liga: ${OZN}) nie jest jeszcze kompletna (brakuje kadry, kapitana, wicekapitana itp.). Bez prawidłowej drużyny w następnej kolejce nie zdobędziesz punktów.`,
      gumb: 'Ułóż / popraw drużynę →',
      opomba:
        'Jeśli nie potrzebujesz przypomnienia (w tym sezonie nie układasz drużyny), możesz zignorować tę wiadomość. Następnym razem napiszemy dopiero przed kolejną kolejką.',
    },
    // Španščina: ime lige stoji samostojno za dvopičjem, brez člena.
    es: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: aún no tienes equipo para la próxima jornada`
        : `SLFF ${ozn}: completa tu equipo antes de la próxima jornada`,
      glavno: meta.brez_ekipe
        ? `Aún no tienes equipo fantasy (liga: ${OZN}). Sin él no sumarás puntos en la próxima jornada.`
        : `Tu equipo fantasy (liga: ${OZN}) aún no está completo (falta la plantilla, el capitán, el vicecapitán o algo parecido). Sin un equipo válido no sumarás puntos en la próxima jornada.`,
      gumb: 'Hacer / corregir el equipo →',
      opomba:
        'Si no necesitas el recordatorio (esta temporada no vas a hacer equipo), puedes ignorar este correo. La próxima vez te escribiremos antes de la siguiente jornada.',
    },
    // Latvijščina: ime lige stoji samostojno za dvopičjem, da ga ni treba sklanjati.
    lv: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: tev vēl nav komandas nākamajai kārtai`
        : `SLFF ${ozn}: papildini savu komandu pirms nākamās kārtas`,
      glavno: meta.brez_ekipe
        ? `Tev vēl nav fantāzijas komandas (līga: ${OZN}). Bez tās nākamajā kārtā tu nesaņemsi punktus.`
        : `Tava fantāzijas komanda (līga: ${OZN}) vēl nav pilnīga (trūkst sastāva, kapteiņa, vicekapteiņa vai kā cita). Bez derīgas komandas nākamajā kārtā tu nesaņemsi punktus.`,
      gumb: 'Sastādīt / labot komandu →',
      opomba:
        'Ja tev atgādinājums nav vajadzīgs (šajā sezonā tu komandu nesastādi), vari šo vēstuli ignorēt. Nākamreiz tev rakstīsim tikai pirms nākamās kārtas.',
    },
    // Makedonščina: ime lige stoji samostojno za dvopičjem, člen je pripona.
    mk: {
      naslov: meta.brez_ekipe
        ? `SLFF ${ozn}: сè уште немаш тим за следното коло`
        : `SLFF ${ozn}: доврши го тимот пред следното коло`,
      glavno: meta.brez_ekipe
        ? `Сè уште немаш составено фантази тим (лига: ${OZN}). Без него во следното коло нема да освоиш поени.`
        : `Твојот фантази тим (лига: ${OZN}) сè уште не е комплетен (недостасува состав, капитен, вице-капитен или слично). Без исправен тим во следното коло нема да освоиш поени.`,
      gumb: 'Состави / поправи го тимот →',
      opomba:
        'Ако не ти треба потсетник (оваа сезона нема да составуваш тим), оваа порака можеш да ја игнорираш. Следниот пат ќе ти пишеме дури пред следното коло.',
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
    cs: { naslov: `SLFF ${ozn}: ještě nemáš tým`, besedilo: `Uzávěrka kola je ${kdaj}. Sestav tým, abys získal body.` },
    hu: { naslov: `SLFF ${ozn}: még nincs csapatod`, besedilo: `A forduló határideje: ${kdaj}. Rakd össze a csapatodat, hogy pontot szerezz.` },
    de: { naslov: `SLFF ${ozn}: du hast noch kein Team`, besedilo: `Deadline der Runde: ${kdaj}. Stell dein Team zusammen, damit du Punkte holst.` },
    sr: { naslov: `SLFF ${ozn}: još nemaš tim`, besedilo: `Rok za kolo je ${kdaj}. Sastavi tim da bi osvajao bodove.` },
    ro: { naslov: `SLFF ${ozn}: încă nu ai echipă`, besedilo: `Termenul etapei: ${kdaj}. Fă-ți echipa ca să strângi puncte.` },
    et: { naslov: `SLFF ${ozn}: sul pole veel meeskonda`, besedilo: `Vooru tähtaeg: ${kdaj}. Pane meeskond kokku, et punkte koguda.` },
    pl: { naslov: `SLFF ${ozn}: nie masz jeszcze drużyny`, besedilo: `Termin kolejki: ${kdaj}. Ułóż drużynę, aby zdobywać punkty.` },
    es: { naslov: `SLFF ${ozn}: aún no tienes equipo`, besedilo: `Cierre de la jornada: ${kdaj}. Haz tu equipo para sumar puntos.` },
    lv: { naslov: `SLFF ${ozn}: tev vēl nav komandas`, besedilo: `Kārtas termiņš: ${kdaj}. Sastādi komandu, lai krātu punktus.` },
    mk: { naslov: `SLFF ${ozn}: сè уште немаш тим`, besedilo: `Рок за колото: ${kdaj}. Состави тим за да собираш поени.` },
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
  // `en` le dobrodošlica uporabniku brez znanega jezika (Google prijava).
  const j: Jezik | 'en' = jezik === 'sk' || jezik === 'hr' || jezik === 'cs' || jezik === 'hu' || jezik === 'de' || jezik === 'sr' || jezik === 'ro' || jezik === 'et' || jezik === 'pl' || jezik === 'es' || jezik === 'lv' || jezik === 'mk' || jezik === 'en' ? jezik : 'sl'
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
    mk: {
      naslov: 'SLFF: избери ја својата лига и состави тим',
      glavno: 'Се регистрираше, но сè уште немаш фантази тим. Тимот ти го составуваме со еден клик, замени кого сакаш и зачувај. Поени собираш веќе во следното коло.',
      gumb: 'Состави ми тим →',
      opomba: 'Ако нема да составуваш тим, оваа порака можеш да ја игнорираш.',
    },
    hr: {
      naslov: 'SLFF: odaberi svoju ligu i složi momčad',
      glavno: 'Registrirao/la si se, ali još nemaš fantasy momčad. Momčad ćemo ti složiti jednim klikom, zamijeni koga želiš i spremi. Bodove skupljaš već u sljedećem kolu.',
      gumb: 'Složi mi momčad →',
      opomba: 'Ako nećeš slagati momčad, ovaj e-mail možeš zanemariti.',
    },
    cs: {
      naslov: 'SLFF: vyber si ligu a sestav tým',
      glavno: 'Zaregistroval/a ses, ale ještě nemáš fantasy tým. Tým ti sestavíme jedním kliknutím, vyměň, koho chceš, a ulož. Body sbíráš už v dalším kole.',
      gumb: 'Sestav mi tým →',
      opomba: 'Pokud tým skládat nebudeš, tento e-mail můžeš ignorovat.',
    },
    hu: {
      naslov: 'SLFF: válaszd ki a bajnokságodat, és rakd össze a csapatodat',
      glavno: 'Regisztráltál, de még nincs fantasy csapatod. Egy kattintással összerakunk neked egyet, cseréld le, akit szeretnél, és mentsd el. A pontokat már a következő fordulóban gyűjtheted.',
      gumb: 'Csapatot kérek →',
      opomba: 'Ha nem szeretnél csapatot összerakni, nyugodtan hagyd figyelmen kívül ezt az e-mailt.',
    },
    de: {
      naslov: 'SLFF: wähl deine Liga und stell dein Team zusammen',
      glavno: 'Du hast dich registriert, hast aber noch kein Fantasy-Team. Wir stellen dir mit einem Klick eines zusammen, tausch aus, wen du willst, und speichere. Punkte sammelst du schon in der nächsten Runde.',
      gumb: 'Team für mich zusammenstellen →',
      opomba: 'Wenn du kein Team zusammenstellen willst, kannst du diese E-Mail ignorieren.',
    },
    sr: {
      naslov: 'SLFF: izaberi svoju ligu i sastavi tim',
      glavno: 'Registrovao/la si se, ali još nemaš fantasy tim. Tim ti sastavljamo jednim klikom, zameni koga želiš i sačuvaj. Bodove skupljaš već u sledećem kolu.',
      gumb: 'Sastavi mi tim →',
      opomba: 'Ako nećeš da sastavljaš tim, ovaj imejl možeš da zanemariš.',
    },
    ro: {
      naslov: 'SLFF: alege-ți liga și fă-ți echipa',
      glavno: 'Te-ai înregistrat, dar încă nu ai o echipă fantasy. Îți facem echipa dintr-un clic, schimbă pe cine vrei și salvează. Strângi puncte chiar din etapa următoare.',
      gumb: 'Fă-mi echipa →',
      opomba: 'Dacă nu vrei să-ți faci echipă, poți ignora acest e-mail.',
    },
    et: {
      naslov: 'SLFF: vali oma liiga ja pane meeskond kokku',
      glavno: 'Registreerusid, kuid sul pole veel fantaasiameeskonda. Paneme sulle meeskonna kokku ühe klõpsuga, vaheta kedagi, kui tahad, ja salvesta. Punkte kogud juba järgmises voorus.',
      gumb: 'Pane mulle meeskond kokku →',
      opomba: 'Kui sa ei taha meeskonda kokku panna, võid selle kirja tähelepanuta jätta.',
    },
    pl: {
      naslov: 'SLFF: wybierz swoją ligę i ułóż drużynę',
      glavno: 'Masz już konto, ale nie masz jeszcze drużyny fantasy. Ułożymy ci drużynę jednym kliknięciem, wymień, kogo chcesz, i zapisz. Punkty zbierasz już w następnej kolejce.',
      gumb: 'Ułóż mi drużynę →',
      opomba: 'Jeśli nie chcesz układać drużyny, możesz zignorować tę wiadomość.',
    },
    es: {
      naslov: 'SLFF: elige tu liga y haz tu equipo',
      glavno: 'Te has registrado, pero aún no tienes equipo fantasy. Te lo hacemos con un clic: cambia a quien quieras y guarda. Sumas puntos ya en la próxima jornada.',
      gumb: 'Hazme el equipo →',
      opomba: 'Si no quieres hacer un equipo, puedes ignorar este correo.',
    },
    lv: {
      naslov: 'SLFF: izvēlies savu līgu un sastādi komandu',
      glavno: 'Tu esi reģistrējies, bet tev vēl nav fantāzijas komandas. Sastādīsim tev komandu ar vienu klikšķi, nomaini, ko vēlies, un saglabā. Punktus krāsi jau nākamajā kārtā.',
      gumb: 'Sastādīt man komandu →',
      opomba: 'Ja nevēlies sastādīt komandu, vari šo vēstuli ignorēt.',
    },
    en: {
      naslov: 'SLFF: pick your league and build your team',
      glavno: 'You signed up, but you don’t have a fantasy team yet. We’ll build one for you in one click: swap anyone you like and save. You start scoring points in the next round.',
      gumb: 'Build my team →',
      opomba: 'If you don’t want to build a team, you can ignore this email.',
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

// --- opomnik brez ekipe: do trije po dobrodošlici ---------------------------
// Krajši od dobrodošlice: liga (ekipe, kluba ali države jezika), rok in gumb.
// Ime lige stoji samo zase (v vrstici z rokom), da ga ni treba sklanjati.
// Brez lige (`liga` null) brez `?t=` in brez roka.

export function sestaviOpomnikBrezEkipe(
  jezik: string | null | undefined,
  meta: { display_name: string | null; liga: Liga | null; rok: string | null },
): Sporocilo {
  const j: Jezik | 'en' =
    jezik === 'en' || Object.values(JEZIK_DRZAVE).includes(jezik as Jezik) ? (jezik as Jezik | 'en') : 'sl'
  const { liga, rok } = meta
  const t = liga ? `&t=${encodeURIComponent(liga.slug)}` : ''
  const vstop = `${SITE}/my-team?sestavi=1${t}`
  const odjava = liga ? povezave(liga.slug).odjava : `${SITE}/reminders`
  const B = {
    sl: { naslov: 'ekipa te še čaka', glavno: 'Še vedno nimaš fantasy ekipe. »Sestavi mi ekipo« jo naredi v enem kliku: zamenjaj, kogar hočeš, in shrani.', rok: 'Rok', gumb: 'Sestavi mi ekipo →' },
    sk: { naslov: 'tím na teba stále čaká', glavno: 'Stále nemáš fantasy tím. „Zostav mi tím“ ho vytvorí jedným klikom: vymeň, koho chceš, a ulož.', rok: 'Uzávierka', gumb: 'Zostav mi tím →' },
    hr: { naslov: 'momčad te još čeka', glavno: 'Još uvijek nemaš fantasy momčad. „Složi mi momčad“ je slaže jednim klikom: zamijeni koga želiš i spremi.', rok: 'Rok', gumb: 'Složi mi momčad →' },
    cs: { naslov: 'tým na tebe pořád čeká', glavno: 'Pořád nemáš fantasy tým. „Sestav mi tým“ ho vytvoří jedním kliknutím: vyměň, koho chceš, a ulož.', rok: 'Uzávěrka', gumb: 'Sestav mi tým →' },
    hu: { naslov: 'a csapatod még vár', glavno: 'Még mindig nincs fantasy csapatod. A „Csapatot kérek” gomb egy kattintással összerakja: cseréld le, akit szeretnél, és mentsd el.', rok: 'Határidő', gumb: 'Csapatot kérek →' },
    de: { naslov: 'dein Team wartet noch', glavno: 'Du hast noch kein Fantasy-Team. „Team für mich zusammenstellen“ erledigt das mit einem Klick: tausch aus, wen du willst, und speichere.', rok: 'Deadline', gumb: 'Team für mich zusammenstellen →' },
    sr: { naslov: 'tim te još čeka', glavno: 'Još uvek nemaš fantasy tim. „Sastavi mi tim“ ga sastavlja jednim klikom: zameni koga želiš i sačuvaj.', rok: 'Rok', gumb: 'Sastavi mi tim →' },
    ro: { naslov: 'echipa te așteaptă încă', glavno: 'Încă nu ai o echipă fantasy. „Fă-mi echipa” o face dintr-un clic: schimbă pe cine vrei și salvează.', rok: 'Termen', gumb: 'Fă-mi echipa →' },
    et: { naslov: 'meeskond ootab sind ikka veel', glavno: 'Sul pole ikka veel fantaasiameeskonda. „Pane mulle meeskond kokku“ teeb selle ühe klõpsuga: vaheta kedagi, kui tahad, ja salvesta.', rok: 'Tähtaeg', gumb: 'Pane mulle meeskond kokku →' },
    pl: { naslov: 'drużyna wciąż na ciebie czeka', glavno: 'Nadal nie masz drużyny fantasy. „Złóż mi drużynę” zrobi to jednym kliknięciem: wymień, kogo chcesz, i zapisz.', rok: 'Termin', gumb: 'Złóż mi drużynę →' },
    es: { naslov: 'tu equipo aún te espera', glavno: 'Todavía no tienes equipo fantasy. «Hazme el equipo» lo hace con un clic: cambia a quien quieras y guarda.', rok: 'Cierre', gumb: 'Hazme el equipo →' },
    lv: { naslov: 'komanda tevi joprojām gaida', glavno: 'Tev joprojām nav fantāzijas komandas. “Sastādi man komandu” to izdara ar vienu klikšķi: nomaini, ko vēlies, un saglabā.', rok: 'Termiņš', gumb: 'Sastādīt man komandu →' },
    mk: { naslov: 'тимот сè уште те чека', glavno: 'Сè уште немаш фантази тим. „Состави ми тим“ го прави со еден клик: замени кого сакаш и зачувај.', rok: 'Рок', gumb: 'Состави ми тим →' },
    en: { naslov: 'your team is still waiting', glavno: 'You still don’t have a fantasy team. “Build my team” makes one in a single click: swap anyone you like and save.', rok: 'Deadline', gumb: 'Build my team →' },
  }[j]
  const kdaj = liga && rok
    ? new Date(rok).toLocaleString(j === 'en' ? 'en-GB' : LOKALE[j], {
        weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: PAS_DRZAVE[liga.drzava ?? 'SI'] ?? PAS_DRZAVE.SI,
      })
    : null
  const vrstica = liga
    ? `<p style="font-size: 14px; color: #334155; margin: 0 0 20px;"><strong>${esc(liga.oznaka)}</strong>${kdaj ? ` · ${B.rok}: ${kdaj}` : ''}</p>`
    : ''
  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px;">${B.glavno}</p>
      ${vrstica}
      <p style="text-align: center; margin: 24px 0;">
        <a href="${vstop.replaceAll('&', '&amp;')}" style="${GUMB}">${B.gumb}</a>
      </p>`,
    nogaOdjave(j, odjava),
  )
  return { naslov: `SLFF${liga ? ` ${liga.oznaka}` : ''} — ${B.naslov}`, html, odjava }
}

// --- liga, ki si jo je kdo želel, je zaživela -------------------------------
// Enkratno obvestilo na željo ("Moje lige ni"), zato brez odjave. Jezik je
// jezik vmesnika ob želji, sicer jezik lige. Ime lige stoji samo zase.

export function sestaviLigaZivi(
  jezik: string | null | undefined,
  meta: { display_name: string | null; liga: Liga },
): Sporocilo {
  const { liga } = meta
  const j: Jezik | 'en' =
    jezik === 'en' || Object.values(JEZIK_DRZAVE).includes(jezik as Jezik) ? (jezik as Jezik | 'en') : jezikLige(liga)
  const vstop = `${SITE}/my-team?sestavi=1&t=${encodeURIComponent(liga.slug)}`
  const B = {
    sl: { naslov: 'tvoja liga je tu', glavno: 'Želel/a si si to ligo in zdaj je v SLFF. Sestavi ekipo, preden se začne naslednji krog.', gumb: 'Sestavi ekipo →', opomba: 'To je edini mail o tej želji.' },
    sk: { naslov: 'tvoja liga je tu', glavno: 'Želal/a si si túto ligu a teraz je v SLFF. Zostav si tím ešte pred ďalším kolom.', gumb: 'Zostav tím →', opomba: 'Toto je jediný e-mail o tvojom želaní.' },
    hr: { naslov: 'tvoja liga je tu', glavno: 'Želio/la si ovu ligu i sada je u SLFF-u. Složi momčad prije sljedećeg kola.', gumb: 'Složi momčad →', opomba: 'Ovo je jedini e-mail o tvojoj želji.' },
    cs: { naslov: 'tvoje liga je tu', glavno: 'Přál/a sis tuto ligu a teď je v SLFF. Sestav si tým ještě před dalším kolem.', gumb: 'Sestav tým →', opomba: 'Toto je jediný e-mail o tvém přání.' },
    hu: { naslov: 'itt a bajnokságod', glavno: 'Ezt a bajnokságot kérted, és most már az SLFF-ben van. Rakd össze a csapatodat a következő forduló előtt.', gumb: 'Csapatot rakok össze →', opomba: 'Ez az egyetlen e-mail a kérésedről.' },
    de: { naslov: 'deine Liga ist da', glavno: 'Du hast dir diese Liga gewünscht, jetzt ist sie bei SLFF. Stell dein Team vor der nächsten Runde zusammen.', gumb: 'Team zusammenstellen →', opomba: 'Das ist die einzige E-Mail zu deinem Wunsch.' },
    sr: { naslov: 'tvoja liga je tu', glavno: 'Želeo/la si ovu ligu i sada je u SLFF-u. Sastavi tim pre sledećeg kola.', gumb: 'Sastavi tim →', opomba: 'Ovo je jedini imejl o tvojoj želji.' },
    ro: { naslov: 'liga ta e aici', glavno: 'Ți-ai dorit această ligă și acum e în SLFF. Fă-ți echipa înainte de etapa următoare.', gumb: 'Fă-ți echipa →', opomba: 'Acesta este singurul e-mail despre dorința ta.' },
    et: { naslov: 'sinu liiga on siin', glavno: 'Soovisid seda liigat ja nüüd on see SLFF-is. Pane meeskond kokku enne järgmist vooru.', gumb: 'Pane meeskond kokku →', opomba: 'See on ainus kiri sinu soovi kohta.' },
    pl: { naslov: 'twoja liga już jest', glavno: 'Chciałeś/aś tej ligi i teraz jest w SLFF. Ułóż drużynę przed następną kolejką.', gumb: 'Ułóż drużynę →', opomba: 'To jedyna wiadomość w sprawie twojej prośby.' },
    es: { naslov: 'tu liga ya está aquí', glavno: 'Pediste esta liga y ya está en SLFF. Haz tu equipo antes de la próxima jornada.', gumb: 'Haz tu equipo →', opomba: 'Este es el único correo sobre tu petición.' },
    lv: { naslov: 'tava līga ir klāt', glavno: 'Tu vēlējies šo līgu, un tagad tā ir SLFF. Sastādi komandu pirms nākamās kārtas.', gumb: 'Sastādīt komandu →', opomba: 'Šī ir vienīgā vēstule par tavu vēlmi.' },
    mk: { naslov: 'твојата лига е тука', glavno: 'Ја посака оваа лига и сега е во SLFF. Состави тим пред следното коло.', gumb: 'Состави тим →', opomba: 'Ова е единствената порака за твојата желба.' },
    en: { naslov: 'your league is here', glavno: 'You asked for this league and now it’s on SLFF. Build your team before the next round.', gumb: 'Build my team →', opomba: 'This is the only email about your request.' },
  }[j]
  const html = ovoj(
    `<p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${pozdrav(j, meta.display_name)}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px;">${B.glavno}</p>
      <p style="font-size: 14px; color: #334155; margin: 0 0 20px;"><strong>${esc(liga.ime || liga.oznaka)}</strong></p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${vstop.replaceAll('&', '&amp;')}" style="${GUMB}">${B.gumb}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">${B.opomba}</p>`,
    '',
  )
  return { naslov: `SLFF ${liga.oznaka} — ${B.naslov}`, html }
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
    cs: () => {
      const kolo = u.round_number ? `${u.round_number}. kolo` : 'další kolo'
      return {
        naslov: `SLFF ${ozn}: tvůj tým nezíská body za ${kolo}`,
        glavno: `Tým ${ekipa} nesplňuje pravidla, proto se pro ${kolo} neuzamkne a nezíská v něm body.`,
        rok: rok && `Opravit ho můžeš do uzávěrky: ${rok}.`,
        gumb: 'Oprav tým →',
        opomba:
          'Jinak se tým přenáší z kola do kola sám a nemusíš dělat nic. Píšeme ti jen tehdy, když to nejde.',
      }
    },
    hu: () => {
      const kolo = u.round_number ? `${u.round_number}. forduló` : 'következő forduló'
      return {
        naslov: `SLFF ${ozn}, ${kolo}: a csapatod nem szerez pontot`,
        glavno: `A csapatod (${ekipa}) nem felel meg a szabályoknak, ezért nem zárul le erre a fordulóra (${kolo}), és nem szerez benne pontot.`,
        rok: rok && `A határidőig javíthatod: ${rok}.`,
        gumb: 'Csapat javítása →',
        opomba:
          'Egyébként a csapatod magától átkerül fordulóról fordulóra, és semmit sem kell tenned. Csak akkor írunk, ha ez nem lehetséges.',
      }
    },
    de: () => {
      const runde = u.round_number ? `Runde ${u.round_number}` : 'die nächste Runde'
      return {
        naslov: `SLFF ${ozn}: dein Team holt keine Punkte für ${runde}`,
        glavno: `Dein Team ${ekipa} entspricht nicht den Regeln, deshalb wird es für ${runde} nicht gesperrt und holt darin keine Punkte.`,
        rok: rok && `Korrigieren kannst du es bis zur Deadline: ${rok}.`,
        gumb: 'Team korrigieren →',
        opomba:
          'Sonst wird dein Team von Runde zu Runde automatisch übernommen und du musst nichts tun. Wir schreiben dir nur, wenn das nicht geht.',
      }
    },
    sr: () => {
      const kolo = u.round_number ? `${u.round_number}. kolo` : 'sledeće kolo'
      return {
        naslov: `SLFF ${ozn}: tvoj tim neće osvojiti bodove za ${kolo}`,
        glavno: `Tim ${ekipa} ne ispunjava pravila, zato se za ${kolo} neće zaključati i u njemu neće osvojiti bodove.`,
        rok: rok && `Možeš da ga popraviš do roka: ${rok}.`,
        gumb: 'Popravi tim →',
        opomba:
          'Inače se tim sam prenosi iz kola u kolo i ne moraš ništa da radiš. Pišemo ti samo kad to nije moguće.',
      }
    },
    ro: () => {
      const etapa = u.round_number ? `etapa ${u.round_number}` : 'etapa următoare'
      return {
        naslov: `SLFF ${ozn}: echipa ta nu primește puncte pentru ${etapa}`,
        glavno: `Echipa ${ekipa} nu respectă regulile, așa că nu se blochează pentru ${etapa} și nu primește puncte în ea.`,
        rok: rok && `O poți corecta până la termen: ${rok}.`,
        gumb: 'Corectează echipa →',
        opomba:
          'Altfel echipa trece singură de la o etapă la alta și nu trebuie să faci nimic. Îți scriem doar când asta nu e posibil.',
      }
    },
    et: () => {
      const voorus = u.round_number ? `${u.round_number}. voorus` : 'järgmises voorus'
      return {
        naslov: `SLFF ${ozn}: sinu meeskond ei saa ${voorus} punkte`,
        glavno: `Meeskond ${ekipa} ei vasta reeglitele, seega see ei lukustu ja ei saa ${voorus} punkte.`,
        rok: rok && `Saad selle parandada kuni tähtajani: ${rok}.`,
        gumb: 'Paranda meeskond →',
        opomba:
          'Muidu kandub meeskond voorust vooru ise edasi ja sa ei pea midagi tegema. Kirjutame sulle ainult siis, kui see pole võimalik.',
      }
    },
    pl: () => {
      const kolejka = u.round_number ? `w ${u.round_number}. kolejce` : 'w następnej kolejce'
      return {
        naslov: `SLFF ${ozn}: twoja drużyna nie zdobędzie punktów ${kolejka}`,
        glavno: `Drużyna ${ekipa} nie spełnia zasad, więc nie zostanie zatwierdzona i nie zdobędzie punktów ${kolejka}.`,
        rok: rok && `Możesz to poprawić do terminu: ${rok}.`,
        gumb: 'Popraw drużynę →',
        opomba:
          'Normalnie drużyna sama przechodzi z kolejki do kolejki i nie musisz nic robić. Piszemy tylko wtedy, gdy to nie jest możliwe.',
      }
    },
    es: () => {
      const jornada = u.round_number ? `en la jornada ${u.round_number}` : 'en la próxima jornada'
      return {
        naslov: `SLFF ${ozn}: tu equipo no sumará puntos ${jornada}`,
        glavno: `El equipo ${ekipa} no cumple las reglas, así que no quedará cerrado y no sumará puntos ${jornada}.`,
        rok: rok && `Puedes corregirlo hasta el cierre: ${rok}.`,
        gumb: 'Corregir el equipo →',
        opomba:
          'Normalmente el equipo pasa solo de una jornada a otra y no tienes que hacer nada. Solo te escribimos cuando eso no es posible.',
      }
    },
    lv: () => {
      const karta = u.round_number ? `${u.round_number}. kārtā` : 'nākamajā kārtā'
      return {
        naslov: `SLFF ${ozn}: tava komanda ${karta} nesaņems punktus`,
        glavno: `Komanda ${ekipa} neatbilst noteikumiem, tāpēc tā netiks apstiprināta un ${karta} nesaņems punktus.`,
        rok: rok && `To vari izlabot līdz termiņam: ${rok}.`,
        gumb: 'Labot komandu →',
        opomba:
          'Parasti komanda pati pāriet no kārtas uz kārtu, un tev nekas nav jādara. Rakstām tikai tad, ja tas nav iespējams.',
      }
    },
    mk: () => {
      const kolo = u.round_number ? `${u.round_number}. коло` : 'следното коло'
      return {
        naslov: `SLFF ${ozn}: твојот тим нема да освои поени за ${kolo}`,
        glavno: `Тимот ${ekipa} не ги исполнува правилата, затоа за ${kolo} нема да се заклучи и во него нема да освои поени.`,
        rok: rok && `Можеш да го поправиш до рокот: ${rok}.`,
        gumb: 'Поправи го тимот →',
        opomba:
          'Инаку тимот сам се пренесува од коло во коло и не мора ништо да правиш. Ти пишуваме само кога тоа не е можно.',
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
    cs: {
      naslov: 'SLFF: schválili jsme tvou žádost o status znalce',
      kaj:
        meta.obseg === 'liga'
          ? `Od teď jsi <strong>znalcem ligy ${imeLige}</strong>: tvůj hlas sám potvrdí pozici hráče nebo asistenci, na další hlasy není třeba čekat.`
          : `Od teď jsi <strong>znalcem klubu ${klub}</strong> v lize ${imeLige}: tvůj hlas pro hráče tohoto klubu má trojnásobnou váhu.`,
      hvala: 'Děkujeme, že ses nabídl.',
      prosnja:
        'Jedna prosba: je to projev důvěry. Zadávej jen to, co opravdu víš, a nepřizpůsobuj údaje svému fantasy týmu. Závisí na tom body všech v lize. Pokud se ukáže, že údaje jsou úmyslně nesprávné, status znalce ztratíš.',
      kje: `Pozice upravuješ na stránce <a href="${p.pozicije}" style="color:#15803d;">Pozice</a>
        (platí vždy v pondělí ráno), asistence na stránce
        <a href="${p.asistence}" style="color:#15803d;">Asistence</a> (hned).
        Hráče, který už za klub nehraje, můžeš označit jako "už nehraje".`,
      gumb: 'Otevřít Pozice →',
      gumbUrl: p.pozicije,
      vprasanja: 'Pokud ti něco není jasné, odpověz na tento e-mail.',
    },
    hu: {
      naslov: 'SLFF: jóváhagytuk a szakértői kérelmedet',
      kaj:
        meta.obseg === 'liga'
          ? `Mostantól <strong>szakértő vagy ebben a bajnokságban: ${imeLige}</strong>. A szavazatod egymagában megerősíti a játékos posztját vagy a gólpasszt, nem kell más szavazatokra várni.`
          : `Mostantól <strong>${klub} klub szakértője vagy</strong> ebben a bajnokságban: ${imeLige}. A klub játékosaira leadott szavazatod háromszoros súllyal számít.`,
      hvala: 'Köszönjük, hogy jelentkeztél.',
      prosnja:
        'Egy kérésünk van: ez bizalmi feladat. Csak azt rögzítsd, amit biztosan tudsz, és ne a saját fantasy csapatodhoz igazítsd az adatokat. Ezen múlik a bajnokság összes résztvevőjének pontszáma. Ha kiderül, hogy szándékosan hibás adatokat adtál meg, elveszíted a szakértői státuszt.',
      kje: `A posztokat a <a href="${p.pozicije}" style="color:#15803d;">Posztok</a> oldalon szerkesztheted
        (minden hétfő reggel lépnek érvénybe), a gólpasszokat a
        <a href="${p.asistence}" style="color:#15803d;">Gólpasszok</a> oldalon (azonnal).
        Azt a játékost, aki már nem játszik a klubban, megjelölheted "már nem játszik" jelöléssel.`,
      gumb: 'Posztok megnyitása →',
      gumbUrl: p.pozicije,
      vprasanja: 'Ha valami nem világos, válaszolj erre az e-mailre.',
    },
    de: {
      naslov: 'SLFF: wir haben deine Anfrage als Kenner bestätigt',
      kaj:
        meta.obseg === 'liga'
          ? `Ab jetzt bist du <strong>Kenner der Liga ${imeLige}</strong>: deine Stimme allein bestätigt die Position eines Spielers oder eine Torvorlage, auf weitere Stimmen musst du nicht warten.`
          : `Ab jetzt bist du <strong>Kenner des Klubs ${klub}</strong> in der Liga ${imeLige}: deine Stimme für Spieler dieses Klubs zählt dreifach.`,
      hvala: 'Danke, dass du dich gemeldet hast.',
      prosnja:
        'Eine Bitte: das ist ein Vertrauensbeweis. Trag nur ein, was du wirklich weißt, und pass die Daten nicht an dein eigenes Fantasy-Team an. Davon hängen die Punkte aller in der Liga ab. Wenn sich herausstellt, dass Angaben absichtlich falsch sind, verlierst du den Kenner-Status.',
      kje: `Positionen bearbeitest du auf der Seite <a href="${p.pozicije}" style="color:#15803d;">Positionen</a>
        (sie gelten jeden Montag in der Früh), Torvorlagen auf der Seite
        <a href="${p.asistence}" style="color:#15803d;">Torvorlagen</a> (sofort).
        Einen Spieler, der nicht mehr für den Klub spielt, kannst du mit "spielt nicht mehr" markieren.`,
      gumb: 'Positionen öffnen →',
      gumbUrl: p.pozicije,
      vprasanja: 'Wenn dir etwas unklar ist, antworte einfach auf diese E-Mail.',
    },
    sr: {
      naslov: 'SLFF: odobrili smo tvoj zahtev za poznavaoca',
      kaj:
        meta.obseg === 'liga'
          ? `Od sada si <strong>poznavalac lige ${imeLige}</strong>: tvoj glas sam potvrđuje poziciju igrača ili asistenciju, ne treba čekati druge glasove.`
          : `Od sada si <strong>poznavalac kluba ${klub}</strong> u ligi ${imeLige}: tvoj glas za igrače tog kluba vredi trostruko.`,
      hvala: 'Hvala što si se prijavio.',
      prosnja:
        'Jedna molba: ovo je pitanje poverenja. Unosi samo ono što zaista znaš i ne prilagođavaj podatke svom fantasy timu. Od toga zavise bodovi svih u ligi. Ako se pokaže da su podaci namerno netačni, gubiš status poznavaoca.',
      kje: `Pozicije uređuješ na stranici <a href="${p.pozicije}" style="color:#15803d;">Pozicije</a>
        (primenjuju se svakog ponedeljka ujutru), asistencije na stranici
        <a href="${p.asistence}" style="color:#15803d;">Asistencije</a> (odmah).
        Igrača koji više ne igra za klub možeš da označiš sa "više ne igra".`,
      gumb: 'Otvori Pozicije →',
      gumbUrl: p.pozicije,
      vprasanja: 'Ako ti nešto nije jasno, odgovori na ovaj imejl.',
    },
    ro: {
      naslov: 'SLFF: ți-am aprobat cererea de cunoscător',
      kaj:
        meta.obseg === 'liga'
          ? `De acum ești <strong>cunoscător al ligii ${imeLige}</strong>: votul tău confirmă singur poziția unui jucător sau o pasă decisivă, nu mai trebuie așteptate alte voturi.`
          : `De acum ești <strong>cunoscător al clubului ${klub}</strong> în liga ${imeLige}: votul tău pentru jucătorii acestui club contează triplu.`,
      hvala: 'Mersi că te-ai oferit.',
      prosnja:
        'O rugăminte: e o dovadă de încredere. Introdu doar ce știi cu adevărat și nu potrivi datele după echipa ta fantasy. De asta depind punctele tuturor din ligă. Dacă se dovedește că datele sunt greșite intenționat, pierzi statutul de cunoscător.',
      kje: `Pozițiile le editezi pe pagina <a href="${p.pozicije}" style="color:#15803d;">Poziții</a>
        (se aplică în fiecare luni dimineața), pasele decisive pe pagina
        <a href="${p.asistence}" style="color:#15803d;">Pase decisive</a> (imediat).
        Pe un jucător care nu mai joacă la club îl poți marca cu "nu mai joacă".`,
      gumb: 'Deschide Poziții →',
      gumbUrl: p.pozicije,
      vprasanja: 'Dacă ceva nu e clar, răspunde la acest e-mail.',
    },
    et: {
      naslov: 'SLFF: kinnitasime sinu asjatundja taotluse',
      kaj:
        meta.obseg === 'liga'
          ? `Nüüdsest oled liiga <strong>${imeLige}</strong> asjatundja: sinu hääl üksi kinnitab mängija positsiooni või resultatiivse söödu, teisi hääli pole vaja oodata.`
          : `Nüüdsest oled klubi <strong>${klub}</strong> asjatundja (liiga: ${imeLige}): sinu hääl selle klubi mängijate üle loeb kolmekordselt.`,
      hvala: 'Aitäh, et pakkusid end appi.',
      prosnja:
        'Üks palve: see on usalduse märk. Sisesta ainult seda, mida tõesti tead, ja ära sobita andmeid oma fantaasiameeskonna järgi. Sellest sõltuvad kõigi liiga mängijate punktid. Kui selgub, et andmed on meelega valed, kaotad asjatundja staatuse.',
      kje: `Positsioone muudad lehel <a href="${p.pozicije}" style="color:#15803d;">Positsioonid</a>
        (jõustuvad iga esmaspäeva hommikul), resultatiivseid sööte lehel
        <a href="${p.asistence}" style="color:#15803d;">Resultatiivsed söödud</a> (kohe).
        Mängija, kes klubis enam ei mängi, saad märkida "enam ei mängi".`,
      gumb: 'Ava Positsioonid →',
      gumbUrl: p.pozicije,
      vprasanja: 'Kui midagi on ebaselge, vasta sellele kirjale.',
    },
    pl: {
      naslov: 'SLFF: zatwierdziliśmy twoją prośbę o status znawcy',
      kaj:
        meta.obseg === 'liga'
          ? `Od teraz jesteś znawcą ligi <strong>${imeLige}</strong>: twój głos sam zatwierdza pozycję zawodnika lub asystę, nie trzeba czekać na inne głosy.`
          : `Od teraz jesteś znawcą klubu <strong>${klub}</strong> (liga: ${imeLige}): twój głos przy zawodnikach tego klubu liczy się potrójnie.`,
      hvala: 'Dziękujemy za chęć pomocy.',
      prosnja:
        'Jedna prośba: to wyraz zaufania. Wpisuj tylko to, co naprawdę wiesz, i nie dopasowuj danych do swojej drużyny fantasy. Od tego zależą punkty wszystkich graczy w lidze. Jeśli okaże się, że dane są celowo błędne, stracisz status znawcy.',
      kje: `Pozycje zmieniasz na stronie <a href="${p.pozicije}" style="color:#15803d;">Pozycje</a>
        (zaczynają obowiązywać w każdy poniedziałek rano), asysty na stronie
        <a href="${p.asistence}" style="color:#15803d;">Asysty</a> (od razu).
        Zawodnika, który już nie gra w klubie, możesz oznaczyć jako "już nie gra".`,
      gumb: 'Otwórz Pozycje →',
      gumbUrl: p.pozicije,
      vprasanja: 'Jeśli coś jest niejasne, odpowiedz na tę wiadomość.',
    },
    es: {
      naslov: 'SLFF: hemos aprobado tu solicitud para ser experto',
      kaj:
        meta.obseg === 'liga'
          ? `Desde ahora eres experto de la liga <strong>${imeLige}</strong>: tu voto confirma por sí solo la posición de un jugador o una asistencia, sin esperar a otros votos.`
          : `Desde ahora eres experto del club <strong>${klub}</strong> (liga: ${imeLige}): tu voto sobre los jugadores de este club cuenta el triple.`,
      hvala: 'Gracias por ofrecerte a ayudar.',
      prosnja:
        'Una petición: esto es una muestra de confianza. Introduce solo lo que sepas de verdad y no ajustes los datos a tu equipo fantasy. De ello dependen los puntos de todos en la liga. Si resulta que los datos son falsos a propósito, perderás el estatus de experto.',
      kje: `Las posiciones se cambian en la página <a href="${p.pozicije}" style="color:#15803d;">Posiciones</a>
        (se aplican cada lunes por la mañana) y las asistencias en la página
        <a href="${p.asistence}" style="color:#15803d;">Asistencias</a> (al momento).
        A un jugador que ya no juega en el club lo puedes marcar como "ya no juega".`,
      gumb: 'Abrir Posiciones →',
      gumbUrl: p.pozicije,
      vprasanja: 'Si algo no está claro, responde a este correo.',
    },
    lv: {
      naslov: 'SLFF: apstiprinājām tavu pieteikumu par eksperta statusu',
      kaj:
        meta.obseg === 'liga'
          ? `No šī brīža tu esi līgas eksperts (līga: <strong>${imeLige}</strong>): tava balss viena pati apstiprina spēlētāja pozīciju vai rezultatīvo piespēli, citas balsis nav jāgaida.`
          : `No šī brīža tu esi kluba eksperts (klubs: <strong>${klub}</strong>, līga: ${imeLige}): tava balss par šī kluba spēlētājiem skaitās trīskārt.`,
      hvala: 'Paldies, ka piedāvāji palīdzību.',
      prosnja:
        'Viens lūgums: tā ir uzticēšanās zīme. Ievadi tikai to, ko tiešām zini, un nepielāgo datus savai fantāzijas komandai. No tā ir atkarīgi visu līgas dalībnieku punkti. Ja izrādīsies, ka dati ir apzināti nepareizi, tu zaudēsi eksperta statusu.',
      kje: `Pozīcijas maini lapā <a href="${p.pozicije}" style="color:#15803d;">Pozīcijas</a>
        (stājas spēkā katru pirmdienas rītu), rezultatīvās piespēles lapā
        <a href="${p.asistence}" style="color:#15803d;">Rezultatīvās piespēles</a> (uzreiz).
        Spēlētāju, kurš klubā vairs nespēlē, vari atzīmēt kā "vairs nespēlē".`,
      gumb: 'Atvērt Pozīcijas →',
      gumbUrl: p.pozicije,
      vprasanja: 'Ja kaut kas nav skaidrs, atbildi uz šo vēstuli.',
    },
    mk: {
      naslov: 'SLFF: го одобривме твоето барање за познавач',
      kaj:
        meta.obseg === 'liga'
          ? `Отсега си познавач на лигата (лига: <strong>${imeLige}</strong>): твојот глас сам ја потврдува позицијата на играчот или асистенцијата, не треба да се чекаат други гласови.`
          : `Отсега си познавач на клубот (клуб: <strong>${klub}</strong>, лига: ${imeLige}): твојот глас за играчите од тој клуб вреди тројно.`,
      hvala: 'Ти благодариме што се пријави.',
      prosnja:
        'Една молба: ова е прашање на доверба. Внесувај само она што навистина го знаеш и не ги прилагодувај податоците на својот фантази тим. Од тоа зависат поените на сите во лигата. Ако се покаже дека податоците се намерно неточни, го губиш статусот на познавач.',
      kje: `Позициите ги уредуваш на страницата <a href="${p.pozicije}" style="color:#15803d;">Позиции</a>
        (се применуваат секој понеделник наутро), асистенциите на страницата
        <a href="${p.asistence}" style="color:#15803d;">Асистенции</a> (веднаш).
        Играчот што повеќе не игра за клубот можеш да го означиш со "повеќе не игра".`,
      gumb: 'Отвори Позиции →',
      gumbUrl: p.pozicije,
      vprasanja: 'Ако нешто не ти е јасно, одговори на оваа порака.',
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
const POZICIJA_CS: Record<string, string> = { DEF: 'obránce', MID: 'záložník', FWD: 'útočník' }
const POZICIJA_HU: Record<string, string> = { DEF: 'védő', MID: 'középpályás', FWD: 'támadó' }
const POZICIJA_DE: Record<string, string> = { DEF: 'Verteidiger', MID: 'Mittelfeldspieler', FWD: 'Stürmer' }
const POZICIJA_SR: Record<string, string> = { DEF: 'odbrambeni', MID: 'vezni', FWD: 'napadač' }
const POZICIJA_RO: Record<string, string> = { DEF: 'fundaș', MID: 'mijlocaș', FWD: 'atacant' }
const POZICIJA_ET: Record<string, string> = { DEF: 'kaitsja', MID: 'poolkaitsja', FWD: 'ründaja' }
const POZICIJA_LV: Record<string, string> = { DEF: 'aizsargs', MID: 'pussargs', FWD: 'uzbrucējs' }
const POZICIJA_MK: Record<string, string> = { DEF: 'одбранбен', MID: 'среден ред', FWD: 'напаѓач' }
const POZICIJA_PL: Record<string, string> = { DEF: 'obrońca', MID: 'pomocnik', FWD: 'napastnik' }
const POZICIJA_ES: Record<string, string> = { DEF: 'defensa', MID: 'centrocampista', FWD: 'delantero' }
const POZICIJA: Record<Jezik, Record<string, string>> = { sl: POZICIJA_SL, sk: POZICIJA_SK, hr: POZICIJA_HR, cs: POZICIJA_CS, hu: POZICIJA_HU, de: POZICIJA_DE, sr: POZICIJA_SR, ro: POZICIJA_RO, et: POZICIJA_ET, pl: POZICIJA_PL, es: POZICIJA_ES, lv: POZICIJA_LV, mk: POZICIJA_MK }

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
      if (j === 'hr' || j === 'sr') return poz ? `${ime} (sada ${poz})` : ime
      if (j === 'cs') return poz ? `${ime} (nyní ${poz})` : ime
      if (j === 'hu') return poz ? `${ime} (mostantól ${poz})` : ime
      if (j === 'de') return poz ? `${ime} (jetzt ${poz})` : ime
      if (j === 'ro') return poz ? `${ime} (acum ${poz})` : ime
      if (j === 'et') return poz ? `${ime} (nüüd ${poz})` : ime
      if (j === 'lv') return poz ? `${ime} (tagad ${poz})` : ime
      if (j === 'mk') return poz ? `${ime} (сега ${poz})` : ime
      if (j === 'pl') return poz ? `${ime} (teraz ${poz})` : ime
      if (j === 'es') return poz ? `${ime} (ahora ${poz})` : ime
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
    cs: {
      naslov: `SLFF ${ozn}: oprava pozice hráče v tvém týmu`,
      glavno:
        `V tvém týmu ${ekipa ? `<strong>${ekipa}</strong> ` : ''}máš hráče ${kdo}, ` +
        'kterého jsme omylem vedli jako brankáře. Zápis o utkání ho jednou označil jako brankáře, ' +
        've skutečnosti ale hraje v poli. Jeho pozici jsme opravili.',
      body:
        'Co to pro tebe znamená: na soupisce zůstává na místě brankáře, takže tým je dál platný ' +
        'a nemusíš nic dělat. Body ale od teď získává jako hráč v poli, body posledního kola jsou už ' +
        'přepočítané. Pokud ho prodáš, na jeho místo bude potřeba koupit brankáře.',
      gumb: 'Otevřít můj tým →',
      opomba: 'Omlouváme se za chybu.',
    },
    hu: {
      naslov: `SLFF ${ozn}: javítottuk egy játékosod posztját`,
      glavno:
        `A csapatodban ${ekipa ? `(<strong>${ekipa}</strong>) ` : ''}szerepel ${kdo}, ` +
        'akit tévedésből kapusként tartottunk nyilván. A mérkőzés jegyzőkönyve egyszer kapusként jelölte, ' +
        'valójában azonban mezőnyjátékos. A posztját kijavítottuk.',
      body:
        'Mit jelent ez számodra: a keretedben továbbra is a kapus helyén marad, így a csapatod érvényes ' +
        'marad, és semmit sem kell tenned. Pontot viszont mostantól mezőnyjátékosként szerez, az utolsó ' +
        'forduló pontjait már újraszámoltuk. Ha eladod, a helyére kapust kell venned.',
      gumb: 'Csapatom megnyitása →',
      opomba: 'Elnézést kérünk a hibáért.',
    },
    de: {
      naslov: `SLFF ${ozn}: Korrektur der Position eines Spielers in deinem Team`,
      glavno:
        `In deinem Team ${ekipa ? `(<strong>${ekipa}</strong>) ` : ''}ist ${kdo}, ` +
        'den wir irrtümlich als Tormann geführt haben. Der Spielbericht hat ihn einmal als Tormann eingetragen, ' +
        'tatsächlich ist er aber Feldspieler. Wir haben seine Position korrigiert.',
      body:
        'Was das für dich heißt: im Kader bleibt er auf dem Platz des Tormanns, dein Team bleibt also gültig ' +
        'und du musst nichts tun. Punkte holt er aber ab jetzt als Feldspieler, die Punkte der letzten ' +
        'Runde haben wir schon neu berechnet. Wenn du ihn verkaufst, musst du an seiner Stelle einen Tormann kaufen.',
      gumb: 'Mein Team öffnen →',
      opomba: 'Entschuldige den Fehler.',
    },
    sr: {
      naslov: `SLFF ${ozn}: ispravka pozicije igrača u tvom timu`,
      glavno:
        `U tvom timu ${ekipa ? `<strong>${ekipa}</strong> ` : ''}imaš igrača ${kdo}, ` +
        'kojeg smo greškom vodili kao golmana. Zapisnik utakmice ga je jednom označio kao golmana, ' +
        'ali on zapravo igra u polju. Ispravili smo mu poziciju.',
      body:
        'Šta to znači za tebe: u tvom sastavu ostaje na mestu golmana, pa je tim i dalje ispravan ' +
        'i ne moraš ništa da radiš. Bodove međutim od sada dobija kao igrač iz polja, a bodovi poslednjeg ' +
        'kola su već preračunati. Ako ga prodaš, na njegovo mesto moraćeš da kupiš golmana.',
      gumb: 'Otvori moj tim →',
      opomba: 'Izvinjavamo se zbog greške.',
    },
    ro: {
      naslov: `SLFF ${ozn}: am corectat poziția unui jucător din echipa ta`,
      glavno:
        `În echipa ta ${ekipa ? `<strong>${ekipa}</strong> ` : ''}îl ai pe ${kdo}, ` +
        'pe care l-am avut trecut din greșeală ca portar. Raportul unui meci l-a marcat o dată ca portar, ' +
        'dar de fapt e jucător de câmp. I-am corectat poziția.',
      body:
        'Ce înseamnă asta pentru tine: în lotul tău rămâne pe locul de portar, așa că echipa e în continuare validă ' +
        'și nu trebuie să faci nimic. De acum însă primește puncte ca jucător de câmp, iar punctele ultimei ' +
        'etape sunt deja recalculate. Dacă îl vinzi, în locul lui va trebui să cumperi un portar.',
      gumb: 'Deschide echipa mea →',
      opomba: 'Ne cerem scuze pentru greșeală.',
    },
    et: {
      naslov: `SLFF ${ozn}: parandasime sinu meeskonna mängija positsiooni`,
      glavno:
        `Sinu meeskonnas ${ekipa ? `<strong>${ekipa}</strong> ` : ''}on mängija ${kdo}, ` +
        'kes oli meil ekslikult väravavahina kirjas. Ühe mängu protokoll märkis ta korra väravavahiks, ' +
        'kuid tegelikult mängib ta väljakul. Parandasime tema positsiooni.',
      body:
        'Mida see sinu jaoks tähendab: sinu koosseisus jääb ta väravavahi kohale, nii et meeskond vastab endiselt reeglitele ' +
        'ja sa ei pea midagi tegema. Nüüdsest saab ta aga punkte väljakumängijana ja viimase vooru punktid ' +
        'on juba ümber arvutatud. Kui ta müüd, pead tema asemele ostma väravavahi.',
      gumb: 'Ava minu meeskond →',
      opomba: 'Vabandame vea pärast.',
    },
    pl: {
      naslov: `SLFF ${ozn}: poprawiliśmy pozycję zawodnika w twojej drużynie`,
      glavno:
        `W twojej drużynie ${ekipa ? `<strong>${ekipa}</strong> ` : ''}jest zawodnik ${kdo}, ` +
        'który był u nas błędnie zapisany jako bramkarz. Protokół jednego meczu raz oznaczył go jako bramkarza, ' +
        'ale w rzeczywistości gra w polu. Poprawiliśmy jego pozycję.',
      body:
        'Co to dla ciebie oznacza: w twojej kadrze zostaje na miejscu bramkarza, więc drużyna nadal spełnia zasady ' +
        'i nie musisz nic robić. Od teraz jednak zdobywa punkty jako zawodnik z pola, a punkty z ostatniej kolejki ' +
        'zostały już przeliczone. Jeśli go sprzedasz, w jego miejsce musisz kupić bramkarza.',
      gumb: 'Otwórz moją drużynę →',
      opomba: 'Przepraszamy za pomyłkę.',
    },
    es: {
      naslov: `SLFF ${ozn}: hemos corregido la posición de un jugador de tu equipo`,
      glavno:
        `En tu equipo ${ekipa ? `<strong>${ekipa}</strong> ` : ''}tienes a ${kdo}, ` +
        'a quien teníamos registrado por error como portero. El acta de un partido lo marcó una vez como portero, ' +
        'pero en realidad juega de campo. Hemos corregido su posición.',
      body:
        'Qué significa para ti: en tu plantilla sigue ocupando el puesto de portero, así que el equipo sigue cumpliendo las reglas ' +
        'y no tienes que hacer nada. Pero desde ahora puntúa como jugador de campo, y los puntos de la última jornada ' +
        'ya están recalculados. Si lo vendes, en su lugar tendrás que comprar un portero.',
      gumb: 'Abrir mi equipo →',
      opomba: 'Perdona el error.',
    },
    lv: {
      naslov: `SLFF ${ozn}: izlabojām spēlētāja pozīciju tavā komandā`,
      glavno:
        `Tavā komandā ${ekipa ? `<strong>${ekipa}</strong> ` : ''}ir spēlētājs ${kdo}, ` +
        'kurš pie mums kļūdaini bija reģistrēts kā vārtsargs. Vienas spēles protokolā viņš reiz tika atzīmēts kā vārtsargs, ' +
        'taču patiesībā viņš spēlē laukumā. Mēs izlabojām viņa pozīciju.',
      body:
        'Ko tas tev nozīmē: tavā sastāvā viņš paliek vārtsarga vietā, tāpēc komanda joprojām atbilst noteikumiem ' +
        'un tev nekas nav jādara. Taču turpmāk viņš saņem punktus kā laukuma spēlētājs, un pēdējās kārtas punkti ' +
        'jau ir pārrēķināti. Ja viņu pārdosi, viņa vietā būs jānopērk vārtsargs.',
      gumb: 'Atvērt manu komandu →',
      opomba: 'Atvainojamies par kļūdu.',
    },
    mk: {
      naslov: `SLFF ${ozn}: исправка на позицијата на играч во твојот тим`,
      glavno:
        `Во твојот тим ${ekipa ? `<strong>${ekipa}</strong> ` : ''}го имаш играчот ${kdo}, ` +
        'кој по грешка го водевме како голман. Записникот од еден натпревар еднаш го означил како голман, ' +
        'но тој всушност игра во поле. Му ја поправивме позицијата.',
      body:
        'Што значи тоа за тебе: во твојот состав останува на местото на голманот, па тимот и понатаму е исправен ' +
        'и не мора ништо да правиш. Поените сепак отсега ги добива како играч од поле, а поените од последното ' +
        'коло се веќе пресметани одново. Ако го продадеш, на неговото место ќе мора да купиш голман.',
      gumb: 'Отвори го мојот тим →',
      opomba: 'Се извинуваме за грешката.',
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
    cs: {
      naslov: `SLFF ${ozn}: klub tvého hráče odstoupil ze soutěže`,
      glavno:
        `Klub ${klubi} odstoupil ze soutěže. ` +
        `${ekipa ? `V týmu <strong>${ekipa}</strong> máš` : 'V týmu máš'} jeho hráče: ${kdo}.`,
      body:
        'Tito hráči už hrát nebudou, takže za ně už nezískáš body. Tým zůstává platný a ostatní hráči ' +
        'získávají body normálně. Doporučujeme ti je ale vyměnit před nejbližší uzávěrkou. ' +
        'Body, které už získali v odehraných zápasech, ti zůstávají. Koupit je už nemůže nikdo.',
      gumb: 'Vyměnit hráče →',
    },
    hu: {
      naslov: `SLFF ${ozn}: egy játékosod klubja visszalépett a bajnokságból`,
      glavno:
        `${klubi} csapata visszalépett a bajnokságból. ` +
        `${ekipa ? `A csapatodban (<strong>${ekipa}</strong>)` : 'A csapatodban'} ott vannak a játékosai: ${kdo}.`,
      body:
        'Ezek a játékosok már nem fognak játszani, így utánuk nem kapsz több pontot. A csapatod érvényes marad, ' +
        'a többi játékos rendesen gyűjti a pontokat, de azt javasoljuk, hogy a következő határidő előtt cseréld le őket. ' +
        'A már lejátszott meccseken szerzett pontjaik megmaradnak. Őket már senki sem veheti meg.',
      gumb: 'Játékosok cseréje →',
    },
    de: {
      naslov: `SLFF ${ozn}: der Klub eines deiner Spieler hat sich aus der Liga zurückgezogen`,
      glavno:
        `${klubi} hat sich aus der Liga zurückgezogen. ` +
        `${ekipa ? `In deinem Team (<strong>${ekipa}</strong>)` : 'In deinem Team'} sind seine Spieler: ${kdo}.`,
      body:
        'Diese Spieler werden nicht mehr spielen, du bekommst für sie also keine Punkte mehr. Dein Team bleibt gültig ' +
        'und die anderen Spieler sammeln normal Punkte, wir empfehlen dir aber, sie vor der nächsten Deadline zu tauschen. ' +
        'Die Punkte, die sie in den gespielten Partien geholt haben, bleiben dir. Kaufen kann sie niemand mehr.',
      gumb: 'Spieler tauschen →',
    },
    sr: {
      naslov: `SLFF ${ozn}: klub tvog igrača istupio je iz lige`,
      glavno:
        `Klub ${klubi} istupio je iz lige. ` +
        `${ekipa ? `U timu <strong>${ekipa}</strong> imaš` : 'U timu imaš'} njegove igrače: ${kdo}.`,
      body:
        'Ti igrači više neće igrati, pa za njih više nećeš dobijati bodove. Tim ostaje ispravan, a ostali ' +
        'igrači bodove dobijaju normalno. Ipak ti preporučujemo da ih zameniš pre sledećeg roka. ' +
        'Bodovi koje su već osvojili na odigranim utakmicama ostaju ti. Više niko ne može da ih kupi.',
      gumb: 'Zameni igrače →',
    },
    ro: {
      naslov: `SLFF ${ozn}: clubul unui jucător de-al tău s-a retras din ligă`,
      glavno:
        `Clubul ${klubi} s-a retras din ligă. ` +
        `${ekipa ? `În echipa <strong>${ekipa}</strong> ai` : 'În echipă ai'} jucători de-ai lui: ${kdo}.`,
      body:
        'Acești jucători nu vor mai juca, așa că nu mai primești puncte pentru ei. Echipa rămâne validă, iar ceilalți ' +
        'jucători primesc puncte normal. Totuși îți recomandăm să-i schimbi înainte de următorul termen. ' +
        'Punctele pe care le-au strâns deja în meciurile jucate îți rămân. Nimeni nu-i mai poate cumpăra.',
      gumb: 'Schimbă jucătorii →',
    },
    et: {
      naslov: `SLFF ${ozn}: sinu mängija klubi lahkus liigast`,
      glavno:
        `Klubi ${klubi} lahkus liigast. ` +
        `${ekipa ? `Meeskonnas <strong>${ekipa}</strong> on sul` : 'Meeskonnas on sul'} selle klubi mängijaid: ${kdo}.`,
      body:
        'Need mängijad enam ei mängi, seega sa nende eest enam punkte ei saa. Meeskond jääb nõuetekohaseks ja teised ' +
        'mängijad saavad punkte tavapäraselt. Siiski soovitame nad enne järgmist tähtaega välja vahetada. ' +
        'Punktid, mis nad mängitud mängudes juba kogusid, jäävad sulle. Keegi ei saa neid enam osta.',
      gumb: 'Vaheta mängijad →',
    },
    pl: {
      naslov: `SLFF ${ozn}: klub twojego zawodnika wycofał się z ligi`,
      glavno:
        `Klub ${klubi} wycofał się z ligi. ` +
        `${ekipa ? `W drużynie <strong>${ekipa}</strong> masz` : 'W drużynie masz'} zawodników tego klubu: ${kdo}.`,
      body:
        'Ci zawodnicy już nie zagrają, więc nie zdobędziesz za nich punktów. Drużyna pozostaje prawidłowa, a pozostali ' +
        'zawodnicy zdobywają punkty normalnie. Mimo to radzimy wymienić ich przed następnym terminem. ' +
        'Punkty, które już zdobyli w rozegranych meczach, zostają ci. Nikt nie może ich już kupić.',
      gumb: 'Wymień zawodników →',
    },
    es: {
      naslov: `SLFF ${ozn}: el club de un jugador tuyo se ha retirado de la liga`,
      glavno:
        `El club ${klubi} se ha retirado de la liga. ` +
        `${ekipa ? `En el equipo <strong>${ekipa}</strong> tienes` : 'En tu equipo tienes'} jugadores de ese club: ${kdo}.`,
      body:
        'Estos jugadores ya no van a jugar, así que no sumarás puntos con ellos. El equipo sigue siendo válido y los demás ' +
        'jugadores puntúan con normalidad. Aun así, te recomendamos cambiarlos antes del próximo cierre. ' +
        'Los puntos que ya sumaron en los partidos jugados se quedan contigo. Ya nadie puede ficharlos.',
      gumb: 'Cambiar jugadores →',
    },
    lv: {
      naslov: `SLFF ${ozn}: tava spēlētāja klubs izstājās no līgas`,
      glavno:
        `Klubs ${klubi} izstājās no līgas. ` +
        `${ekipa ? `Komandā <strong>${ekipa}</strong> tev ir` : 'Komandā tev ir'} šī kluba spēlētāji: ${kdo}.`,
      body:
        'Šie spēlētāji vairs nespēlēs, tāpēc par viņiem punktus vairs nesaņemsi. Komanda paliek derīga, un pārējie ' +
        'spēlētāji punktus saņem kā parasti. Tomēr iesakām viņus nomainīt pirms nākamā termiņa. ' +
        'Punkti, ko viņi jau savāca aizvadītajās spēlēs, paliek tev. Neviens viņus vairs nevar nopirkt.',
      gumb: 'Nomainīt spēlētājus →',
    },
    mk: {
      naslov: `SLFF ${ozn}: клубот на твојот играч се повлече од лигата`,
      glavno:
        `Клубот ${klubi} се повлече од лигата. ` +
        `${ekipa ? `Во тимот <strong>${ekipa}</strong> ги имаш` : 'Во тимот ги имаш'} неговите играчи: ${kdo}.`,
      body:
        'Тие играчи повеќе нема да играат, па за нив повеќе нема да добиваш поени. Тимот останува исправен, а останатите ' +
        'играчи добиваат поени нормално. Сепак ти препорачуваме да ги замениш пред следниот рок. ' +
        'Поените што веќе ги освоија на одиграните натпревари ти остануваат. Никој повеќе не може да ги купи.',
      gumb: 'Замени ги играчите →',
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
        ? (Number.isInteger(n) ? skMn(n, 'bod', 'body', 'bodov') : 'bodu')
        : j === 'hr' || j === 'sr'
          ? hrMn(cela(n), 'bod', 'boda', 'bodova')
          : j === 'cs'
            ? (Number.isInteger(n) ? skMn(n, 'bod', 'body', 'bodů') : 'bodu')
            : j === 'hu'
              ? 'pont' // madžarščina za številom ne pozna množine
              : j === 'de'
                ? (n === 1 ? 'Punkt' : 'Punkte')
                : j === 'ro'
                  ? roMn(cela(n), 'punct', 'puncte', 'de puncte')
                  : j === 'et'
                    ? (n === 1 ? 'punkt' : 'punkti')
                    : j === 'pl'
                      ? plMn(n, 'punkt', 'punkty', 'punktów', 'punktu')
                      : j === 'es'
                        ? (n === 1 ? 'punto' : 'puntos')
                        : j === 'lv'
                          ? lvMn(n, 'punktu', 'punkts', 'punkti')
                          : j === 'mk'
                            ? mkMn(n, 'поен', 'поени')
                            : slMn(cela(n), 'točka', 'točki', 'točke', 'točk')
    }`
  const ekipa = `<strong>${esc(m.ekipa)}</strong>`
  const premik = m.mesto_prej == null ? 0 : m.mesto_prej - m.mesto
  const premikZnak = premik > 0 ? ` (+${premik})` : premik < 0 ? ` (${premik})` : ''
  const najboljsiVLigi = m.najvec != null && m.tocke >= m.najvec && m.ekip > 1
  const najboljsiNiKapetan = m.najboljsi && m.najboljsi !== m.kapetan
  // Pivo le po dobrem krogu: točke in vsaj povprečje lige.
  const dobrKrog = m.tocke > 0 && m.povprecje != null && m.tocke >= m.povprecje

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
      pivo: 'P.S. SLFF je zadarmo a beží na pive. Ak ti toto kolo spríjemnilo pondelok, pozvi nás na jedno a získaš miesto na pivnej stene:',
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
      pivo: 'P.S. SLFF je besplatan i radi na pivu. Ako ti je ovo kolo uljepšalo ponedjeljak, počasti nas jednim i dobij mjesto na pivskom zidu:',
      odjava: 'Ne želim više primati e-mailove',
    },
    cs: {
      naslov: `SLFF ${ozn}: ${m.krog}. kolo, ${tock(m.tocke)}, ${m.mesto}. místo${premikZnak}`,
      glavno: `Tvůj tým ${ekipa} získal v ${m.krog}. kole v lize ${OZN} <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Průměr ligy: ${st(m.povprecje)}, nejvíc: ${st(m.najvec)}.` : '',
      top: 'Nejvíc bodů v celé lize v tomto kole.',
      mesto: `V žebříčku jsi na <strong>${m.mesto}. místě</strong> z ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (předtím ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Kapitán ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Nejlepší v týmu: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Připrav tým na další kolo →',
      pivo: 'P.S. SLFF je zdarma a běží na pivu. Jestli ti tohle kolo zpříjemnilo pondělí, kup nám jedno a získáš místo na pivní zdi:',
      odjava: 'Nechci už dostávat e-maily',
    },
    // Madžarščina: člen a/az pred številko je odvisen od izgovora, zato
    // stavki številko postavijo brez člena.
    hu: {
      naslov: `SLFF ${ozn}: ${m.krog}. forduló, ${tock(m.tocke)}, ${m.mesto}. hely${premikZnak}`,
      glavno: `${m.krog}. forduló (${OZN}): a csapatod, ${ekipa}, <strong>${tock(m.tocke)}ot</strong> szerzett.`,
      liga: m.povprecje != null && m.najvec != null
        ? `A bajnokság átlaga: ${st(m.povprecje)}, a legtöbb: ${st(m.najvec)}.` : '',
      top: 'Ebben a fordulóban a te csapatod szerezte a legtöbb pontot az egész bajnokságban.',
      mesto: `Helyezésed a tabellán: <strong>${m.mesto}.</strong> hely ${m.ekip} csapat közül` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (korábban ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Csapatkapitány (${esc(m.kapetan)}): ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Legjobb a csapatban: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Készítsd fel a csapatodat a következő fordulóra →',
      pivo: 'U.i. Az SLFF ingyenes, és sörből működik. Ha ez a forduló feldobta a hétfődet, hívj meg minket egyre, és felkerülsz a sörfalra:',
      odjava: 'Nem kérek több e-mailt',
    },
    de: {
      naslov: `SLFF ${ozn}: Runde ${m.krog}, ${tock(m.tocke)}, Platz ${m.mesto}${premikZnak}`,
      glavno: `Dein Team ${ekipa} hat in Runde ${m.krog} (${OZN}) <strong>${tock(m.tocke)}</strong> geholt.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Schnitt der Liga: ${st(m.povprecje)}, am meisten: ${st(m.najvec)}.` : '',
      top: 'Die meisten Punkte der ganzen Liga in dieser Runde.',
      mesto: `In der Tabelle bist du auf <strong>Platz ${m.mesto}</strong> von ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (vorher Platz ${m.mesto_prej}).`),
      kapetan: m.kapetan ? `Kapitän ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Bester im Team: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Mach dein Team für die nächste Runde bereit →',
      pivo: 'PS: SLFF ist kostenlos und läuft mit Bier. Wenn dir diese Runde den Montag versüßt hat, spendier uns eins und hol dir einen Platz an der Bierwand:',
      odjava: 'Keine E-Mails mehr',
    },
    sr: {
      naslov: `SLFF ${ozn}: ${m.krog}. kolo, ${tock(m.tocke)}, ${m.mesto}. mesto${premikZnak}`,
      glavno: `Tvoj tim ${ekipa} osvojio je u ${m.krog}. kolu lige ${OZN} <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Prosek lige: ${st(m.povprecje)}, najviše: ${st(m.najvec)}.` : '',
      top: 'Najviše bodova u celoj ligi u ovom kolu.',
      mesto: `Na tabeli si <strong>${m.mesto}.</strong> od ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (pre toga ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Kapiten ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Najbolji u timu: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Pripremi tim za sledeće kolo →',
      pivo: 'P.S. SLFF je besplatan i radi na pivu. Ako ti je ovo kolo ulepšalo ponedeljak, časti nas jednim i dobij mesto na pivskom zidu:',
      odjava: 'Ne želim više da primam imejlove',
    },
    ro: {
      naslov: `SLFF ${ozn}: etapa ${m.krog}, ${tock(m.tocke)}, locul ${m.mesto}${premikZnak}`,
      glavno: `Echipa ta ${ekipa} a strâns în etapa ${m.krog} din liga ${OZN} <strong>${tock(m.tocke)}</strong>.`,
      liga: m.povprecje != null && m.najvec != null
        ? `Media ligii: ${st(m.povprecje)}, maximul: ${st(m.najvec)}.` : '',
      top: 'Cele mai multe puncte din toată liga în această etapă.',
      mesto: `În clasament ești pe <strong>locul ${m.mesto}</strong> din ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (înainte, locul ${m.mesto_prej}).`),
      kapetan: m.kapetan ? `Căpitanul ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Cel mai bun din echipă: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Pregătește echipa pentru etapa următoare →',
      pivo: 'P.S. SLFF este gratuit și merge cu bere. Dacă etapa asta ți-a înseninat ziua de luni, fă-ne cinste cu una și primești un loc pe zidul berilor:',
      odjava: 'Nu mai vreau e-mailuri',
    },
    et: {
      naslov: `SLFF ${ozn}: ${m.krog}. voor, ${tock(m.tocke)}, ${m.mesto}. koht${premikZnak}`,
      glavno: `Sinu meeskond ${ekipa} kogus ${m.krog}. voorus <strong>${tock(m.tocke)}</strong> (liiga: ${OZN}).`,
      liga: m.povprecje != null && m.najvec != null
        ? `Liiga keskmine: ${st(m.povprecje)}, parim: ${st(m.najvec)}.` : '',
      top: 'Kogu liiga kõige rohkem punkte selles voorus.',
      mesto: `Edetabelis oled <strong>${m.mesto}. kohal</strong> ${m.ekip} meeskonnast` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (enne ${m.mesto_prej}. kohal).`),
      kapetan: m.kapetan ? `Kapten ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Meeskonna parim: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Valmista meeskond järgmiseks vooruks ette →',
      pivo: 'P.S. SLFF on tasuta ja töötab õlle peal. Kui see voor tegi su esmaspäeva paremaks, osta meile üks ja saad koha õlleseinal:',
      odjava: 'Ma ei soovi enam kirju',
    },
    pl: {
      naslov: `SLFF ${ozn}: ${m.krog}. kolejka, ${tock(m.tocke)}, ${m.mesto}. miejsce${premikZnak}`,
      glavno: `Twoja drużyna ${ekipa} zdobyła w ${m.krog}. kolejce <strong>${tock(m.tocke)}</strong> (liga: ${OZN}).`,
      liga: m.povprecje != null && m.najvec != null
        ? `Średnia ligi: ${st(m.povprecje)}, najwięcej: ${st(m.najvec)}.` : '',
      top: 'Najwięcej punktów w całej lidze w tej kolejce.',
      mesto: `W rankingu jesteś na <strong>${m.mesto}. miejscu</strong> spośród ${m.ekip} drużyn` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (wcześniej ${m.mesto_prej}. miejsce).`),
      kapetan: m.kapetan ? `Kapitan ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Najlepszy w drużynie: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Przygotuj drużynę na następną kolejkę →',
      pivo: 'P.S. SLFF jest darmowy i działa na piwie. Jeśli ta kolejka umiliła ci poniedziałek, postaw nam jedno i zdobądź miejsce na ścianie piw:',
      odjava: 'Nie chcę więcej e-maili',
    },
    es: {
      naslov: `SLFF ${ozn}: jornada ${m.krog}, ${tock(m.tocke)}, ${m.mesto}.º puesto${premikZnak}`,
      glavno: `Tu equipo ${ekipa} ha sumado <strong>${tock(m.tocke)}</strong> en la jornada ${m.krog} (liga: ${OZN}).`,
      liga: m.povprecje != null && m.najvec != null
        ? `Media de la liga: ${st(m.povprecje)}, máximo: ${st(m.najvec)}.` : '',
      top: 'La mejor puntuación de toda la liga en esta jornada.',
      mesto: `En la clasificación eres <strong>${m.mesto}.º</strong> de ${m.ekip} equipos` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (antes, ${m.mesto_prej}.º).`),
      kapetan: m.kapetan ? `Capitán ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `El mejor del equipo: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Prepara el equipo para la próxima jornada →',
      pivo: 'P. D. SLFF es gratis y funciona a base de cañas. Si esta jornada te ha alegrado el lunes, invítanos a una y consigue un sitio en el muro de cañas:',
      odjava: 'No quiero más correos',
    },
    lv: {
      naslov: `SLFF ${ozn}: ${m.krog}. kārta, ${tock(m.tocke)}, ${m.mesto}. vieta${premikZnak}`,
      glavno: `Tava komanda ${ekipa} ${m.krog}. kārtā savāca <strong>${tock(m.tocke)}</strong> (līga: ${OZN}).`,
      liga: m.povprecje != null && m.najvec != null
        ? `Līgas vidējais: ${st(m.povprecje)}, labākais: ${st(m.najvec)}.` : '',
      top: 'Visvairāk punktu visā līgā šajā kārtā.',
      mesto: `Kopvērtējumā tu esi <strong>${m.mesto}. vietā</strong> no ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (iepriekš ${m.mesto_prej}. vietā).`),
      kapetan: m.kapetan ? `Kapteinis ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Labākais komandā: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Sagatavot komandu nākamajai kārtai →',
      pivo: 'P.S. SLFF ir bez maksas un darbojas uz alus. Ja šī kārta tev padarīja pirmdienu labāku, uzsauc mums vienu un iegūsti vietu uz alus sienas:',
      odjava: 'Vairs nevēlos saņemt e-pastus',
    },
    mk: {
      naslov: `SLFF ${ozn}: ${m.krog}. коло, ${tock(m.tocke)}, ${m.mesto}. место${premikZnak}`,
      glavno: `Твојот тим ${ekipa} во ${m.krog}. коло освои <strong>${tock(m.tocke)}</strong> (лига: ${OZN}).`,
      liga: m.povprecje != null && m.najvec != null
        ? `Просек на лигата: ${st(m.povprecje)}, најмногу: ${st(m.najvec)}.` : '',
      top: 'Најмногу поени во целата лига во ова коло.',
      mesto: `На табелата си <strong>${m.mesto}.</strong> од ${m.ekip}` +
        (m.mesto_prej == null || premik === 0 ? '.' : ` (претходно ${m.mesto_prej}.).`),
      kapetan: m.kapetan ? `Капитен ${esc(m.kapetan)}: ${tock(m.kapetan_tocke ?? 0)}.` : '',
      najboljsi: najboljsiNiKapetan ? `Најдобар во тимот: ${esc(m.najboljsi!)} (${tock(m.najboljsi_tocke ?? 0)}).` : '',
      gumb: 'Подготви го тимот за следното коло →',
      pivo: 'П.С. SLFF е бесплатен и работи на пиво. Ако ова коло ти го разубави понеделникот, почести нè со едно и добиј место на ѕидот на пива:',
      odjava: 'Не сакам повеќе да добивам пораки',
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
      pivo: 'P.S. SLFF je brezplačen in teče na pivu. Če ti je ta krog polepšal ponedeljek, nas počasti z enim, pa dobiš mesto na pivskem zidu:',
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
      </p>
      ${dobrKrog ? vrstica(`${B.pivo} <a href="${SITE}/pivo?src=mail-krog" style="color:#64748b;">slff.eu/pivo</a>`, 'font-size: 13px; color: #64748b; margin: 16px 0 0;') : ''}`,
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
 * `'en'` rabi le vmesnik (angleški obiskovalec) — pošta je vedno sl/sk/hr/cs/hu/de/sr/ro/et/pl/es/lv/mk.
 */
export function prevediRazlog(razlog: string | null | undefined, j: Jezik | 'en'): string {
  if (j === 'sl') return razlog ?? 'Kader ni veljaven.'
  if (j === 'en') return razlogVAngliscini(razlog)
  if (j === 'hr') return razlogVHrvascini(razlog)
  if (j === 'cs') return razlogVCestini(razlog)
  if (j === 'hu') return razlogVMadzarscini(razlog)
  if (j === 'de') return razlogVNemscini(razlog)
  if (j === 'sr') return razlogVSrbscini(razlog)
  if (j === 'ro') return razlogVRomunscini(razlog)
  if (j === 'et') return razlogVEstonscini(razlog)
  if (j === 'lv') return razlogVLatviescini(razlog)
  if (j === 'mk') return razlogVMakedonscini(razlog)
  if (j === 'pl') return razlogVPoljscini(razlog)
  if (j === 'es') return razlogVSpanscini(razlog)
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

/** Isti razlogi v češčini (za češki mail in vmesnik). Množina kot slovaška. */
function razlogVCestini(razlog: string | null | undefined): string {
  if (!razlog) return 'Soupiska není platná.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "Na soupisce je 1 hráč / jsou 3 hráči / je 14 hráčů".
  const hracu = (n: number) => skMn(n, `je ${n} hráč`, `jsou ${n} hráči`, `je ${n} hráčů`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tým je prázdný, na soupisce není žádný hráč.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Na soupisce ${hracu(Number(m[1]))} místo ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Na soupisce jsou hráči, kteří už nejsou aktivní: ${m[1]}. Jejich klub v této sezóně nehraje nebo hráč odešel.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} máš ${m[2]} hráčů, povoleno je nejvýš ${m[3]}. ` +
      'Může se to stát i bez tvé změny: když hráč během sezóny přestoupí do klubu, ze kterého už nějaké hráče máš.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/))) {
    const n = Number(m[1])
    return n === 1 ? 'U 1 hráče není známá pozice.' : `U ${n} hráčů není známá pozice.`
  }
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Soupiska musí mít 2 brankáře, 5 obránců, 5 záložníků a 3 útočníky; má ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `V základní sestavě ${hracu(Number(m[1]))} místo ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tým nemá právě jednoho kapitána.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tým nemá právě jednoho zástupce kapitána.'
  return 'Tým nesplňuje pravidla. Podrobnosti najdeš v sekci Můj tým.'
}

/**
 * Isti razlogi v madžarščini (za madžarski mail). Samostalnik za številom je
 * v ednini ("3 játékos"), zato množine ni; ime kluba stoji v oklepaju, da mu
 * ni treba dodajati pripon.
 */
function razlogVMadzarscini(razlog: string | null | undefined): string {
  if (!razlog) return 'A keret nem érvényes.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'A csapat üres, nincs benne egyetlen játékos sem.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `A keretben ${m[1]} játékos van ${m[2]} helyett.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `A keretedben olyan játékosok vannak, akik már nem aktívak: ${m[1]}. A klubjuk idén nem játszik, vagy a játékos távozott.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `${m[2]} játékosod van ugyanabból a klubból (${m[1]}), de legfeljebb ${m[3]} megengedett. ` +
      'Ez a te módosításod nélkül is előfordulhat: ha egy játékos a szezon közben olyan klubba igazol, ahonnan már vannak játékosaid.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${m[1]} játékos posztja ismeretlen.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `A keretben 2 kapusnak, 5 védőnek, 5 középpályásnak és 3 támadónak kell lennie; jelenleg: ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `A kezdőcsapatban ${m[1]} játékos van ${m[2]} helyett.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'A csapatban nincs pontosan egy csapatkapitány.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'A csapatban nincs pontosan egy alkapitány.'
  return 'A csapat nem felel meg a szabályoknak. A részleteket a Csapatom oldalon találod.'
}

/** Isti razlogi v nemščini (za avstrijski mail in vmesnik). */
function razlogVNemscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Der Kader ist nicht gültig.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'Das Team ist leer, es gibt keinen Kader.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Im Kader sind ${m[1]} Spieler statt ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `In deinem Kader sind Spieler, die nicht mehr aktiv sind: ${m[1]}. Ihr Klub spielt heuer nicht oder der Spieler ist weg.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Du hast ${m[2]} Spieler aus demselben Klub (${m[1]}), erlaubt sind ${m[3]}. ` +
      'Das kann auch ohne dein Zutun passieren: wenn ein Spieler während der Saison zu einem Klub wechselt, aus dem du schon Spieler hast.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return m[1] === '1' ? 'Bei 1 Spieler ist die Position unbekannt.' : `Bei ${m[1]} Spielern ist die Position unbekannt.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Der Kader muss 2 Tormänner, 5 Verteidiger, 5 Mittelfeldspieler und 3 Stürmer haben; er hat ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `In der Startelf sind ${m[1]} Spieler statt ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Das Team hat nicht genau einen Kapitän.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Das Team hat nicht genau einen Vizekapitän.'
  return 'Das Team hält sich nicht an die Regeln. Details findest du unter Mein Team.'
}

/** Isti razlogi v srbščini (ekavica, latinica). Množina kot hrvaška. */
function razlogVSrbscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastav nije ispravan.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "U sastavu je 1 igrač / su 3 igrača / je 14 igrača".
  const igraca = (n: number) => hrMn(n, `je ${n} igrač`, `su ${n} igrača`, `je ${n} igrača`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tim je prazan, u sastavu nema nijednog igrača.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `U sastavu ${igraca(Number(m[1]))} umesto ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `U sastavu su igrači koji više nisu aktivni: ${m[1]}. Njihov klub ove sezone ne igra ili je igrač otišao.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Iz kluba ${m[1]} imaš ${m[2]} igrača, a dozvoljeno je najviše ${m[3]}. ` +
      'To može da se desi i bez tvoje promene: ako igrač tokom sezone pređe u klub iz kojeg već imaš igrače.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Za ${m[1]} igrača nije poznata pozicija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastav mora da ima 2 golmana, 5 odbrambenih, 5 veznih i 3 napadača; ima ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `U prvoj postavi ${igraca(Number(m[1]))} umesto ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tim nema tačno jednog kapitena.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tim nema tačno jednog zamenika kapitena.'
  return 'Tim ne ispunjava pravila. Pogledaj detalje u odeljku Moj tim.'
}

/**
 * Romunska množina (`Intl.PluralRules('ro')`): 1 / 0, 2–19 in x01–x19 /
 * ostalo, ki dobi "de" ("20 de puncte").
 */
const roMn = (n: number, one: string, few: string, other: string) => {
  if (n === 1) return one
  const s = Math.abs(n) % 100
  return n === 0 || (s >= 1 && s <= 19) ? few : other
}

/** Isti razlogi v romunščini (za romunski mail in vmesnik). */
function razlogVRomunscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Lotul nu este valid.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jucatori = (n: number) => `${n} ${roMn(n, 'jucător', 'jucători', 'de jucători')}`
  // "În lot este 1 jucător / sunt 3 jucători / sunt 20 de jucători".
  const sunt = (n: number) => `${n === 1 ? 'este' : 'sunt'} ${jucatori(n)}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Echipa e goală, nu are niciun jucător în lot.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `În lot ${sunt(Number(m[1]))} în loc de ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `În lot sunt jucători care nu mai sunt activi: ${m[1]}. Clubul lor nu joacă în acest sezon sau jucătorul a plecat.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `De la clubul ${m[1]} ai ${jucatori(Number(m[2]))}, sunt permiși cel mult ${m[3]}. ` +
      'Se poate întâmpla și fără vreo schimbare de-a ta: dacă un jucător se transferă în timpul sezonului la un club de la care ai deja jucători.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Poziția nu este cunoscută pentru ${jucatori(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Lotul trebuie să aibă 2 portari, 5 fundași, 5 mijlocași și 3 atacanți; are ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `În formația de start ${sunt(Number(m[1]))} în loc de ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Echipa nu are exact un căpitan.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Echipa nu are exact un vicecăpitan.'
  return 'Echipa nu respectă regulile. Vezi detaliile în secțiunea Echipa mea.'
}

/** Isti razlogi v estonščini (za estonski mail in vmesnik). Za številom je samostalnik v delilniku ednine. */
function razlogVEstonscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Koosseis ei vasta reeglitele.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const mangijat = (n: number) => `${n} ${n === 1 ? 'mängija' : 'mängijat'}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Meeskond on tühi, koosseisus pole ühtegi mängijat.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Koosseisus on ${mangijat(Number(m[1]))} ${m[2]} asemel.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Koosseisus on mängijaid, kes pole enam aktiivsed: ${m[1]}. Nende klubi ei mängi sel hooajal või mängija on lahkunud.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Klubist ${m[1]} on sul ${mangijat(Number(m[2]))}, lubatud on kõige rohkem ${m[3]}. ` +
      'See võib juhtuda ka ilma sinu muudatuseta: kui mängija läheb hooaja jooksul üle klubisse, kust sul juba on mängijaid.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Positsioon pole teada: ${mangijat(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Koosseisus peab olema 2 väravavahti, 5 kaitsjat, 5 poolkaitsjat ja 3 ründajat; praegu on ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Algkoosseisus on ${mangijat(Number(m[1]))} ${m[2]} asemel.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Meeskonnal pole täpselt ühte kaptenit.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Meeskonnal pole täpselt ühte asekaptenit.'
  return 'Meeskond ei vasta reeglitele. Vaata üksikasju jaotises Minu meeskond.'
}

/** Polska množina: one (1), few (2-4, 22-24 …), many (0, 5-21 …), other (necela števila, "2,5 punktu"). */
const plMn = (n: number, one: string, few: string, many: string, other: string) => {
  if (!Number.isInteger(n)) return other
  if (n === 1) return one
  const e = n % 10
  const d = n % 100
  return e >= 2 && e <= 4 && (d < 12 || d > 14) ? few : many
}

/** Isti razlogi v poljščini (za poljski mail in vmesnik). Glagol se ujema s številom ("są 3 zawodnicy", "jest 5 zawodników"). */
function razlogVPoljscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Kadra nie spełnia zasad.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jest = (n: number) => `${plMn(n, 'jest', 'są', 'jest', 'jest')} ${n} ${plMn(n, 'zawodnik', 'zawodnicy', 'zawodników', 'zawodnika')}`
  const zawodnika = (n: number) => `${n} ${plMn(n, 'zawodnika', 'zawodników', 'zawodników', 'zawodnika')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Drużyna jest pusta, w kadrze nie ma żadnego zawodnika.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `W kadrze ${jest(Number(m[1]))} zamiast ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `W kadrze są zawodnicy, którzy nie są już aktywni: ${m[1]}. Ich klub nie gra w tym sezonie albo zawodnik odszedł.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} masz ${zawodnika(Number(m[2]))}, dozwolonych jest najwyżej ${m[3]}. ` +
      'Może się to zdarzyć także bez twojej zmiany: gdy zawodnik w trakcie sezonu przejdzie do klubu, z którego masz już zawodników.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Pozycja nie jest znana u ${zawodnika(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Kadra musi mieć 2 bramkarzy, 5 obrońców, 5 pomocników i 3 napastników; teraz ma ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `W wyjściowym składzie ${jest(Number(m[1]))} zamiast ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Drużyna nie ma dokładnie jednego kapitana.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Drużyna nie ma dokładnie jednego wicekapitana.'
  return 'Drużyna nie spełnia zasad. Szczegóły znajdziesz w sekcji Moja drużyna.'
}

/** Isti razlogi v španščini (za španski mail in vmesnik). Samostalnik se ujema s številom ("1 jugador", "3 jugadores"). */
function razlogVSpanscini(razlog: string | null | undefined): string {
  if (!razlog) return 'La plantilla no cumple las reglas.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jugadores = (n: number) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'El equipo está vacío: no hay ningún jugador en la plantilla.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `En la plantilla hay ${jugadores(Number(m[1]))} en lugar de ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `En la plantilla hay jugadores que ya no están activos: ${m[1]}. Su club no juega esta temporada o el jugador se ha ido.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Del club ${m[1]} tienes ${jugadores(Number(m[2]))} y se permiten como mucho ${m[3]}. ` +
      'Puede pasar también sin que cambies nada: si un jugador se va durante la temporada a un club del que ya tienes jugadores.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `No se conoce la posición de ${jugadores(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `La plantilla debe tener 2 porteros, 5 defensas, 5 centrocampistas y 3 delanteros; ahora tiene ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `En el once inicial hay ${jugadores(Number(m[1]))} en lugar de ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'El equipo no tiene exactamente un capitán.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'El equipo no tiene exactamente un vicecapitán.'
  return 'El equipo no cumple las reglas. Tienes los detalles en la sección Mi equipo.'
}

/**
 * Latvijska množina po `Intl.PluralRules('lv')`: zero (0, 10–20, 30 …, rodilnik
 * množine "10 punktu"), one (1, 21, 31 … razen 11, "21 punkts"), other ("2 punkti").
 */
const lvPravila = new Intl.PluralRules('lv-LV')
const lvMn = (n: number, zero: string, one: string, other: string) => {
  const k = lvPravila.select(n)
  return k === 'zero' ? zero : k === 'one' ? one : other
}

// Makedonščina: one (1, 21, 31 …, ne 11) in other; decimalke so other ("1,5 поени").
const mkMn = (n: number, one: string, other: string) =>
  Number.isInteger(n) && n % 10 === 1 && n % 100 !== 11 ? one : other

/** Isti razlogi v latvijščini (za latvijski mail in vmesnik). */
function razlogVLatviescini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastāvs neatbilst noteikumiem.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const speletaji = (n: number) => `${n} ${lvMn(n, 'spēlētāju', 'spēlētājs', 'spēlētāji')}`
  // Dajalnik: "1 spēlētājam", "2 spēlētājiem".
  const speletajiem = (n: number) => `${n} ${lvMn(n, 'spēlētājiem', 'spēlētājam', 'spēlētājiem')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Komanda ir tukša, sastāvā nav neviena spēlētāja.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Sastāvā ir ${speletaji(Number(m[1]))} ${m[2]} vietā.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Sastāvā ir spēlētāji, kuri vairs nav aktīvi: ${m[1]}. Viņu klubs šajā sezonā nespēlē vai spēlētājs ir aizgājis.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `No kluba ${m[1]} tev ir ${speletaji(Number(m[2]))}, atļauts ir ne vairāk kā ${m[3]}. ` +
      'Tas var notikt arī bez tavām izmaiņām: ja spēlētājs sezonas laikā pāriet uz klubu, no kura tev jau ir spēlētāji.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${speletajiem(Number(m[1]))} nav zināma pozīcija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastāvā jābūt 2 vārtsargiem, 5 aizsargiem, 5 pussargiem un 3 uzbrucējiem; pašlaik ir ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Pamatsastāvā ir ${speletaji(Number(m[1]))} ${m[2]} vietā.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Komandai nav tieši viena kapteiņa.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Komandai nav tieši viena vicekapteiņa.'
  return 'Komanda neatbilst noteikumiem. Sīkāka informācija sadaļā Mana komanda.'
}

/** Isti razlogi v makedonščini (za makedonski mail in vmesnik). */
function razlogVMakedonscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Составот не е исправен.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const igraci = (n: number) => `${n} ${mkMn(n, 'играч', 'играчи')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Тимот е празен, во составот нема ниту еден играч.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Во составот има ${igraci(Number(m[1]))} наместо ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Во составот има играчи што повеќе не се активни: ${m[1]}. Нивниот клуб оваа сезона не игра или играчот заминал.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Од клубот ${m[1]} имаш ${igraci(Number(m[2]))}, дозволени се ${m[3]}. ` +
      'Тоа може да се случи и без твоја промена: ако играч во текот на сезоната премине во клуб од кој веќе имаш играчи.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `За ${igraci(Number(m[1]))} позицијата не е позната.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Составот мора да има 2 голмани, 5 одбранбени, 5 од средниот ред и 3 напаѓачи; има ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Во првиот состав има ${igraci(Number(m[1]))} наместо ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Тимот нема точно еден капитен.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Тимот нема точно еден вице-капитен.'
  return 'Тимот не ги исполнува правилата. Детали има во делот Мој тим.'
}
