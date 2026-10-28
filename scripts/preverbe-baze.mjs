// Preverbe v bazi, po delih.
//
// `preveri_podatke()` kot en sam klic je z rastjo podatkov presegel 30 s, ki jih
// Cloudflare pred api.slff.eu dovoli odgovoru (504), tudi ko baza sama še tece
// (statement_timeout servisne vloge je 60 s). Zato kličemo dele
// (`preveri_podatke_del`, migracija 20261028100000) vsakega posebej: vsak mora
// ostati daleč pod mejo, padec pa imenuje del.
export const DELI_PREVERB = ['postava', 'menjave', 'goli-in-datumi', 'tocke', 'cene']

// Vrne { data, error } kot `db.rpc`. Prva napaka ustavi preverbo: nepopoln
// seznam bi molče prikazal "vse v redu" za dele, ki niso tekli.
export async function preveriPodatkeVBazi(db) {
  const vse = []
  for (const del of DELI_PREVERB) {
    const { data, error } = await db.rpc('preveri_podatke_del', { p_del: del })
    if (error) return { data: null, error: { ...error, message: `del "${del}": ${error.message}` } }
    vse.push(...(data ?? []))
  }
  return { data: vse, error: null }
}
