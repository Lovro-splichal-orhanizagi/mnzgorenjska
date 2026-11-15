// Makete za prenose v živo (SLF-472). Samo oblikovanje: nič od tega ni v aplikaciji.
// Zagon iz korena repozitorija: node docs/design/slf-472/vir/zaslonke.mjs <začasna-mapa>
// Zgradi HTML z istim Tailwindom in src/index.css kot stran, ga poslika (390 in 1280 px)
// in PNG-je zapiše v docs/design/slf-472/.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, extname } from 'node:path'
import { chromium } from 'playwright'

const KOREN = process.cwd()
const GRADNJA = process.argv[2]
const IZHOD = join(KOREN, 'docs/design/slf-472')
mkdirSync(GRADNJA, { recursive: true })

// ---------- skupni deli ----------
const grb = (ime, px = 36) => `<img src="/grbi/${ime}.png" width="${px}" height="${px}" class="object-contain" alt="">`

const pasZaklepa = `<div class="border-b border-gnl-400/20 bg-gnl-900/60 py-1.5 text-center text-sm text-slate-200"><b>Člani · 14. krog</b> &nbsp;zaklep čez <b>2 h 10 min</b></div>`

const navbar = (d) => d
  ? `<header class="border-b border-white/10 bg-slate-950/80"><div class="mx-auto flex max-w-5xl items-center gap-6 py-3">
      <span class="flex items-center gap-2 font-extrabold"><img src="/logo/slff-grb.png" class="h-8 w-8">SLFF</span>
      <span class="flex items-center gap-2 rounded-xl border border-amber-300/40 px-3 py-1.5 text-sm font-semibold">🇸🇮 Gorenjska · 1. GNL — č… ▾</span>
      <nav class="flex gap-6 text-sm text-slate-300"><span>Moja ekipa</span><span>Igralci</span><span>Lestvica</span><span class="text-white">Rezultati</span><span>Mini lige</span><span>Napovedi</span><span>Več ▾</span></nav>
      <span class="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-gnl-700 text-sm font-bold">JK</span>
    </div></header>`
  : `<header class="border-b border-white/10 bg-slate-950/80"><div class="flex items-center gap-3 px-4 py-3">
      <img src="/logo/slff-grb.png" class="h-8 w-8">
      <span class="flex items-center gap-2 rounded-xl border border-amber-300/40 px-3 py-1.5 text-sm font-semibold">🇸🇮 Člani ▾</span>
      <span class="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-gnl-700 text-sm font-bold">JK</span>
      <span class="text-2xl leading-none">☰</span>
    </div></header>`

// Glava tekme, kot jo ima src/pages/Tekma.tsx.
const glava = ({ izid = '15:00', stanje = '', d }) => `
  <div class="flex flex-wrap items-center justify-between gap-2">
    <span class="inline-flex min-h-11 items-center text-sm text-slate-400">← Rezultati</span>
    <span class="text-sm text-slate-500">14. krog · 2026/27 · sobota, 21. november 2026</span>
  </div>
  <h1 class="flex items-start justify-center gap-3 text-center sm:gap-6">
    <span class="flex min-w-0 flex-1 flex-col items-center gap-1.5">${grb('bled-bohinj-hirter')}<span class="text-sm font-semibold leading-tight sm:text-base">Bled - Bohinj Hirter</span></span>
    <span class="flex flex-col items-center gap-1 pt-1"><span class="text-3xl font-black tabular-nums sm:text-4xl">${izid}</span>${stanje}</span>
    <span class="flex min-w-0 flex-1 flex-col items-center gap-1.5">${grb('niko-zelezniki')}<span class="text-sm font-semibold leading-tight sm:text-base">Niko Železniki</span></span>
  </h1>`

const zivo = (minuta) => `<span class="znacka bg-rose-500 text-white"><span class="h-1.5 w-1.5 rounded-full bg-white"></span>V živo${minuta ? ` · ${minuta}` : ''}</span>`

