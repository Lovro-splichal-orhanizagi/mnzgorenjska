"""Sintetične sezone s privzetimi stolpci, kot jih vrne nalaganje.nalozi."""
import numpy as np

PRIVZETO = {
    "country_id": 1, "competition_id": 1, "sezona": "2025/26", "leto": 2025, "team_id": 1,
    "skupina": "FWD", "ima_sifro": True, "nastopi": 10, "zacetki": 10, "minute": 900, "cele": 10,
    "goli_np": 0, "enajstm": 0, "rumeni": 0, "rdeci": 0, "prejeti": 0, "ciste": 0,
    "gr_on": 0, "min_on": 900, "ekipa_minute": 900, "ekipa_goli": 10, "ekipa_prejeti": 10, "ekipa_gr": 0,
    "ekipa_min_zmin": 900,
}


def sezone(n: int, **stolpci) -> dict[str, np.ndarray]:
    t = {c: np.array(stolpci.get(c, [v] * n), dtype=object if isinstance(v, str) else None)
         for c, v in PRIVZETO.items()}
    t["player_id"] = np.array(stolpci.get("player_id", list(range(1, n + 1))))
    t["oseba"] = np.array(stolpci.get("oseba", [f"r1:{i}" for i in range(1, n + 1)]), dtype=object)
    return t
