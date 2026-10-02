// Mobilna aplikacija (Capacitor) teče isto kodo kot splet; tu je, kar je drugače.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

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
}
