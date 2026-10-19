// Skupna oblika maila SLFF (opomniki, prevzem, trgovina): temna glava z logom,
// zelena črta, bela vsebina, temna noga. Tabele in slogi v vrstici, ker Gmail,
// Outlook in Apple Mail drugega ne berejo zanesljivo; `bgcolor` poleg CSS, da
// temni način Gmaila glave in noge ne pobeli. Statična kopija iste oblike je v
// supabase/templates/*.html (avtentikacijska pošta, Go predloge).
//
// Brez nizov v jeziku: smoke preverja, da v tujih mailih ni slovenščine.

export const PISAVA = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const LOGO = 'https://slff.eu/logo/slff-ikona-180.png'

/** Slog zelenega gumba (kot v vmesniku). */
export const GUMB =
  'display: inline-block; background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 12px 20px; border-radius: 10px;'

/** Gumb na sredini; `href` in `besedilo` morata biti že ubežana. */
export const gumb = (href: string, besedilo: string) =>
  `<p style="text-align: center; margin: 24px 0;"><a href="${href}" style="${GUMB} font-family: ${PISAVA};">${besedilo}</a></p>`

export interface Ovoj {
  /** HTML vsebine (bela kartica). */
  vsebina: string
  /** HTML za nogo, doda se za "slff.eu · info@slff.eu" (odjava, prodajalec). */
  noga?: string
  /** Značka ob imenu, npr. "SHOP". */
  znacka?: string
  /** Skrito besedilo za predogled v nabiralniku (navaden tekst, ubežan). */
  predogled?: string
}

export function ovoj({ vsebina, noga = '', znacka, predogled }: Ovoj): string {
  const znackaHtml = znacka
    ? `<td style="padding-left: 8px; vertical-align: middle;"><span style="display: inline-block; background: #0f2a1c; color: #86efac; border: 1px solid #166534; border-radius: 6px; padding: 2px 7px; font-family: ${PISAVA}; font-size: 11px; font-weight: 800; letter-spacing: 1px;">${znacka}</span></td>`
    : ''
  const predogledHtml = predogled
    ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">${predogled}${'&#847; &zwnj; '.repeat(30)}</div>`
    : ''
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>SLFF</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9;">${predogledHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background: #f1f5f9;">
<tr><td align="center" style="padding: 24px 8px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px;">
<tr><td bgcolor="#020617" style="background: #020617; padding: 16px 24px; border-radius: 12px 12px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align: middle;"><a href="https://slff.eu" style="text-decoration: none;"><img src="${LOGO}" width="36" height="36" alt="SLFF" style="display: block; border: 0; width: 36px; height: 36px;"></a></td>
<td style="padding-left: 10px; vertical-align: middle; font-family: ${PISAVA}; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">SLFF</td>${znackaHtml}
</tr></table>
</td></tr>
<tr><td bgcolor="#22c55e" height="3" style="background: #22c55e; height: 3px; line-height: 3px; font-size: 0;">&nbsp;</td></tr>
<tr><td bgcolor="#ffffff" style="background: #ffffff; padding: 28px 24px; font-family: ${PISAVA}; font-size: 15px; line-height: 1.5; color: #0f172a;">
${vsebina}
</td></tr>
<tr><td bgcolor="#020617" style="background: #020617; padding: 18px 24px; border-radius: 0 0 12px 12px; font-family: ${PISAVA}; font-size: 12px; line-height: 1.6; color: #94a3b8;">
Sunday League Fantasy Football · <a href="https://slff.eu" style="color: #94a3b8;">slff.eu</a> · <a href="mailto:info@slff.eu" style="color: #94a3b8;">info@slff.eu</a>${noga}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`
}
