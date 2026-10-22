// Skupna oblika maila SLFF (opomniki, prevzem, trgovina): temnozelena glava z
// logom, bela kartica z naslovom, eno dejanje (gumb), drobna noga z razlogom
// in odjavo. Tabele in slogi v vrstici, ker Gmail, Outlook in Apple Mail
// drugega ne berejo zanesljivo; `bgcolor` poleg CSS, gumb z barvo na celici
// (Outlook), predglava (preheader) za predogled v nabiralniku, temni način
// prek `prefers-color-scheme` in `[data-ogsc]` (Outlook.com).
//
// `postavi()` iz istih podatkov vrne HTML in čistopis (text/plain), da ima
// vsak mail oba dela. Statična kopija iste oblike je v supabase/templates/*.html
// (avtentikacijska pošta, Go predloge).
//
// Brez nizov v jeziku: smoke preverja, da v tujih mailih ni slovenščine.

export const BARVE = {
  ozadje: '#f3f1ea', kartica: '#ffffff', glava: '#0b3d2e', crta: '#e7e3d8',
  besedilo: '#0f172a', sivo: '#5b6b63', povezava: '#047655',
  gumb: '#34d399', gumbBesedilo: '#052e16', zlato: '#ffd166', krema: '#fdf6e3',
  dejstva: '#f0faf4', dejstvaRob: '#cdeedd', opozorilo: '#fff7e0', opozoriloRob: '#f2c14e',
}

export const PISAVA = "Inter, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif"
export const LOGO = 'https://slff.eu/logo/slff-ikona-180.png'

/** HTML ubeži; za vse, kar napiše uporabnik ali pride iz baze. */
export const esc = (s: unknown) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

