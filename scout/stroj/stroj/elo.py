"""Elo klubov iz izidov. Vsaka liga-sezona začne pri 1500: Elo meri moč
znotraj lige (kontekst ekipe), moč med ligami meri moc_lig."""
import numpy as np

from stroj import Tabela

ZACETEK = 1500.0


def elo(tekme: Tabela, k: float = 20.0, domaci: float = 60.0) -> dict[tuple[int, int, int], float]:
    r: dict[tuple[int, int, int], float] = {}
    for liga, leto, d, g, dg, gg in zip(*(tekme[c].tolist() for c in (
            "competition_id", "leto", "home_team_id", "away_team_id", "home_goals", "away_goals"))):
        if dg is None or gg is None:  # brez izida (preložena ali neznana tekma) Elo ne premakne
            continue
        kd, kg = (liga, leto, d), (liga, leto, g)
        rd, rg = r.get(kd, ZACETEK), r.get(kg, ZACETEK)
        pricakovano = 1 / (1 + 10 ** ((rg - rd - domaci) / 400))
        izid = 1.0 if dg > gg else 0.5 if dg == gg else 0.0
        r[kd] = rd + k * (izid - pricakovano)
        r[kg] = rg - k * (izid - pricakovano)
    return r


def elo_rel(s: Tabela, elo: dict[tuple[int, int, int], float]) -> np.ndarray:
    """Elo ekipe igralca glede na povprečje lige, v enotah 400 točk."""
    kljuci = zip(s["competition_id"].tolist(), s["leto"].tolist(), s["team_id"].tolist())
    return np.array([(elo.get(kl, ZACETEK) - ZACETEK) / 400 for kl in kljuci], dtype=float)
