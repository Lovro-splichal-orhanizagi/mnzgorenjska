// Razčlenitev razporeda: iz zaporedja besedila v kroge in tekme.
//
// Ločeno od uvoza, ker je edini del, ki se med viri obnaša različno, in ker
// ga je tako mogoče preveriti brez omrežja (`npm run smoke`).

/** "29.08.26" in "29.08.2026" → "2026-08-29" */
export function datum(slovenski) {
  const m = slovenski.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (!m) return null
  const [, d, mes, l] = m
  const leto = l.length === 2 ? 2000 + Number(l) : Number(l)
  return `${leto}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Sezona iz datuma prvega kroga: avgust 2026 → "2026/27". Liga s koledarsko
 * sezono (`competitions.sezona_koledarska`, Estonija) ima leto: "2026".
 */
export function sezonaIz(datumIso, koledarska = false) {
  const [leto, mesec] = datumIso.split('-').map(Number)
  if (koledarska) return String(leto)
  const zacetek = mesec >= 7 ? leto : leto - 1
  return `${zacetek}/${String((zacetek + 1) % 100).padStart(2, '0')}`
}

// Ime kluba ima vedno vsaj eno črko. Rezultat ("8 : 1(5 : 0)") je nima — brez
// tega bi vsak že odigran krog dobil še enkrat toliko izmišljenih tekem.
const jeIme = (s) => /[a-zžčšđćA-ZŽČŠĐĆ]/.test(s)

// Konec razporeda. Pod njim stran nadaljuje z odigranimi rezultati — najprej
// te lige, nato DRUGE (pri Kranju so pod mladinci člani, pri Ljubljani pod
// 1. ligo druga). Brez tega konca pristanejo v bazi kot dodatni krogi te lige.
//
// Kranj piše "REZULTATI", Ljubljana "REZULTATI TEKEM"; primerjava z enakostjo
// je zato Ljubljani spustila skozi cel blok druge lige. Naslov je izpisan z
// velikimi črkami — enako ime v meniju ("Rezultati") pustimo pri miru.
const KONEC = /^REZULTATI\b/

/**
 * @param {string[]} vrstice besedilo strani, vrstica za vrstico
 * @returns {{stevilka:number, tekme:{domaci:string,gostje:string,datum:string|null,kontumacija?:boolean,odigrana:boolean}[]}[]}
 */
export function razcleniRazpored(vrstice) {
  const krogi = []
  let tekoci = null
  let zadnjiDatum = null

  for (const v of vrstice) {
    if (KONEC.test(v.trim()) && krogi.length) break

    const mKrog = v.match(/^(\d{1,2})\.\s*krog/i)
    if (mKrog) {
      tekoci = { stevilka: Number(mKrog[1]), tekme: [] }
      krogi.push(tekoci)
      zadnjiDatum = datum(v)
      continue
    }
    if (!tekoci) continue

    const mDatum = v.match(/^(\d{1,2}\.\d{1,2}\.\d{2,4})$/)
    if (mDatum) {
      zadnjiDatum = datum(mDatum[1])
      continue
    }

    // Izid pod tekmo. Odigrana ima polčas ("8 : 1(5 : 0)"), kontumacija ga
    // nima ("3 : 0()") — zapisnika zanjo ne bo in borza nanjo ne sme čakati.
    // Celje namesto praznih oklepajev piše "po uradni dolžnosti":
    // "0 :3(u.d.)" (1801, 1. krog Šmarje pri Jelšah : Žalec) — zapisnik te
    // tekme je prazen, brez sodnika in postav.
    const mIzid = v.trim().match(/^(\d+)\s*:\s*(\d+)\s*\(\s*(?:u\.\s*d\.)?\s*\)$/i)
    if (mIzid && tekoci.tekme.length) {
      tekoci.tekme.at(-1).kontumacija = true
      tekoci.tekme.at(-1).odigrana = true
      continue
    }
    // Izid odigrane tekme ("8 : 1(5 : 0)", tudi brez polčasa). Tekma brez
    // njega pri viru še ni odigrana — zveza jo lahko prestavi, ne da bi ji
    // dala nov datum (Bled Bohinj : Sava Kranj, mladinci 4. 10. 2026), in
    // preverba je ne sme javljati kot zamujen uvoz.
    // Presledek ob dvopičju loči izid od ure ("17:30").
    if (/^\d+(?:\s+:\s*|\s*:\s+)\d+\s*(?:\([^)]*\))?$/.test(v.trim()) && tekoci.tekme.length) {
      tekoci.tekme.at(-1).odigrana = true
      continue
    }

    // "Eltron Preddvor : Tržič 2012" (lahko z datumom na začetku iste vrstice)
    const mTekma = v.match(/^(?:\d{1,2}\.\d{1,2}\.\d{2,4}\s+)?(.+?)\s+:\s+(.+?)$/)
    if (mTekma && jeIme(mTekma[1]) && jeIme(mTekma[2])) {
      tekoci.tekme.push({
        domaci: mTekma[1].trim(),
        gostje: mTekma[2].trim(),
        datum: datum(v) ?? zadnjiDatum,
        odigrana: false,
      })
    }
  }

  return krogi.filter((k) => k.tekme.length)
}

/**
 * Katera minula tekma je pri viru brez izida.
 *
 * Zveza tekmo lahko prestavi, ne da bi ji dala nov datum (Bled Bohinj : Sava
 * Kranj, mladinci 4. 10. 2026; Infostyle Šmartno : Svoboda, lj-mladinci
 * 5. 9.): vrstica ostane pri starem datumu brez zapisnika in preverba bi jo
 * javljala vsak dan do konca sezone. Uvoz razporeda jo zato označi
 * (`matches.vir_brez_izida`), preverba pa javi le tekmo, ki ima pri viru
 * izid, pri nas pa zapisnika ne.
 *
 * Razčlenjevalnik, ki izid pozna, tekmi doda `odigrana`. Vir brez tega
 * podatka (Ptuj, Maribor, NZS …) da `null` — preverba zanj dela kot doslej.
 * Razpored, v katerem ni odigrana NOBENA od vsaj treh minulih tekem, je
 * skoraj gotovo razčlenjevalnik, ki izida ne najde več (zveza je spremenila
 * stran): tudi tedaj `null`, sicer bi preverba utihnila prav ob pokvarjenem
 * uvozu. Nekateri viri izrecno označijo prestavitev, vendar odstranijo datum.
 * Tako vrstico označimo samo ob izrecnem podatku vira, da ne sklepamo iz samega
 * manjkajočega datuma.
 *
 * @param {{tekme:{datum:string|null, odigrana?:boolean, prestavljena?:boolean}[]}[]} krogi
 * @param {string} danes 'YYYY-MM-DD'
 * @returns {{ brezIzida: (t: {datum:string|null, odigrana?:boolean, prestavljena?:boolean}) => boolean|null, pokvarjen: boolean }}
 */
export function oznakaBrezIzida(krogi, danes) {
  const tekme = krogi.flatMap((k) => k.tekme)
  const minule = tekme.filter((t) => t.datum && t.datum < danes)
  const vePove = tekme.some((t) => typeof t.odigrana === 'boolean')
  const pokvarjen = vePove && minule.length >= 3 && !minule.some((t) => t.odigrana)
  const brezIzida = (t) => {
    if (!vePove || pokvarjen || typeof t.odigrana !== 'boolean') return null
    if (!t.odigrana && t.datum === null) return t.prestavljena === true ? true : null
    return !t.odigrana && !!t.datum && t.datum < danes
  }
  return { brezIzida, pokvarjen }
}

/**
 * Vir, pri katerem je krog teden (`vir.krogiPoTednih`, ncefl): prestavljena
 * tekma se pokaže v drugem krogu. Par domači:gostje igra v sezoni enkrat,
 * zato je tekma istega para iz drugega kroga ista tekma.
 *
 * Vrne `{ odigrana }`, če je par v drugem krogu že uvožen (zapisnik ima pravi
 * datum — ne podvajamo), `{ prestavljena }` z vrstico, ki jo je treba
 * premakniti v `krogId`, ali `{}`, če para drugje ni.
 *
 * @param {{ id:number, round_id:number, imported_at?:string|null, zapisnik_id?:string|null }[]} tekmePara
 * @param {number} krogId krog, v katerem je tekma v razporedu zdaj
 */
export function tekmaDrugegaKroga(tekmePara, krogId) {
  const drugje = (tekmePara ?? []).filter((m) => m.round_id !== krogId)
  if (drugje.some((m) => m.imported_at || m.zapisnik_id)) return { odigrana: true }
  return drugje.length ? { prestavljena: drugje[0] } : {}
}

/**
 * Neuvožene vrstice para v drugem krogu, kot ga kaže razpored, kadar je par v
 * svojem krogu že vpisan (uvoz zapisnikov je tekmo, odigrano v drugem tednu,
 * vpisal v krog zapisnika, preden jo je razpored premaknil).
 *
 * @param {Map<string, { id:number, round_id:number, imported_at?:string|null, zapisnik_id?:string|null }[]>} tekmePara 'domaci:gostje' → vrstice
 * @param {Map<string, number>} krogPara 'domaci:gostje' → krog v razporedu
 */
export function odvecneVrsticePara(tekmePara, krogPara) {
  return [...tekmePara.entries()].flatMap(([par, tekme]) =>
    krogPara.has(par) && tekme.some((m) => m.round_id === krogPara.get(par))
      ? tekme.filter((m) => m.round_id !== krogPara.get(par) && !m.imported_at && !m.zapisnik_id)
      : [],
  )
}

/**
 * Ali je datum kroga več kot `zamikDni` pred VEČINO prejšnjih krogov. Večina,
 * ne najkasnejši: v celoti prestavljen krog (17. krog v maj) ne sme narediti
 * sumljivih vseh krogov za njim. Pomladni krog z datumom začetka sezone (fssid,
 * Zona Centar 2026/27: 14. kolo "22.08.2026") je pred vsemi.
 *
 * @param {string|null} datum
 * @param {string[]} prejsnji datumi prejšnjih krogov iste lige in sezone
 */
export function datumPredPrejsnjimi(datum, prejsnji, zamikDni = 14) {
  if (!datum || !prejsnji.length) return false
  const meja = new Date(Date.parse(`${datum}T12:00:00Z`) + zamikDni * 86400000).toISOString().slice(0, 10)
  return prejsnji.filter((d) => d > meja).length * 2 > prejsnji.length
}

/**
 * Krogi v bazi, ki jih razpored nima več in katerih datum je pred večino
 * prejšnjih krogov razporeda (`datumPredPrejsnjimi`). Tak krog brez uvožene
 * tekme bi preverba javljala kot neuvožen, zaklep pa bi vanj zajel postave.
 * Zaklenjen krog ni na seznamu — tega popravi človek.
 *
 * @param {Iterable<[number, { id:number, played_on:string|null, lineups_locked_at?:string|null }]>} obstojeciKrogi številka → krog
 * @param {{ stevilka:number, tekme:{ datum?:string|null }[] }[]} krogi razpored
 * @param {Set<number>} uvozeniKrogi id krogov z uvoženo tekmo
 */
export function krogiZDatumomNazaj(obstojeciKrogi, krogi, uvozeniKrogi) {
  const datumi = krogi
    .map((k) => [k.stevilka, k.tekme.map((t) => t.datum).filter(Boolean).sort()[0]])
    .filter(([, d]) => d)
  const out = []
  for (const [stevilka, r] of obstojeciKrogi) {
    if (!r.played_on || r.lineups_locked_at || uvozeniKrogi.has(r.id)) continue
    if (krogi.some((k) => k.stevilka === stevilka)) continue
    const prej = datumi.filter(([s]) => s < stevilka).map(([, d]) => d)
    if (datumPredPrejsnjimi(r.played_on, prej)) out.push({ stevilka, ...r })
  }
  return out.sort((a, b) => a.stevilka - b.stevilka)
}

/**
 * Krogi z datumom pred večino prejšnjih krogov iste lige in sezone (preverba
 * podatkov). `prejsnji` je najkasnejši datum pred njim, za izpis.
 *
 * @param {{ id:number, competition_id:number, season:string, number:number, played_on:string|null }[]} krogi
 */
export function krogiPredPrejsnjim(krogi) {
  const poLigi = new Map()
  for (const r of krogi) {
    if (!r.played_on) continue
    const k = `${r.competition_id}|${r.season}`
    if (!poLigi.has(k)) poLigi.set(k, [])
    poLigi.get(k).push(r)
  }
  const out = []
  for (const vrsta of poLigi.values()) {
    const prej = []
    for (const r of vrsta.sort((a, b) => a.number - b.number)) {
      // Sumljiv krog ne gre med prejšnje: naslednji napačni bi se primerjali z njim.
      if (datumPredPrejsnjimi(r.played_on, prej)) out.push({ ...r, prejsnji: [...prej].sort().at(-1) })
      else prej.push(r.played_on)
    }
  }
  return out
}

/**
 * Kontumacije vira, ki jih razpored ne pokaže (`vir.kontumacije`). Napaka tu
 * ne ustavi razporeda — brez oznake je stanje enako, kot ko jo vpiše admin —
 * **razen zavrnitve** (401/403/429, izziv): ta gre naprej, da skripta konča z
 * izhodom 4 in nočna zanka vira ne bere naprej. Strani tekem kontumacij ne gredo v
 * predpomnilnik (brez postav), zato se berejo sveže ob vsakem zagonu.
 */
export async function preberiKontumacije(vir, liga, prenesiKrog, krogi, danes, log = console.log) {
  try {
    return await vir.kontumacije(liga, prenesiKrog, krogi, danes)
  } catch (e) {
    if (e?.zavrnitev) throw e
    log(`  kontumacij ni bilo mogoče prebrati (${e?.message}) — nadaljujem brez njih`)
    return []
  }
}
