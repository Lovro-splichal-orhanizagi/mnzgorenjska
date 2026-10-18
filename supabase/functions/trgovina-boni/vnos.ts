// Vnos trgovina-boni (brez Deno, da ga preveri smoke).

export interface Vnos { za: 'scout' | 'preverjen'; odstotek: number | null; znesek: number | null; uporab: number; do: number }

/** Preveri telo; vrne vnos (do = unix sekunde, konec dneva UTC) ali null. */
export function preberiVnos(v: unknown, zdaj = Date.now()): Vnos | null {
  const o = (v ?? {}) as Record<string, unknown>
  if (o.za !== 'scout' && o.za !== 'preverjen') return null
  const odstotek = o.odstotek == null ? null : o.odstotek
  const znesek = o.znesek == null ? null : o.znesek
  if ((odstotek === null) === (znesek === null)) return null
  if (odstotek !== null && !(Number.isInteger(odstotek) && (odstotek as number) >= 1 && (odstotek as number) <= 100)) return null
  if (znesek !== null && !(Number.isInteger(znesek) && (znesek as number) >= 1 && (znesek as number) <= 100000)) return null
  if (!Number.isInteger(o.uporab) || (o.uporab as number) < 1 || (o.uporab as number) > 1000) return null
  if (typeof o.do !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.do)) return null
  const doS = Math.floor(Date.parse(`${o.do}T23:59:59Z`) / 1000)
  if (!Number.isFinite(doS) || doS * 1000 <= zdaj + 3600_000 || doS * 1000 > zdaj + 2 * 366 * 86400_000) return null
  return { za: o.za, odstotek: odstotek as number | null, znesek: znesek as number | null, uporab: o.uporab as number, do: doS }
}
