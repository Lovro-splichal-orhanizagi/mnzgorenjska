"""SLFF Scout: nočni analitični stroj (docs/scout.md)."""
import numpy as np

# Tabela je slovar stolpcev; vse vrstice so poravnane po indeksu.
Tabela = dict[str, np.ndarray]


def izberi(t: Tabela, maska: np.ndarray) -> Tabela:
    """Vrstice tabele, kjer je maska resnična."""
    return {c: v[maska] for c, v in t.items()}
