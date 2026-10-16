"""Moč lig iz igralcev, ki so igrali v več ligah (spec 3.1)."""
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


def _prestopniki(oseba: np.ndarray, liga: np.ndarray) -> np.ndarray:
    lige_osebe: dict = {}
    for o, l in zip(oseba.tolist(), liga.tolist()):
        lige_osebe.setdefault(o, set()).add(l)
    return np.array([len(lige_osebe[o]) > 1 for o in oseba.tolist()], dtype=bool)


def _povprecje(inv: np.ndarray, v: np.ndarray, n: int) -> np.ndarray:
    return np.bincount(inv, v, n) / np.maximum(np.bincount(inv, minlength=n), 1)


def oceni_moc(oseba: np.ndarray, liga: np.ndarray, elo_rel: np.ndarray, y: np.ndarray) -> tuple[dict[int, float], float, dict[int, int]]:
    """Dvosmerni fiksni učinki: y = oseba + liga + c · Elo ekipe."""
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
    for _ in range(KORAKOV):
        b_prej = b
        b = _povprecje(il, yy - a[io] - c * e, len(b))
        a = _povprecje(io, yy - b[il] - c * e, len(a))
        if ee > 0:
            c = float((yy - a[io] - b[il]) @ e / ee)
        if np.abs(b - b_prej).max() < TOLERANCA:
            break
    moc = np.median(b) - b
    return dict(zip(znane.tolist(), moc.tolist())), c, stevci


def dopolni_moc(moc: dict[int, float], stevci: dict[int, int], lige: Tabela) -> dict[int, tuple[float, str, int]]:
    """Vsaki ligi moč in vir: model → piramida (ravenLige) → mediana države → 0."""
    drzava = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    ravni = {l: raven_lige(s, i, z) for l, s, i, z in zip(
        lige["id"].tolist(), lige["slug"].tolist(), lige["name"].tolist(), lige["zveza"].tolist())}
    drzavna = {l: r[0] for l, r in ravni.items() if r and r[0] is not None and r[1] == "drzava"}
    pari = [(drzavna[l], v) for l, v in moc.items() if l in drzavna]
    # ponytail: en naklon za vse države; po državi, ko bo vsaka imela tri modelne lige
    korak = -float(np.polyfit(*zip(*pari), 1)[0]) if len({r for r, _ in pari}) >= 2 and len(pari) >= 3 else PRIVZETI_KORAK
    izid: dict[int, tuple[float, str, int]] = {}
    for l, d in drzava.items():
        n = stevci.get(l, 0)
        modelne = [k for k in moc if drzava.get(k) == d]
        if l in moc:
            izid[l] = (moc[l], "model", n)
        elif l in drzavna:
            sidra = [moc[k] + korak * (drzavna[k] - 1) for k in modelne if k in drzavna]
            vrh = float(np.mean(sidra)) if sidra else 0.0
            izid[l] = (vrh - korak * (drzavna[l] - 1), "piramida", n)
        elif modelne:
            izid[l] = (float(np.median([moc[k] for k in modelne])), "drzava", n)
        else:
            izid[l] = (0.0, "brez", n)
    return izid


def prilagodi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float]) -> tuple[dict[int, tuple[float, str, int]], float]:
    """Moč vseh lig in učinek Elo ekipe na gole (teče enkrat tedensko)."""
    m = (s["minute"] >= MIN_MINUT) & (s["skupina"] != "GK")
    y = np.log((s["goli_np"][m] + 0.5) / (s["minute"][m] / 90))
    moc, koef, stevci = oceni_moc(s["oseba"][m], s["competition_id"][m], elo_rel(s, elo)[m], y)
    return dopolni_moc(moc, stevci, lige), koef
