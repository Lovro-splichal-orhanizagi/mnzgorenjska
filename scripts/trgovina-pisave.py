"""Dodatni pisavi motivov trgovine za pisave, ki jih Anton nima.

Anton (shop/src/motivi/anton.ttf) ima le latinico. Za cirilico (mk, uk), grščino
(el), azerbajdžanski ə in znak minus vzamemo Fira Sans Extra Condensed
ExtraBold, za armenščino Noto Sans Armenian ExtraBold (obe OFL, izvirnika v
scripts/hetzner/predogledi/pisave/). Obe podmnožimo na potrebne znake in
navpično raztegnemo, da so velike črke visoke kot pri Antonu (sicer bi bil
cirilski napis ob enaki velikosti pisave za četrtino nižji od latinskega).

Uporaba (potrebuje fonttools):  python3 scripts/trgovina-pisave.py
Izhod: shop/src/motivi/dodatek.ttf, dodatek-hy.ttf in sirine-dodatka.ts
(širine znakov v enotah 2048 na em, za risba.ts).
"""
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

R = Path(__file__).resolve().parent.parent
VIR = R / 'scripts/hetzner/predogledi/pisave'
IZHOD = R / 'shop/src/motivi'

ANTON = TTFont(IZHOD / 'anton.ttf')
VISINA_ANTON = ANTON['OS/2'].sCapHeight / ANTON['head'].unitsPerEm

PISAVE = [
    # (vir, izhod, ime družine, znaki)
    ('FiraSansExtraCondensed-ExtraBold.ttf', 'dodatek.ttf', 'SLFF Motivi Dodatek',
     [*range(0x0370, 0x0400), *range(0x0400, 0x0460), *range(0x0490, 0x04A0), 0x018F, 0x0259, 0x2212, 0x0301]),
    ('NotoSansArmenian-ExtraBold.ttf', 'dodatek-hy.ttf', 'SLFF Motivi Armenscina',
     [*range(0x0531, 0x0557), *range(0x0559, 0x058B), 0x058A, 0x058F]),
]


def pripravi(vir: str, izhod: str, druzina: str, znaki: list[int]) -> dict[int, int]:
    f = TTFont(VIR / vir)
    o = Options()
    o.layout_features = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk']
    o.name_IDs = []
    o.hinting = False
    o.desubroutinize = True
    s = Subsetter(o)
    s.populate(unicodes=znaki)
    s.subset(f)

    upm = f['head'].unitsPerEm
    visina = f['OS/2'].sCapHeight / upm
    sy = VISINA_ANTON / visina
    sx = sy * 0.74  # ožje kot sorazmerno: Anton je zelo ozek

    glyf = f['glyf']
    gs = f.getGlyphSet()
    # Najprej vse obrise (sestavljeni znaki, npr. cirilski E iz latinskega, se razstavijo),
    # šele nato zapis: sicer bi se del, ki je že raztegnjen, raztegnil še enkrat.
    obrisi = {}
    for ime in f.getGlyphOrder():
        if glyf[ime].numberOfContours != 0:
            pero = DecomposingRecordingPen(gs)
            gs[ime].draw(pero)
            obrisi[ime] = pero
    for ime in f.getGlyphOrder():
        if ime in obrisi:
            tt = TTGlyphPen(None)
            obrisi[ime].replay(TransformPen(tt, (sx, 0, 0, sy, 0, 0)))
            glyf[ime] = tt.glyph()
        sir, lsb = f['hmtx'][ime]
        f['hmtx'][ime] = (round(sir * sx), round(lsb * sx))
    for ime in f.getGlyphOrder():
        glyf[ime].recalcBounds(glyf)
    # Kerning in sidrišča ostanejo v izvirnih enotah: za velike črke napisov zanemarljivo.
    os2 = f['OS/2']
    os2.sCapHeight = round(os2.sCapHeight * sy)
    os2.sxHeight = round(os2.sxHeight * sy)
    for t, k in (('hhea', 'ascent'), ('hhea', 'descent')):
        setattr(f[t], k, round(getattr(f[t], k) * sy))
    os2.sTypoAscender = round(os2.sTypoAscender * sy)
    os2.sTypoDescender = round(os2.sTypoDescender * sy)
    os2.usWinAscent = round(os2.usWinAscent * sy)
    os2.usWinDescent = round(os2.usWinDescent * sy)

    ime_tabela = f['name']
    for zapis in list(ime_tabela.names):
        ime_tabela.removeNames(zapis.nameID)
    for nid, txt in ((1, druzina), (2, 'Regular'), (3, druzina), (4, druzina), (6, druzina.replace(' ', '')),
                     (0, 'OFL 1.1, see OFL.txt; subset and scaled for SLFF'), (13, 'SIL Open Font License 1.1')):
        ime_tabela.setName(txt, nid, 3, 1, 0x409)
        ime_tabela.setName(txt, nid, 1, 0, 0)
    f.save(IZHOD / izhod)

    cmap = f.getBestCmap()
    return {k: round(f['hmtx'][g][0] * 2048 / upm) for k, g in cmap.items()}


sirine: dict[int, int] = {}
for vir, izhod, druzina, znaki in PISAVE:
    sirine.update(pripravi(vir, izhod, druzina, znaki))

# Kompaktno: "<znak><širina>" po vrsti, ločeno z vejico.
vrstica = ','.join(f'{chr(k)}{v}' for k, v in sorted(sirine.items()) if chr(k).isprintable() and k != 0x0301)
(IZHOD / 'sirine-dodatka.ts').write_text(
    '// Širine znakov dodatnih pisav (dodatek.ttf, dodatek-hy.ttf) v enotah 2048 na em.\n'
    '// Ustvari scripts/trgovina-pisave.py; ne popravljaj ročno.\n'
    f"export const SIRINE_DODATKA = '{vrstica}'\n"
)
print('ok', len(sirine), 'znakov; Anton visina', VISINA_ANTON)
