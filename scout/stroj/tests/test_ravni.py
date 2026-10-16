import json
import subprocess
from pathlib import Path

from stroj.ravni import raven_lige

KOREN = Path(__file__).resolve().parents[3]

LIGE = [
    ["hr-hnl", None, None],
    ["hr-3nl-zapad", None, None],
    ["hr-zup-istra-1", "1. ŽNL Istarska", "hr-istra"],
    ["hr-zup-x", "Nešto", None],
    ["sk-nike-liga", None, None],
    ["sk-sfz-3liga-zapad", None, None],
    ["sk-zsfz-5liga-nitra", None, None],
    ["sk-xyz", None, None],
    ["hu-nb2", None, None],
    ["hu-pest-1", None, None],
    ["hu-pest-2-del", None, None],
    ["at-regionalliga-ost", None, None],
    ["at-wiener-liga", None, None],
    ["es-ct-primera-g1", None, None],
    ["es-as-tercera-g2", None, None],
    ["es-ct-x", None, None],
    ["gr-arg-a1", None, None],
    ["gr-arg-a2-1", None, None],
    ["gr-ath-g-3", None, None],
    ["gr-ach-2026-1002", None, None],
    ["gb-lowland-east", None, None],
    ["ee-esiliiga-b", None, None],
    ["ee-iii-liiga-louna", None, None],
    ["lv-virsliga", None, None],
    ["lv-2-liga", None, None],
    ["clani", None, None],
    ["lj-1-liga", None, None],
]

JS = (
    "import('./scripts/visja-liga.mjs').then((m) => console.log(JSON.stringify("
    "JSON.parse(process.argv[1]).map(([slug, name, zveza]) => {"
    " const r = m.ravenLige({ slug, name, zveza }); return r && [r.raven, r.obmocje] }))))"
)


def test_enako_kot_js():
    izhod = subprocess.run(["node", "-e", JS, json.dumps(LIGE)], cwd=KOREN, capture_output=True, text=True, check=True)
    pricakovano = json.loads(izhod.stdout)
    dobljeno = [list(r) if r else None for r in (raven_lige(*l) for l in LIGE)]
    assert dobljeno == pricakovano


def test_slovenija_nima_ravni():
    assert raven_lige("clani") is None