// Posnetek igrišča namesto pravega videa (YouTube predvajalnik v iframe).
const video = ({ naslov, kanal, gledalcev, live = true, trajanje = '', visina = '', mini = false }) => mini ? `
  <div class="relative aspect-video w-full overflow-hidden rounded-lg"><div class="absolute inset-0" style="background:linear-gradient(180deg,#8fb3c9 0%,#c9d8e0 22%,#3f7d3a 23%,#2f6b2c 60%,#3a7a34 100%)"></div><div class="absolute left-[8%] right-[8%] top-[40%] h-[45%] -skew-x-12 border border-white/60"></div><span class="absolute bottom-1 left-1 rounded bg-[#ff0033] px-1 text-[10px] font-bold text-white">LIVE</span></div>` : `
  <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-black ${visina}">
    <div class="absolute inset-0" style="background:linear-gradient(180deg,#8fb3c9 0%,#c9d8e0 22%,#3f7d3a 23%,#2f6b2c 60%,#3a7a34 100%)"></div>
    <div class="absolute left-[8%] right-[8%] top-[40%] h-[45%] -skew-x-12 border-2 border-white/60"></div>
    <div class="absolute left-1/2 top-[40%] h-[45%] border-l-2 border-white/60"></div>
    <div class="absolute left-[44%] top-[56%] h-3 w-3 rounded-full bg-white shadow"></div>
    ${[18, 30, 52, 63, 75].map((l, i) => `<div class="absolute h-5 w-2 rounded-sm ${i % 2 ? 'bg-sky-300' : 'bg-rose-500'}" style="left:${l}%;top:${48 + (i * 7) % 20}%"></div>`).join('')}
    <div class="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-2.5 text-[13px] text-white">
      <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gnl-700 text-[11px] font-bold">${kanal.slice(1, 3).toUpperCase()}</span>
      <span class="truncate font-semibold">${naslov}</span>
    </div>
    <div class="absolute inset-0 flex items-center justify-center"><span class="flex h-11 w-16 items-center justify-center rounded-2xl bg-[#ff0033]/90"><span class="ml-1 border-y-[9px] border-l-[15px] border-y-transparent border-l-white"></span></span></div>
    <div class="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-xs text-white">
      ${live ? `<span class="rounded bg-[#ff0033] px-1.5 py-0.5 font-bold">LIVE</span><span>${gledalcev} gleda</span>` : `<span class="rounded bg-black/70 px-1.5 py-0.5 font-semibold">${trajanje}</span>`}
      <span class="ml-auto font-bold tracking-tight">▶ YouTube</span>
    </div>
  </div>`

const avtor = ({ ime, kanal, prijavi = true }) => `
  <div class="flex items-center gap-3 text-sm">
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">${ime.split(' ').map((x) => x[0]).join('')}</span>
    <span class="min-w-0 flex-1 leading-tight"><span class="block font-semibold">Prenaša ${ime}</span><span class="block truncate text-slate-400">YouTube: ${kanal}</span></span>
    ${prijavi ? `<button class="inline-flex min-h-11 items-center gap-1 text-sm text-slate-400 underline decoration-white/20 underline-offset-4">⚑ Prijavi</button>` : ''}
  </div>`

const stran = (vsebina, { d = false, dodatek = '' } = {}) => `<!doctype html><html lang="sl"><head><meta charset="utf-8"><link rel="stylesheet" href="/app.css"></head>
<body class="min-h-screen">${pasZaklepa}${navbar(d)}
<main class="${d ? 'mx-auto max-w-5xl py-8' : 'px-4 py-5'}"><div class="space-y-6">${vsebina}</div></main>${dodatek}</body></html>`

// ---------- vsebina zaslonov ----------
const PREDNAPOVED = `<section class="kartica space-y-2 p-3"><span class="text-xs font-bold uppercase tracking-wide text-slate-400">Izbira skupnosti</span>
  <div class="flex h-7 overflow-hidden rounded-lg text-xs font-bold"><span class="flex w-[52%] items-center justify-center bg-gnl-500 text-slate-950">52 %</span><span class="flex w-[21%] items-center justify-center bg-slate-500">21 %</span><span class="flex w-[27%] items-center justify-center bg-sky-500 text-slate-950">27 %</span></div></section>`

