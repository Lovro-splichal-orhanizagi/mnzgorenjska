"""Vrzeli v kadru kluba iz tekoče sezone (spec 3.6)."""
import numpy as np

from stroj import Tabela

NORMA = {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2}  # rednih igralcev na pozicijo
REDNI = 0.5  # delež minut ekipe
MIN_DISCIPLINA = 10  # igralcev v (liga, pozicija), da je percentil kartonov smiseln
MIN_KARTONOV = 0.2  # spodnja meja praga na 90 min, da p90 = 0 ne označi vsakega kartona


def _po(*stolpci: np.ndarray) -> dict[tuple, np.ndarray]:
    """Indeksi vrstic po ključu iz stolpcev: en prehod, ne maska čez vse vrstice na ključ
    (ta je bila O(ekip × vrstic), pri vseh državah ~100 s)."""
    izid: dict[tuple, list[int]] = {}
    for i, k in enumerate(zip(*(s.tolist() for s in stolpci))):
        izid.setdefault(k, []).append(i)
    return {k: np.array(v) for k, v in izid.items()}


def vrzeli(t: Tabela) -> list[tuple[int, int, str | None, str, int | None, float]]:
    izid: list[tuple[int, int, str | None, str, int | None, float]] = []
    # prag po ligi in poziciji: lige in države imajo različne norme kartonov
    meja_kartonov = {(liga, g): max(float(np.percentile(t["kartoni_90"][m], 90)), MIN_KARTONOV)
                     for (liga, g), m in _po(t["competition_id"], t["skupina"]).items()
                     if g in NORMA and len(m) >= MIN_DISCIPLINA}
    for (ekipa, liga), m in sorted(_po(t["team_id"], t["competition_id"]).items()):
        redni = m[t["delez_minut"][m] >= REDNI]
        skupina_rednih = t["skupina"][redni]
        for g, n in NORMA.items():
            stevilo = int((skupina_rednih == g).sum())
            if stevilo < n:
                izid.append((ekipa, liga, g, "tanka", None, float(stevilo)))
        for i in m.tolist():
            pid, g = int(t["player_id"][i]), t["skupina"][i]
            if t["delez_golov"][i] >= 0.4 and t["ekipa_goli"][i] >= 5:
                izid.append((ekipa, liga, g, "odvisnost", pid, float(t["delez_golov"][i])))
            # brez lanske sezone je trend NaN: primerjava je False, padca minut ni
            if t["trend_minut"][i] <= -0.3 and t["delez_minut"][i] - t["trend_minut"][i] >= REDNI:
                izid.append((ekipa, liga, g, "padajoce_minute", pid, float(t["trend_minut"][i])))
            if (liga, g) in meja_kartonov and t["kartoni_90"][i] > meja_kartonov[(liga, g)]:
                izid.append((ekipa, liga, g, "disciplina", pid, float(t["kartoni_90"][i])))
        prejeti = {g: float(t["prejeti_ref_90"][redni[skupina_rednih == g]].mean())
                   for g in ("DEF", "MID", "FWD") if (skupina_rednih == g).any()}
        if prejeti:
            g = max(prejeti, key=prejeti.get)
            izid.append((ekipa, liga, g, "prejeti", None, prejeti[g]))
    return izid
