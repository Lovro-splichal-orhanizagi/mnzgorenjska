# Mobilna aplikacija (Capacitor) — načrt

Cilj: SLFF v App Store in Google Play. Spletna aplikacija ostane vir; Capacitor
jo zapakira (`webDir: dist`), `ios/` in `android/` sta v gitu.

## Odločitve

- **Koda je v paketu**, nove različice gredo skozi trgovino. `min_app_verzija`
  v `settings` vsili posodobitev, ko migracija zlomi staro različico.
- **Potisna obvestila v v1** (rok kroga, rezultati). Supabase push ne dostavlja
  sam: edge funkcija pošlje prek FCM (Android ga nujno potrebuje, iOS gre skozi
  isti FCM z naloženim APNs ključem). Firebase je le dostavljavec, podatki in
  žetoni naprav ostanejo v Supabase.
- **Prijava:** e-pošta, Google in Apple (Apple zahteva Sign in with Apple, kjer je Google).
- Računa v trgovinah sta **podjetniška**, `eu.slff.app`, ime "SLFF".
- Objava **po vsem svetu**; tujec dobi angleški vmesnik kot na spletu.
- **Administracija samo na spletu** — v aplikaciji ni ne povezave ne poti.
- Samo iPhone in pokončno (brez posnetkov za iPad).

## Gradnja

```bash
npm run build && npx cap sync          # dist/ → ios/, android/
npx cap open ios                       # Xcode
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./android/gradlew -p android assembleDebug   # Capacitor 8 zahteva JDK 21
```

Build vzame `.env.production`, zato aplikacija teče proti produkcijski bazi.
Ikona in splash: `assets/logo.png` →
`npx @capacitor/assets generate --iconBackgroundColor '#2f6b4f' --splashBackgroundColor '#020617'`
(ustvarjeni PWA ikone in manifest pobriši — splet jih ne uporablja).

Xcode 27 `npx cap run ios` ne najde simulatorja; namesti ročno:
`xcrun simctl install booted ios/DerivedData/*/Build/Products/Debug-iphonesimulator/App.app && xcrun simctl launch booted eu.slff.app`.

## Faze

1. ✅ **Lupina** — `@capacitor/core|cli|ios|android|app|status-bar`,
   `capacitor.config.ts` (`eu.slff.app`, "SLFF"), ikona in splash iz
   `public/logo` (`@capacitor/assets`), `viewport-fit=cover` + safe-area,
   Android gumb nazaj → `history.back()`.
2. ✅ **Splet v aplikaciji** — `src/lib/platforma.ts` (`jeNativno()`):
   - povezave za deljenje iz `DOMENA` (`src/lib/naslov.ts`) namesto
     `window.location.origin` (Ekipa, Lestvica, MojaEkipa, Igralec, Klub,
     PovabiSoigralce, TedenskiPregled, miniLige, Administracija);
   - `drzavaUgib.ts` kliče `https://slff.eu/api/drzava`, `api/drzava.ts` doda CORS;
   - deljenje slik in besedila prek `@capacitor/share` + `@capacitor/filesystem`
     (DeliSliko, DeliMiniLigo, miniLige), splet ostane kot je;
   - zunanje povezave (sponzorji, vir, mailto) v sistemski brskalnik.
3. ✅ **Prijava in povezave**
   - Google/Apple OAuth: `@capacitor/browser`, PKCE, `exchangeCodeForSession`;
   - Universal Links / App Links: `public/.well-known/apple-app-site-association`,
     `assetlinks.json`; `appUrlOpen` → `navigate()` (potrditev, `/novo-geslo`, `/l/:koda`);
   - Sign in with Apple v Supabase (Services ID, ključ);
   - **izbris računa** (zahteva obeh trgovin): migracija + RPC/edge funkcija,
     gumb v nastavitvah računa, test v `test:varnost`.
4. ✅ **Varovalo različice** — `min_app_verzija`, zaslon "Posodobi" s povezavo v trgovino.
5. ✅ **Potisna obvestila** — `@capacitor-firebase/messaging`, Firebase projekt
   (APNs ključ naložen v Firebase), tabela `push_tokens` (RLS: lastnik),
   `posli-opomnik` pošlje tudi push; `brez_opomnikov` velja za oba kanala.
6. ✅ **Trgovini** — opisi sl/sk/en, posnetki zaslona, zasebnost (`/pravno`),
   Apple privacy labels, Google Data safety, TestFlight + zaprto testiranje, pregled.
7. **CI (pozneje)** — GitHub Actions + fastlane, ko je prva različica odobrena.

Kaj ostane tebi (računi, ključi, oddaja): `docs/trgovine/README.md`.

## Tveganja

- Apple 4.2 (minimalna funkcionalnost): zgolj ovita spletna stran je pogosto
  zavrnjena — push, nativno deljenje in povezave so argument.
- Zamik med aplikacijo in bazo: stara aplikacija proti novim RPC-jem → varovalo različice.