const prenosPred = `<section class="kartica space-y-3 border-rose-400/30 p-4">
  <div class="flex items-center gap-2"><span class="text-lg">📺</span><h2 class="text-lg font-bold">Si na tekmi? Prenašaj jo v živo</h2></div>
  <p class="text-sm text-slate-300">Prenašaj s svojega YouTube kanala, mi prenos pokažemo vsem navijačem na tej strani. Po tekmi posnetek ostane pod tekmo.</p>
  <div class="flex flex-wrap items-center gap-3">
    <button class="gumb bg-rose-500 text-white">● Prenašaj v živo</button>
    <button class="gumb-tih text-sm">Kako deluje?</button>
  </div>
  <p class="text-xs text-slate-500">Povezavo lahko dodaš od 14.30 do 18.00 (30 min pred začetkom do 3 h po njem).</p>
</section>`

const nihceSe = `<section class="space-y-2"><h2 class="text-lg font-bold">Prenosi v živo</h2>
  <p class="kartica p-4 text-sm text-slate-400">Tekme še nihče ne prenaša. Začetek ob 15.00.</p></section>`

const listic = (naslov, telo, { d } = {}) => `<div class="fixed inset-0 z-40 bg-black/60"></div>
  <div aria-modal="true" class="fixed z-50 ${d ? 'left-1/2 top-1/2 w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl' : 'inset-x-0 bottom-0 rounded-t-2xl'} border border-white/10 bg-slate-900 p-5 shadow-2xl">
    ${d ? '' : '<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20"></div>'}
    <div class="mb-3 flex items-start justify-between gap-3"><h2 class="text-lg font-bold">${naslov}</h2><span class="text-xl text-slate-400">✕</span></div>
    ${telo}</div>`

