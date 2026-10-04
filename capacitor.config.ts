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
    CapacitorUpdater: { autoUpdate: false, appReadyTimeout: 10000, resetWhenUpdate: true, autoDeletePrevious: true },
  },
  // Brez tega se Firebase paketa v SPM sprta za ime (navodila vtičnika).
  experimental: {
    ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } },
  },
}

export { config as default }
