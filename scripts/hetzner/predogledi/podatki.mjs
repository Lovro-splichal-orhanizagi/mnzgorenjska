// Podatki za slike predogleda — samo javni, prek PostgREST z anon ključem
// (kot scripts/hetzner/html/streznik.mjs). Vsaka funkcija vrne
// { jezik, podatki, slike } ali null (ni entitete ali je ne smemo pokazati:
// tedaj gre ven privzeta slika SLFF).
//
// Kaj se ne pokaže (ista pravila kot vmesnik in objave):
//   • anonimiziran igralec (ime se začne z "#") — ne kartice ne imena v seznamih;
//   • igralci mladinskih lig — kartice ni (Igralec.tsx `smeKartico`), klub in
//     tekma mladinske lige sta brez imen igralcev;
//   • fotografij igralcev ni nikjer (potrjeni profili imajo svoja pravila,
//     kartica jo pokaže le, kadar jo človek deli sam);
//   • zasebna mini liga le prek povabila (kode) in le ime ter število ekip.
import { JEZIK, jeMladinska, prikazniIme } from '../html/streznik.mjs'
const anonimiziran = (ime) => String(ime ?? '').startsWith('#')
const jezikLige = (liga) => JEZIK[liga?.country_code] ?? 'sl'
/** "Priimek Ime" -> ime in priimek za kartico (prva beseda je priimek). */
function deliImena(p) {
  if (p.first_name || p.last_name) return { ime: p.first_name ?? '', priimek: p.last_name ?? '' }
  const d = String(p.full_name ?? '').trim().split(/\s+/)
  return d.length < 2 ? { ime: '', priimek: d[0] ?? '' } : { ime: d.slice(1).join(' '), priimek: d[0] }
}

async function tekocaSezona(rest, ligaId) {
  const [s] = await rest(`sezone?competition_id=eq.${ligaId}&tekoca=eq.true&select=season`)
  return s?.season ?? null
}

export async function igralec(id, { rest, lige }) {
  const [p] = await rest(`player_overview?id=eq.${id}&select=id,full_name,first_name,last_name,position,shirt_number,value,team_id,team_name,team_short,team_logo,competition_id`)
  const liga = p && lige.find((l) => l.id === p.competition_id)
  if (!liga || anonimiziran(p.full_name) || jeMladinska(liga.slug)) return null
  const sezona = await tekocaSezona(rest, liga.id)
  const [s] = sezona
    ? await rest(`player_season_standings?id=eq.${id}&competition_id=eq.${liga.id}&season=eq.${encodeURIComponent(sezona)}&select=points,matches,goals,assists,minutes,value`)
    : []
  return {
    jezik: jezikLige(liga),
    podatki: {
      ...deliImena(p),
      stevilka: p.shirt_number ?? null,
      pozicija: p.position ?? null,
      klub: p.team_name ?? '',
      klubKratko: p.team_short ?? null,
      liga: liga.name,
      tocke: Number(s?.points ?? 0),
      tekme: Number(s?.matches ?? 0),
      goli: Number(s?.goals ?? 0),
      asistence: Number(s?.assists ?? 0),
      minute: Number(s?.minutes ?? 0),
      cena: s?.value ?? p.value ?? null,
    },
    slike: { grb: p.team_logo ?? null },
  }
}

export async function klub(id, { rest, lige }) {
  const [[k], ct] = await Promise.all([
    rest(`teams?id=eq.${id}&select=id,name,short_name,logo_url`),
    rest(`competition_teams?team_id=eq.${id}&select=competition_id`),
  ])
  if (!k) return null
  // Kot streznik.mjs (klub): aktivne lige, med njimi tista z največ igralci v tekoči sezoni.
  const vse = ct.map((c) => lige.find((l) => l.id === c.competition_id)).filter(Boolean)
  const aktivne = vse.filter((l) => l.active)
  const kandidati = aktivne.length ? aktivne : vse
  if (!kandidati.length) return null
  let najboljsi = null
  for (const liga of kandidati.slice(0, 4)) {
    const sezona = await tekocaSezona(rest, liga.id)
    const igralci = sezona
      ? await rest(`player_season_standings?team_id=eq.${id}&competition_id=eq.${liga.id}&season=eq.${encodeURIComponent(sezona)}&select=id,full_name,points&order=points.desc,id`)
      : []
    if (!najboljsi || igralci.length > najboljsi.igralci.length) najboljsi = { liga, igralci }
  }
  const { liga, igralci } = najboljsi
  const vrstice = await rest('rpc/lestvica_lige', { p_competition_id: liga.id }).catch(() => [])
  const mesto = vrstice.find((v) => v.team_id === k.id)?.mesto ?? null
  return {
    jezik: jezikLige(liga),
    podatki: {
      klub: k.name,
      klubKratko: k.short_name ?? null,
      liga: liga.name,
      mesto: vrstice.length > 1 ? mesto : null,
      // Plakat ne hvali ničel; mladinska liga brez imen.
      igralci: jeMladinska(liga.slug)
        ? []
        : igralci
            .filter((p) => !anonimiziran(p.full_name) && Number(p.points) > 0)
            .slice(0, 3)
            .map((p) => ({ ime: prikazniIme(p.full_name), tocke: Number(p.points) })),
    },
    slike: { grb: k.logo_url ?? null },
  }
}