const kakoDeluje = `<ol class="space-y-3 text-sm text-slate-200">
  ${[
    ['Začni prenos na YouTubu', 'V aplikaciji YouTube tapni + → <b>V živo</b> (ali uporabi OBS). Prenos naj bo <b>javen</b> ali <b>nenaveden</b>.'],
    ['Kopiraj povezavo', 'V YouTubu tapni <b>Deli</b> → <b>Kopiraj povezavo</b>.'],
    ['Prilepi jo sem', 'Preverimo, da je prenos v živo in da se je začel ob tekmi. Takoj ga vidijo vsi na tej strani.'],
  ].map(([n, t], i) => `<li class="flex gap-3"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gnl-400 font-bold text-slate-950">${i + 1}</span><span><b class="block text-white">${n}</b><span class="text-slate-400">${t}</span></span></li>`).join('')}
  </ol>
  <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
    Snemaj samo tekmo. Ne snemaj gledalcev od blizu. Prenosi mladinskih tekem (U-19 in mlajši) niso mogoči.
    Vsak prenos lahko kdorkoli prijavi; po 2 prijavah ga skrijemo, dokler ga ne pregleda skrbnik.
  </div>
  <button class="gumb mt-4 w-full bg-rose-500 py-3 text-white">● Prilepi povezavo prenosa</button>`

const obrazec = ({ url = '', stanje = '' }) => `<label class="block text-sm font-semibold">Povezava YouTube prenosa</label>
  <div class="mt-1.5 flex gap-2"><input value="${url}" placeholder="https://youtube.com/live/…" class="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500">
  <button class="gumb-glavni shrink-0">Dodaj</button></div>
  ${stanje}
  <p class="mt-3 text-xs text-slate-500">Prenos mora biti v živo na tvojem kanalu in se je moral začeti med 14.30 in 18.00.</p>`

const sporocilo = (barva, ikona, naslov, telo) => {
  const b = { zelena: 'border-gnl-400/30 bg-gnl-400/10 text-gnl-200', rdeca: 'border-rose-400/30 bg-rose-400/10 text-rose-200', rumena: 'border-amber-300/30 bg-amber-300/10 text-amber-200' }[barva]
  return `<div role="status" class="mt-3 rounded-xl border ${b} p-3 text-sm"><b class="flex items-center gap-2">${ikona} ${naslov}</b><p class="mt-1 text-slate-300">${telo}</p></div>`
}

const STANJA = {
  '04-povezava-uspeh': ['https://youtube.com/live/q8Tz1Bled21', sporocilo('zelena', '✓', 'Prenos je dodan', 'Tvoj prenos <b>»Bled vs Železniki v živo«</b> zdaj vidijo vsi na strani tekme. Ko ga na YouTubu končaš, posnetek ostane pod tekmo.') + `<div class="mt-3">${video({ naslov: 'Bled vs Železniki v živo', kanal: '@jurek_sport', gledalcev: 3 })}</div>`],
  '05-zavrnjeno-star-video': ['https://youtu.be/Zr0kq2Bled09', sporocilo('rdeca', '✕', 'To ni prenos v živo', 'Ta povezava vodi na posnetek z dne 3. 10. 2026. Dodaš lahko samo prenos, ki teče zdaj.')],
  '06-zavrnjeno-izven-casa': ['https://youtube.com/live/m4Xa7Kranj11', sporocilo('rdeca', '🕑', 'Prenos se ni začel ob tej tekmi', 'Prenos se je začel ob 11.02, tekma pa ob 15.00. Sprejmemo prenose, ki se začnejo med 14.30 in 18.00. Morda si izbral napačno tekmo?')],
  '07-zavrnjeno-mladinska': ['', sporocilo('rumena', 'ⓘ', 'Prenosi mladinskih tekem niso mogoči', 'To je tekma U-17. Zaradi zasebnosti mladoletnih igralcev mladinskih tekem (U-19 in mlajši) zaenkrat ne prenašamo.')],
  '08-zavrnjeno-prepoved': ['https://youtube.com/live/b7Pp0Bled21', sporocilo('rdeca', '⛔', 'Prenašanje ti ni dovoljeno', 'Skrbnik ti je onemogočil prenose do <b>31. 12. 2026</b>. Razlog: prenos ni bil tekma. Če misliš, da je to napaka, nam piši na podporo.')],
}

const izbira = (prenosi, izbran) => `<div class="flex gap-2 overflow-x-auto pb-1">${prenosi.map((p, i) => `
  <button class="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${i === izbran ? 'border-gnl-400 bg-gnl-400/15' : 'border-white/15 bg-white/5'}">
    <span class="h-2 w-2 rounded-full bg-rose-500"></span><span class="leading-tight"><b class="block">${p.ime}</b><span class="text-xs text-slate-400">${p.gledalcev} gleda</span></span></button>`).join('')}</div>`

const PRENOSI = [
  { ime: 'Jure K.', kanal: '@jurek_sport', gledalcev: 124, naslov: 'Bled vs Železniki v živo' },
  { ime: 'NK Bled', kanal: '@nkbled', gledalcev: 310, naslov: 'NK Bled – NK Niko Železniki | 14. krog' },
  { ime: 'Miha P.', kanal: '@mihap', gledalcev: 41, naslov: 'tekma v živo' },
]

const zivoStanje = zivo("37'")

const prenosiV = (n, d) => {
  const p = PRENOSI[n === 1 ? 0 : 1]
  const glavni = `${video(p)}${avtor(p)}`
  if (n === 1) return `<section class="space-y-3"><div class="flex items-center gap-2"><h2 class="text-lg font-bold">Prenos v živo</h2>${zivo()}</div>${glavni}
    <p class="text-xs text-slate-500">Prenos je od navijača, ne od SLFF ali klubov. <span class="underline">Prenašaj tudi ti</span></p></section>`
  if (!d) return `<section class="space-y-3"><div class="flex items-center gap-2"><h2 class="text-lg font-bold">Prenosi v živo</h2>${zivo()}<span class="text-sm text-slate-400">3</span></div>
    ${izbira(PRENOSI, 1)}${glavni}<p class="text-xs text-slate-500">Prenosi so od navijačev, ne od SLFF ali klubov. <span class="underline">Prenašaj tudi ti</span></p></section>`
  return `<section class="space-y-3"><div class="flex items-center gap-2"><h2 class="text-lg font-bold">Prenosi v živo</h2>${zivo()}<span class="text-sm text-slate-400">3</span></div>
    <div class="grid grid-cols-[1fr_260px] gap-4"><div class="space-y-3">${glavni}</div>
    <div class="space-y-2">${PRENOSI.map((x, i) => `<button class="kartica flex w-full gap-3 p-2 text-left ${i === 1 ? 'border-gnl-400 bg-gnl-400/10' : ''}"><div class="w-24 shrink-0">${video({ ...x, mini: true })}</div><span class="min-w-0 text-sm leading-tight"><b class="block">${x.ime}</b><span class="block truncate text-xs text-slate-400">${x.kanal}</span><span class="text-xs text-rose-300">● ${x.gledalcev} gleda</span></span></button>`).join('')}
    <p class="text-xs text-slate-500">Prenosi so od navijačev, ne od SLFF ali klubov.</p><button class="gumb-tih w-full text-sm">● Prenašaj tudi ti</button></div></div></section>`
}

const goli = `<section class="space-y-3"><h2 class="text-lg font-bold">Goli in asistence</h2><ul class="kartica divide-y divide-white/10 overflow-hidden">
  <li class="flex items-center gap-3 p-3 text-sm"><span class="w-8 font-bold text-slate-400">23'</span>${grb('bled-bohinj-hirter', 20)}<span class="flex-1"><b>Grašič</b> <span class="text-slate-400">· asistenca: Varl</span></span><span class="font-bold tabular-nums">1:0</span></li></ul></section>`

