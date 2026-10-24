// Igralci, ki jih je dodal klubski račun (klub_dodaj_igralca, migracija
// 20261024123700). Uvoz jih posvoji ob prvem nastopu, da ne nastane dvojnik.

/** Isto pravilo kot SQL `ime_za_primerjavo`: brez šumnikov, male črke, besede po abecedi. */
export function normaliziranoIme(ime) {
  return String(ime ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[\s,.]+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

/**
 * Klubski igralec iste lige in kluba, brez šifre in brez nastopa, z enakim
 * imenom po normalizaciji. Vrne ga le, če je natanko eden; pri več zadetkih
 * zapiše opozorilo in vrne null (nov igralec, admin uredi).
 */
export async function najdiKlubskega(db, { competitionId, teamId, polnoIme, polja, opozorila = null }) {
  const { data, error } = await db
    .from('players')
    .select(`${polja}, full_name`)
    .eq('competition_id', competitionId)
    .eq('team_id', teamId)
    .not('dodal_klub_at', 'is', null)
    .is('reg_st', null)
    .order('id')
  if (error) throw new Error(`klubski igralci: ${error.message}`)
  const kljuc = normaliziranoIme(polnoIme)
  const kandidati = (data ?? []).filter((p) => normaliziranoIme(p.full_name) === kljuc)
  if (!kandidati.length) return null

  const { data: nastopi, error: eN } = await db
    .from('appearances')
    .select('player_id')
    .in('player_id', kandidati.map((p) => p.id))
  if (eN) throw new Error(`klubski igralci: ${eN.message}`)
  const zIgro = new Set((nastopi ?? []).map((a) => a.player_id))
  const prosti = kandidati.filter((p) => !zIgro.has(p.id))
  if (prosti.length > 1) opozorila?.push(`več klubskih igralcev z imenom ${polnoIme}: ${prosti.map((p) => p.id).join(', ')}`)
  return prosti.length === 1 ? prosti[0] : null
}
