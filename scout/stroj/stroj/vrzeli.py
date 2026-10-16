"""Vrzeli v kadru kluba iz tekoče sezone (spec 3.6)."""
import numpy as np

from stroj import Tabela

NORMA = {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2}  # rednih igralcev na pozicijo
REDNI = 0.5  # delež minut ekipe


def vrzeli(t: Tabela) -> list[tuple[int, int, str | None, str, int | None, float]]:
    izid: list[tuple[int, int, str | None, str, int | None, float]] = []
    meja_kartonov = {g: float(np.percentile(t["kartoni_90"][t["skupina"] == g], 90))
                     for g in NORMA if (t["skupina"] == g).any()}
    ekipe = sorted(set(zip(t["team_id"].tolist(), t["competition_id"].tolist())))
    for ekipa, liga in ekipe:
        m = (t["team_id"] == ekipa) & (t["competition_id"] == liga)
        redni = m & (t["delez_minut"] >= REDNI)
        for g, n in NORMA.items():
            stevilo = int((redni & (t["skupina"] == g)).sum())
            if stevilo < n:
                izid.append((ekipa, liga, g, "tanka", None, float(stevilo)))
        for i in np.flatnonzero(m):
            pid, g = int(t["player_id"][i]), t["skupina"][i]
            if t["delez_golov"][i] >= 0.4 and t["ekipa_goli"][i] >= 5:
                izid.append((ekipa, liga, g, "odvisnost", pid, float(t["delez_golov"][i])))
            # brez lanske sezone je trend NaN: primerjava je False, padca minut ni
            if t["trend_minut"][i] <= -0.3 and t["delez_minut"][i] - t["trend_minut"][i] >= REDNI:
                izid.append((ekipa, liga, g, "padajoce_minute", pid, float(t["trend_minut"][i])))
            if g in meja_kartonov and t["kartoni_90"][i] > meja_kartonov[g]:
                izid.append((ekipa, liga, g, "disciplina", pid, float(t["kartoni_90"][i])))
        prejeti = {g: float(t["prejeti_ref_90"][redni & (t["skupina"] == g)].mean())
                   for g in ("DEF", "MID", "FWD") if (redni & (t["skupina"] == g)).any()}
        if prejeti:
            g = max(prejeti, key=prejeti.get)
            izid.append((ekipa, liga, g, "prejeti", None, prejeti[g]))
    return izid