const SLOG = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a { text-decoration: none; }
  @media (max-width: 620px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 22px !important; line-height: 28px !important; }
    .gumb-celica, .gumb-povezava { display: block !important; width: 100% !important; box-sizing: border-box; text-align: center !important; }
    .ploscica { display: block !important; width: 100% !important; box-sizing: border-box; margin-bottom: 8px; }
    .skrij-mobi { display: none !important; }
    .gumb-tabela { width: 100% !important; }
  }
  @media (prefers-color-scheme: dark) {
    .ozadje { background-color: #07110d !important; }
    .kartica { background-color: #0f1d17 !important; border-color: #1d3328 !important; }
    .tx { color: #e6efe9 !important; }
    .siv { color: #9db3a7 !important; }
    .pov { color: #6fe4ae !important; }
    .dejstva { background-color: #13261d !important; border-color: #24402f !important; }
    .opoz { background-color: #2a230f !important; border-color: #8a6d1f !important; }
  }
  [data-ogsc] .tx { color: #e6efe9 !important; }
  [data-ogsc] .siv { color: #9db3a7 !important; }
  [data-ogsc] .pov { color: #6fe4ae !important; }
`

/** Gumb, ki deluje tudi v Outlooku (barva na celici, ne le na povezavi). `label` in `url` sta surova. */
export function gumb(label: string, url: string): string {
  return `<table role="presentation" class="gumb-tabela" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 4px;">
  <tr><td class="gumb-celica" align="center" bgcolor="${BARVE.gumb}" style="border-radius: 10px; background-color: ${BARVE.gumb};">
    <a class="gumb-povezava" href="${esc(url)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: ${PISAVA}; font-size: 16px; line-height: 20px; font-weight: 800; color: ${BARVE.gumbBesedilo}; text-decoration: none; border-radius: 10px;">${esc(label)}</a>
  </td></tr></table>`
}

/** Vrstica v okvirju dejstev: `k` je navaden tekst, `v` že ubežan HTML. */
export interface Vrstica { k: string; v: string }

function dejstva(vrstice: Vrstica[], opozorilo = false): string {
  const bg = opozorilo ? BARVE.opozorilo : BARVE.dejstva
  const rob = opozorilo ? BARVE.opozoriloRob : BARVE.dejstvaRob
  const vr = vrstice.map(({ k, v }, i) => `<tr>
      <td class="siv" valign="top" style="padding: ${i ? 8 : 0}px 12px 0 0; font-family: ${PISAVA}; font-size: 13px; line-height: 20px; color: ${BARVE.sivo}; white-space: nowrap;">${esc(k)}</td>
      <td class="tx" valign="top" style="padding: ${i ? 8 : 0}px 0 0; font-family: ${PISAVA}; font-size: 15px; line-height: 20px; color: ${BARVE.besedilo}; font-weight: 600;">${v}</td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="${opozorilo ? 'opoz' : 'dejstva'}" style="background-color: ${bg}; border: 1px solid ${rob}; border-radius: 10px; margin: 0 0 20px;">
  <tr><td style="padding: 14px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">${vr}</table></td></tr></table>`
}

function ploscice(st: Vrstica[]): string {
  const w = Math.floor(100 / st.length)
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 20px;"><tr>
  ${st.map((s, i) => `<td class="ploscica dejstva" width="${w}%" align="center" valign="top" style="background-color: ${BARVE.dejstva}; border: 1px solid ${BARVE.dejstvaRob}; border-radius: 10px; padding: 12px 6px;">
      <div class="tx" style="font-family: ${PISAVA}; font-size: 26px; line-height: 30px; font-weight: 800; color: ${BARVE.besedilo};">${s.v}</div>
      <div class="siv" style="font-family: ${PISAVA}; font-size: 12px; line-height: 16px; color: ${BARVE.sivo}; text-transform: uppercase; letter-spacing: .5px;">${esc(s.k)}</div>
    </td>${i < st.length - 1 ? '<td width="8" style="font-size:0;line-height:0;" class="skrij-mobi">&nbsp;</td>' : ''}`).join('')}
  </tr></table>`
}

const odst = (html: string, slog = '') =>
  `<p class="tx" style="margin: 0 0 16px; font-family: ${PISAVA}; font-size: 16px; line-height: 24px; color: ${BARVE.besedilo};${slog}">${html}</p>`
const drobno = (html: string, slog = '') =>
  `<p class="siv" style="margin: 0 0 12px; font-family: ${PISAVA}; font-size: 13px; line-height: 19px; color: ${BARVE.sivo};${slog}">${html}</p>`

/** Povezava v besedilu; `label` in `url` sta surova. */
export const povezava = (label: string, url: string) =>
  `<a class="pov" href="${esc(url)}" style="color: ${BARVE.povezava}; text-decoration: underline;">${esc(label)}</a>`

export interface Mail {
  /** Jezik (`lang` dokumenta). */
  jezik: string
  /** Zadeva (navaden tekst). */
  zadeva: string
  /** Skrito besedilo za predogled v nabiralniku (navaden tekst). */
  predglava: string
  /** Značka v glavi (kratko ime lige, "SHOP"), navaden tekst. */
  oznaka?: string
  /** Naslov v kartici (HTML). */
  naslov: string
  /** Prvi odstavek (HTML). */
  uvod: string
  /** Oštevilčeni koraki (HTML). */
  seznam?: string[]
  /** Rumeni okvir (razlog, rok …). */
  opozorilo?: Vrstica[]
  /** Zeleni okvir dejstev. */
  dejstva?: Vrstica[]
  /** Velike številke nad besedilom (`v` HTML, `k` tekst). */
  ploscice?: Vrstica[]
  /** Edino dejanje; `label` in `url` surova. */
  gumb: { label: string; url: string }
  /** Besedilo nad rezervno povezavo pod gumbom (navaden tekst). */
  rezerva?: string
  /** Odstavek za gumbom (HTML). */
  potem?: string
  /** Drobna opomba (HTML). */
  opomba?: string
  /** Drobni tisk pod kartico (HTML odstavki). */
  pravno?: string[]
  /** Noga: zakaj ta mail (tekst) in povezave (odjava …). */
  noga: { zakaj?: string; povezave?: Array<{ label: string; url: string }> }
}

/** HTML in čistopis iz istih podatkov. */
export function postavi(o: Mail, logo = LOGO): { html: string; besedilo: string } {
  return { html: vHtml(o, logo), besedilo: cistopis(o) }
}

function vHtml(o: Mail, logo: string): string {
  const deli: string[] = []
  if (o.ploscice) deli.push(ploscice(o.ploscice))
  deli.push(odst(o.uvod))
  if (o.seznam) deli.push(`<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 16px;">${o.seznam.map((s, i) => `<tr>
      <td valign="top" style="padding: 0 10px 8px 0;"><div style="width: 22px; height: 22px; border-radius: 11px; background-color: ${BARVE.glava}; color: ${BARVE.krema}; font-family: ${PISAVA}; font-size: 12px; line-height: 22px; font-weight: 800; text-align: center;">${i + 1}</div></td>
      <td class="tx" valign="top" style="padding: 1px 0 8px; font-family: ${PISAVA}; font-size: 15px; line-height: 21px; color: ${BARVE.besedilo};">${s}</td></tr>`).join('')}</table>`)
  if (o.opozorilo?.length) deli.push(dejstva(o.opozorilo, true))
  if (o.dejstva?.length) deli.push(dejstva(o.dejstva))
  deli.push(gumb(o.gumb.label, o.gumb.url))
  if (o.rezerva) deli.push(drobno(`${esc(o.rezerva)}<br><a class="pov" href="${esc(o.gumb.url)}" style="color: ${BARVE.povezava}; word-break: break-all;">${esc(o.gumb.url)}</a>`, ' margin-top: 12px;'))
  if (o.potem) deli.push(odst(o.potem, ' margin-top: 16px; font-size: 15px; line-height: 22px;'))
  if (o.opomba) deli.push(drobno(o.opomba, ' margin-top: 20px;'))

  const noga = [
    o.noga.zakaj ? esc(o.noga.zakaj) : '',
    (o.noga.povezave ?? []).map((p) => `<a class="siv" href="${esc(p.url)}" style="color: ${BARVE.sivo}; text-decoration: underline;">${esc(p.label)}</a>`).join(' &nbsp;·&nbsp; '),
    `SLFF · Sunday League Fantasy Football · <a class="siv" href="https://slff.eu" style="color: ${BARVE.sivo};">slff.eu</a> · <a class="siv" href="mailto:info@slff.eu" style="color: ${BARVE.sivo};">info@slff.eu</a>`,
  ].filter(Boolean).join('<br>')

  return `<!doctype html>
<html lang="${esc(o.jezik)}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>${esc(o.zadeva)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td,p,a,div{font-family:'Segoe UI',Arial,sans-serif !important;}</style><![endif]-->
<style>${SLOG}</style>
</head>
<body class="ozadje" style="margin: 0; padding: 0; background-color: ${BARVE.ozadje};">
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${BARVE.ozadje}; opacity: 0;">${esc(o.predglava)}${'&#8199;&#65279;&#847; '.repeat(40)}</div>
<table role="presentation" class="ozadje" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BARVE.ozadje}" style="background-color: ${BARVE.ozadje};">
<tr><td align="center" style="padding: 24px 12px;">
  <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px;">
    <tr><td bgcolor="${BARVE.glava}" style="background-color: ${BARVE.glava}; border-radius: 14px 14px 0 0; padding: 14px 24px;" class="px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
        <td width="44" valign="middle"><a href="https://slff.eu"><img src="${logo}" width="44" height="44" alt="SLFF" style="display: block; border: 0; width: 44px; height: 44px;"></a></td>
        <td valign="middle" style="padding-left: 12px; font-family: ${PISAVA}; font-size: 18px; line-height: 22px; font-weight: 800; letter-spacing: 1px; color: ${BARVE.krema};">SLFF<br><span style="font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: .6px; color: ${BARVE.zlato}; text-transform: uppercase;">Sunday League Fantasy Football</span></td>
        ${o.oznaka ? `<td align="right" valign="middle"><span style="display: inline-block; padding: 4px 10px; border-radius: 999px; white-space: nowrap; border: 1px solid ${BARVE.zlato}; font-family: ${PISAVA}; font-size: 12px; line-height: 16px; font-weight: 700; color: ${BARVE.zlato};">${esc(o.oznaka)}</span></td>` : ''}
      </tr></table>
    </td></tr>
    <tr><td class="kartica px" bgcolor="${BARVE.kartica}" style="background-color: ${BARVE.kartica}; border: 1px solid ${BARVE.crta}; border-top: 0; border-radius: 0 0 14px 14px; padding: 28px 32px 24px;">
      <h1 class="h1 tx" style="margin: 0 0 14px; font-family: ${PISAVA}; font-size: 24px; line-height: 30px; font-weight: 800; color: ${BARVE.besedilo};">${o.naslov}</h1>
      ${deli.join('\n      ')}
    </td></tr>
    ${o.pravno ? `<tr><td class="px" style="padding: 20px 32px 0;">${o.pravno.map((p) => drobno(p, ' font-size: 12px; line-height: 17px;')).join('')}</td></tr>` : ''}
    <tr><td class="px" align="center" style="padding: 20px 32px 8px;">${drobno(noga, ' text-align: center; font-size: 12px; line-height: 18px;')}</td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`
}

/** HTML odlomek v čistopis: povezava "besedilo (url)", oznake proč. */
export function vBesedilo(html: string): string {
  return String(html ?? '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, (_, u: string, t: string) => {
      const url = u.replaceAll('&amp;', '&')
      const tekst = t.replace(/<[^>]+>/g, '')
      return tekst === url || tekst === u ? url : `${tekst} (${url})`
    })
    .replace(/<[^>]+>/g, '')
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
}

/** Čistopis (text/plain) iz istih podatkov kot HTML. */
export function cistopis(o: Mail): string {
  const v: string[] = []
  v.push(vBesedilo(o.naslov), '')
  if (o.ploscice) v.push(o.ploscice.map((s) => `${s.k}: ${vBesedilo(s.v)}`).join(' | '), '')
  v.push(vBesedilo(o.uvod), '')
  if (o.seznam) v.push(o.seznam.map((s, i) => `${i + 1}. ${vBesedilo(s)}`).join('\n'), '')
  if (o.opozorilo?.length) v.push(o.opozorilo.map((d) => `${d.k}: ${vBesedilo(d.v)}`).join('\n'), '')
  if (o.dejstva?.length) v.push(o.dejstva.map((d) => `${d.k}: ${vBesedilo(d.v)}`).join('\n'), '')
  v.push(`${o.gumb.label}:`, o.gumb.url, '')
  if (o.potem) v.push(vBesedilo(o.potem), '')
  if (o.opomba) v.push(vBesedilo(o.opomba), '')
  if (o.pravno) v.push('---', ...o.pravno.map((p) => vBesedilo(p) + '\n'))
  v.push('--')
  if (o.noga.zakaj) v.push(o.noga.zakaj)
  v.push(...(o.noga.povezave ?? []).map((p) => `${p.label}: ${p.url}`), 'SLFF · slff.eu · info@slff.eu')
  return v.filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim() + '\n'
}
