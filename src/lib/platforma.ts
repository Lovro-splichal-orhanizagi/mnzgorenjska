// Mobilna aplikacija (Capacitor) teče isto kodo kot splet; tu je, kar je drugače.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'

/** Javni naslov spletne strani; vanj vodijo vse povezave, ki gredo ven. */
export const DOMENA = 'https://slff.eu'

/** Ali stran teče v mobilni aplikaciji (iOS, Android), ne v brskalniku. */
export const jeNativno = (): boolean => Capacitor.isNativePlatform()

/** Enkrat ob zagonu: vrstica stanja in Androidov gumb nazaj. */
export function pripraviNativno(): void {
  if (!jeNativno()) return
  // Svetle ikone na temni podlagi strani.
  void StatusBar.setStyle({ style: Style.Dark })
  // Brez tega gumb nazaj na Androidu zapre aplikacijo že na drugi strani.
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })
  namestiDeljenje()
}

/**
 * `navigator.share` prek sistemskega lista aplikacije. Androidov WebView ga
 * nima, iOS ne deli datotek; tako vse obstoječe deljenje (DeliSliko,
 * miniLige) dela brez sprememb. Slika gre prek začasne datoteke.
 */
function namestiDeljenje(): void {
  const deli = async (podatki: ShareData = {}): Promise<void> => {
    const files = podatki.files?.length
      ? await Promise.all(
          podatki.files.map(async (f) => {
            const { uri } = await Filesystem.writeFile({
              path: f.name,
              data: await vBase64(f),
              directory: Directory.Cache,
            })
            return uri
          }),
        )
      : undefined
    try {
      await Share.share({ title: podatki.title, text: podatki.text, url: podatki.url, files })
    } catch (e) {
      // Zaprt list je na spletu AbortError; klicatelji ga tako prepoznajo.
      if (/cancel/i.test((e as Error).message)) throw new DOMException('', 'AbortError')
      throw e
    }
  }
  Object.defineProperty(navigator, 'share', { value: deli, configurable: true })
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
}

function vBase64(datoteka: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const bralnik = new FileReader()
    bralnik.onload = () => resolve(String(bralnik.result).split(',')[1] ?? '')
    bralnik.onerror = () => reject(bralnik.error)
    bralnik.readAsDataURL(datoteka)
  })
}

/**
 * Začetek povezave, ki gre ven (deljenje, vabila, e-pošta). V aplikaciji je
 * izvor strani `capacitor://localhost`, ki ga prejemnik ne more odpreti, zato
 * tam vedno slff.eu; na spletu ostane trenutni izvor (predogledi, lokalno).
 */
export function izvor(): string {
  if (typeof window === 'undefined' || jeNativno()) return DOMENA
  return window.location.origin
}
