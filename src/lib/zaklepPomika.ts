// Stran pod pogovornim oknom se ne pomika. Okna se lahko odpirajo eno nad
// drugim (trg → podatki igralca), zato štejemo: prvo zaklene, zadnje odklene.
// Vsako okno posebej bi si zapomnilo "prejšnje" stanje in ob hkratnem
// zaprtju pustilo stran zaklenjeno.
import { useEffect } from 'react'

let odprtih = 0

export function useZaklepPomika() {
  useEffect(() => {
    if (odprtih++ === 0) document.body.style.overflow = 'hidden'
    return () => {
      if (--odprtih === 0) document.body.style.overflow = ''
    }
  }, [])
}
