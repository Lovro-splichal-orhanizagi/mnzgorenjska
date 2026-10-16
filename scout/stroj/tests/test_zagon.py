from datetime import datetime

from stroj.__main__ import PAS, do_naslednjega


def test_do_naslednjega():
    assert do_naslednjega(datetime(2026, 10, 16, 4, 0, tzinfo=PAS)) == 25200
    assert do_naslednjega(datetime(2026, 10, 16, 12, 0, tzinfo=PAS)) == 82800
    # 25. 10. 2026 se ura premakne nazaj: do 11:00 je uro več
    assert do_naslednjega(datetime(2026, 10, 24, 12, 0, tzinfo=PAS)) == 86400