const posnetki = (d) => `<section class="space-y-3"><div class="flex items-baseline justify-between"><h2 class="text-lg font-bold">Posnetki</h2><span class="text-sm text-slate-400">2 posnetka navijačev</span></div>
  <div class="grid gap-4 ${d ? 'grid-cols-2' : ''}">${[
    { ...PRENOSI[1], live: false, trajanje: '1:52:14' },
    { ...PRENOSI[0], live: false, trajanje: '1:41:03' },
  ].map((p) => `<article class="kartica space-y-2 p-3">${video(p)}<p class="text-sm font-semibold">${p.naslov}</p>${avtor(p)}</article>`).join('')}</div>
  <p class="text-xs text-slate-500">Posnetki ostanejo, dokler jih lastnik na YouTubu ne izbriše ali skrije.</p></section>`

const prijava = `<p class="text-sm text-slate-400">Prenos: <b class="text-slate-200">NK Bled – NK Niko Železniki | 14. krog</b> (@nkbled)</p>
  <fieldset class="mt-3 space-y-2 text-sm">${['To ni ta tekma', 'Neprimerna ali žaljiva vsebina', 'Snema gledalce ali otroke od blizu', 'Oglas ali spam', 'Drugo'].map((r, i) => `
    <label class="flex min-h-11 items-center gap-3 rounded-xl border ${i === 0 ? 'border-gnl-400 bg-gnl-400/10' : 'border-white/10 bg-white/5'} px-3"><span class="flex h-4 w-4 items-center justify-center rounded-full border-2 ${i === 0 ? 'border-gnl-400' : 'border-slate-500'}">${i === 0 ? '<span class="h-2 w-2 rounded-full bg-gnl-400"></span>' : ''}</span>${r}</label>`).join('')}
  </fieldset>
  <textarea placeholder="Dodaj opombo (neobvezno)" class="mt-3 h-20 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm placeholder:text-slate-500"></textarea>
  <p class="mt-2 text-xs text-slate-500">Prijave pregleda skrbnik. Ko prenos prijavita 2 različna uporabnika, ga takoj skrijemo.</p>
  <div class="mt-4 flex gap-3"><button class="gumb-tih flex-1">Prekliči</button><button class="gumb flex-1 bg-rose-500 text-white">Pošlji prijavo</button></div>`

