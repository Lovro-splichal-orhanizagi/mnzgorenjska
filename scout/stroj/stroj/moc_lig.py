"""Moč lig iz igralcev, ki so igrali v več ligah (spec 3.1)."""
import logging
from collections import Counter

import numpy as np

from stroj import Tabela
from stroj.elo import elo_rel
from stroj.ravni import raven_lige

MIN_MINUT = 450
MIN_VRSTIC_LIGE = 20
# ponytail: privzet korak moči na raven piramide (log faktor), ko ni treh lig
# z modelom in znano ravnijo; zamenja ga naklon iz podatkov, takoj ko so.
PRIVZETI_KORAK = 0.25
# ponytail: izmenično odštevanje povprečij konvergira počasi pri slabo
# povezanih ligah; če 500 korakov ne zadošča, ga zamenja redek LSQR.
KORAKOV = 500
TOLERANCA = 1e-9

log = logging.getLogger(__name__)


def _prestopniki(oseba: np.ndarray, liga: np.ndarray) -> np.ndarray:
    lige_osebe: dict = {}
    for o, l in zip(oseba.tolist(), liga.tolist()):
        lige_osebe.setdefault(o, set()).add(l)
    return np.array([len(lige_osebe[o]) > 1 for o in oseba.tolist()], dtype=bool)


def _povprecje(inv: np.ndarray, v: np.ndarray, n: int) -> np.ndarray:
    return np.bincount(inv, v, n) / np.maximum(np.bincount(inv, minlength=n), 1)


def _komponente(io: np.ndarray, il: np.ndarray, n: int) -> np.ndarray:
    """Povezane komponente lig: oseba poveže vse lige, v katerih je igrala."""
    stars = list(range(n))

    def koren(x: int) -> int:
        while stars[x] != x:
            stars[x] = stars[stars[x]]
            x = stars[x]
        return x

    prva: dict[int, int] = {}
    for o, l in zip(io.tolist(), il.tolist()):
        stars[koren(l)] = koren(prva.setdefault(o, l))
    return np.array([koren(l) for l in range(n)])


def oceni_moc(oseba: np.ndarray, liga: np.ndarray, elo_rel: np.ndarray, y: np.ndarray,
              drzava: dict[int, int] | None = None) -> tuple[dict[int, float], float, dict[int, int]]:
    """Dvosmerni fiksni učinki: y = oseba + liga + c · Elo ekipe.

    Moč je lestvica znotraj države (`drzava`: liga → država; brez nje ena
    država): razlike so določene le znotraj povezane komponente lig, zato
    država obdrži komponento z največ vrsticami, mediana njenih lig je 0,
    ostale njene lige gredo na dopolnitev (piramida → država → brez)."""
    m = _prestopniki(oseba, liga)
    stevci = dict(Counter(liga[m].tolist()))
    m &= np.isin(liga, [l for l, n in stevci.items() if n >= MIN_VRSTIC_LIGE])
    m[m] = _prestopniki(oseba[m], liga[m])
    znane, il = np.unique(liga[m], return_inverse=True)
    if len(znane) < 2:
        return {}, 0.0, stevci
    _, io = np.unique(oseba[m], return_inverse=True)
    yy, e = y[m], elo_rel[m]
    a, b, c = np.zeros(io.max() + 1), np.zeros(len(znane)), 0.0
    ee = float(e @ e)
    for korak in range(1, KORAKOV + 1):
        b_prej = b
        b = _povprecje(il, yy - a[io] - c * e, len(b))
        a = _povprecje(io, yy - b[il] - c * e, len(a))
        if ee > 0:
            c = float((yy - a[io] - b[il]) @ e / ee)
        if np.abs(b - b_prej).max() < TOLERANCA:
            break
    log.info("moc lig: %d korakov, %s", korak, "konvergiral" if np.abs(b - b_prej).max() < TOLERANCA else "NI konvergiral")
    komp = _komponente(io, il, len(znane))
    vrstic = np.bincount(il, minlength=len(znane))
    drz = [(drzava or {}).get(l) for l in znane.tolist()]
    izid: dict[int, float] = {}
    for d in set(drz):
        v_drz = np.array([x == d for x in drz])
        glavna = max(set(komp[v_drz].tolist()), key=lambda k: vrstic[v_drz & (komp == k)].sum())
        obdrzi = v_drz & (komp == glavna)
        izid.update(zip(znane[obdrzi].tolist(), (np.median(b[obdrzi]) - b[obdrzi]).tolist()))
    return izid, c, stevci


def dopolni_moc(moc: dict[int, float], stevci: dict[int, int], lige: Tabela) -> dict[int, tuple[float, str, int]]:
    """Vsaki ligi moč in vir: model → piramida (ravenLige) → mediana države → 0."""
    drzava = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    ravni = {l: raven_lige(s, i, z) for l, s, i, z in zip(
        lige["id"].tolist(), lige["slug"].tolist(), lige["name"].tolist(), lige["zveza"].tolist())}
    drzavna = {l: r[0] for l, r in ravni.items() if r and r[0] is not None and r[1] == "drzava"}
    pari = [(drzava[l], drzavna[l], v) for l, v in moc.items() if l in drzavna]
    # Vsaka država ima svojo ničlo (mediano), zato naklon znotraj držav: raven in
    # moč odštejeta povprečje svoje države, nato skupni naklon (fiksni učinek države).
    # ponytail: en naklon za vse države; po državi, ko bo vsaka imela tri modelne lige
    sredina = {d: (np.mean([r for e, r, _ in pari if e == d]), np.mean([v for e, _, v in pari if e == d])) for d, _, _ in pari}
    dr = np.array([r - sredina[d][0] for d, r, _ in pari])
    dv = np.array([v - sredina[d][1] for d, _, v in pari])
    korak = -float(dr @ dv / (dr @ dr)) if len(pari) >= 3 and dr @ dr > 0 else PRIVZETI_KORAK
    izid: dict[int, tuple[float, str, int]] = {}
    for l, d in drzava.items():
        n = stevci.get(l, 0)
        modelne = [k for k in moc if drzava.get(k) == d]
        if l in moc:
            izid[l] = (moc[l], "model", n)
        elif l in drzavna and (sidra := [moc[k] + korak * (drzavna[k] - 1) for k in modelne if k in drzavna]):
            izid[l] = (float(np.mean(sidra)) - korak * (drzavna[l] - 1), "piramida", n)
        elif modelne:
            izid[l] = (float(np.median([moc[k] for k in modelne])), "drzava", n)
        else:
            izid[l] = (0.0, "brez", n)
    return izid


def prilagodi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float]) -> tuple[dict[int, tuple[float, str, int]], float]:
    """Moč vseh lig in učinek Elo ekipe na gole (teče enkrat tedensko)."""
    m = (s["minute"] >= MIN_MINUT) & (s["skupina"] != "GK")
    y = np.log((s["goli_np"][m] + 0.5) / (s["minute"][m] / 90))
    drzava = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    moc, koef, stevci = oceni_moc(s["oseba"][m], s["competition_id"][m], elo_rel(s, elo)[m], y, drzava)
    return dopolni_moc(moc, stevci, lige), koef
