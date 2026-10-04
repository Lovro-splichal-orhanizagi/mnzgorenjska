// Posodobitev mobilne aplikacije mimo trgovine (OTA). Vsak build zapiše
// `/app/latest.json` in zip strani (vtičnik `otaSvezenj` v vite.config.js);
// aplikacija ob zagonu in vrnitvi v ospredje preveri, ali je na slff.eu
// novejša različica, jo v ozadju prenese in zamenja ob naslednjem zagonu.
//
// Nativni del (vtičniki, dovoljenja, ikona) se z OTA ne spremeni. Zato
// `minBuild`: starejša gradnja iz trgovine nove kode ne dobi. Če nova koda ob
// zagonu ne pokliče notifyAppReady v 10 s, se vtičnik vrne na prejšnjo.
import { App } from '@capacitor/app'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { DOMENA, jeNativno } from './platforma'

interface Najnovejsa {
  version: string
  url: string
  checksum: string
  minBuild: number
}

let tece = false

async function preveri(): Promise<void> {
  if (tece) return
  tece = true
  try {
    const odg = await fetch(`${DOMENA}/app/latest.json`, { cache: 'no-store' })
    if (!odg.ok) return
    const n = (await odg.json()) as Najnovejsa
    const { build } = await App.getInfo()
    if (Number(build) < n.minBuild) return
    const zdaj = document.querySelector<HTMLMetaElement>('meta[name="slff-commit"]')?.content
    if (!n.version || n.version === zdaj) return
    const { bundles } = await CapacitorUpdater.list()
    const ze = bundles.find((b) => b.version === n.version && b.status === 'success')
    const svezenj = ze ?? (await CapacitorUpdater.download({ url: n.url, version: n.version, checksum: n.checksum }))
    // Zamenja se, ko gre aplikacija v ozadje — ne sredi urejanja ekipe.
    await CapacitorUpdater.next({ id: svezenj.id })
  } catch {
    // Brez omrežja ali pokvarjen prenos: ostanemo na sedanji različici.
  } finally {
    tece = false
  }
}

export function pripraviOta(): void {
  if (!jeNativno()) return
  // Ta različica se je zagnala — brez tega bi jo vtičnik čez 10 s zavrnil.
  void CapacitorUpdater.notifyAppReady()
  void preveri()
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void preveri()
  })
}