// Administracija: vrsta prenosov (isti zavihki kot obstoječa stran).
const admin = (d) => {
  const vrste = [
    { stanje: '<span class="znacka bg-amber-300/20 text-amber-200">Skrit · 2 prijavi</span>', tekma: 'Jesenice – Sava Kranj', kdo: 'Rok M.', kanal: '@rok_tv', razlog: '2× »To ni ta tekma«', akcije: ['Pokaži', 'Skrij za vedno', 'Prepovej prenašanje'] },
    { stanje: zivo(), tekma: 'Bled – Niko Železniki', kdo: 'Jure K.', kanal: '@jurek_sport', razlog: '1× »Snema gledalce …«', akcije: ['Skrij', 'Prepovej prenašanje'] },
    { stanje: zivo(), tekma: 'Bled – Niko Železniki', kdo: 'NK Bled', kanal: '@nkbled', razlog: '—', akcije: ['Skrij', 'Prepovej prenašanje'] },
    { stanje: '<span class="znacka bg-white/10 text-slate-300">Posnetek</span>', tekma: 'Triglav – Kranjska Gora', kdo: 'Ana Z.', kanal: '@anaz', razlog: '—', akcije: ['Skrij', 'Prepovej prenašanje'] },
  ]
  const gumb = (a) => `<button class="${a.startsWith('Prepovej') ? 'gumb border border-rose-400/40 bg-rose-500/10 text-rose-200' : 'gumb-tih'} px-3 py-1.5 text-xs">${a}</button>`
  const zavihki = `<div class="flex gap-2 overflow-x-auto text-sm">${['Prijave klepeta', 'Prenosi <span class="ml-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">1</span>', 'Prepovedi', 'Popravki', 'Prevzemi'].map((z, i) => `<span class="shrink-0 rounded-xl px-3 py-2 ${i === 1 ? 'bg-gnl-400 font-semibold text-slate-950' : 'border border-white/15 bg-white/5 text-slate-300'}">${z}</span>`).join('')}</div>`
  const filtri = `<div class="flex flex-wrap gap-2 text-xs">${['Za pregled (1)', 'V živo (2)', 'Vsi danes (4)'].map((f, i) => `<span class="rounded-lg px-2.5 py-1 ${i === 0 ? 'bg-white/15 text-white' : 'text-slate-400'}">${f}</span>`).join('')}</div>`
  const vsebina = d
    ? `<table class="kartica w-full overflow-hidden text-left text-sm"><thead class="text-xs uppercase tracking-wide text-slate-400"><tr class="border-b border-white/10">${['Stanje', 'Tekma', 'Uporabnik / kanal', 'Prijave', ''].map((h) => `<th class="p-3">${h}</th>`).join('')}</tr></thead><tbody class="divide-y divide-white/10">
      ${vrste.map((v) => `<tr class="${v.stanje.includes('Skrit') ? 'bg-amber-300/5' : ''}"><td class="p-3">${v.stanje}</td><td class="p-3">${v.tekma}<span class="block text-xs text-slate-500">danes 15.00 · začetek prenosa 14.52</span></td><td class="p-3"><b>${v.kdo}</b><span class="block text-xs text-slate-400">${v.kanal} · ▶ odpri na YouTubu</span></td><td class="p-3 text-slate-300">${v.razlog}</td><td class="p-3"><div class="flex flex-wrap justify-end gap-1.5">${v.akcije.map(gumb).join('')}</div></td></tr>`).join('')}</tbody></table>`
    : vrste.map((v) => `<article class="kartica space-y-2 p-3 ${v.stanje.includes('Skrit') ? 'border-amber-300/30' : ''}"><div class="flex items-center justify-between gap-2">${v.stanje}<span class="text-xs text-slate-500">danes 14.52</span></div>
      <p class="text-sm"><b>${v.tekma}</b><span class="block text-slate-400">${v.kdo} · ${v.kanal}</span><span class="block text-xs text-slate-500">Prijave: ${v.razlog}</span></p><div class="flex flex-wrap gap-1.5">${v.akcije.map(gumb).join('')}</div></article>`).join('')
  return `<h1 class="text-2xl font-extrabold">Administracija</h1>${zavihki}${filtri}<div class="space-y-3">${vsebina}</div>`
}

