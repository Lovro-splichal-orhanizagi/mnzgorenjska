import type { CapacitorConfig } from '@capacitor/cli'

// Mobilna aplikacija je ista spletna stran, zapakirana z `dist/` (glej
// docs/mobilna-aplikacija.md). Po `npm run build` jo v ios/ in android/
// prenese `npx cap sync`.
const config: CapacitorConfig = {
  appId: 'eu.slff.app',
  appName: 'SLFF',
  webDir: 'dist',
  backgroundColor: '#020617',
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#020617' },
    // Obvestilo se pokaže tudi, ko je aplikacija odprta.
    FirebaseMessaging: { presentationOptions: ['alert', 'badge', 'sound'] },
    // OTA brez Capgo strežnika: kdaj in kaj prenesti, odloči src/lib/ota.ts.
    // Nova gradnja iz trgovine začne spet pri vgrajeni kodi.
    // Prazni naslovi: privzeto vtičnik pošilja statistiko, napake WebViewa in
    // poizvedbe Capgo strežnikom — tretji osebi, ki je ni v izjavi o zasebnosti.
    CapacitorUpdater: {
      autoUpdate: false,
      appReadyTimeout: 10000,
      resetWhenUpdate: true,
      autoDeletePrevious: true,
      statsUrl: '',
      updateUrl: '',
      channelUrl: '',
    },
  },
  // Brez tega se Firebase paketa v SPM sprta za ime (navodila vtičnika).
  experimental: {
    ios: {
      spm: {
        packageOptions: { '@capacitor-firebase/messaging': { symlink: true } },
        // Najnižji iOS je 18.4 (glej docs/mobilna-aplikacija.md); `.v18` pozna šele Swift 6.
        swiftToolsVersion: '6.0',
      },
    },
  },
}

export { config as default }
