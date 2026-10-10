// Link in NavLink, ki izbrano ligo nosita v naslovu (`?t=`). Kontekst lige jo
// ob navigaciji sicer doda sam, a šele v brskalniku — iskalnik sledi `href`
// in bi brez nje pristal v privzeti ligi. Povezava, ki ligo že ima (igralec
// iz druge lige), ostane, kot je. Uporabljaj ju namesto react-router-dom.
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
  type To,
} from 'react-router-dom'
import { PRIVZETO, useTekmovanje, zLigo } from '../lib/tekmovanje'

function useCilj(to: To): To {
  const { slug } = useTekmovanje()
  // Privzeta liga parametra nima (glej `uskladiTekmovanje`).
  return typeof to === 'string' ? zLigo(to, slug === PRIVZETO ? null : slug) : to
}

export function Link({ to, ...ostalo }: LinkProps) {
  return <RouterLink to={useCilj(to)} {...ostalo} />
}

export function NavLink({ to, ...ostalo }: NavLinkProps) {
  return <RouterNavLink to={useCilj(to)} {...ostalo} />
}
