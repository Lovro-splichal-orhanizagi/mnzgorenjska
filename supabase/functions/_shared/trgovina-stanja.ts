// Plačana in ne preklicana/vrnjena naročila trgovine. Isti nabor kot SQL
// trgovina.je_placano_aktivno (migracija 20261019140000); smoke ju primerja in
// preveri, da ga nobena funkcija ne piše na roko.
// Objava: scripts/hetzner/objavi-funkcije.sh prenese _shared ob vsaki funkciji.
export const PLACANA_AKTIVNA: readonly string[] = ['placano', 'v_izdelavi', 'poslano', 'dostavljeno']

export const jePlacanoAktivno = (stanje: string | null | undefined): boolean => PLACANA_AKTIVNA.includes(stanje ?? '')
