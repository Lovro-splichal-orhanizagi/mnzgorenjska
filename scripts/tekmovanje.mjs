// Katero ligo uvažamo — člane ali mladince.
//
// Vse uvozne skripte sprejmejo `--tekmovanje mladinci`; brez njega delajo s
// člansko ligo, tako kot so od nekdaj. Šifro lige pri viru hrani
// `competitions.source_league_code`, zato je `--liga` potreben le za arhiv
// prejšnjih sezon (npr. `--liga 1503` za mladince 2025/26).
//
// Tekmovanje pove tudi, KDO je vir (`source`) — uvozne skripte naslovov ne
// gradijo več same, ampak jih dobijo od vira v `scripts/viri/`.

export function slugTekmovanja(privzeto = 'clani') {
  const i = process.argv.indexOf('--tekmovanje')
  const v = i > -1 ? process.argv[i + 1] : null
  return v && !v.startsWith('--') ? v : privzeto
}

const STOLPCI = 'id, slug, name, short_name, mnzg_liga, prvi_fantasy_krog, rok_pomak_ur, active, source, source_league_code, country_id, source_policy, date_only_deadline_policy'

/**
 * Vrne vrstico iz `competitions` za dani slug; brez nje se ne da uvažati.
 *
 * Ob napaki branja se uvoz USTAVI. Doslej je padel nazaj na stolpce brez
 * vira (prehod na migracijo 20260905090000, davno končan) — in ker je potem
 * manjkal `source`, je uvoz bral MNZ Gorenjska (liga 1502) v tujo ligo.
 * Tako je 12. 10. kratek izpad povezave z bazo poslal srbsko ligo brati
 * zapisnike Gorenjske; ustavila jih je le enoličnost `zapisnik_id`.
 */
export async function tekmovanje(db, slug = slugTekmovanja()) {
  const { data, error } = await db
    .from('competitions')
    .select(STOLPCI)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(`tekmovanja ni mogoče prebrati: ${error.message}`)

  if (!data) {
    // Nasteti "clani in mladinci" je bilo res, dokler sta bili ligi dve.
    // Seznam zato preberemo, sicer napaka zavaja prav takrat, ko je nova liga
    // vzrok zanjo.
    const { data: vse } = await db
      .from('competitions')
      .select('slug')
      .order('sort_order')
    const nasteti = (vse ?? []).map((t) => `"${t.slug}"`).join(', ')
    throw new Error(
      `tekmovanje "${slug}" ne obstaja${nasteti ? ` — na voljo so ${nasteti}` : ''}`,
    )
  }
  // Koledarska sezona (20261011140100) se bere posebej: če migracija še ni
  // stekla, je liga pač sezonska, vir in šifra pa ostaneta.
  const { data: kol, error: eKol } = await db
    .from('competitions')
    .select('sezona_koledarska')
    .eq('id', data.id)
    .maybeSingle()
  // Capture-bound providers bind their scope to the actual country row. country_id
  // is a numeric foreign key, never an ISO code. Keep other providers' row
  // shape and query contract unchanged.
  let country = {}
  if (process.env.SLFF_BULK_CAPTURE || ['fussball-public', 'dribl-public'].includes(data.source)) {
    if (!Number.isSafeInteger(data.country_id) || data.country_id <= 0)
      throw new Error(`${data.source} country: invalid country_id foreign key`)
    const { data: row, error: countryError } = await db
      .from('countries')
      .select('code')
      .eq('id', data.country_id)
      .maybeSingle()
    if (countryError || typeof row?.code !== 'string' || !row.code)
      throw new Error(`${data.source} country: country lookup failed${countryError ? ': ' + countryError.message : ''}`)
    country = { country_code: row.code }
  }
  return { ...data, ...country, sezona_koledarska: !eKol && Boolean(kol?.sezona_koledarska) }
}

/**
 * Šifra lige pri viru.
 *
 * Med prehodom bere `source_league_code`, če ga ni, pa stari `mnzg_liga` —
 * tako uvoz teče tudi proti bazi, kjer migracija še ni stekla.
 */
export const sifraLige = (tekmovanje, privzeto = null) =>
  tekmovanje?.source_league_code ?? tekmovanje?.mnzg_liga ?? privzeto
