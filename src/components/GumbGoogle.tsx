// Gumb "Nadaljuj z Googlom" in prijava prek ponudnika — isti za stran Prijava
// in za vrata, kjer gosta povabimo k registraciji (seznam igralcev).
//
// Supabase preusmeri k ponudniku in nazaj na `nazaj`; nov uporabnik dobi
// profil iz imena pri ponudniku (glej handle_new_user). V aplikaciji Google
// prijave v WebViewu ne dovoli: odpre se sistemski brskalnik, vrnitev na
// `eu.slff.app://auth` sejo preda NativnePovezave.
import { useState } from 'react'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { napakaPrijave } from '../lib/prijava'
import { izvor, jeNativno, SHEMA } from '../lib/platforma'
import { dogodek } from '../lib/analitika'
import { t } from '../i18n'

/** Začne prijavo prek ponudnika; vrne besedilo napake ali null. */
export async function prijavaSPonudnikom(
  provider: 'google' | 'apple',
  nazaj: string,
): Promise<string | null> {
  dogodek('prijava_ponudnik', { ponudnik: provider })
  const nativno = jeNativno()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: nativno
      ? { redirectTo: `${SHEMA}://auth?nazaj=${encodeURIComponent(nazaj)}`, skipBrowserRedirect: true }
      : { redirectTo: `${izvor()}${nazaj}` },
  })
  // Dokler ponudnik v Supabase ni vklopljen, vrne "provider is not enabled";
  // to uporabniku ne pove nič, zato ga usmerimo na e-pošto.
  if (error)
    return /not enabled/i.test(error.message)
      ? t(provider === 'google' ? 'racun.prijava.googleNiNaVoljo' : 'racun.prijava.appleNiNaVoljo')
      : napakaPrijave(error.message)
  if (nativno && data.url) await Browser.open({ url: data.url })
  return null
}

export function IkonaGoogle() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  )
}

/** Gumb z Googlovim znakom; napako (npr. ponudnik ni vklopljen) izpiše pod sabo. */
export default function GumbGoogle({ nazaj }: { nazaj: string }) {
  const [napaka, setNapaka] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          setNapaka(null)
          setNapaka(await prijavaSPonudnikom('google', nazaj))
        }}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-100"
      >
        <IkonaGoogle />
        {t('racun.prijava.zGooglom')}
      </button>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </>
  )
}