export async function tekma(id, { rest, lige }) {
  const [m] = await rest(`match_assist_status?match_id=eq.${id}&select=match_id,played_on,round_number,home_name,home_short,home_logo,away_name,away_short,away_logo,home_goals,away_goals,home_team_id,away_team_id,competition_id`)
  const liga = m && lige.find((l) => l.id === m.competition_id)
  if (!liga) return null
  const goli = jeMladinska(liga.slug) ? [] : await rest(`goals?match_id=eq.${id}&select=minute,team_id,scorer:scorer_id(full_name)&order=minute`)
  // "Janez Novak 12', 45'": strelec enkrat, minute po vrsti, kot streznik.mjs.
  const strelci = (ekipa) => {
    const po = new Map()
    for (const g of goli.filter((g) => g.team_id === ekipa && g.scorer && !anonimiziran(g.scorer.full_name))) {
      const ime = prikazniIme(g.scorer.full_name)
      po.set(ime, [...(po.get(ime) ?? []), ...(g.minute ? [`${g.minute}'`] : [])])
    }
    return [...po].map(([ime, minute]) => [ime, minute.join(', ')].filter(Boolean).join(' '))
  }
  return {
    jezik: jezikLige(liga),
    podatki: {
      liga: liga.name,
      krog: m.round_number ?? null,
      datum: m.played_on ?? null,
      domaci: m.home_name,
      domaciKratko: m.home_short ?? null,
      gostje: m.away_name,
      gostjeKratko: m.away_short ?? null,
      goliDomaci: m.home_goals,
      goliGostje: m.away_goals,
      strelciDomaci: strelci(m.home_team_id),
      strelciGostje: strelci(m.away_team_id),
    },
    slike: { grbDomaci: m.home_logo ?? null, grbGostje: m.away_logo ?? null },
  }
}

export async function liga(id, { rest, lige }) {
  const l = lige.find((x) => x.id === id && x.active)
  if (!l) return null
  const vrstice = await rest('rpc/lestvica_lige', { p_competition_id: l.id })
  const pet = vrstice.slice(0, 5)
  return {
    jezik: jezikLige(l),
    podatki: {
      liga: l.name,
      drzava: l.country_name ?? null,
      zveza: l.federation_short ?? l.federation_name ?? null,
      sezona: vrstice[0]?.sezona ?? null,
      vrstice: pet.map((v) => ({ mesto: v.mesto, ime: v.ime, kratko: v.kratko ?? null, tocke: v.tocke })),
    },
    slike: Object.fromEntries(pet.map((v, i) => [`vrstica${i}`, v.grb ?? null])),
  }
}

/** Javna mini liga (/mini-leagues/:id): zasebne anon ne vidi (RPC vrne nič). */
export async function miniLiga(id, { rest, lige }) {
  const [[g], lestvica] = await Promise.all([
    rest('rpc/mini_liga_glava', { p_liga: id }),
    rest('rpc/lestvica_javne_mini_lige', { p_liga: id }),
  ])
  if (!g || !g.javna) return null
  const liga = lige.find((l) => l.id === g.competition_id)
  const urejena = [...lestvica].sort((a, b) => Number(b.total_points) - Number(a.total_points) || a.fantasy_team_id - b.fantasy_team_id)
  // Mesto kot na lestvici: enake točke, enako mesto.
  let mesto = 0
  const vrstice = urejena.slice(0, 5).map((v, i) => {
    if (i === 0 || Number(v.total_points) !== Number(urejena[i - 1].total_points)) mesto = i + 1
    return { mesto, ime: v.team_name, tocke: Number(v.total_points) }
  })
  return {
    jezik: jezikLige(liga),
    podatki: { ime: g.name, liga: liga?.name ?? g.competition_name ?? null, ekip: g.ekip ?? lestvica.length, vrstice },
    slike: {},
  }
}

/**
 * Povabilo (/l/:koda): le ime in število ekip, kot ga pokaže stran povabila.
 * Mini liga gre čez lige in anon ne ve, katere, zato je slika v jeziku
 * predloge strani (index.html, slovenščina).
 */
export async function vabilo(koda, { rest }) {
  const [l] = await rest('rpc/mini_liga_po_kodi', { p_koda: koda })
  if (!l) return null
  return { jezik: 'sl', podatki: { ime: l.name, ekip: l.ekip ?? 0 }, slike: {} }
}

export const NALAGALNIKI = { player: igralec, club: klub, match: tekma, league: liga, mini: miniLiga, invite: vabilo }
