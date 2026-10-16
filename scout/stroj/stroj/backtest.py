"""Backtest: napoved golov brez 11 m na 90 v naslednji sezoni proti naivni
osnovi (lanski učinek) in proti ablaciji brez moči lig; pogoj faze 1 velja za
igralce, ki so zamenjali ligo.

Brez puščanja: moč lig, Elo in kazalniki vidijo le sezone pred ciljno; iz
ciljne sezone pridejo le liga (kam je igralec šel), minute (utež) in izid."""
import numpy as np

from stroj import Tabela, izberi
from stroj.indeks import projekcija
from stroj.kazalniki import izracunaj
from stroj.moc_lig import MIN_MINUT, prilagodi

PRAG = 0.15
MIN_PRESTOPOV = 200


def _glavne(t: Tabela, leto: int) -> dict:
    """Za vsako osebo vrstica z največ minutami v sezoni (le ≥ MIN_MINUT)."""
    izid: dict = {}
    for i in np.flatnonzero((t["leto"] == leto) & (t["minute"] >= MIN_MINUT)).tolist():
        o = t["oseba"][i]
        if o not in izid or t["minute"][i] > t["minute"][izid[o]]:
            izid[o] = i
    return izid


def _mae(napoved: np.ndarray, dejansko: np.ndarray, utez: np.ndarray, m: np.ndarray) -> float | None:
    return float(np.average(np.abs(napoved[m] - dejansko[m]), weights=utez[m])) if m.any() else None


def napovedi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> Tabela:
    """Pari (lanska glavna vrstica i, letošnja j; indeksa v s) in napovedi zanje."""
    maska = s["leto"] < ciljno_leto
    ucna = izberi(s, maska)
    elo = {kl: v for kl, v in elo.items() if kl[1] < ciljno_leto}  # Elo je ob koncu sezone
    moc, koef = prilagodi(ucna, lige, elo)
    k = izracunaj(ucna, moc, elo, koef)
    k0 = izracunaj(ucna, {}, elo, koef)  # ablacija: moč lig 0 povsod, le krčenje
    prej, potem = _glavne(k, ciljno_leto - 1), _glavne(s, ciljno_leto)
    pari = [(prej[o], potem[o]) for o in prej if o in potem]
    iu, j = (np.array(x, dtype=int) for x in zip(*pari)) if pari else (np.zeros(0, dtype=int),) * 2
    i = np.flatnonzero(maska)[iu]
    # oseba je ključ znotraj države (šifra vira ali ime + klub), zato je par vedno iz iste države
    # in projekcija na ciljno ligo ostane na lestvici iste države
    assert (s["country_id"][i] == s["country_id"][j]).all(), "par prestopnika čez državi"
    cilj = s["competition_id"][j]
    return {
        "i": i, "j": j,
        "prestop": s["competition_id"][i] != cilj,
        "model": projekcija(k["goli_ref_90"][iu], [moc.get(l, (0.0,))[0] for l in cilj.tolist()]),
        "brez_moci": k0["goli_ref_90"][iu],
        "naivno": s["goli_np"][i] / s["minute"][i] * 90,
        "dejansko": s["goli_np"][j] / s["minute"][j] * 90,
        "utez": s["minute"][j].astype(float),
    }


def backtest(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> dict:
    p = napovedi(s, lige, elo, ciljno_leto)
    rez: dict = {"ciljno_leto": ciljno_leto, "n": len(p["i"]), "n_prestopi": 0, "izboljsava_prestopi": None,
                 "izboljsava_moci": None, "stanje": "premalo podatkov", "prestal": False}
    if not rez["n"]:
        return rez
    vsi = np.ones(rez["n"], dtype=bool)
    for ime in ("model", "naivno", "brez_moci"):
        rez[f"mae_{ime}"] = _mae(p[ime], p["dejansko"], p["utez"], vsi)
        rez[f"mae_{ime}_prestopi"] = _mae(p[ime], p["dejansko"], p["utez"], p["prestop"])
    rez["n_prestopi"] = int(p["prestop"].sum())
    if rez["n_prestopi"] < MIN_PRESTOPOV:
        return rez
    rez["izboljsava_prestopi"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_naivno_prestopi"], 1e-12)
    rez["izboljsava_moci"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_brez_moci_prestopi"], 1e-12)
    rez["prestal"] = bool(rez["izboljsava_prestopi"] >= PRAG and rez["izboljsava_moci"] > 0)
    rez["stanje"] = "prestal" if rez["prestal"] else "padel"
    return rez