const prepoved = `<p class="text-sm text-slate-300"><b>Rok M.</b> · YouTube kanal <b>@rok_tv</b></p>
  <p class="mt-1 text-xs text-slate-500">Uporabnik ne bo mogel dodati prenosa na nobeni tekmi. Njegovi dosedanji prenosi in posnetki se skrijejo.</p>
  <fieldset class="mt-3 space-y-2 text-sm">
    <label class="flex min-h-11 items-center gap-3 rounded-xl border border-gnl-400 bg-gnl-400/10 px-3"><span class="flex h-4 w-4 items-center justify-center rounded-full border-2 border-gnl-400"><span class="h-2 w-2 rounded-full bg-gnl-400"></span></span>Do datuma <input value="31. 12. 2026" class="ml-auto w-32 rounded-lg border border-white/15 bg-slate-950 px-2 py-1 text-sm"></label>
    <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><span class="h-4 w-4 rounded-full border-2 border-slate-500"></span>Za vedno</label>
  </fieldset>
  <label class="mt-3 block text-sm font-semibold">Razlog (uporabnik ga vidi)</label>
  <input value="Prenos ni bil tekma." class="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm">
  <label class="mt-3 flex items-center gap-2 text-sm text-slate-300"><span class="flex h-4 w-4 items-center justify-center rounded bg-gnl-400 text-[10px] text-slate-950">✓</span>Prepovej tudi YouTube kanal @rok_tv (nov račun z istim kanalom ne bo mogel prenašati)</label>
  <div class="mt-4 flex gap-3"><button class="gumb-tih flex-1">Prekliči</button><button class="gumb flex-1 bg-rose-500 text-white">Prepovej prenašanje</button></div>`

const domovPas = (d) => `<section class="space-y-3"><div class="flex items-center gap-2"><h2 class="text-lg font-bold">V živo zdaj</h2>${zivo()}<span class="ml-auto text-sm text-gnl-300">Vse tekme →</span></div>
  <div class="flex gap-3 overflow-x-auto pb-1">${[
    ['bled-bohinj-hirter', 'niko-zelezniki', 'Bled', 'Železniki', '1:0', "37'", 3, '1. GNL'],
    ['jesenice', 'sava-kranj', 'Jesenice', 'Sava Kranj', '0:0', "12'", 1, '1. GNL'],
    ['sobec-lesce', 'kranjska-gora', 'Šobec Lesce', 'Kranjska Gora', '2:2', "71'", 2, '2. GNL'],
  ].map(([a, b, ia, ib, iz, m, n, l]) => `<article class="kartica kartica-hover w-[250px] shrink-0 space-y-2 overflow-hidden p-0">
    <div class="relative">${video({ naslov: `${ia} – ${ib} v živo`, kanal: '@navijac', gledalcev: 80 + n * 37 })}</div>
    <div class="space-y-1 px-3 pb-3"><div class="flex items-center gap-2 text-sm">${grb(a, 18)}<b class="truncate">${ia}</b><span class="ml-auto font-black tabular-nums">${iz}</span></div>
    <div class="flex items-center gap-2 text-sm">${grb(b, 18)}<b class="truncate">${ib}</b><span class="ml-auto text-xs font-bold text-rose-300">${m}</span></div>
    <p class="text-xs text-slate-400">${l} · ${n} ${n === 1 ? 'prenos' : n === 2 ? 'prenosa' : 'prenosi'}</p></div></article>`).join('')}</div></section>`

const domovGlava = (d) => `<section class="kartica space-y-2 p-5"><p class="text-xs font-bold uppercase tracking-wide text-gnl-300">Člani · 14. krog</p><h1 class="text-2xl font-extrabold">Živjo, Jure</h1>
  <p class="text-sm text-slate-400">Tvoja ekipa ima ta krog <b class="text-white">31 točk</b> (v živo).</p></section>`
const domovRep = `<section class="kartica p-4 text-sm text-slate-400"><h2 class="mb-2 text-lg font-bold text-white">Lestvica</h2>1. Grajski vitezi · 412 &nbsp; 2. Pivski FC · 398 &nbsp; 3. Jure K. · 377</section>`

