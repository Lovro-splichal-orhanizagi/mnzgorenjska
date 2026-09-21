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
 */
export async function vseVrstice<T>(
  poizvedba: (od: number, do_: number) => PromiseLike<Odgovor<T>>,
): Promise<T[]> {
  const vse: T[] = []
  for (let od = 0; ; od += STRAN) {
    const { data, error } = await poizvedba(od, od + STRAN - 1)
    if (error) throw new Error(error.message)
    const kos = data ?? []
    vse.push(...kos)
    if (kos.length < STRAN) return vse
  }
}
