"""Backtest: napoved golov brez 11 m na 90 v naslednji sezoni proti naivni
osnovi (lanski učinek) in proti ablaciji brez moči lig; pogoj faze 1 velja za
igralce, ki so zamenjali ligo.

Brez puščanja: moč lig, Elo in kazalniki vidijo le sezone pred ciljno; iz
ciljne sezone pridejo le liga (kam je igralec šel), minute (utež) in izid.

Pogoj šteje le pokrite prestopnike: obe ligi imata moč iz modela ali piramide,
ne nadomestne (mediana države, 0) — sicer je model kar ablacija (10/2026: ciljna
2025 brez zgodovine, 918 od 926 lig z močjo 0)."""
import numpy as np

from stroj import Tabela, izberi
from stroj.indeks import projekcija
from stroj.kazalniki import izracunaj
from stroj.moc_lig import MIN_MINUT, prilagodi

PRAG = 0.15
MIN_PRESTOPOV = 200
# moč lig mora ablacijo premagati opazno, ne za šum (produkcija 10/2026: +0,0015 %)
MIN_IZBOLJSAVA_MOCI = 0.01
POKRITI_VIRI = {"model", "piramida"}
# ciljno leto: od zadnjega navzdol, največ toliko let (vsako stane eno prilagoditev moči)
KANDIDATOV = 3


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


def _pari(ucna: Tabela, s: Tabela, ciljno_leto: int) -> tuple[np.ndarray, np.ndarray]:
    """Indeksa parov: lanska glavna vrstica v `ucna`, letošnja v `s`."""
    prej, potem = _glavne(ucna, ciljno_leto - 1), _glavne(s, ciljno_leto)
    pari = [(prej[o], potem[o]) for o in prej if o in potem]
    if not pari:
        return np.zeros(0, dtype=int), np.zeros(0, dtype=int)
    iu, j = (np.array(x, dtype=int) for x in zip(*pari))
    return iu, j


def _pokrit(moc: dict, od: np.ndarray, do: np.ndarray) -> np.ndarray:
    """Obe ligi para imata moč iz modela ali piramide."""
    vir = {l: v[1] for l, v in moc.items()}
    return np.array([vir.get(a) in POKRITI_VIRI and vir.get(b) in POKRITI_VIRI
                     for a, b in zip(od.tolist(), do.tolist())], dtype=bool)


def _ucna(s: Tabela, elo: dict, ciljno_leto: int) -> tuple[np.ndarray, Tabela, dict]:
    maska = s["leto"] < ciljno_leto
    return maska, izberi(s, maska), {kl: v for kl, v in elo.items() if kl[1] < ciljno_leto}  # Elo je ob koncu sezone


def napovedi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> Tabela:
    """Pari (lanska glavna vrstica i, letošnja j; indeksa v s) in napovedi zanje."""
    maska, ucna, elo = _ucna(s, elo, ciljno_leto)
    moc, koef = prilagodi(ucna, lige, elo)
    k = izracunaj(ucna, moc, elo, koef)
    k0 = izracunaj(ucna, {}, elo, koef)  # ablacija: moč lig 0 povsod, le krčenje
    iu, j = _pari(ucna, s, ciljno_leto)
    i = np.flatnonzero(maska)[iu]
    # oseba je ključ znotraj države (šifra vira ali ime + klub), zato je par vedno iz iste države
    # in projekcija na ciljno ligo ostane na lestvici iste države
    assert (s["country_id"][i] == s["country_id"][j]).all(), "par prestopnika čez državi"
    cilj = s["competition_id"][j]
    return {
        "i": i, "j": j,
        "prestop": s["competition_id"][i] != cilj,
        "pokrit": _pokrit(moc, s["competition_id"][i], cilj),
        "model": projekcija(k["goli_ref_90"][iu], [moc.get(l, (0.0,))[0] for l in cilj.tolist()]),
        "brez_moci": k0["goli_ref_90"][iu],
        "naivno": s["goli_np"][i] / s["minute"][i] * 90,
        "dejansko": s["goli_np"][j] / s["minute"][j] * 90,
        "utez": s["minute"][j].astype(float),
    }


def backtest(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> dict:
    p = napovedi(s, lige, elo, ciljno_leto)
    rez: dict = {"ciljno_leto": ciljno_leto, "n": len(p["i"]), "n_prestopi": 0, "n_pokriti": 0,
                 "izboljsava_prestopi": None,
                 "izboljsava_moci": None, "stanje": "premalo podatkov", "prestal": False}
    if not rez["n"]:
        return rez
    vsi = np.ones(rez["n"], dtype=bool)
    pokriti = p["prestop"] & p["pokrit"]
    for ime in ("model", "naivno", "brez_moci"):
        rez[f"mae_{ime}"] = _mae(p[ime], p["dejansko"], p["utez"], vsi)
        rez[f"mae_{ime}_prestopi"] = _mae(p[ime], p["dejansko"], p["utez"], pokriti)  # le pokriti
    rez["n_prestopi"] = int(p["prestop"].sum())
    rez["n_pokriti"] = int(pokriti.sum())
    if rez["n_pokriti"] < MIN_PRESTOPOV:
        return rez
    rez["izboljsava_prestopi"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_naivno_prestopi"], 1e-12)
    rez["izboljsava_moci"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_brez_moci_prestopi"], 1e-12)
    rez["prestal"] = bool(rez["izboljsava_prestopi"] >= PRAG and rez["izboljsava_moci"] >= MIN_IZBOLJSAVA_MOCI)
    rez["stanje"] = "prestal" if rez["prestal"] else "padel"
    return rez


def pokritih(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> int:
    """Število pokritih prestopnikov ciljnega leta; le moč lig, brez kazalnikov."""
    maska, ucna, elo = _ucna(s, elo, ciljno_leto)
    if not maska.any():
        return 0
    moc, _ = prilagodi(ucna, lige, elo)
    iu, j = _pari(ucna, s, ciljno_leto)
    od, do = ucna["competition_id"][iu], s["competition_id"][j]
    return int(((od != do) & _pokrit(moc, od, do)).sum())


def izberi_ciljno_leto(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float]) -> int | None:
    """Zadnje leto (od max(leto) navzdol, največ KANDIDATOV) z vsaj MIN_PRESTOPOV pokritimi
    prestopniki. Tekoča sezona je lahko ciljna: je šumnejša, a edina z dovolj zgodovine."""
    zadnje = int(s["leto"].max())
    for leto in range(zadnje, zadnje - KANDIDATOV, -1):
        if pokritih(s, lige, elo, leto) >= MIN_PRESTOPOV:
            return leto
    return None
