// Branje vseh vrstic, ko jih je več kot tisoč.
//
// PostgREST vrne največ **1000 vrstic** in tega ne pove: odgovor je videti
// popolnoma običajen, le krajši. `.limit(5000)` in `.range(0, 9999)` meje ne
// premakneta — strežnik ju poreže.
//
// Dokler je bila liga ena, so vse poizvedbe v skriptah ostajale pod mejo. Z
// vsako novo ligo se meja tiho prekorači: `ovrednoti-igralce` je za drugo
// ljubljansko ligo dobil 0 vrstic statistike (prvih tisoč jih je porabila
// gorenjska) in bi vsem igralcem postavil privzeto ceno 4.5 — brez opozorila.
//
// Zato: kjer število vrstic ni omejeno z majhnim filtrom, beri prek te
// funkcije.

const STRAN = 1000

/**
 * Prebere vse vrstice po straneh.
 *
 * @param {(od: number, do_: number) => PromiseLike<{data: any[]|null, error: any}>} poizvedba
 *   zgradi poizvedbo za dani razpon; **mora imeti določen vrstni red**, sicer
 *   Postgres vrne vrstice v poljubnem zaporedju in strani se prekrivajo.
 */
export async function vseVrstice(poizvedba) {
  const vse = []
  for (let od = 0; ; od += STRAN) {
    const { data, error } = await poizvedba(od, od + STRAN - 1)
    if (error) throw new Error(error.message ?? String(error))
    const kos = data ?? []
    vse.push(...kos)
    if (kos.length < STRAN) return vse
  }
}

/**
 * Vse vrstice tabele za igralce ene lige (nastopi, priori, zgodovina cen).
 *
 * Prej je poizvedba stikala `players!inner(competition_id)` in urejala po
 * id-ju tabele: Postgres je za vsako stran prehodil tabelo po vrsti id-jev in
 * sproti zavračal vrstice drugih lig. Pri 226.000 nastopih je bila ena stran
 * 880 ms; v soboto zvečer, ko je baza obremenjena, je poizvedba mb-u19 padla
 * na časovni omejitvi in nočni uvoz se je končal z napako. Po id-jih igralcev
 * gre ista poizvedba prek indeksa na `player_id` — 16 ms za celo ligo.
 *
 * @param db       odjemalec Supabase
 * @param tabela   npr. 'appearances'
 * @param stolpci  izbor stolpcev
 * @param ligaId   competitions.id
 * @param red      stolpci za vrstni red (enolični skupaj s player_id), npr. ['id']
 */
export async function vrsticeIgralcevLige(db, tabela, stolpci, ligaId, red = ['id']) {
  const igralci = await vseVrstice((od, do_) =>
    db.from('players').select('id').eq('competition_id', ligaId).order('id').range(od, do_),
  )
  const idji = igralci.map((p) => p.id)
  const vse = []
  // 300 id-jev na zahtevo: naslov poizvedbe s filtrom `in` ostane pod mejo.
  for (let i = 0; i < idji.length; i += 300) {
    const kos = idji.slice(i, i + 300)
    vse.push(
      ...(await vseVrstice((od, do_) => {
        let q = db.from(tabela).select(stolpci).in('player_id', kos)
        for (const s of red) q = q.order(s)
        return q.range(od, do_)
      })),
    )
  }
  return vse
}
