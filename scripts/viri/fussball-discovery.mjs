import {fussballLiveTags} from './fussball-statistika.mjs'

const fail = reason => { throw new Error(`fussball discovery: ${reason}`) }
const requireProof = (condition, reason) => { if (!condition) fail(reason) }
const FONT = /^[a-z0-9]{8}$/
const MATCH = /^[A-Z0-9]{32}$/
const STAFFEL = /^[A-Z0-9]{32}-G$/
const CSS_TEMPLATE = 'https://www.fussball.de/export.fontface/-/id/%ID%/type/css'

function normalizePublicUrl(value) {
  if (typeof value !== 'string') return null
  if (value.startsWith('//')) return `https:${value}`
  return value
}

function ownUrlId(url, kind) {
  if (kind === 'round') {
    return url?.match(/^https:\/\/www\.fussball\.de\/spieltag\/(?:[a-z0-9-]+\/)?-\/staffel\/([A-Z0-9]{32}-G)$/)?.[1] ?? null
  }
  return url?.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1] ?? null
}

function pageIdentity(tags, kind, expected) {
  const head = tags.filter(t => t.inHead)
  const canonical = head.filter(t => t.tag === 'link' && t.attrs.rel === 'canonical')
  const og = head.filter(t => t.tag === 'meta' && t.attrs.property === 'og:url')
  requireProof(canonical.length === 1 && og.length === 1, 'manjka enolična živa kanonična/OG identiteta')
  const canonicalUrl = normalizePublicUrl(canonical[0].attrs.href)
  const ogUrl = normalizePublicUrl(og[0].attrs.content)
  requireProof(canonicalUrl && canonicalUrl === ogUrl, 'kanonična in OG URL se razlikujeta')
  requireProof(ownUrlId(canonicalUrl, kind) === expected, 'živa identiteta ne ustreza vrsti ali zahtevani ligi/tekmi')
  return canonicalUrl
}

function bodyCssTemplate(tags) {
  const bodies = tags.filter(t => t.tag === 'body' && !t.inHead)
  requireProof(bodies.length === 1, 'manjka enolično živo telo HTML')
  const observed = normalizePublicUrl(bodies[0].attrs['data-obfuscation-stylesheet'])
  requireProof(observed === CSS_TEMPLATE, 'manjka podprta živa predloga CSS pisav')
  return observed
}

function liveFonts(tags) {
  const ids = new Set()
  for (const tag of tags) {
    if (!Object.hasOwn(tag.attrs, 'data-obfuscation')) continue
    const id = tag.attrs['data-obfuscation']
    requireProof(FONT.test(id ?? ''), 'neveljaven živi ID pisave')
    ids.add(id)
  }
  return [...ids].sort()
}

function lineupUrl(tags, matchId) {
  const possible = tags.filter(t => t.tag === 'a' && [t.attrs.href, t.attrs['data-ajax-resource']]
    .some(v => typeof v === 'string' && v.includes('/ajax.match.lineup/')))
  if (!possible.length) return null
  requireProof(possible.length === 1, 'več možnih povezav na postavo')
  const tab = possible[0], attrs = tab.attrs
  requireProof(Object.hasOwn(attrs, 'data-match-course-tab') &&
    attrs['data-ajax-target'] === '#match_course_body' && Object.hasOwn(attrs, 'data-ajax'),
  'povezava postave ni pravi zavihek poteka tekme')
  requireProof(typeof attrs.href === 'string' && typeof attrs['data-ajax-resource'] === 'string', 'manjka povezava ali vir zavihka postave')
  const href = normalizePublicUrl(attrs.href), resource = normalizePublicUrl(attrs['data-ajax-resource'])
  requireProof(href === resource, 'povezava in vir zavihka postave se razlikujeta')
  const id = href?.match(/^https:\/\/www\.fussball\.de\/ajax\.match\.lineup\/-\/mode\/PAGE\/spiel\/([A-Z0-9]{32})(?:\/ticker-id\/selectedTickerId)?$/)?.[1]
  requireProof(id === matchId, 'povezava postave ne ustreza zahtevani tekmi')
  return href
}

/** Extracts only live, page-scoped public references; no scripts or markup repair are executed. */
export function inspectFussballPage(html, {kind, staffel, matchId} = {}) {
  requireProof(typeof html === 'string' && html.length > 0, 'zahtevan je izvorni HTML')
  requireProof(kind === 'round' || kind === 'report', 'nepodprta vrsta strani')
  const expected = kind === 'round' ? staffel : matchId
  requireProof(kind === 'round' ? STAFFEL.test(expected ?? '') : MATCH.test(expected ?? ''), 'manjka veljavna zahtevana šifra lige ali tekme')
  const tags = fussballLiveTags(html)
  const url = pageIdentity(tags, kind, expected)
  const cssTemplate = bodyCssTemplate(tags)
  return {
    url,
    fontIds: liveFonts(tags),
    cssTemplate,
    lineupUrl: kind === 'report' ? lineupUrl(tags, expected) : null,
  }
}

/** Resolve the observed CSS only when its complete closed grammar binds one same-host WOFF. */
export function fussballFontUrl(css, fontId) {
  requireProof(typeof css === 'string' && FONT.test(fontId ?? ''), 'manjkata veljavna pisava ali CSS')
  const woffPath = '//www.fussball.de/export.fontface/-/format/woff/id/([a-z0-9]{8})/type/font'
  const ttfPath = '//www.fussball.de/export.fontface/-/format/ttf/id/([a-z0-9]{8})/type/font'
  const pattern = new RegExp(
    '^\\s*@font-face\\s*\\{\\s*font-family\\s*:\\s*font-([a-z0-9]{8})\\s*;\\s*src\\s*:\\s*url\\(\\s*([\'"])' + woffPath + '\\2\\s*\\)\\s*format\\(\\s*([\'"])woff\\4\\s*\\)\\s*,\\s*url\\(\\s*([\'"])' + ttfPath + '\\5\\s*\\)\\s*format\\(\\s*([\'"])truetype\\7\\s*\\)\\s*;\\s*\\}\\s*\\.results-c-([a-z0-9]{8})\\s*\\{\\s*font-family\\s*:\\s*font-([a-z0-9]{8})\\s*!important\\s*;\\s*\\}\\s*$',
  )
  const match = pattern.exec(css)
  requireProof(match, 'nepodprta oblika CSS pisave')
  const [, familyId, , woffId, , , ttfId, , classId, selectorFamilyId] = match
  requireProof([familyId, woffId, ttfId, classId, selectorFamilyId].every(id => id === fontId), 'CSS ne veže zahtevanega ID-ja pisave')
  return `https://www.fussball.de/export.fontface/-/format/woff/id/${fontId}/type/font`
}
