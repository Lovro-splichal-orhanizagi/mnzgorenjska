// Uradni znački App Store in Google Play (SLFF v trgovinah). Datoteke so
// nespremenjene, kot sta jih objavila Apple (tools.applemediaservices.com) in
// Google (play.google.com/intl/en_us/badges): ne prerisuj, ne barvaj, ne
// obrezuj in ne razteguj. Apple priporoča črno znački in najmanj 40 px
// višine; Google ima v PNG-ju prazen rob, zato ga poravnamo z negativnim
// robom, da sta znački enako visoki. V aplikaciji je ni (tam je namestitev
// brez pomena); povezavi se odpreta v zunanjem zavihku, ne v WebViewu.
import { jeNativno } from '../lib/platforma'
import { jezikSlovarja, t } from '../i18n'
import { APP_STORE, GOOGLE_PLAY } from './Trgovine'

/** Višina vidnega dela značke v px (Apple: najmanj 40). */
const VISINA = 44

/** Jeziki, ki jim je Apple objavil lastno različico značke; ostali dobijo angleško. */
const APPLE_JEZIKI = ['sl', 'cs', 'da', 'de', 'el', 'es', 'et', 'hu', 'lv', 'pl', 'ro', 'sk', 'tr']

/**
 * Googlov PNG je 646×250. Angleški ima znački 564×168 s 41 px roba na vseh
 * straneh, prevedeni jo imajo 646×192 s 29 px roba zgoraj in spodaj.
 */
const GOOGLE_MERE = (jezik: string) =>
  jezik === 'en' ? { znacka: 168, rob: 41 } : { znacka: 192, rob: 29 }

const POVEZAVA =
  'inline-block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

export default function ZnackeTrgovin({ razred = '' }: { razred?: string }) {
  if (jeNativno()) return null
  const jezik = jezikSlovarja()
  const apple = APPLE_JEZIKI.includes(jezik) ? jezik : 'en'
  const g = GOOGLE_MERE(jezik)
  const k = VISINA / g.znacka
  const gRob = Math.round(g.rob * k * 100) / 100
  const gRobStran = jezik === 'en' ? gRob : 0
  return (
    // Apple: črna znački je prva, ob njej Google Play.
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${razred}`}>
      {APP_STORE && (
        <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className={POVEZAVA}>
          <img
            src={`/badges/app-store-${apple}.svg`}
            alt={t('domov.uvod.znackaAppStore')}
            height={VISINA}
            style={{ height: VISINA, width: 'auto' }}
            className="block"
          />
        </a>
      )}
      <a href={GOOGLE_PLAY} target="_blank" rel="noopener noreferrer" className={POVEZAVA}>
        <img
          src={`/badges/google-play-${jezik}.png`}
          alt={t('domov.uvod.znackaGooglePlay')}
          width={Math.round(646 * k)}
          height={Math.round(250 * k)}
          style={{ height: 250 * k, width: 646 * k, margin: gRobStran ? `-${gRob}px -${gRobStran}px` : `-${gRob}px 0` }}
          className="block max-w-none"
        />
      </a>
    </div>
  )
}
