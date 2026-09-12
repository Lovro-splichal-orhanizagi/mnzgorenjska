// Razčlenjevalnik zapisnikov NZS (www.nzs.si) — 1. SNL, 2. SNL in 3. SNL.
//
// Dolgo sem trdil, da NZS postav po tekmah ne objavlja. Narobe. Stran zanje
// obstaja, le ime ji nisem uganil: pod stranjo tekme stoji še `/zapisnik`,
// na njej pa sta obe postavi. Iskal sem besedo "postave" — te na strani ni.
// Začetna enajsterica nima nobenega naslova, klop pa piše "Rezervni igralci".
// Sklepati iz odsotnosti NAPISA, da ni PODATKA, je bila napaka.
//
// Ta vir je od vseh najbogatejši, ker ima vsak igralec v profilni povezavi
// svojo **stalno šifro** (`…/mostvo/pijus-sirvys-157721`). Identitete igralca
// torej ni treba ugibati iz imena in številke dresa — kar je bil vir
// soimenjaških napak pri medobčinskih ligah.
//
// Oblika strani (vse znotraj `<ul class="match-report">`):
//
//   <li>
//     <div class="widget-rank">2</div>                    številka dresa
//     <span class="widget-player-name"><a href="…-157721">Širvys Pijus</a> (V)
//     <div class="match-report-events">
//       <i class="fa-solid fa-circle yellow"></i><time datetime="62">
//       <i class="fa-light fa-arrows-repeat"></i><time datetime="68">
//
// Blokov je šest: enajsterica, klop in trener za vsako ekipo. Trenerjev blok
// nima profilnih povezav, zato ga ločimo po tem in ne po vrstnem redu.

const DOLZINA_TEKME = 90

/** Dogodek pove ikona, ne besedilo. */
const IKONE = {
  'fa-futbol': 'gol',
  'fa-circle yellow': 'rumeni',
  'fa-circle red': 'rdeci',
  'fa-arrows-repeat': 'menjava',
}

const razpakiraj = (s) =>
  s
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Dogodki enega igralca: [{ vrsta, minuta }]. */
function dogodki(blok) {
  const out = []
  const re =
    /<i class="([^"]+)"[^>]*><\/i>\s*<\/div>\s*<time[^>]*datetime="(\d+)"/g
  for (const m of blok.matchAll(re)) {
    const razred = m[1]
    const kljuc = Object.keys(IKONE).find((k) => razred.includes(k))
    if (kljuc) out.push({ vrsta: IKONE[kljuc], minuta: Number(m[2]) })
  }
  return out
}

