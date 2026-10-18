"""Lietuviško teksto kirčiavimas balsui krapas-Regina.

Naudojamas autoriaus konvejeris (krapas_text/kirtis_v2.py): korpuso žodynas (130 tūkst. formų) →
Vikižodynas (139 tūkst.) → modelis banano-kirtis-v2 tik nežinomiems žodžiams; nepatikimi spėjimai
paliekami be kirčio (balsas be ženklo kirčiuoja geriau nei su klaidingu).

Mūsų pakeitimai:
  * išjungta „panašu į anglišką žodį“ euristika – visi mūsų tekstai lietuviški, o ji
    sakinio pradžios veiksmažodžius (Pasirink, Pašokinėk) palikdavo be kirčio;
  * mūsų rankinės pataisos – kirciai.json (pirmenybė prieš viską);
  * rezultatas paverčiamas į modelio mokymo formą: raidės sulietos (NFC), kirčio ženklai – atskiri simboliai.
"""
import json
import sys
import unicodedata as ud
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / 'krapas_text'))
import kirtis_v2  # noqa: E402

MARKS = '̀́̃'


def _only_listed_or_non_lt(w):
    lw = ud.normalize('NFC', w.lower())
    return lw in kirtis_v2.FOREIGN or any(c.isalpha() and c not in kirtis_v2.LT_LETTERS for c in lw)


kirtis_v2.foreign = _only_listed_or_non_lt

_ours = json.load(open(HERE / 'kirciai.json', encoding='utf-8'))
kirtis_v2.OVERRIDES.update({ud.normalize('NFC', k.lower()): ud.normalize('NFC', v) for k, v in _ours.items() if not k.startswith('_')})


def train_form(s):
    """Kirčio ženklai – atskiri combining simboliai, visa kita – NFC (taip mokytas modelis)."""
    out = []
    for ch in ud.normalize('NFD', s):
        if ch in MARKS:
            out.append(ch)
        elif out and out[-1] not in MARKS and ud.category(ch) == 'Mn':
            out[-1] = ud.normalize('NFC', out[-1] + ch)  # ė, ą, š… lieka viena raide
        else:
            out.append(ch)
    return ''.join(out)


class Kirtis:
    def __call__(self, text):
        return train_form(kirtis_v2.stress_text(text, normalize=False))

    def explain(self, text):
        """[(žodis, šaltinis, pasitikėjimas)] – iš kur paimtas kiekvieno žodžio kirtis."""
        return kirtis_v2.stress_text(text, with_sources=True, normalize=False)[1]
