"""Indeks po poziciji: utežena vsota z-vrednosti, percentil v (država, skupina),
projekcija na raven ciljne lige (spec 3.4)."""
import numpy as np

from stroj import Tabela

VEKTOR = ["delez_minut", "zacetki_delez", "stalnost", "goli_ref_90", "delez_golov",
          "onoff_ref_90", "prejeti_ref_90", "vratar_ref_90", "ciste_delez", "kartoni_90"]
# ponytail: uteži po presoji; umeri jih backtest indeksa, ko bo merilo (faza 4)
UTEZI = {
    "FWD": {"goli_ref_90": 0.5, "delez_golov": 0.2, "onoff_ref_90": 0.2, "delez_minut": 0.1},
    "MID": {"goli_ref_90": 0.3, "onoff_ref_90": 0.3, "delez_minut": 0.2, "stalnost": 0.1, "kartoni_90": -0.1},
    "DEF": {"onoff_ref_90": 0.3, "prejeti_ref_90": -0.3, "delez_minut": 0.2, "stalnost": 0.1, "goli_ref_90": 0.1},
    "GK": {"prejeti_ref_90": -0.3, "vratar_ref_90": 0.3, "ciste_delez": 0.2, "delez_minut": 0.2},
}


def _skupine(t: Tabela):
    """Indeksi vrstic po (država, skupina); *_ref_90 so na lestvici države, zato nič čez države."""
    for d in set(t["country_id"].tolist()):
        for g in UTEZI:
            m = np.flatnonzero((t["country_id"] == d) & (t["skupina"] == g))
            if len(m):
                yield g, m


def z_vrednosti(t: Tabela) -> np.ndarray:
    """Stolpci VEKTOR, standardizirani znotraj (država, skupina)."""
    X = np.column_stack([np.nan_to_num(np.asarray(t[c], dtype=float)) for c in VEKTOR])
    Z = np.zeros_like(X)
    for _, m in _skupine(t):
        if len(m) < 2:
            continue
        sd = X[m].std(0)
        Z[m] = (X[m] - X[m].mean(0)) / np.where(sd > 0, sd, 1.0)
    return Z


def indeks(t: Tabela, Z: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    idx = np.full(len(Z), np.nan)
    pct = np.full(len(Z), np.nan)
    for g, m in _skupine(t):
        idx[m] = Z[m] @ np.array([UTEZI[g].get(c, 0.0) for c in VEKTOR])
        pct[m] = (idx[m].argsort().argsort() + 1) / len(m) * 100
    return idx, pct


def projekcija(vrednost_ref, moc_cilj) -> np.ndarray:
    """Pričakovana vrednost (npr. golov na 90) v ligi z močjo moc_cilj.
    moc_cilj mora biti liga iste države kot vrednost_ref (moč je na lestvici države)."""
    return np.asarray(vrednost_ref, dtype=float) * np.exp(-np.asarray(moc_cilj, dtype=float))
