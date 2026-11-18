// PostgREST vrne največ 1000 vrstic in tega ne pove: odgovor je videti
// običajen, le krajši. Dokler je bila liga ena, so poizvedbe ostajale pod
// mejo — 119 ekip krat 9 krogov jo prekorači sredi sezone in lestvica bi tiho
// izgubila ekipe. Kjer števila vrstic ne omeji majhen filter, beri po straneh.

const STRAN = 1000

interface Odgovor<T> {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Prebere vse vrstice po straneh. Poizvedba **mora imeti določen vrstni
 * red**, sicer Postgres vrne vrstice v poljubnem zaporedju in strani se
 * prekrivajo.
 *
 * `stran` nad 1000 je za poizvedbe, ki vsakič izračunajo vse vrstice (npr.
 * plpgsql funkcija `admin_uporabniki`): produkcija vrne do 5000, zato pol
 * manj klicev. Ker meja strežnika ni znana (lokalno 1000), krajša prva stran
 * ni dokaz konca: njena dolžina postane nova velikost strani in konec pove
 * šele krajša ali prazna naslednja.
 */
export async function vseVrstice<T>(
  poizvedba: (od: number, do_: number) => PromiseLike<Odgovor<T>>,
  stran: number = STRAN,
): Promise<T[]> {
  const vse: T[] = []
  let velikost = stran
  for (let od = 0; ; ) {
    const { data, error } = await poizvedba(od, od + velikost - 1)
    if (error) throw new Error(error.message)
    const kos = data ?? []
    vse.push(...kos)
    if (kos.length < velikost) {
      if (od > 0 || velikost === STRAN || kos.length === 0) return vse
      velikost = kos.length
    }
    od += kos.length
  }
}
