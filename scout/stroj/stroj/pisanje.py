"""Nova različica modela: vse tabele v eni transakciji, vmesnik nikoli ne
vidi napol izračunanih števil (spec 4)."""
import json
import math
from collections.abc import Iterable, Iterator

import numpy as np
import psycopg
from psycopg.types.json import Jsonb

STOLPCI = {
    "lige_moc": ["competition_id", "moc", "vir", "prestopov", "izracunano_at"],
    "ekipe_elo": ["team_id", "competition_id", "leto", "elo"],
    "kazalniki": ["player_id", "competition_id", "sezona", "leto", "team_id", "skupina", "minute",
                  "delez_minut", "zacetki_delez", "cele_delez", "goli_ref_90", "delez_golov", "enajstm",
                  "onoff_ref_90", "prejeti_ref_90", "ciste_delez", "kartoni_90", "vratar_ref_90",
                  "stalnost", "trend_minut", "prehod_ravni", "zaupanje"],
    "indeks": ["player_id", "skupina", "indeks", "percentil", "zaupanje"],
    "vektorji": ["player_id", "skupina", "vektor", "podobni", "podobnost"],
    "vrzeli": ["team_id", "competition_id", "skupina", "vrsta", "player_id", "vrednost"],
}
OHRANI_OBJAVLJENIH = 3
KOS = 20_000  # vrstic, ki jih vrstice() naenkrat pretvori v Pythonove objekte


def _vrednost(v):
    """NaN (npr. trend_minut igralca z eno sezono) gre v bazo kot NULL."""
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, dict):
        return {k: _vrednost(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_vrednost(x) for x in v]
    return v


def _json(v) -> Jsonb:
    # allow_nan=False: NaN, ki bi ušel _vrednost, je napaka, ne neveljaven JSON v bazi
    return Jsonb(_vrednost(v), dumps=lambda o: json.dumps(o, allow_nan=False))


def vrstice(t: dict[str, np.ndarray], stolpci: list[str], izbor: np.ndarray | None = None) -> Iterator[tuple]:
    """Vrstice tabele stolpcev (le `izbor` indeksov, če je dan), po kosih: v pomnilniku
    je naenkrat le en kos Pythonovih objektov, ne vse vrstice."""
    izbor = np.arange(len(t[stolpci[0]])) if izbor is None else izbor
    for z in range(0, len(izbor), KOS):
        i = izbor[z:z + KOS]
        yield from zip(*(t[c][i].tolist() for c in stolpci))


def zapisi(conn: psycopg.Connection, model: dict, izhod: dict[str, Iterable[tuple]]) -> int:
    with conn.transaction():
        model_id = conn.execute(
            "insert into scout.modeli (leto, backtest, parametri, objavljen) values (%s, %s, %s, %s) returning id",
            (model["leto"], _json(model["backtest"]), _json(model["parametri"]), model["objavljen"]),
        ).fetchone()[0]
        # COPY FROM v tabelo z RLS Postgres zavrne (scout_stroj ni lastnik), zato
        # COPY v začasno tabelo in od tam insert ... select skozi politike `stroj`.
        with conn.cursor() as cur:
            for tabela, stolpci in STOLPCI.items():
                s = ", ".join(["model_id", *stolpci])
                cur.execute(f"create temp table _nova (like scout.{tabela}) on commit drop")
                with cur.copy(f"copy _nova ({s}) from stdin") as cp:
                    for r in izhod.get(tabela, []):
                        cp.write_row((model_id, *map(_vrednost, r)))
                cur.execute(f"insert into scout.{tabela} ({s}) select {s} from _nova")
                cur.execute("drop table _nova")
        conn.execute(
            """delete from scout.modeli where id <> %(id)s and id not in (
                 select id from scout.modeli where objavljen order by id desc limit %(n)s)""",
            {"id": model_id, "n": OHRANI_OBJAVLJENIH},
        )
    return model_id
