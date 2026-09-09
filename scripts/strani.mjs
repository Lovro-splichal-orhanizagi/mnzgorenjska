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
