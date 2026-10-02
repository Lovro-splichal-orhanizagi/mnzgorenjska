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
  },
}

export { config as default }
