"""Kazalniki igralca po (igralec, liga, sezona): prilagojeni ravni in ekipi,
skrčeni proti povprečju pri malo minutah (spec 3.2, 3.3, 3.7)."""
import numpy as np

from stroj import Tabela
from stroj.elo import elo_rel

# ponytail: ena prior teža za vse stopnje; po kazalniku, ko backtest pokaže razliko
K_MINUT = 900.0
REDNI = 0.5  # delež minut ekipe
ZAUPANJE_VIRA = {"model": 1.0, "piramida": 0.8, "drzava": 0.6, "brez": 0.5}
NEZNANA = (0.0, "brez", 0)
PREPISANI = ["player_id", "oseba", "country_id", "competition_id", "sezona", "leto", "team_id",
             "skupina", "minute", "enajstm", "ekipa_goli"]


def _deli(a, b) -> np.ndarray:
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    return np.divide(a, b, out=np.zeros_like(a), where=b > 0)


def _skrci(stevec: np.ndarray, minute: np.ndarray, kljuc: np.ndarray) -> np.ndarray:
    """Stopnja na 90 minut, skrčena proti povprečju iste lige in pozicije."""
    _, inv = np.unique(kljuc, return_inverse=True)
    mu = np.bincount(inv, stevec) / np.maximum(np.bincount(inv, minute), 1.0)
    return (stevec + mu[inv] * K_MINUT) / (minute + K_MINUT) * 90


def _pot(k: Tabela) -> tuple[np.ndarray, np.ndarray]:
    """Sprememba deleža minut in moči lige od lanske glavne vrstice iste osebe."""
    glavna: dict = {}
    for i, (o, y, m) in enumerate(zip(k["oseba"].tolist(), k["leto"].tolist(), k["minute"].tolist())):
        j = glavna.get((o, y))
        if j is None or m > k["minute"][j]:
            glavna[(o, y)] = i
    trend = np.full(len(k["oseba"]), np.nan)
    prehod = np.full(len(k["oseba"]), np.nan)
    for i, (o, y) in enumerate(zip(k["oseba"].tolist(), k["leto"].tolist())):
        j = glavna.get((o, y - 1))
        if j is not None:
            trend[i] = k["delez_minut"][i] - k["delez_minut"][j]
            prehod[i] = k["moc_lige"][i] - k["moc_lige"][j]
    return trend, prehod


def _stalnost(k: Tabela) -> np.ndarray:
    """Delež dosedanjih sezon osebe, v katerih je bila redna v vsaj eni vrstici leta."""
    redna: dict = {}
    for o, y, d in zip(k["oseba"].tolist(), k["leto"].tolist(), k["delez_minut"].tolist()):
        sezone = redna.setdefault(o, {})
        sezone[y] = sezone.get(y, False) or d >= REDNI
    # tekoči delež po letih osebe: en prehod na osebo, ne np.mean na vrstico
    delez: dict = {}
    for o, sezone in redna.items():
        rednih = 0
        for n, y in enumerate(sorted(sezone), 1):
            rednih += sezone[y]
            delez[(o, y)] = rednih / n
    return np.array([delez[ky] for ky in zip(k["oseba"].tolist(), k["leto"].tolist())], dtype=float)


def izracunaj(s: Tabela, moc: dict[int, tuple[float, str, int]], elo: dict[tuple[int, int, int], float], elo_koef: float) -> Tabela:
    minute = s["minute"].astype(float)
    lige = s["competition_id"].tolist()
    moc_lige = np.array([moc.get(l, NEZNANA)[0] for l in lige], dtype=float)
    vir = np.array([ZAUPANJE_VIRA[moc.get(l, NEZNANA)[1]] for l in lige])
    f = np.exp(moc_lige)
    kljuc = np.array([f"{l}:{g}" for l, g in zip(lige, s["skupina"].tolist())])
    min_off = np.maximum(s["ekipa_min_zmin"] - s["min_on"], 0).astype(float)
    utez = np.minimum(s["min_on"], min_off).astype(float)
    prejeti = _skrci(s["prejeti"].astype(float), minute, kljuc)
    ekipa_na_min = _deli(s["ekipa_prejeti"], s["ekipa_minute"])
    # vratar skrčen proti svoji ekipi, ne povprečju lige: enak ekipi = 0 ne glede na njeno moč
    vratar = (ekipa_na_min * 90 - (s["prejeti"] + ekipa_na_min * K_MINUT) / (minute + K_MINUT) * 90) / f
    onoff = (_deli(s["gr_on"], s["min_on"]) - _deli(s["ekipa_gr"] - s["gr_on"], min_off)) * 90
    k: Tabela = {c: s[c] for c in PREPISANI}
    k |= {
        "moc_lige": moc_lige,
        "delez_minut": _deli(minute, s["ekipa_minute"]),
        "zacetki_delez": _deli(s["zacetki"], s["nastopi"]),
        "cele_delez": _deli(s["cele"], s["nastopi"]),
        "goli_ref_90": _skrci(s["goli_np"].astype(float), minute, kljuc) * f * np.exp(-elo_koef * elo_rel(s, elo)),
        "delez_golov": _deli(s["goli_np"], s["ekipa_goli"]),
        "onoff_ref_90": onoff * utez / (utez + K_MINUT) * f,
        "prejeti_ref_90": prejeti / f,
        "vratar_ref_90": np.where(s["skupina"] == "GK", vratar, 0.0),
        "ciste_delez": _deli(s["ciste"], s["nastopi"]),
        "kartoni_90": _skrci((s["rumeni"] + 3 * s["rdeci"]).astype(float), minute, kljuc),
        "zaupanje": np.minimum(1.0, minute / 1800) * np.where(s["ima_sifro"], 1.0, 0.7) * vir,
    }
    k["trend_minut"], k["prehod_ravni"] = _pot(k)
    k["stalnost"] = _stalnost(k)
    return k
