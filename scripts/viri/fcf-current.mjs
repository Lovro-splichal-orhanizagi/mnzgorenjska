// Current public /ca/partit pages. No private API requests or synthetic IDs.
import { tokRsc, vrsticeRsc, drevoRsc, elementi, besedilo, jeElement,
  glavaZapisnika, imeIgralca, datumIz, uraIz, sezonaIz, isFcfActaSourceRoute } from './fcf.mjs'
const origin = 'https://www.fcf.cat'
const currentPath = /^\/ca\/partit\/(20\d{2})-(20\d{2})\/(lliga-elit|(?:primera|segona|tercera|quarta)-catalana)\/grup-([1-9]\d*)\/jornada-([1-9]\d*)\/([a-z0-9]+(?:-[a-z0-9]+)*-vs-[a-z0-9]+(?:-[a-z0-9]+)*)$/
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim()
const fail = why => { throw new Error(`fcf: current report identity — ${why}`) }
const sourceRoute = html => vrsticeRsc(tokRsc(html)).get('0')?.c
export const isFcfCurrentPage = html => sourceRoute(html)?.[2] === 'partit'
function publicUrl(value) {
  if (typeof value !== 'string' || /[\s\\%?#]/.test(value)) fail('unsafe canonical URL')
  const path = value.startsWith(origin) ? value.slice(origin.length) : value
  const m = currentPath.exec(path)
  if (!m || Number(m[2]) !== Number(m[1]) + 1) fail('not a supported same-host public report')
  return origin + path
}
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(m => [m[1].toLowerCase(), m[3]]))
}
/** Numeric source ID is proven by the original redirect RSC route, not caller labels. */
export function fcfPublicRedirect(html, { id, url } = {}) {
  const number = typeof id === 'string' ? id.replace(/^es/, '') : ''
  if (!/^[1-9]\d*$/.test(number) || url !== `${origin}/ca/competicio/acta/${number}` ||
      !isFcfActaSourceRoute(sourceRoute(html), number)) fail('redirect does not belong to numeric source ID')
  const targets = new Set()
  for (const match of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(match[0])
    if (a['http-equiv']?.toLowerCase() !== 'refresh') continue
    const content = /^0;url=(.+)$/.exec(a.content ?? '')
    if (a.id !== '__next-page-redirect' || !content) fail('unrecognized redirect')
    targets.add(publicUrl(content[1]))
  }
  if (targets.size !== 1) fail('missing or ambiguous public redirect')
  return [...targets][0]
}
export function validateFcfCurrentIdentity(html, options = {}) {
  const target = fcfPublicRedirect(options.redirectHtml, options)
  const route = sourceRoute(html)
  if (!Array.isArray(route) || origin + route.join('/') !== target) fail('canonical RSC route differs from numeric redirect')
  const links = new Set([...String(html).matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => a.rel === 'canonical').map(a => publicUrl(a.href)))
  if (links.size !== 1 || !links.has(target)) fail('canonical metadata differs from numeric redirect')
  const g = fcfCurrentHeader(drevoRsc(html))
  const m = currentPath.exec(new URL(target).pathname)
  if (g.sezona !== `${m[1]}/${m[2].slice(-2)}` || g.krog !== Number(m[5]) || g.skupina !== `GRUP ${m[4]}` ||
      g.tekmovanje !== m[3].toUpperCase().replaceAll('-', ' ')) fail('report header differs from canonical route')
  const names = fcfCurrentClubs(drevoRsc(html))
  if (names[0].name !== g.domaci || names[1].name !== g.gostje || names[0].slug + '-vs-' + names[1].slug !== m[6]) fail('team identity differs from canonical route')
  return g
}
function scorePanels(koreni) {
  return [...elementi(koreni)].filter(e => e.tip === 'div' && e.otroci.length === 3 &&
    e.otroci[0]?.otroci?.length === 2 && e.otroci[0].otroci.every(x => /^\/ca\/clubs\/[a-z0-9-]+\/categories\/[a-z0-9-]+$/.test(x?.props?.href ?? '')) &&
    e.otroci[1]?.otroci?.length === 3)
}
export function fcfCurrentClubs(koreni) {
  const panels = scorePanels(koreni)
  if (!panels.length) fail('missing team header')
  const all = panels.map(panel => panel.otroci[0].otroci.map(x => ({ name: clean(besedilo(x)), slug: x.props.href.split('/').at(-1) })))
  if (all.some(x => JSON.stringify(x) !== JSON.stringify(all[0]))) fail('ambiguous team header')
  return all[0]
}
export function fcfCurrentHeader(koreni) {
  const old = glavaZapisnika(koreni)
  const panels = scorePanels(koreni)
  if (!panels.length) return { ...old, zaprt: false }
  const panel = panels[0]
  const teams = fcfCurrentClubs(koreni)
  const oznaka = clean(besedilo(panel.otroci[2]))
  const score = clean(besedilo(panel.otroci[1].otroci[1])).match(/^(\d+)-(\d+)$/)
  const field = label => [...elementi(koreni)].find(e => e.tip === 'span' && String(e.otroci[0] ?? '').startsWith(label))
  return { ...old, domaci: teams[0].name, gostje: teams[1].name, oznaka,
    zaprt: oznaka === 'FINALITZAT', izid: score ? { domaci: Number(score[1]), gostje: Number(score[2]) } : null,
    sezona: sezonaIz(besedilo(field('TEMPORADA :'))), datum: datumIz(besedilo(field('DATA:'))), ura: uraIz(besedilo(field('HORARI:'))) }
}
const sourceMinute = text => {
  const m = clean(text).match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?[’']$/)
  return m && Number(m[1]) <= 120 ? Number(m[1]) + Number(m[2] ?? 0) : null
}
const strictMinute = text => {
  const clock = sourceMinute(text)
  return clock === null ? null : Math.min(clock, 90)
}
function iconKind(icon, slot) {
  const nodes = [...elementi(icon)]
  const colors = nodes.flatMap(e => [e.props.fill, e.props.stroke, ...(e.props.className?.match(/#[0-9a-f]{6}/gi) ?? [])]).filter(Boolean).map(s => String(s).toUpperCase())
  if (nodes.some(e=>e.tip==='circle')) {
    if (colors.includes('#F30000')) return 'avtogol'
    if (colors.includes('#82E4FF')) return 'enajstmetrovka'
    if (colors.includes('#00FF73')) return 'gol'
    return '?'
  }
  if (slot === 4 && colors.includes('#007AFF')) return 'noter'
  if (slot === 5 && colors.includes('#E50011')) return 'ven'
  const yellow = colors.includes('#FFEB3B')
  const red = colors.some(c=>/^#[A-F\d]{6}$/.test(c)&&parseInt(c.slice(1,3),16)>180&&parseInt(c.slice(3,5),16)<90&&parseInt(c.slice(5,7),16)<90)
  if (yellow && red) return 'drugiRumeni'
  if (red) return 'rdeci'
  if (yellow) return slot === 3 ? 'drugiRumeni' : 'rumeni'
  return '?'
}
export function fcfCurrentData(koreni) {
  const g = fcfCurrentHeader(koreni), opozorila = []
  const hold = text => opozorila.push(`nepopoln: ${text}`)
  if (!g.zaprt) hold(`unknown or unfinished status ${g.oznaka}`)
  if (!g.datum || !g.sezona || !g.krog || !g.domaci || !g.gostje) hold('missing report header')
  const container = [...elementi(koreni)].find(e => e.props.localNode && e.props.visitorNode)
  const ekipeIgr = ['localNode','visitorNode'].map((key, idx) => {
    const rows = [...elementi(container?.props[key])].filter(e => e.tip === 'div' && e.props.className?.startsWith('py-2 px-1') && e.otroci.length === 2 && [...elementi(e)].some(x=>x.props.player?.titular !== undefined))
    const players = rows.map(row => {
      const entry = [...elementi(row)].find(x=>x.props.player?.titular !== undefined), p = entry.props.player
      if (clean(entry.props.teamName) !== [g.domaci,g.gostje][idx] || clean(entry.props.competitionName) !== g.tekmovanje) hold('player team/competition mismatch')
      const dogodki = []
      for (const event of row.otroci[1]?.otroci ?? []) {
        if (!jeElement(event)) continue
        const minute = strictMinute(besedilo(event.otroci[0]))
        event.otroci.slice(1).forEach((icon, i) => {
          if (!icon) return
          const vrsta = iconKind(icon,i+1)
          if (minute === null || vrsta === '?') hold(`invalid event/minute for ${p.id}`)
          dogodki.push({ vrsta, minuta: minute, sourceMinute: sourceMinute(besedilo(event.otroci[0])) })
        })
      }
      const eventIdentities = new Set()
      for (const event of dogodki) {
        const identity = `${event.vrsta}|${event.sourceMinute}`
        if (eventIdentities.has(identity)) hold(`duplicate player event for ${p.id}: ${identity}`)
        eventIdentities.add(identity)
      }
      const regSt = /^[1-9]\d*$/.test(String(p.id)) && Number.isSafeInteger(Number(p.id)) ? Number(p.id) : null
      if (!regSt || !clean(p.nombre) || !['0','1'].includes(String(p.titular)) || !['0','1'].includes(String(p.portero))) hold('invalid player identity')
      return { st: /^\d+$/.test(String(p.dorsal)) ? Number(p.dorsal) : null, ime: imeIgralca(p.nombre), regSt,
        zacetnik: String(p.titular)==='1', kapetan: String(p.capitan)==='1', vratar: String(p.portero)==='1', pozicija: String(p.portero)==='1'?'GK':null, dogodki }
    })
    if (players.filter(p=>p.zacetnik).length !== 11) hold('missing starting lineup')
    return players
  })
  for (const players of ekipeIgr) {
    const balance = new Map()
    for (const p of players) {
      let active = p.zacetnik
      for (const event of [...p.dogodki].sort((a,b)=>a.sourceMinute-b.sourceMinute)) {
        if (event.vrsta === 'noter' || event.vrsta === 'ven') {
          if ((event.vrsta === 'noter') === active) hold(`contradictory substitution for ${p.regSt}`)
          active = event.vrsta === 'noter'
          balance.set(event.minuta, (balance.get(event.minuta) ?? 0) + (active ? 1 : -1))
        } else if ((['gol','enajstmetrovka','avtogol'].includes(event.vrsta)) && !active) hold(`goal without known playing interval for ${p.regSt}`)
      }
    }
    if ([...balance.values()].some(n=>n!==0)) hold('unpaired substitution minutes')
  }
  const ids = ekipeIgr.flat().map(p=>p.regSt)
  if (new Set(ids).size !== ids.length) hold('duplicate player identity')
  const sections = [...elementi(koreni)].filter(e=>e.tip==='div' && e.otroci.some(o=>o?.otroci?.some(h=>h?.tip==='h3'&&besedilo(h)==='GOLS')))
  // The report renders the same goals twice for desktop/mobile. Read one
  // complete section, never add both copies together.
  const goli = []
  const section = sections[0]
  if (!section) hold('missing goals section')
  const seen = new Set()
  for (const e of elementi(section)) {
    if (seen.has(e) || e.tip !== 'div') continue
    const ps = [...elementi(e)].filter(x=>x.props.player)
    if (ps.length !== 1) continue
    const t = clean(besedilo(e)), state = /^(\d+)\s*-\s*(\d+)/.exec(t), minute = /\((\d+(?:\s*\+\s*\d+)?)'\)/.exec(t)
    if (!state) continue
    for (const child of elementi(e)) seen.add(child)
    const p = ps[0].props.player, vrsta = iconKind(e,1), m = strictMinute((minute?.[1]??'')+"'")
    if (m===null || !['gol','enajstmetrovka','avtogol'].includes(vrsta)) hold('invalid goal type/minute')
    goli.push({ regSt:Number(p.id), ime:imeIgralca(p.nombre), minuta:m, sourceMinute:sourceMinute((minute?.[1]??'')+"'"), stanje:[Number(state[1]),Number(state[2])], vrsta })
  }
  const lineupGoals = ekipeIgr.flat().flatMap(p => p.dogodki.filter(e => ['gol','enajstmetrovka','avtogol'].includes(e.vrsta)).map(e => `${p.regSt}|${e.sourceMinute}|${e.vrsta}`)).sort()
  const timelineGoals = goli.map(e => `${e.regSt}|${e.sourceMinute}|${e.vrsta}`).sort()
  if (JSON.stringify(lineupGoals) !== JSON.stringify(timelineGoals)) hold('goal identities/minutes differ between lineup and timeline')
  let previous = [0,0]
  for (const goal of goli) {
    const delta = goal.stanje.map((n,i)=>n-previous[i])
    if (!((delta[0]===1&&delta[1]===0)||(delta[0]===0&&delta[1]===1))) hold('invalid progressive score')
    previous=goal.stanje
  }
  if (g.izid && (previous[0]!==g.izid.domaci || previous[1]!==g.izid.gostje)) hold('goals differ from final score')
  // Keep penalty identity through source reconciliation. The shared legacy
  // mapper counts lineup balls as goals; detailed goal type stays in goli.
  const mappedTeams = ekipeIgr.map(players => players.map(player => ({
    ...player,
    dogodki: player.dogodki.map(event => ({ vrsta: event.vrsta === 'enajstmetrovka' ? 'gol' : event.vrsta, minuta: event.minuta })),
  })))
  return {g,ekipeIgr:mappedTeams,goli,opozorila}
}
