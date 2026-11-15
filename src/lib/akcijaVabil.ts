// Akcija vabil (14.–30. 11. 2026): do kdaj vmesnik vabilo poudarja (pasica,
// okno, meni). Isto okno ima baza v `akcija_vabil_okno()`.
export const AKCIJA_VABIL_DO = Date.parse('2026-12-01T00:00:00+01:00')

export function akcijaVabilTece(zdaj = Date.now()): boolean {
  return zdaj < AKCIJA_VABIL_DO
}