/** En `<li>` → igralec ali null (trener nima šifre). */
function igralec(li) {
  const st = li.match(/<div class="widget-rank">(\d+)<\/div>/)
  const ime = li.match(
    /<span class="widget-player-name">\s*(?:<a[^>]*>)?([^<]+)/,
  )
  if (!st || !ime) return null
  const profil = li.match(/\/klubi\/([a-z0-9-]+)\/mostvo\/[a-z0-9-]+-(\d+)"/)
  const oznake = li.match(/<\/a>\s*((?:\((?:V|K)\)\s*)+)/)?.[1] ?? ''
  const dog = dogodki(li.slice(li.indexOf('match-report-events')))
  return {
    st: Number(st[1]),
    ime: razpakiraj(ime[1]),
    // Stalna šifra igralca pri NZS; uvoz jo uporabi kot identiteto.
    nzsId: profil ? Number(profil[2]) : null,
    klubSlug: profil ? profil[1] : null,
    vratar: oznake.includes('(V)'),
    kapetan: oznake.includes('(K)'),
    dogodki: dog,
  }
}

/**
 * Menjave iz dogodkov: ikona je ista pri obeh, zato ju ločimo po tem, ali je
 * igralec začetnik. Isto minuto lahko menjata dva para — za minutažo je
 * vseeno, kdo je s kom, ker vsak igralec nosi svojo minuto.
 */
function menjaveEkipe(postava, rezerve, ekipaIdx) {
  const ven = postava.flatMap((i) =>
    i.dogodki.filter((d) => d.vrsta === 'menjava').map((d) => ({ i, m: d.minuta })),
  )
  const noter = rezerve.flatMap((i) =>
    i.dogodki.filter((d) => d.vrsta === 'menjava').map((d) => ({ i, m: d.minuta })),
  )
  const out = []
  const prosti = [...ven]
  for (const n of noter) {
    const k = prosti.findIndex((v) => v.m === n.m)
    const par = k >= 0 ? prosti.splice(k, 1)[0] : null
    out.push({
      ekipaIdx,
      minuta: n.m,
      noter: { st: n.i.st, ime: n.i.ime },
      ven: par ? { st: par.i.st, ime: par.i.ime } : { st: null, ime: null },
    })
  }

  // Rezervist, ki je dal GOL, je gotovo igral — tudi kadar ikone menjave ni.
  // Pri nekaterih tekmah starejših sezon so dogodki na strani nepopolni:
  // postavi sta celi, menjav pa nobene. Brez tega bi tak igralec ostal brez
  // nastopa, gol pa bi obvisel v zraku — natanko to je ujela invarianta
  // `gol-brez-nastopa` pri treh golih v 2. SNL.
  //
  // Samo gol, ne karton. Prvi poskus je sklepal iz KATEREGA KOLI dogodka in
  // je s klopi na igrišče poslal vratarja Mavriča, ki je v 83. minuti dobil
  // rumeni karton — na klopi. Opomin lahko dobi tudi, kdor ne igra; gol ne.
  //
  // Minute vstopa ne poznamo, zato vzamemo minuto njegovega prvega gola. To
  // je spodnja meja: igral je vsaj od tam do konca. Rajši manj minut kakor
  // izmišljena natančnost ali izgubljen gol.
  for (const r of rezerve) {
    if (out.some((m) => m.noter.st === r.st)) continue
    const prvi = r.dogodki
      .filter((d) => d.vrsta === 'gol')
      .map((d) => d.minuta)
      .sort((a, b) => a - b)[0]
    if (prvi == null) continue
    out.push({
      ekipaIdx,
      minuta: prvi,
      noter: { st: r.st, ime: r.ime },
      ven: { st: null, ime: null },
      sklepano: true,
    })
  }
  return out
}

/**
 * Razčleni stran `/zapisnik` v isto strukturo, kot jo dajo drugi viri, da
 * `nastopi()` ostane skupen.
 */
export function parsirajZapisnik(html, { zapisnikId = null, url = null } = {}) {
  const bloki = [...html.matchAll(/<ul class="match-report">(.*?)<\/ul>/gs)].map(
    (m) => m[1],
  )
  // Dve ekipi sta najmanj, kar zapisnik potrebuje; klop in trener sta lahko
  // tudi prazna. Merilo `< 4` je tu delalo isto škodo kot spodaj.
  if (bloki.length < 2) return null

  const skupine = bloki
    .map((b) =>
      [...b.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => igralec(m[1])).filter(Boolean),
    )
    // Blok trenerja nima profilnih povezav in zato nobenega igralca s šifro.
    .filter((ig) => ig.length && ig.some((i) => i.nzsId != null))
  // Zahtevamo DVE ekipi, ne štiri skupine. Prej je bilo merilo `< 4`, kar je
  // pomenilo "obe postavi in obe klopi" — zapisnik, kjer je ena klop prazna
  // (nihče ni bil na klopi ali jih stran ne našteje), je tako tiho izpadel in
  // tekma je ostala neuvožena, ne da bi kdo zvedel. Klop ni pogoj za tekmo.
  if (skupine.length < 2) return null

  // Ekipo pove klub iz profilne povezave, ne vrstni red blokov.
  const klubi = []
  for (const s of skupine) {
    const k = s.find((i) => i.klubSlug)?.klubSlug
    if (k && !klubi.includes(k)) klubi.push(k)
  }
  if (klubi.length !== 2) return null

  const zaKlub = (k) => skupine.filter((s) => s.some((i) => i.klubSlug === k))
  const imena = [...html.matchAll(
    /<h2 class="section--subtitle">\s*<a href="[^"]*\/klubi\/([a-z0-9-]+)"[^>]*>([^<]+)<\/a>/g,
  )].reduce((m, x) => ({ ...m, [x[1]]: razpakiraj(x[2]) }), {})

  const ekipe = klubi.map((k) => {
    const [prvi, drugi] = zaKlub(k)
    return {
      ime: imena[k] ?? k,
      klubSlug: k,
      postava: prvi ?? [],
      rezerve: drugi ?? [],
    }
  })
  if (ekipe.some((e) => !e.postava.length)) return null

  const izidi = [...html.matchAll(/<span class="score">\s*(\d+)\s*<\/span>/g)].map(
    (m) => Number(m[1]),
  )
  if (izidi.length < 2) return null
  const rezultat = { domaci: izidi[0], gostje: izidi[1] }

  const mKrog = html.match(/<span class="competition-round">(\d+)\.\s*krog/)
  const mDatum = html.match(
    /cover-match-info-date[\s\S]{0,160}?<span>(\d{2})\.(\d{2})\.(\d{4})/,
  )
  // "PRVA LIGA TELEMACH 26/27" -> "2026/27"
  const mSezona = html.match(/class="competition-logo"[\s\S]{0,300}?<span>[^<]*?(\d{2})\/(\d{2})\s*<\/span>/)

  const poVrsti = (vrsta) =>
    ekipe.flatMap((e, idx) =>
      [...e.postava, ...e.rezerve].flatMap((i) =>
        i.dogodki
          .filter((d) => d.vrsta === vrsta)
          .map((d) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, minuta: d.minuta })),
      ),
    )

  const menjave = ekipe.flatMap((e, idx) => menjaveEkipe(e.postava, e.rezerve, idx))
  // Ikona pove le, da je gol padel; avtogola in enajstmetrovke stran ne loči,
  // zato ju ne izmišljamo — oboje ostane navaden gol.
  const goli = poVrsti('gol').map((g) => ({
    ...g,
    avtogol: false,
    enajstmetrovka: false,
  }))

  // Pri starejših sezonah stran ponekod našteje postavi, dogodkov pa ne. Uvoz
  // bi tak zapisnik vpisal kot uspešen: 22 nastopov, nobene menjave in premalo
  // golov — brez ene same napake. Zato neskladje povemo na glas.
  const opozorila = []
  const skupajGolov = rezultat.domaci + rezultat.gostje
  if (goli.length !== skupajGolov)
    opozorila.push(`golov iz ikon je ${goli.length}, izid pa pravi ${skupajGolov}`)
  if (!menjave.length && ekipe.every((e) => e.rezerve.length))
    opozorila.push('nobene menjave, čeprav sta klopi zasedeni')

  return {
    zapisnikId,
    url,
    sezona: mSezona ? `20${mSezona[1]}/${mSezona[2]}` : null,
    krog: mKrog ? Number(mKrog[1]) : null,
    datum: mDatum ? `${mDatum[3]}-${mDatum[2]}-${mDatum[1]}` : null,
    domaci: ekipe[0],
    gostje: ekipe[1],
    rezultat,
    polcas: null,
    goli,
    zgresene: [],
    rumeni: poVrsti('rumeni'),
    rdeci: poVrsti('rdeci'),
    menjave,
    opozorila,
  }
}

export { DOLZINA_TEKME }