// ---------- seznam zaslonov ----------
const Z = []
const dodaj = (ime, d, html, visina) => Z.push({ ime, d, html, visina })
for (const d of [false, true]) {
  const s = d ? 'namizje' : 'telefon'
  dodaj(`01-pred-tekmo-${s}`, d, stran(glava({ izid: '15:00', stanje: '<span class="text-xs text-slate-400">začetek</span>', d }) + prenosPred + PREDNAPOVED + nihceSe, { d }))
  dodaj(`09-v-zivo-1-prenos-${s}`, d, stran(glava({ izid: '1:0', stanje: zivoStanje, d }) + prenosiV(1, d) + goli, { d }))
  dodaj(`10-v-zivo-3-prenosi-${s}`, d, stran(glava({ izid: '1:0', stanje: zivoStanje, d }) + prenosiV(3, d) + goli, { d }))
  dodaj(`12-po-tekmi-posnetki-${s}`, d, stran(glava({ izid: '2:1', stanje: '<span class="text-xs text-slate-400">konec</span>', d }) + goli + posnetki(d), { d }))
  dodaj(`13-admin-prenosi-${s}`, d, stran(admin(d), { d }))
  dodaj(`15-domov-v-zivo-zdaj-${s}`, d, stran(domovGlava(d) + domovPas(d) + domovRep, { d }))
}
dodaj('02-kako-deluje-telefon', false, stran(glava({ izid: '15:00', stanje: '<span class="text-xs text-slate-400">začetek</span>' }) + prenosPred, { dodatek: listic('Kako prenašaš tekmo', kakoDeluje) }), 900)
dodaj('03-obrazec-povezave-telefon', false, stran(glava({ izid: '0:0', stanje: zivo("4'") }) + prenosPred, { dodatek: listic('Prilepi povezavo prenosa', obrazec({})) }), 900)
for (const [ime, [url, st]] of Object.entries(STANJA))
  dodaj(`${ime}-telefon`, false, stran(glava({ izid: '0:0', stanje: zivo("4'") }) + prenosPred, { dodatek: listic('Prilepi povezavo prenosa', obrazec({ url, stanje: st })) }), 900)
dodaj('04-povezava-uspeh-namizje', true, stran(glava({ izid: '0:0', stanje: zivo("4'"), d: true }) + prenosPred, { d: true, dodatek: listic('Prilepi povezavo prenosa', obrazec({ url: STANJA['04-povezava-uspeh'][0], stanje: STANJA['04-povezava-uspeh'][1] }), { d: true }) }), 900)
dodaj('11-prijavi-telefon', false, stran(glava({ izid: '1:0', stanje: zivoStanje }) + prenosiV(3, false), { dodatek: listic('Prijavi prenos', prijava) }), 900)
dodaj('14-admin-prepoved-namizje', true, stran(admin(true), { d: true, dodatek: listic('Prepovej prenašanje', prepoved, { d: true }) }), 800)
dodaj('14-admin-prepoved-telefon', false, stran(admin(false), { dodatek: listic('Prepovej prenašanje', prepoved) }), 900)

for (const z of Z) writeFileSync(join(GRADNJA, `${z.ime}.html`), z.html)

// CSS: isti tailwind.config.js in src/index.css kot aplikacija.
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.js', '-i', 'src/index.css', '--content', join(GRADNJA, '*.html'), '-o', join(GRADNJA, 'app.css')], { stdio: 'inherit' })

const TIPI = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' }
const streznik = createServer((req, res) => {
  const pot = decodeURIComponent(req.url.split('?')[0])
  const f = [join(GRADNJA, pot), join(KOREN, 'public', pot)].find((x) => existsSync(x))
  if (!f) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TIPI[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f))
}).listen(0)
const vrata = streznik.address().port

const brskalnik = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/local/bin/chromium' })
for (const z of Z) {
  const p = await brskalnik.newPage({ viewport: { width: z.d ? 1280 : 390, height: z.visina ?? (z.d ? 800 : 844) }, deviceScaleFactor: 2 })
  await p.goto(`http://127.0.0.1:${vrata}/${z.ime}.html`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: join(IZHOD, `${z.ime}.png`), fullPage: !z.visina })
  await p.close()
  console.log(z.ime)
}
await brskalnik.close()
streznik.close()
